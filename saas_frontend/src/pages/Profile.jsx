// src/pages/Profile.jsx (updated with delete button)
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Profile() {
  const { user, loading, refreshUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [generalForm, setGeneralForm] = useState({});
  const [patientForm, setPatientForm] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null); // preview local (blob)
  const [cacheBuster, setCacheBuster] = useState(0); // anti-spam image
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  // States pour l'upload de documents
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('other');
  const [newDocFile, setNewDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  // Chargement initial + mise à jour après refresh
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
    setPhotoPreview(null); // on affiche l'URL serveur
    if (user.role === 'patient') {
      const p = user.patient_profile || {};
      setPatientForm(p);
    }
  }, [user]);
  const handleGeneralChange = (e) => {
    setGeneralForm({ ...generalForm, [e.target.name]: e.target.value });
  };
  const handlePatientChange = (e) => {
    setPatientForm({ ...patientForm, [e.target.name]: e.target.value });
  };
  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file)); // preview immédiat
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
      // Mise à jour patient si nécessaire
      if (user.role === 'patient' && Object.keys(patientForm).length > 0) {
        await api.patch('/users/patient-profile/', patientForm);
      }
      setMessage('✅ Tout a été mis à jour !');
      setEditMode(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      await refreshUser(); // ← recharge tout (image + address + ville)
      setCacheBuster(Date.now()); // force affichage nouvelle image
    } catch (err) {
      setMessage('❌ Erreur : ' + (err.response?.data?.detail || 'Vérifie les logs'));
      console.error(err);
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
      await refreshUser(); // Recharge pour voir les nouveaux docs
      setNewDocTitle('');
      setNewDocType('other');
      setNewDocFile(null);
      setMessage('✅ Document ajouté avec succès !');
    } catch (err) {
      setMessage('❌ Erreur upload document : ' + (err.response?.data?.detail || 'Vérifie les logs'));
      console.error(err);
    } finally {
      setUploadingDoc(false);
    }
  };
  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;
    try {
      await api.delete(`/users/documents/${id}/`);
      await refreshUser();
      setMessage('✅ Document supprimé avec succès !');
    } catch (err) {
      setMessage('❌ Erreur lors de la suppression : ' + (err.response?.data?.detail || 'Vérifie les logs'));
      console.error(err);
    }
  };
  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  if (!user) return <div className="alert alert-danger">Non connecté</div>;
  const displayImage = photoPreview ||
    (user.profile_picture_url ? `${user.profile_picture_url}?t=${cacheBuster}` : '/default-avatar.png');
  return (
    <div className="container py-5">
      <h1 className="display-5 fw-bold text-center mb-5">Mon Profil</h1>
      <div className="card shadow border-0 mb-5">
        <div className="card-header bg-primary text-white d-flex justify-content-between">
          <h4>Profil de {user.first_name || user.username}</h4>
          <button className="btn btn-light btn-sm" onClick={() => setEditMode(!editMode)}>
            {editMode ? 'Annuler' : 'Modifier'}
          </button>
        </div>
        <div className="card-body p-5">
          {message && <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-danger'}`}>{message}</div>}
          {/* IMAGE */}
          <div className="text-center mb-5">
            <img
              src={displayImage}
              alt="Profil"
              className="rounded-circle shadow"
              style={{ width: '160px', height: '160px', objectFit: 'cover' }}
              onError={(e) => { e.target.src = '/default-avatar.png'; }}
            />
            {editMode && (
              <div className="mt-3">
                <label className="btn btn-outline-primary">
                  Changer la photo
                  <input type="file" accept="image/*" onChange={handlePhoto} hidden />
                </label>
              </div>
            )}
          </div>
          {/* GÉNÉRAL */}
          <h5 className="text-primary mb-4">Informations générales</h5>
          <div className="row g-4 mb-5">
            <div className="col-md-6">
              <label className="form-label fw-bold">Prénom</label>
              {editMode ? <input name="first_name" value={generalForm.first_name} onChange={handleGeneralChange} className="form-control" /> : <p className="form-control-plaintext">{user.first_name || '—'}</p>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold">Nom</label>
              {editMode ? <input name="last_name" value={generalForm.last_name} onChange={handleGeneralChange} className="form-control" /> : <p className="form-control-plaintext">{user.last_name || '—'}</p>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold">Téléphone</label>
              {editMode ? <input name="phone_number" value={generalForm.phone_number} onChange={handleGeneralChange} className="form-control" /> : <p className="form-control-plaintext">{user.phone_number || '—'}</p>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold">Langue</label>
              {editMode ? (
                <select name="language_preference" value={generalForm.language_preference} onChange={handleGeneralChange} className="form-select">
                  <option value="fr">Français</option>
                  <option value="ar">Arabe</option>
                </select>
              ) : <p className="form-control-plaintext">{user.language_preference === 'fr' ? 'Français' : 'Arabe'}</p>}
            </div>
            <div className="col-12">
              <label className="form-label fw-bold">Adresse</label>
              {editMode ? <textarea name="address" value={generalForm.address} onChange={handleGeneralChange} className="form-control" rows="2" /> : <p className="form-control-plaintext">{user.address || 'Non renseignée'}</p>}
            </div>
            <div className="col-12">
              <label className="form-label fw-bold">Ville</label>
              {editMode ? (
                <input type="number" name="city" value={generalForm.city} onChange={handleGeneralChange} className="form-control" placeholder="ID ville" />
              ) : <p className="form-control-plaintext">{user.city_detail?.name || '—'}</p>}
            </div>
          </div>
          {/* PATIENT (si patient) */}
          {user.role === 'patient' && (
            <>
              <hr className="my-5" />
              <h5 className="text-info mb-4">Informations médicales</h5>
              <div className="row g-4">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Date de naissance</label>
                  {editMode ? (
                    <input type="date" name="date_of_birth" value={patientForm.date_of_birth || ''} onChange={handlePatientChange} className="form-control" />
                  ) : (
                    <p className="form-control-plaintext">{patientForm.date_of_birth || '—'}</p>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Genre</label>
                  {editMode ? (
                    <select name="gender" value={patientForm.gender || 'U'} onChange={handlePatientChange} className="form-select">
                      <option value="M">Homme</option>
                      <option value="F">Femme</option>
                      <option value="O">Autre</option>
                      <option value="U">Non spécifié</option>
                    </select>
                  ) : (
                    <p className="form-control-plaintext">
                      {patientForm.gender === 'M' ? 'Homme' : patientForm.gender === 'F' ? 'Femme' : patientForm.gender === 'O' ? 'Autre' : 'Non spécifié'}
                    </p>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Groupe sanguin</label>
                  {editMode ? (
                    <select name="blood_type" value={patientForm.blood_type || ''} onChange={handlePatientChange} className="form-select">
                      <option value="">—</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  ) : (
                    <p className="form-control-plaintext">{patientForm.blood_type || '—'}</p>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Taille (cm)</label>
                  {editMode ? (
                    <input type="number" name="height" value={patientForm.height || ''} onChange={handlePatientChange} className="form-control" />
                  ) : (
                    <p className="form-control-plaintext">{patientForm.height || '—'}</p>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Poids (kg)</label>
                  {editMode ? (
                    <input type="number" step="0.1" name="weight" value={patientForm.weight || ''} onChange={handlePatientChange} className="form-control" />
                  ) : (
                    <p className="form-control-plaintext">{patientForm.weight || '—'}</p>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Assurance (ID)</label>
                  {editMode ? (
                    <input type="number" name="insurance_company_id" value={patientForm.insurance_company_id || ''} onChange={handlePatientChange} className="form-control" placeholder="ID compagnie" />
                  ) : (
                    <p className="form-control-plaintext">{patientForm.insurance_company?.name || '—'}</p>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Numéro d'assurance</label>
                  {editMode ? (
                    <input name="insurance_number" value={patientForm.insurance_number || ''} onChange={handlePatientChange} className="form-control" />
                  ) : (
                    <p className="form-control-plaintext">{patientForm.insurance_number || '—'}</p>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Contact d'urgence (nom)</label>
                  {editMode ? (
                    <input name="emergency_contact_name" value={patientForm.emergency_contact_name || ''} onChange={handlePatientChange} className="form-control" />
                  ) : (
                    <p className="form-control-plaintext">{patientForm.emergency_contact_name || '—'}</p>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Contact d'urgence (tél)</label>
                  {editMode ? (
                    <input name="emergency_contact_phone" value={patientForm.emergency_contact_phone || ''} onChange={handlePatientChange} className="form-control" />
                  ) : (
                    <p className="form-control-plaintext">{patientForm.emergency_contact_phone || '—'}</p>
                  )}
                </div>
                <div className="col-12">
                  <label className="form-label fw-bold">Allergies</label>
                  {editMode ? (
                    <textarea name="allergies" value={patientForm.allergies || ''} onChange={handlePatientChange} className="form-control" rows={2} />
                  ) : (
                    <p className="form-control-plaintext">{patientForm.allergies || 'Aucune'}</p>
                  )}
                </div>
                <div className="col-12">
                  <label className="form-label fw-bold">Maladies chroniques</label>
                  {editMode ? (
                    <textarea name="chronic_diseases" value={patientForm.chronic_diseases || ''} onChange={handlePatientChange} className="form-control" rows={2} />
                  ) : (
                    <p className="form-control-plaintext">{patientForm.chronic_diseases || 'Aucune'}</p>
                  )}
                </div>
                <div className="col-12">
                  <label className="form-label fw-bold">Médicaments actuels</label>
                  {editMode ? (
                    <textarea name="current_medications" value={patientForm.current_medications || ''} onChange={handlePatientChange} className="form-control" rows={2} />
                  ) : (
                    <p className="form-control-plaintext">{patientForm.current_medications || 'Aucun'}</p>
                  )}
                </div>
                <div className="col-12">
                  <label className="form-label fw-bold">Antécédents familiaux</label>
                  {editMode ? (
                    <textarea name="family_history" value={patientForm.family_history || ''} onChange={handlePatientChange} className="form-control" rows={2} />
                  ) : (
                    <p className="form-control-plaintext">{patientForm.family_history || 'Aucun'}</p>
                  )}
                </div>
              </div>
            </>
          )}
          {/* ─── DOCUMENTS ────────────────────────────────────────── */}
          <>
            <hr className="my-5" />
            <h5 className="text-warning mb-4">📄 Mes Documents</h5>
            {user.documents && user.documents.length > 0 ? (
              <div className="row g-3 mb-4">
                {user.documents.map(doc => (
                  <div key={doc.id} className="col-md-6">
                    <div className="card h-100 shadow-sm border-0">
                      <div className="card-body d-flex flex-column">
                        <h6 className="fw-bold">{doc.title}</h6>
                        <p className="text-muted small mb-3">{doc.document_type_display}</p>
                        <div className="mt-auto d-flex align-items-center">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                            Voir le fichier
                          </a>
                          {doc.is_verified && <span className="badge bg-success ms-2">✓ Vérifié</span>}
                          {editMode && (
                            <button 
                              onClick={() => handleDeleteDocument(doc.id)} 
                              className="btn btn-sm btn-outline-danger ms-2"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">Aucun document pour le moment.</p>
            )}
          </>
        </div>
      </div>
      {/* ─── PROFILE FORM ─────────────────────────────────────── */}
      {editMode && (
        <form onSubmit={handleSubmit}>
          <button
            type="submit"
            className="btn btn-primary btn-lg w-100 mb-5"
            disabled={saving}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications du profil'}
          </button>
        </form>
      )}
      {/* ─── UPLOAD DOCUMENT (separate section) ───────────────── */}
      {editMode && (
        <div className="card shadow border-0">
          <div className="card-header bg-warning text-white">
            <h5 className="mb-0">📤 Ajouter un document</h5>
          </div>
          <div className="card-body p-5">
            <form onSubmit={handleDocumentUpload}>
              <div className="row g-3">
                <div className="col-md-6">
                  <input
                    type="text"
                    placeholder="Titre du document"
                    className="form-control"
                    value={newDocTitle}
                    onChange={e => setNewDocTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <select
                    className="form-select"
                    value={newDocType}
                    onChange={e => setNewDocType(e.target.value)}
                  >
                    <option value="diploma">Diplôme / Doctorat</option>
                    <option value="certificate">Certificat / Attestation</option>
                    <option value="lab_result">Résultat d'analyse</option>
                    <option value="prescription">Ordonnance</option>
                    <option value="medical_record">Dossier médical</option>
                    <option value="radio">Radiographie / Imagerie</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div className="col-12">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setNewDocFile(e.target.files[0])}
                    className="form-control"
                    required
                  />
                </div>
                <div className="col-12">
                  <button
                    type="submit"
                    className="btn btn-warning w-100"
                    disabled={uploadingDoc}
                  >
                    {uploadingDoc ? 'Upload en cours...' : 'Ajouter ce document'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}