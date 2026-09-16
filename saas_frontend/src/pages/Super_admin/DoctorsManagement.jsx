import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ── Modal réutilisable ─────────────────────────────────────────────────────
function Modal({ show, title, onClose, children, onSubmit, submitLabel, submitDisabled, submitVariant, size }) {
  if (!show) return null;
  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className={`modal-dialog modal-dialog-centered ${size || 'modal-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-content shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} />
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>{children}</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
              <button type="submit" className={`btn ${submitVariant || 'btn-primary'}`} disabled={submitDisabled}>
                {submitLabel || 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const getVisiblePages = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start + 1 < 5) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };
  return (
    <nav>
      <ul className="pagination justify-content-center mb-0">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>Précédent</button>
        </li>
        {getVisiblePages().map((p) => (
          <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(p)}>{p}</button>
          </li>
        ))}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Suivant</button>
        </li>
      </ul>
    </nav>
  );
}

// ── FormField helper ───────────────────────────────────────────────────────
function FormField({ label, required, error, children, helpText }) {
  return (
    <div className="mb-3">
      <label className="form-label fw-semibold">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <div className="invalid-feedback d-block">{Array.isArray(error) ? error[0] : error}</div>}
      {helpText && <div className="form-text">{helpText}</div>}
    </div>
  );
}

// ── String List Editor (pour education / certifications) ───────────────────
function StringListEditor({ label, items, onChange, placeholder }) {
  const addItem = () => onChange([...items, '']);
  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx, val) => {
    const updated = [...items];
    updated[idx] = val;
    onChange(updated);
  };

  return (
    <div className="mb-3">
      <label className="form-label fw-semibold">{label}</label>
      {items.map((item, idx) => (
        <div key={idx} className="d-flex gap-2 mb-1">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder={placeholder || `Élément ${idx + 1}`}
            value={item}
            onChange={(e) => updateItem(idx, e.target.value)}
          />
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeItem(idx)}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addItem}>
        <i className="bi bi-plus me-1"></i> Ajouter
      </button>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export default function DoctorsManagement() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterAccepts, setFilterAccepts] = useState('');
  const [filterTele, setFilterTele] = useState('');
  const [ordering, setOrdering] = useState('user__last_name');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  const [specialties, setSpecialties] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [cabinets, setCabinets] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const emptyForm = {
    user: '', specialty: '', cabinets: [],
    license_number: '', years_experience: '', cnam_code: '',
    consultation_price: '', bio: '',
    education: [], certifications: [],
    accepts_new_patients: true, teleconsultation_available: false,
    profile_photo: null,
  };
  const [form, setForm] = useState({ ...emptyForm });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => { setCurrentPage(1); }, [search, filterSpecialty, filterAccepts, filterTele, ordering]);

  const fetchDropdowns = useCallback(async () => {
    try {
      const specRes = await api.get('/cabinets/specialties/');
      setSpecialties(Array.isArray(specRes.data) ? specRes.data : []);
    } catch (err) {
      console.error('[Doctors] Erreur chargement spécialités:', err);
      setSpecialties([]);
    }

    try {
      const usersRes = await api.get('/cabinets/doctors-management/available-users/');
      setAvailableUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (err) {
      console.error('[Doctors] Erreur chargement utilisateurs disponibles:', err);
      setAvailableUsers([]);
    }

    try {
      const cabRes = await api.get('/cabinets/', { params: { page_size: 500, is_deleted: 'false' } });
      const cabData = cabRes.data;
      setCabinets(Array.isArray(cabData) ? cabData : cabData.results || []);
    } catch (err) {
      console.error('[Doctors] Erreur chargement cabinets:', err);
      setCabinets([]);
    }
  }, []);

  useEffect(() => { fetchDropdowns(); }, [fetchDropdowns]);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (filterSpecialty) params.specialty = filterSpecialty;
      if (filterAccepts) params.accepts_new_patients = filterAccepts;
      if (filterTele) params.teleconsultation_available = filterTele;
      if (ordering) params.ordering = ordering;

      const { data } = await api.get('/cabinets/doctors-management/', { params });
      if (data.results) {
        setDoctors(data.results);
        setTotalCount(data.count);
        setTotalPages(Math.ceil(data.count / pageSize));
      } else {
        setDoctors(data);
        setTotalCount(data.length);
        setTotalPages(1);
      }
    } catch (err) {
      setMessage("Erreur lors du chargement des médecins.");
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  }, [search, filterSpecialty, filterAccepts, filterTele, ordering, currentPage, pageSize]);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreateModal = () => {
    setEditingDoctor(null);
    setForm({ ...emptyForm });
    setFormErrors({});
    api.get('/cabinets/doctors-management/available-users/').then(r => {
      setAvailableUsers(Array.isArray(r.data) ? r.data : []);
    }).catch(err => console.error(err));
    setShowModal(true);
  };

  const openEditModal = async (doc) => {
    try {
      const { data } = await api.get(`/cabinets/doctors-management/${doc.id}/`);
      setEditingDoctor(data);
      setForm({
        user: data.user || '',
        specialty: data.specialty || '',
        cabinets: (data.cabinets_list || []).map(c => c.id),
        license_number: data.license_number || '',
        years_experience: data.years_experience ?? '',
        cnam_code: data.cnam_code || '',
        consultation_price: data.consultation_price ?? '',
        bio: data.bio || '',
        education: Array.isArray(data.education) ? [...data.education] : [],
        certifications: Array.isArray(data.certifications) ? [...data.certifications] : [],
        accepts_new_patients: data.accepts_new_patients ?? true,
        teleconsultation_available: data.teleconsultation_available ?? false,
        profile_photo: null,
      });
      setFormErrors({});
      setShowModal(true);
    } catch (err) {
      setMessage("Erreur lors du chargement du médecin.");
      setMessageType('danger');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    const formData = new FormData();
    
    // ✅ FIX : N'envoyer 'user' que lors de la création
    if (!editingDoctor) {
      formData.append('user', form.user);
    }
    
    formData.append('specialty', form.specialty);
    formData.append('license_number', form.license_number.trim());
    if (form.years_experience !== '') formData.append('years_experience', form.years_experience);
    if (form.cnam_code) formData.append('cnam_code', form.cnam_code.trim());
    if (form.consultation_price !== '') formData.append('consultation_price', form.consultation_price);
    if (form.bio) formData.append('bio', form.bio.trim());
    formData.append('accepts_new_patients', form.accepts_new_patients);
    formData.append('teleconsultation_available', form.teleconsultation_available);

    const validEducation = (form.education || []).filter(s => s && s.trim());
    const validCertifications = (form.certifications || []).filter(s => s && s.trim());
    formData.append('education', JSON.stringify(validEducation));
    formData.append('certifications', JSON.stringify(validCertifications));

    form.cabinets.forEach(id => formData.append('cabinets', id));

    if (form.profile_photo) formData.append('profile_photo', form.profile_photo);

    try {
      if (editingDoctor) {
        await api.patch(`/cabinets/doctors-management/${editingDoctor.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage(`Médecin modifié avec succès.`);
      } else {
        await api.post('/cabinets/doctors-management/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage(`Médecin créé avec succès.`);
      }
      setMessageType('success');
      setShowModal(false);
      fetchDoctors();
      fetchDropdowns(); 
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object' && errors !== null) {
        setFormErrors(errors);
        setMessage(errors.detail || errors.user?.[0] || 'Vérifiez les champs en erreur.');
      } else {
        setMessage("Erreur lors de l'enregistrement.");
      }
      setMessageType('danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Supprimer le profil de Dr. ${doc.full_name} ?`)) return;
    try {
      await api.delete(`/cabinets/doctors-management/${doc.id}/`);
      setMessage(`Profil de Dr. ${doc.full_name} supprimé.`);
      setMessageType('success');
      fetchDoctors();
      fetchDropdowns();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Erreur lors de la suppression.");
      setMessageType('danger');
    }
  };

  const handleToggle = async (doc, action) => {
    try {
      const endpoint = action === 'patients' ? 'toggle_patients' : 'toggle_tele';
      await api.post(`/cabinets/doctors-management/${doc.id}/${endpoint}/`);
      fetchDoctors();
    } catch (err) {
      setMessage("Erreur lors du changement d'état.");
      setMessageType('danger');
    }
  };

  const handleOrderToggle = (field) => setOrdering((prev) => (prev === field ? `-${field}` : field));
  const SortIcon = ({ field }) => ordering === field ? ' ▲' : ordering === `-${field}` ? ' ▼' : ' ↕';

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">
            <i className="bi bi-person-badge me-2 text-primary"></i>
            Gestion des Médecins
          </h2>
          <p className="text-muted mb-0">{totalCount} médecin{totalCount > 1 ? 's' : ''} au total</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <i className="bi bi-plus-lg me-1"></i> Ajouter un médecin
        </button>
      </div>

      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-3">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                <input type="text" className="form-control" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && <button className="btn btn-outline-secondary" onClick={() => setSearch('')}><i className="bi bi-x-lg"></i></button>}
              </div>
            </div>
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={filterSpecialty} onChange={(e) => setFilterSpecialty(e.target.value)}>
                <option value="">Toutes spécialités</option>
                {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={filterAccepts} onChange={(e) => setFilterAccepts(e.target.value)}>
                <option value="">Patients</option>
                <option value="true">Accepte patients</option>
                <option value="false">N'accepte pas</option>
              </select>
            </div>
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={filterTele} onChange={(e) => setFilterTele(e.target.value)}>
                <option value="">Téléconsultation</option>
                <option value="true">Disponible</option>
                <option value="false">Non disponible</option>
              </select>
            </div>
            <div className="col-md-3 text-end">
              <div className="btn-group btn-group-sm">
                <button className={`btn btn-sm ${ordering.includes('user__last_name') ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => handleOrderToggle('user__last_name')}>Nom<SortIcon field="user__last_name" /></button>
                <button className={`btn btn-sm ${ordering.includes('specialty__name') ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => handleOrderToggle('specialty__name')}>Spécialité<SortIcon field="specialty__name" /></button>
                <button className={`btn btn-sm ${ordering.includes('rating') ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => handleOrderToggle('rating')}>Note<SortIcon field="rating" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <p className="mt-2 text-muted">Chargement...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-person-badge display-1 text-muted"></i>
              <p className="mt-2 text-muted">{search ? `Aucun médecin trouvé pour "${search}"` : 'Aucun médecin enregistré.'}</p>
              {!search && <button className="btn btn-primary mt-2" onClick={openCreateModal}>Créer le premier médecin</button>}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3" style={{ width: '50px' }}>#</th>
                      <th>Médecin</th>
                      <th>Spécialité</th>
                      <th>Licence</th>
                      <th className="text-center">Exp.</th>
                      <th className="text-center">Prix</th>
                      <th className="text-center">Patients</th>
                      <th className="text-center">Télé.</th>
                      <th className="text-center">Note</th>
                      <th style={{ width: '200px' }} className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doc, idx) => (
                      <tr key={doc.id}>
                        <td className="ps-3 text-muted">{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {doc.profile_photo_url ? (
                              <img src={doc.profile_photo_url} alt="" className="rounded-circle" style={{ width: 36, height: 36, objectFit: 'cover' }} />
                            ) : (
                              <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                                <i className="bi bi-person-fill text-primary"></i>
                              </div>
                            )}
                            <div>
                              <div className="fw-semibold">{doc.full_name}</div>
                              <small className="text-muted">{doc.email}</small>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge bg-info text-dark">{doc.specialty_name}</span></td>
                        <td><code>{doc.license_number}</code></td>
                        <td className="text-center">{doc.years_experience || 0} ans</td>
                        <td className="text-center">{doc.consultation_price > 0 ? `${doc.consultation_price} TND` : '—'}</td>
                        <td className="text-center">
                          <span className={`badge ${doc.accepts_new_patients ? 'bg-success' : 'bg-secondary'}`}>{doc.accepts_new_patients ? 'Oui' : 'Non'}</span>
                        </td>
                        <td className="text-center">
                          <span className={`badge ${doc.teleconsultation_available ? 'bg-primary' : 'bg-light text-dark'}`}>{doc.teleconsultation_available ? 'Oui' : 'Non'}</span>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-warning text-dark"><i className="bi bi-star-fill me-1"></i>{doc.rating || '0'}</span>
                        </td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => openEditModal(doc)} title="Modifier"><i className="bi bi-pencil"></i></button>
                            <button className={`btn btn-sm ${doc.accepts_new_patients ? 'btn-outline-success' : 'btn-outline-warning'}`} onClick={() => handleToggle(doc, 'patients')} title="Toggle patients"><i className="bi bi-people-fill"></i></button>
                            <button className={`btn btn-sm ${doc.teleconsultation_available ? 'btn-outline-info' : 'btn-outline-secondary'}`} onClick={() => handleToggle(doc, 'tele')} title="Toggle téléconsultation"><i className="bi bi-camera-video"></i></button>
                            <button className="btn btn-outline-danger" onClick={() => handleDelete(doc)} title="Supprimer"><i className="bi bi-trash"></i></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="card-footer bg-white border-top">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                    <small className="text-muted">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} sur {totalCount}</small>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        show={showModal}
        title={editingDoctor ? 'Modifier le médecin' : 'Nouveau Médecin'}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        submitLabel={submitting ? 'Enregistrement...' : (editingDoctor ? 'Mettre à jour' : 'Créer le médecin')}
        submitDisabled={submitting}
        submitVariant={editingDoctor ? 'btn-warning' : 'btn-success'}
        size="modal-xl"
      >
        <h6 className="text-primary border-bottom pb-2 mb-3"><i className="bi bi-person-fill me-1"></i> Informations principales</h6>
        <div className="row g-3">
          <div className="col-md-6">
            <FormField label="Utilisateur (médecin)" required error={formErrors.user} helpText={editingDoctor ? "L'utilisateur ne peut pas être modifié." : "Utilisateurs rôle=doctor sans profil"}>
              {/* ✅ FIX: Afficher un input texte désactivé si on modifie, sinon le select */}
              {editingDoctor ? (
                <input 
                  type="text" 
                  className="form-control bg-light" 
                  value={editingDoctor.user_detail ? `${editingDoctor.user_detail.full_name} (${editingDoctor.user_detail.email})` : 'N/A'} 
                  disabled 
                />
              ) : (
                <select className={`form-select ${formErrors.user ? 'is-invalid' : ''}`} value={form.user} onChange={(e) => updateForm('user', e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email}) {!u.is_active ? '⚠️ Inactif' : ''}</option>
                  ))}
                </select>
              )}
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Spécialité" required error={formErrors.specialty}>
              <select className={`form-select ${formErrors.specialty ? 'is-invalid' : ''}`} value={form.specialty} onChange={(e) => updateForm('specialty', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {specialties.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="Numéro de licence" required error={formErrors.license_number} helpText="Unique — identifiant professionnel">
              <input type="text" className={`form-control ${formErrors.license_number ? 'is-invalid' : ''}`} value={form.license_number} onChange={(e) => updateForm('license_number', e.target.value)} placeholder="Ex: MED-2024-001" />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="Années d'expérience" error={formErrors.years_experience}>
              <input type="number" min="0" max="70" className={`form-control ${formErrors.years_experience ? 'is-invalid' : ''}`} value={form.years_experience} onChange={(e) => updateForm('years_experience', e.target.value)} placeholder="0" />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="Code CNAM" error={formErrors.cnam_code}>
              <input type="text" className={`form-control ${formErrors.cnam_code ? 'is-invalid' : ''}`} value={form.cnam_code} onChange={(e) => updateForm('cnam_code', e.target.value)} />
            </FormField>
          </div>
        </div>

        <h6 className="text-info border-bottom pb-2 mt-4 mb-3"><i className="bi bi-cash-stack me-1"></i> Tarification & Bio</h6>
        <div className="row g-3">
          <div className="col-md-4">
            <FormField label="Prix consultation (TND)" error={formErrors.consultation_price}>
              <input type="number" step="0.001" min="0" className={`form-control ${formErrors.consultation_price ? 'is-invalid' : ''}`} value={form.consultation_price} onChange={(e) => updateForm('consultation_price', e.target.value)} placeholder="0.000" />
            </FormField>
          </div>
          <div className="col-md-4">
            <div className="form-check form-switch mt-4">
              <input className="form-check-input" type="checkbox" id="accepts_new_patients" checked={form.accepts_new_patients} onChange={(e) => updateForm('accepts_new_patients', e.target.checked)} />
              <label className="form-check-label fw-semibold" htmlFor="accepts_new_patients">Accepte nouveaux patients</label>
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-check form-switch mt-4">
              <input className="form-check-input" type="checkbox" id="teleconsultation" checked={form.teleconsultation_available} onChange={(e) => updateForm('teleconsultation_available', e.target.checked)} />
              <label className="form-check-label fw-semibold" htmlFor="teleconsultation">Téléconsultation</label>
            </div>
          </div>
          <div className="col-md-12">
            <FormField label="Biographie" error={formErrors.bio}>
              <textarea className={`form-control ${formErrors.bio ? 'is-invalid' : ''}`} value={form.bio} onChange={(e) => updateForm('bio', e.target.value)} rows="3" placeholder="Biographie du médecin..." />
            </FormField>
          </div>
        </div>

        <h6 className="text-success border-bottom pb-2 mt-4 mb-3"><i className="bi bi-mortarboard me-1"></i> Formation & Certifications</h6>
        <div className="row g-3">
          <div className="col-md-6">
            <StringListEditor label="Formation / Éducation" items={form.education || []} onChange={(items) => updateForm('education', items)} placeholder="Ex: Doctorat en Médecine - Faculté de Tunis" />
          </div>
          <div className="col-md-6">
            <StringListEditor label="Certifications" items={form.certifications || []} onChange={(items) => updateForm('certifications', items)} placeholder="Ex: Board Certified Cardiology" />
          </div>
        </div>

        <h6 className="text-warning border-bottom pb-2 mt-4 mb-3"><i className="bi bi-hospital me-1"></i> Cabinets rattachés</h6>
        <div className="row g-3">
          <div className="col-md-12">
            <FormField label="Cabinets" error={formErrors.cabinets} helpText="Ctrl+clic pour sélectionner plusieurs">
              <select multiple className={`form-control ${formErrors.cabinets ? 'is-invalid' : ''}`} style={{ height: '100px' }} value={form.cabinets} onChange={(e) => updateForm('cabinets', Array.from(e.target.selectedOptions, o => o.value))}>
                {cabinets.map(c => <option key={c.id} value={c.id}>{c.name} — {c.city_name || ''}</option>)}
              </select>
            </FormField>
          </div>
        </div>

        <h6 className="text-danger border-bottom pb-2 mt-4 mb-3"><i className="bi bi-camera me-1"></i> Photo de profil</h6>
        <div className="row g-3">
          <div className="col-md-6">
            <FormField label="Photo du médecin" error={formErrors.profile_photo}>
              <input type="file" accept="image/png,image/jpeg,image/jpg" className={`form-control ${formErrors.profile_photo ? 'is-invalid' : ''}`} onChange={(e) => updateForm('profile_photo', e.target.files[0] || null)} />
              <div className="form-text">JPG, PNG. {form.profile_photo && <span className="text-success">Fichier sélectionné</span>}</div>
            </FormField>
          </div>
        </div>

        {formErrors.detail && <div className="alert alert-danger mt-3">{formErrors.detail}</div>}
        {formErrors.non_field_errors && (
          <div className="alert alert-danger mt-3">{Array.isArray(formErrors.non_field_errors) ? formErrors.non_field_errors.join(' | ') : formErrors.non_field_errors}</div>
        )}
      </Modal>
    </div>
  );
}