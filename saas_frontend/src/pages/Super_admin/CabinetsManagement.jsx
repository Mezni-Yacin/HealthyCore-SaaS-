import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ── Jours de la semaine ──────────────────────────────────────────────────
const DAYS = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
];

const emptyOpeningHours = () => {
  const hours = {};
  DAYS.forEach(d => { hours[d.key] = []; });
  return hours;
};

// ── Composant OpeningHoursEditor ────────────────────────────────────────
function OpeningHoursEditor({ value, onChange, error }) {
  const toggleDay = (dayKey) => {
    const updated = { ...value };
    if (updated[dayKey] && updated[dayKey].length > 0) {
      updated[dayKey] = []; 
    } else {
      updated[dayKey] = ['08:00-12:00']; 
    }
    onChange(updated);
  };

  const addSlot = (dayKey) => {
    const updated = { ...value };
    const slots = [...(updated[dayKey] || [])];
    const lastSlot = slots.length > 0 ? slots[slots.length - 1] : null;
    let defaultStart = '08:00';
    if (lastSlot === '08:00-12:00') defaultStart = '14:00';
    else if (lastSlot === '14:00-18:00') defaultStart = '08:00';
    else if (lastSlot) defaultStart = lastSlot.split('-')[1];
    
    slots.push(`${defaultStart}-17:00`);
    updated[dayKey] = slots;
    onChange(updated);
  };

  const removeSlot = (dayKey, index) => {
    const updated = { ...value };
    const slots = [...(updated[dayKey] || [])];
    slots.splice(index, 1);
    updated[dayKey] = slots;
    onChange(updated);
  };

  const updateSlot = (dayKey, index, field, timeValue) => {
    const updated = { ...value };
    const slots = [...(updated[dayKey] || [])];
    const oldSlot = slots[index];
    const parts = oldSlot.split('-');
    if (field === 'start') parts[0] = timeValue;
    else parts[1] = timeValue;
    slots[index] = `${parts[0]}-${parts[1]}`;
    updated[dayKey] = slots;
    onChange(updated);
  };

  const copyToAll = (sourceDayKey) => {
    const sourceSlots = value[sourceDayKey] || [];
    if (sourceSlots.length === 0) return;
    const updated = { ...value };
    DAYS.forEach(d => {
      if (d.key !== sourceDayKey) {
        updated[d.key] = [...sourceSlots];
      }
    });
    onChange(updated);
  };

  return (
    <div className={error ? 'is-invalid' : ''}>
      <div className="d-flex justify-content-end mb-2">
        <div className="dropdown">
          <button className="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
            <i className="bi bi-copy me-1"></i> Copier les horaires d'un jour
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            {DAYS.map(d => (
              <li key={d.key}>
                <button className="dropdown-item" type="button" onClick={() => copyToAll(d.key)}>
                  {d.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="row g-2">
        {DAYS.map(d => {
          const slots = value[d.key] || [];
          const isOpen = slots.length > 0;
          return (
            <div key={d.key} className="col-12">
              <div className="card border">
                <div className="card-body py-2 px-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="form-check form-switch mb-0">
                      <input className="form-check-input" type="checkbox" id={`day-${d.key}`} checked={isOpen} onChange={() => toggleDay(d.key)} />
                      <label className="form-check-label fw-semibold" htmlFor={`day-${d.key}`}>{d.label}</label>
                    </div>
                    {isOpen && (
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => addSlot(d.key)}>
                        <i className="bi bi-plus me-1"></i> Créneau
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="mt-2">
                      {slots.map((slot, idx) => {
                        const [start, end] = slot.split('-');
                        return (
                          <div key={idx} className="d-flex align-items-center gap-2 mb-1">
                            <input type="time" className="form-control form-control-sm" style={{ maxWidth: '120px' }} value={start} onChange={(e) => updateSlot(d.key, idx, 'start', e.target.value)} />
                            <span className="text-muted fw-bold">—</span>
                            <input type="time" className="form-control form-control-sm" style={{ maxWidth: '120px' }} value={end} onChange={(e) => updateSlot(d.key, idx, 'end', e.target.value)} />
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeSlot(d.key, idx)} title="Supprimer"><i className="bi bi-x-lg"></i></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!isOpen && <small className="text-muted">Fermé</small>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {error && <div className="invalid-feedback d-block mt-1">{Array.isArray(error) ? error[0] : error}</div>}
    </div>
  );
}

// ── Modal réutilisable ────────────────────────────────────────────────────
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

// ── Pagination ────────────────────────────────────────────────────────────
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

// ── FormField helper ──────────────────────────────────────────────────────
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

// ── Composant principal ────────────────────────────────────────────────────
export default function CabinetsManagement() {
  const [cabinets, setCabinets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterCnam, setFilterCnam] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  // Dropdowns
  const [doctors, setDoctors] = useState([]);
  const [secretaries, setSecretaries] = useState([]);
  const [cities, setCities] = useState([]);
  const [governorates, setGovernorates] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [selectedGovernorate, setSelectedGovernorate] = useState(''); // ✅ Fix: Gérer le gouvernorat séparément

  // Modal & Form
  const [showModal, setShowModal] = useState(false);
  const [editingCabinet, setEditingCabinet] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [form, setForm] = useState({
    name: '', owner: '', address: '', city: '',
    phone_number: '', email: '', website: '',
    latitude: '', longitude: '',
    cnam_affiliated: false, cnam_code: '', accreditation: '',
    appointment_duration: 30, timezone: 'Africa/Tunis',
    is_active: true,
    opening_hours: emptyOpeningHours(),
    secretaries: [], specialties: [],
    logo: null, banner: null,
  });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => { setCurrentPage(1); }, [search, filterOwner, filterCnam, filterActive, ordering]);

  // Fetch dropdowns (Médecins, Secrétaires, Spécialités, Gouvernorats)
  const fetchDropdowns = useCallback(async () => {
    try {
      const [docRes, secRes, specRes, govRes] = await Promise.all([
        api.get('/cabinets/doctors/'),
        api.get('/cabinets/secretaries_list/'),
        api.get('/cabinets/specialties/'),
        api.get('/users/governorates/', { params: { ordering: 'name', page_size: 1000 } }),
      ]);
      setDoctors(docRes.data);
      setSecretaries(secRes.data);
      setSpecialties(specRes.data);
      setGovernorates(Array.isArray(govRes.data) ? govRes.data : govRes.data.results || []);
    } catch (err) {
      console.error('[Cabinets] Erreur dropdowns:', err);
    }
  }, []);

  // Fetch cities based on governorate
  const fetchCitiesForGovernorate = useCallback(async (govId) => {
    if (!govId) { 
      setCities([]); 
      return; 
    }
    try {
      const { data } = await api.get('/users/cities/', {
        params: { governorate: govId, ordering: 'name', page_size: 200 }
      });
      setCities(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('[Cabinets] Erreur fetch cities:', err);
    }
  }, []);

  useEffect(() => { fetchDropdowns(); }, [fetchDropdowns]);

  // Fetch cabinets
  const fetchCabinets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (filterOwner) params.owner = filterOwner;
      if (filterCnam) params.cnam_affiliated = filterCnam;
      if (filterActive) params.is_active = filterActive;
      if (ordering) params.ordering = ordering;

      const { data } = await api.get('/cabinets/', { params });
      if (data.results) {
        setCabinets(data.results);
        setTotalCount(data.count);
        setTotalPages(Math.ceil(data.count / pageSize));
      } else {
        setCabinets(data);
        setTotalCount(data.length);
        setTotalPages(1);
      }
    } catch (err) {
      setMessage("Erreur lors du chargement des cabinets.");
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  }, [search, filterOwner, filterCnam, filterActive, ordering, currentPage, pageSize]);

  useEffect(() => { fetchCabinets(); }, [fetchCabinets]);

  const resetForm = () => {
    setForm({
      name: '', owner: '', address: '', city: '',
      phone_number: '', email: '', website: '',
      latitude: '', longitude: '',
      cnam_affiliated: false, cnam_code: '', accreditation: '',
      appointment_duration: 30, timezone: 'Africa/Tunis',
      is_active: true,
      opening_hours: emptyOpeningHours(),
      secretaries: [], specialties: [],
      logo: null, banner: null,
    });
    setFormErrors({});
    setSelectedGovernorate(''); // ✅ Reset governorate
    setCities([]); // ✅ Reset cities
  };

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setFormFromCabinet = (cab) => {
    let hours = emptyOpeningHours();
    if (cab.opening_hours && typeof cab.opening_hours === 'object') {
      hours = { ...emptyOpeningHours(), ...cab.opening_hours };
    }

    setForm({
      name: cab.name || '',
      owner: cab.owner || '',
      address: cab.address || '',
      city: cab.city || '',
      phone_number: cab.phone_number || '',
      email: cab.email || '',
      website: cab.website || '',
      latitude: cab.latitude ?? '',
      longitude: cab.longitude ?? '',
      cnam_affiliated: cab.cnam_affiliated || false,
      cnam_code: cab.cnam_code || '',
      accreditation: cab.accreditation || '',
      appointment_duration: cab.appointment_duration || 30,
      timezone: cab.timezone || 'Africa/Tunis',
      is_active: cab.is_active ?? true,
      opening_hours: hours,
      secretaries: (cab.secretaries_list || []).map((s) => s.id),
      specialties: (cab.specialties_detail || []).map((s) => s.id),
      logo: null,
      banner: null,
    });
    setFormErrors({});
  };

  const openCreateModal = () => {
    setEditingCabinet(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = async (cab) => {
    try {
      const { data } = await api.get(`/cabinets/${cab.id}/`);
      setEditingCabinet(data);
      setFormFromCabinet(data);

      // ✅ Fix: Charger correctement le gouvernorat et les villes
      if (data.city_detail && data.city_detail.governorate_id) {
        setSelectedGovernorate(data.city_detail.governorate_id);
        await fetchCitiesForGovernorate(data.city_detail.governorate_id);
      } else {
        setSelectedGovernorate('');
        setCities([]);
      }
      setShowModal(true);
    } catch (err) {
      setMessage("Erreur lors du chargement du cabinet.");
      setMessageType('danger');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    const formData = new FormData();
    formData.append('name', form.name.trim());
    formData.append('owner', form.owner);
    formData.append('address', form.address.trim());
    formData.append('city', form.city);
    formData.append('phone_number', form.phone_number);
    formData.append('email', form.email.trim());
    if (form.website) formData.append('website', form.website.trim());
    if (form.latitude) formData.append('latitude', form.latitude);
    if (form.longitude) formData.append('longitude', form.longitude);
    formData.append('cnam_affiliated', form.cnam_affiliated);
    if (form.cnam_code) formData.append('cnam_code', form.cnam_code.trim());
    if (form.accreditation) formData.append('accreditation', form.accreditation.trim());
    formData.append('appointment_duration', form.appointment_duration);
    formData.append('timezone', form.timezone);
    formData.append('is_active', form.is_active);

    // Horaires d'ouverture
    const hoursPayload = {};
    for (const dayKey of Object.keys(form.opening_hours)) {
      const slots = form.opening_hours[dayKey];
      if (Array.isArray(slots) && slots.length > 0) {
        const validSlots = slots.filter(s => typeof s === 'string' && s.includes('-') && s.split('-')[0].trim() && s.split('-')[1].trim());
        if (validSlots.length > 0) hoursPayload[dayKey] = validSlots;
      }
    }
    formData.append('opening_hours', JSON.stringify(hoursPayload)); // ✅ Envoie toujours un objet JSON valide

    // M2M
    form.secretaries.forEach((id) => formData.append('secretaries', id));
    form.specialties.forEach((id) => formData.append('specialties', id));

    // Fichiers
    if (form.logo) formData.append('logo', form.logo);
    if (form.banner) formData.append('banner', form.banner);

    try {
      if (editingCabinet) {
        await api.patch(`/cabinets/${editingCabinet.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage(`Cabinet "${form.name}" modifié avec succès.`);
      } else {
        await api.post('/cabinets/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage(`Cabinet "${form.name}" créé avec succès.`);
      }
      setMessageType('success');
      setShowModal(false);
      fetchCabinets();
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object' && errors !== null) {
        setFormErrors(errors);
        setMessage(errors.detail || 'Vérifiez les champs en erreur.');
      } else {
        setMessage("Erreur lors de l'enregistrement.");
      }
      setMessageType('danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cab) => {
    if (!window.confirm(`Supprimer le cabinet "${cab.name}" ? Le cabinet sera désactivé.`)) return;
    try {
      await api.delete(`/cabinets/${cab.id}/`);
      setMessage(`Cabinet "${cab.name}" supprimé.`);
      setMessageType('success');
      fetchCabinets();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Erreur lors de la suppression.");
      setMessageType('danger');
    }
  };

  const handleToggleActive = async (cab) => {
    const action = cab.is_active ? 'deactivate' : 'activate';
    try {
      await api.post(`/cabinets/${cab.id}/${action}/`);
      setMessage(`Cabinet "${cab.name}" ${cab.is_active ? 'désactivé' : 'activé'}.`);
      setMessageType('success');
      fetchCabinets();
    } catch (err) {
      setMessage("Erreur lors du changement d'état.");
      setMessageType('danger');
    }
  };

  const handleOrderToggle = (field) => setOrdering((prev) => (prev === field ? `-${field}` : field));
  const SortIcon = ({ field }) => ordering === field ? ' ▲' : ordering === `-${field}` ? ' ▼' : ' ↕';
  const getOrderLabel = () => ({
    '-created_at': 'Plus récents', 'created_at': 'Plus anciens',
    'name': 'Nom A-Z', '-name': 'Nom Z-A',
    'city__name': 'Ville A-Z', '-city__name': 'Ville Z-A',
    'owner__last_name': 'Médecin A-Z', '-owner__last_name': 'Médecin Z-A',
  })[ordering] || 'Plus récents';

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Gestion des Cabinets Médicaux</h2>
          <p className="text-muted mb-0">{totalCount} cabinet{totalCount > 1 ? 's' : ''} au total</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <i className="bi bi-plus-lg me-1"></i> Ajouter un cabinet
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
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                <input type="text" className="form-control" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && <button className="btn btn-outline-secondary" onClick={() => setSearch('')}><i className="bi bi-x-lg"></i></button>}
              </div>
            </div>
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
                <option value="">Tous les médecins</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={filterCnam} onChange={(e) => setFilterCnam(e.target.value)}>
                <option value="">CNAM</option>
                <option value="true">CNAM oui</option>
                <option value="false">CNAM non</option>
              </select>
            </div>
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
                <option value="">Tous états</option>
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </div>
            <div className="col-md-2 text-end">
              <small className="text-muted">{getOrderLabel()}</small>
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
          ) : cabinets.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-hospital display-1 text-muted"></i>
              <p className="mt-2 text-muted">Aucun cabinet trouvé.</p>
              <button className="btn btn-primary mt-2" onClick={openCreateModal}>Créer le premier cabinet</button>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3" style={{ width: '50px' }}>#</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleOrderToggle('name')}>Nom <SortIcon field="name" /></th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleOrderToggle('owner__last_name')}>Médecin <SortIcon field="owner__last_name" /></th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleOrderToggle('city__name')}>Ville <SortIcon field="city__name" /></th>
                      <th>Téléphone</th>
                      <th>Spécialités</th>
                      <th>CNAM</th>
                      <th>État</th>
                      <th style={{ width: '220px' }} className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cabinets.map((cab, idx) => (
                      <tr key={cab.id}>
                        <td className="ps-3 text-muted">{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {cab.logo_url ? (
                              <img src={cab.logo_url} alt="" className="rounded" style={{ width: 32, height: 32, objectFit: 'cover' }} />
                            ) : (
                              <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                                <i className="bi bi-hospital text-muted"></i>
                              </div>
                            )}
                            <div>
                              <div className="fw-semibold">{cab.name}</div>
                              <small className="text-muted">{cab.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>{cab.owner_name || '—'}</td>
                        <td>{cab.city_name || '—'}</td>
                        <td>{cab.phone_number || '—'}</td>
                        <td>
                          {cab.specialties_names?.length > 0
                            ? cab.specialties_names.slice(0, 2).map((s) => <span key={s} className="badge bg-info text-dark me-1">{s}</span>)
                            : <span className="text-muted">—</span>
                          }
                          {cab.specialties_names?.length > 2 && <span className="badge bg-secondary">+{cab.specialties_names.length - 2}</span>}
                        </td>
                        <td>{cab.cnam_affiliated ? <span className="badge bg-success">Oui</span> : <span className="badge bg-light text-dark">Non</span>}</td>
                        <td>
                          <span className={`badge ${cab.is_active ? 'bg-success' : 'bg-secondary'}`}>
                            {cab.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => openEditModal(cab)} title="Modifier">
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className={`btn ${cab.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`} onClick={() => handleToggleActive(cab)} title={cab.is_active ? 'Désactiver' : 'Activer'}>
                              <i className={`bi ${cab.is_active ? 'bi-pause-circle' : 'bi-play-circle'}`}></i>
                            </button>
                            <button className="btn btn-outline-danger" onClick={() => handleDelete(cab)} title="Supprimer">
                              <i className="bi bi-trash"></i>
                            </button>
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

      {/* ==================== MODAL CRÉER / MODIFIER ==================== */}
      <Modal
        show={showModal}
        title={editingCabinet ? `Modifier : ${editingCabinet.name}` : 'Nouveau Cabinet Médical'}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        submitLabel={submitting ? 'Enregistrement...' : (editingCabinet ? 'Mettre à jour' : 'Créer le cabinet')}
        submitDisabled={submitting}
        submitVariant={editingCabinet ? 'btn-warning' : 'btn-success'}
        size="modal-xl"
      >
        <h6 className="text-primary border-bottom pb-2 mb-3"><i className="bi bi-info-circle me-1"></i> Informations générales</h6>
        <div className="row g-3">
          <div className="col-md-6">
            <FormField label="Nom du cabinet" required error={formErrors.name}>
              <input type="text" className={`form-control ${formErrors.name ? 'is-invalid' : ''}`} value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Ex: Clinique El Manar" />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Médecin propriétaire" required error={formErrors.owner}>
              <select className={`form-select ${formErrors.owner ? 'is-invalid' : ''}`} value={form.owner} onChange={(e) => updateForm('owner', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name} ({d.email})</option>)}
              </select>
            </FormField>
          </div>
          <div className="col-md-12">
            <FormField label="Adresse" required error={formErrors.address}>
              <textarea className={`form-control ${formErrors.address ? 'is-invalid' : ''}`} value={form.address} onChange={(e) => updateForm('address', e.target.value)} rows="2" placeholder="Adresse complète" />
            </FormField>
          </div>
          
          {/* ✅ Fix: Gouvernorat et Ville toujours visibles et bien liés */}
          <div className="col-md-6">
            <FormField label="Gouvernorat" required>
              <select 
                className="form-select" 
                value={selectedGovernorate} 
                onChange={(e) => {
                  setSelectedGovernorate(e.target.value);
                  fetchCitiesForGovernorate(e.target.value);
                  updateForm('city', ''); // Reset ville quand on change de gouvernorat
                }}
              >
                <option value="">— Sélectionner —</option>
                {governorates.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Ville" required error={formErrors.city}>
              <select 
                className={`form-select ${formErrors.city ? 'is-invalid' : ''}`} 
                value={form.city} 
                onChange={(e) => updateForm('city', e.target.value)}
                disabled={!selectedGovernorate}
              >
                <option value="">— Sélectionner —</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {!selectedGovernorate && <div className="form-text">Sélectionnez d'abord un gouvernorat</div>}
            </FormField>
          </div>

          <div className="col-md-4">
            <FormField label="Téléphone" required error={formErrors.phone_number}>
              <input type="tel" className={`form-control ${formErrors.phone_number ? 'is-invalid' : ''}`} value={form.phone_number} onChange={(e) => updateForm('phone_number', e.target.value)} placeholder="+216 XX XXX XXX" />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="Email" required error={formErrors.email}>
              <input type="email" className={`form-control ${formErrors.email ? 'is-invalid' : ''}`} value={form.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="contact@cabinet.tn" />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="Site web" error={formErrors.website}>
              <input type="url" className={`form-control ${formErrors.website ? 'is-invalid' : ''}`} value={form.website} onChange={(e) => updateForm('website', e.target.value)} placeholder="https://..." />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Spécialités" error={formErrors.specialties} helpText="Maintenez Ctrl pour sélectionner plusieurs">
              <select multiple className={`form-control ${formErrors.specialties ? 'is-invalid' : ''}`} style={{ height: '100px' }} value={form.specialties} onChange={(e) => updateForm('specialties', Array.from(e.target.selectedOptions, (o) => o.value))}>
                {specialties.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </FormField>
          </div>
          <div className="col-md-3">
            <FormField label="Latitude" error={formErrors.latitude} helpText="-90 à 90">
              <input type="number" step="0.000001" className={`form-control ${formErrors.latitude ? 'is-invalid' : ''}`} value={form.latitude} onChange={(e) => updateForm('latitude', e.target.value)} placeholder="36.8065" />
            </FormField>
          </div>
          <div className="col-md-3">
            <FormField label="Longitude" error={formErrors.longitude} helpText="-180 à 180">
              <input type="number" step="0.000001" className={`form-control ${formErrors.longitude ? 'is-invalid' : ''}`} value={form.longitude} onChange={(e) => updateForm('longitude', e.target.value)} placeholder="10.1815" />
            </FormField>
          </div>
        </div>

        <h6 className="text-info border-bottom pb-2 mt-4 mb-3"><i className="bi bi-heart-pulse me-1"></i> Informations médicales</h6>
        <div className="row g-3">
          <div className="col-md-4">
            <div className="form-check form-switch mt-4">
              <input className="form-check-input" type="checkbox" id="cnam_affiliated" checked={form.cnam_affiliated} onChange={(e) => updateForm('cnam_affiliated', e.target.checked)} />
              <label className="form-check-label fw-semibold" htmlFor="cnam_affiliated">Affilié CNAM</label>
            </div>
          </div>
          <div className="col-md-4">
            <FormField label="Code CNAM" error={formErrors.cnam_code}>
              <input type="text" className={`form-control ${formErrors.cnam_code ? 'is-invalid' : ''}`} value={form.cnam_code} onChange={(e) => updateForm('cnam_code', e.target.value)} />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="Durée consultation (min)" error={formErrors.appointment_duration} helpText="5 à 480 min">
              <input type="number" min="5" max="480" className={`form-control ${formErrors.appointment_duration ? 'is-invalid' : ''}`} value={form.appointment_duration} onChange={(e) => updateForm('appointment_duration', e.target.value)} />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Accréditation" error={formErrors.accreditation}>
              <textarea className={`form-control ${formErrors.accreditation ? 'is-invalid' : ''}`} value={form.accreditation} onChange={(e) => updateForm('accreditation', e.target.value)} rows="2" placeholder="Accréditations du cabinet" />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Secrétaires" error={formErrors.secretaries} helpText="Ctrl+clic pour sélectionner plusieurs">
              <select multiple className={`form-control ${formErrors.secretaries ? 'is-invalid' : ''}`} style={{ height: '100px' }} value={form.secretaries} onChange={(e) => updateForm('secretaries', Array.from(e.target.selectedOptions, (o) => o.value))}>
                {secretaries.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)}
              </select>
            </FormField>
          </div>
        </div>

        <h6 className="text-success border-bottom pb-2 mt-4 mb-3"><i className="bi bi-clock me-1"></i> Horaires d'ouverture</h6>
        <div className="row g-3">
          <div className="col-md-9">
            <OpeningHoursEditor value={form.opening_hours} onChange={(hours) => updateForm('opening_hours', hours)} error={formErrors.opening_hours} />
          </div>
          <div className="col-md-3">
            <FormField label="Fuseau horaire" error={formErrors.timezone}>
              <select className={`form-select ${formErrors.timezone ? 'is-invalid' : ''}`} value={form.timezone} onChange={(e) => updateForm('timezone', e.target.value)}>
                <option value="Africa/Tunis">Africa/Tunis</option>
              </select>
            </FormField>
            <div className="mt-4">
              <small className="text-muted d-block mb-2">
                <i className="bi bi-info-circle me-1"></i>
                Activez le toggle pour ouvrir un jour, puis ajoutez des créneaux.
              </small>
            </div>
          </div>
        </div>

        <h6 className="text-warning border-bottom pb-2 mt-4 mb-3"><i className="bi bi-image me-1"></i> Médias</h6>
        <div className="row g-3">
          <div className="col-md-6">
            <FormField label="Logo du cabinet" error={formErrors.logo}>
              <input type="file" accept="image/png,image/jpeg,image/jpg" className={`form-control ${formErrors.logo ? 'is-invalid' : ''}`} onChange={(e) => updateForm('logo', e.target.files[0] || null)} />
              <div className="form-text">JPG, PNG. {form.logo && <span className="text-success">Fichier sélectionné</span>}</div>
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Bannière" error={formErrors.banner}>
              <input type="file" accept="image/png,image/jpeg,image/jpg" className={`form-control ${formErrors.banner ? 'is-invalid' : ''}`} onChange={(e) => updateForm('banner', e.target.files[0] || null)} />
              <div className="form-text">JPG, PNG. {form.banner && <span className="text-success">Fichier sélectionné</span>}</div>
            </FormField>
          </div>
        </div>

        <div className="row g-3 mt-2">
          <div className="col-md-6">
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => updateForm('is_active', e.target.checked)} />
              <label className="form-check-label fw-semibold" htmlFor="is_active">Cabinet actif</label>
            </div>
          </div>
        </div>

        {formErrors.detail && <div className="alert alert-danger mt-3">{formErrors.detail}</div>}
        {formErrors.non_field_errors && (
          <div className="alert alert-danger mt-3">
            {Array.isArray(formErrors.non_field_errors) ? formErrors.non_field_errors.join(' | ') : formErrors.non_field_errors}
          </div>
        )}
      </Modal>
    </div>
  );
}