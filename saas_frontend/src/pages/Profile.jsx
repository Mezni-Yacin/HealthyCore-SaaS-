import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // ✅ IMPORT MANQUANT AJOUTÉ ICI
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Profile() {
  const { user, loading, refreshUser } = useAuth();
  
  // États
  const [editMode, setEditMode] = useState(false);
  const [generalForm, setGeneralForm] = useState({});
  const [patientForm, setPatientForm] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cacheBuster, setCacheBuster] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Gestion des documents
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('other');
  const [newDocFile, setNewDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Villes (pour le select)
  const [cities, setCities] = useState([]);

  // Récupération des villes
  useEffect(() => {
    api.get('/users/cities/?page_size=500')
      .then(res => setCities(res.data.results || res.data || []))
      .catch(err => console.error("Erreur villes:", err));
  }, []);

  // Chargement initial des données utilisateur
  useEffect(() => {
    if (!user) return;
    setGeneralForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone_number: user.phone_number || '',
      address: user.address || '',
      city: user.city || '',
      language_preference: user.language_preference || 'fr',
    });
    setPhotoPreview(null);
    if (user.role === 'patient') {
      setPatientForm(user.patient_profile || {});
    }
  }, [user]);

  const handleGeneralChange = (e) => setGeneralForm({ ...generalForm, [e.target.name]: e.target.value });
  const handlePatientChange = (e) => setPatientForm({ ...patientForm, [e.target.name]: e.target.value });

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const formData = new FormData();
    Object.entries(generalForm).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) formData.append(k, v);
    });
    if (photoFile) formData.append('profile_picture', photoFile);

    try {
      await api.patch('/users/profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (user.role === 'patient' && Object.keys(patientForm).length > 0) {
        await api.patch('/users/patient-profile/', patientForm);
      }
      
      setMessage('✅ Profil mis à jour avec succès !');
      setEditMode(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      await refreshUser();
      setCacheBuster(Date.now());
    } catch (err) {
      setMessage('❌ Erreur : ' + (err.response?.data?.detail || 'Vérifiez les champs.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    if (!newDocFile || !newDocTitle) {
      setMessage('❌ Titre et fichier requis !');
      return;
    }
    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('title', newDocTitle);
    formData.append('document_type', newDocType);
    formData.append('file', newDocFile);

    try {
      await api.post('/users/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshUser();
      setNewDocTitle('');
      setNewDocType('other');
      setNewDocFile(null);
      setMessage('✅ Document ajouté avec succès !');
    } catch (err) {
      setMessage('❌ Erreur upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    try {
      await api.delete(`/users/documents/${id}/`);
      await refreshUser();
      setMessage('✅ Document supprimé.');
    } catch (err) {
      setMessage('❌ Erreur lors de la suppression.');
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  if (!user) return <div className="alert alert-danger m-4">Non connecté</div>;

  const displayImage = photoPreview || (user.profile_picture_url ? `${user.profile_picture_url}?t=${cacheBuster}` : null);

  // Helper pour l'icône du document
  const getDocIcon = (type) => {
    const icons = {
      diploma: 'bi-mortarboard', certificate: 'bi-patch-check', lab_result: 'bi-clipboard2-pulse',
      prescription: 'bi-prescription2', medical_record: 'bi-folder2-open', radio: 'bi-image', other: 'bi-file-earmark'
    };
    return icons[type] || 'bi-file-earmark';
  };

  return (
    <div className="container-fluid py-4" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Bannière de couverture */}
      <div className="position-relative mb-5 rounded-4 shadow-sm overflow-hidden" style={{ height: '200px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
        <div className="position-absolute top-0 end-0 p-3">
          <button className="btn btn-light btn-sm shadow-sm" onClick={() => setEditMode(!editMode)}>
            <i className={`bi ${editMode ? 'bi-x-lg' : 'bi-pencil-square'} me-1`}></i>
            {editMode ? 'Annuler' : 'Modifier le profil'}
          </button>
        </div>
      </div>

      <div className="row g-4" style={{ marginTop: '-100px' }}>
        
        {/* Colonne Gauche : Carte de visite */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm sticky-top" style={{ top: '20px', borderRadius: 16 }}>
            <div className="card-body text-center p-4">
              <div className="position-relative d-inline-block mb-3">
                {displayImage ? (
                  <img src={displayImage} alt="Profil" className="rounded-circle shadow" style={{ width: '140px', height: '140px', objectFit: 'cover', border: '4px solid white' }} />
                ) : (
                  <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white shadow" style={{ width: '140px', height: '140px', border: '4px solid white', fontSize: '3rem' }}>
                    <i className="bi bi-person-fill"></i>
                  </div>
                )}
                {editMode && (
                  <label className="btn btn-light btn-sm rounded-circle shadow position-absolute bottom-0 end-0" style={{ width: '40px', height: '40px' }}>
                    <i className="bi bi-camera"></i>
                    <input type="file" accept="image/*" onChange={handlePhoto} hidden />
                  </label>
                )}
              </div>
              <h3 className="fw-bold mb-1">{user.first_name} {user.last_name}</h3>
              <p className="text-muted text-uppercase small fw-bold mb-3">
                <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2">{user.role_display || user.role}</span>
              </p>
              
              <div className="text-start mt-4 mb-4">
                <div className="d-flex align-items-center mb-3 text-muted">
                  <i className="bi bi-envelope me-3 fs-5"></i>
                  <span className="small text-dark">{user.email || 'Non renseigné'}</span>
                </div>
                <div className="d-flex align-items-center mb-3 text-muted">
                  <i className="bi bi-telephone me-3 fs-5"></i>
                  <span className="small text-dark">{user.phone_number || 'Non renseigné'}</span>
                </div>
                <div className="d-flex align-items-center text-muted">
                  <i className="bi bi-geo-alt me-3 fs-5"></i>
                  <span className="small text-dark">{user.city_detail?.name || 'Non renseignée'}</span>
                </div>
              </div>

              {/* ✅ BOUTON MESSAGERIE */}
              {!editMode && (
                <Link to="/messages" className="btn btn-outline-primary w-100 rounded-3 fw-semibold">
                  <i className="bi bi-chat-dots me-2"></i> Ma Messagerie
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Colonne Droite : Formulaires et Documents */}
        <div className="col-lg-8">
          {message && <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-danger'} shadow-sm`}>{message}</div>}

          {editMode ? (
            <form onSubmit={handleSubmit}>
              {/* Infos Générales */}
              <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
                <div className="card-header bg-white border-0 py-3">
                  <h5 className="mb-0 fw-bold"><i className="bi bi-person-lines-fill text-primary me-2"></i>Informations générales</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Prénom</label>
                      <input name="first_name" value={generalForm.first_name || ''} onChange={handleGeneralChange} className="form-control" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Nom</label>
                      <input name="last_name" value={generalForm.last_name || ''} onChange={handleGeneralChange} className="form-control" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Téléphone</label>
                      <input name="phone_number" value={generalForm.phone_number || ''} onChange={handleGeneralChange} className="form-control" placeholder="+216..." />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Ville</label>
                      <select name="city" value={generalForm.city || ''} onChange={handleGeneralChange} className="form-select">
                        <option value="">-- Choisir une ville --</option>
                        {cities.map(c => <option key={c.id} value={c.id}>{c.name} ({c.governorate_name})</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold">Adresse</label>
                      <textarea name="address" value={generalForm.address || ''} onChange={handleGeneralChange} className="form-control" rows="2"></textarea>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold">Langue préférée</label>
                      <select name="language_preference" value={generalForm.language_preference || 'fr'} onChange={handleGeneralChange} className="form-select">
                        <option value="fr">Français</option>
                        <option value="ar">Arabe</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Infos Médicales (Patient uniquement) */}
              {user.role === 'patient' && (
                <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
                  <div className="card-header bg-white border-0 py-3">
                    <h5 className="mb-0 fw-bold"><i className="bi bi-heart-pulse text-danger me-2"></i>Informations médicales</h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Date de naissance</label>
                        <input type="date" name="date_of_birth" value={patientForm.date_of_birth || ''} onChange={handlePatientChange} className="form-control" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Genre</label>
                        <select name="gender" value={patientForm.gender || 'U'} onChange={handlePatientChange} className="form-select">
                          <option value="M">Homme</option>
                          <option value="F">Femme</option>
                          <option value="O">Autre</option>
                          <option value="U">Non spécifié</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-bold">Groupe Sanguin</label>
                        <select name="blood_type" value={patientForm.blood_type || ''} onChange={handlePatientChange} className="form-select">
                          <option value="">—</option>
                          <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                          <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-bold">Taille (cm)</label>
                        <input type="number" name="height" value={patientForm.height || ''} onChange={handlePatientChange} className="form-control" />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-bold">Poids (kg)</label>
                        <input type="number" step="0.1" name="weight" value={patientForm.weight || ''} onChange={handlePatientChange} className="form-control" />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold">Allergies</label>
                        <textarea name="allergies" value={patientForm.allergies || ''} onChange={handlePatientChange} className="form-control" rows="1"></textarea>
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold">Maladies chroniques</label>
                        <textarea name="chronic_diseases" value={patientForm.chronic_diseases || ''} onChange={handlePatientChange} className="form-control" rows="1"></textarea>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Contact d'urgence (Nom)</label>
                        <input name="emergency_contact_name" value={patientForm.emergency_contact_name || ''} onChange={handlePatientChange} className="form-control" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Contact d'urgence (Tél)</label>
                        <input name="emergency_contact_phone" value={patientForm.emergency_contact_phone || ''} onChange={handlePatientChange} className="form-control" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg w-100 mb-4 shadow-sm" disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-check-lg me-2"></i>Enregistrer les modifications</>}
              </button>
            </form>
          ) : (
            // Mode Lecture (Détails)
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
              <div className="card-header bg-white border-0 py-3">
                <h5 className="mb-0 fw-bold"><i className="bi bi-info-circle text-primary me-2"></i>Détails du compte</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6"><strong className="d-block text-muted small">Nom d'utilisateur</strong> @{user.username}</div>
                  <div className="col-md-6"><strong className="d-block text-muted small">Email</strong> {user.email || '—'}</div>
                  <div className="col-md-6"><strong className="d-block text-muted small">Téléphone</strong> {user.phone_number || '—'}</div>
                  <div className="col-md-6"><strong className="d-block text-muted small">Ville</strong> {user.city_detail?.name || '—'}</div>
                  <div className="col-12"><strong className="d-block text-muted small">Adresse</strong> {user.address || '—'}</div>
                  
                  {user.role === 'patient' && (
                    <div className="col-12 mt-4 border-top pt-3">
                      <h6 className="text-danger mb-3">Informations Médicales</h6>
                      <div className="row g-3">
                        <div className="col-md-4"><strong className="d-block text-muted small">Date de naissance</strong> {patientForm.date_of_birth || '—'}</div>
                        <div className="col-md-4"><strong className="d-block text-muted small">Groupe Sanguin</strong> {patientForm.blood_type || '—'}</div>
                        <div className="col-md-4"><strong className="d-block text-muted small">Genre</strong> {patientForm.gender === 'M' ? 'Homme' : patientForm.gender === 'F' ? 'Femme' : '—'}</div>
                        <div className="col-12"><strong className="d-block text-muted small">Allergies</strong> {patientForm.allergies || 'Aucune'}</div>
                        <div className="col-12"><strong className="d-block text-muted small">Maladies chroniques</strong> {patientForm.chronic_diseases || 'Aucune'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section Documents */}
          <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
            <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold"><i className="bi bi-folder text-warning me-2"></i>Mes Documents</h5>
            </div>
            <div className="card-body">
              {user.documents && user.documents.length > 0 ? (
                <div className="row g-3 mb-3">
                  {user.documents.map(doc => (
                    <div key={doc.id} className="col-md-6">
                      <div className="card h-100 border shadow-sm">
                        <div className="card-body d-flex align-items-center">
                          <i className={`bi ${getDocIcon(doc.document_type)} fs-2 text-primary me-3`}></i>
                          <div className="flex-grow-1">
                            <h6 className="mb-0">{doc.title}</h6>
                            <small className="text-muted">{doc.document_type_display}</small>
                          </div>
                          <div className="d-flex flex-column gap-1">
                            <a href={doc.file_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary"><i className="bi bi-eye"></i></a>
                            {editMode && <button onClick={() => handleDeleteDocument(doc.id)} className="btn btn-sm btn-outline-danger"><i className="bi bi-trash"></i></button>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center py-4"><i className="bi bi-inbox fs-1 d-block mb-2"></i>Aucun document téléversé.</p>
              )}

              {editMode && (
                <form onSubmit={handleDocumentUpload} className="mt-4 p-3 bg-light rounded border">
                  <h6 className="mb-3">Ajouter un nouveau document</h6>
                  <div className="row g-2 align-items-end">
                    <div className="col-md-4">
                      <label className="form-label small">Titre</label>
                      <input type="text" className="form-control" value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)} required />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small">Type</label>
                      <select className="form-select" value={newDocType} onChange={e => setNewDocType(e.target.value)}>
                        <option value="diploma">Diplôme</option>
                        <option value="lab_result">Résultat labo</option>
                        <option value="prescription">Ordonnance</option>
                        <option value="medical_record">Dossier médical</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <input type="file" accept=".pdf,.jpg,.png" className="form-control" onChange={e => setNewDocFile(e.target.files[0])} required />
                    </div>
                    <div className="col-md-2">
                      <button type="submit" className="btn btn-warning w-100" disabled={uploadingDoc}>
                        {uploadingDoc ? '...' : <><i className="bi bi-upload me-1"></i>Ajouter</>}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}