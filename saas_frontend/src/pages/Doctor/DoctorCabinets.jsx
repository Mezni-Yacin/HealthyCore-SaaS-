import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

/**
 * ============================================================================
 *  DoctorCabinets.jsx — Gestion des cabinets par le médecin propriétaire
 * ============================================================================
 *
 *  Fonctionnalités :
 *    ✅ Lister ses cabinets (tableau + recherche + filtres + tri + pagination)
 *    ✅ Créer un cabinet (modal multi-sections)
 *    ✅ Modifier un cabinet (modal pré-rempli)
 *    ✅ Supprimer un cabinet (soft delete)
 *    ✅ Activer / désactiver un cabinet
 *    ✅ Éditeur visuel d'horaires d'ouverture (jour par jour + copier)
 *    ✅ Upload logo + bannière
 *    ✅ Dropdowns indépendants (un 404 ne bloque pas les autres)
 *    ✅ Messages auto-dismiss (5s)
 *
 *  Endpoints backend (baseURL api.js = /api/) :
 *    GET    /cabinets/my-cabinets/                      → Liste
 *    POST   /cabinets/my-cabinets/                      → Créer
 *    GET    /cabinets/my-cabinets/<id>/                 → Détail
 *    PATCH  /cabinets/my-cabinets/<id>/                 → Modifier
 *    DELETE /cabinets/my-cabinets/<id>/                 → Supprimer (soft)
 *    POST   /cabinets/my-cabinets/<id>/toggle_active/   → Activer/désactiver
 *    GET    /cabinets/my-cabinets/dropdown_specialties/ → Dropdown spécialités
 *    GET    /cabinets/my-cabinets/dropdown_cities/      → Dropdown villes
 *    GET    /cabinets/my-cabinets/dropdown_governorates/ → Dropdown gouvernorats
 *
 * ============================================================================ */

// ── Modal ──────────────────────────────────────────────────────────────
function Modal({ show, title, onClose, children, onSubmit, submitLabel, submitDisabled, submitVariant, size }) {
  if (!show) return null;
  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className={`modal-dialog modal-dialog-centered ${size || 'modal-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-content shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title"><i className="bi bi-hospital me-2"></i>{title}</h5>
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

// ── Pagination ──────────────────────────────────────────────────────────
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

// ── FormField ───────────────────────────────────────────────────────────
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

// ── Opening Hours Editor ────────────────────────────────────────────────
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const DAY_LABELS = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche' };

function OpeningHoursEditor({ openingHours, onChange }) {
  const toggleDay = (day) => {
    onChange({
      ...openingHours,
      [day]: openingHours[day]?.length > 0 ? [] : [{ start: '08:00', end: '17:00' }],
    });
  };

  const updateSlot = (day, idx, field, value) => {
    const slots = [...(openingHours[day] || [])];
    slots[idx] = { ...slots[idx], [field]: value };
    onChange({ ...openingHours, [day]: slots });
  };

  const addSlot = (day) => {
    const slots = [...(openingHours[day] || []), { start: '08:00', end: '12:00' }];
    onChange({ ...openingHours, [day]: slots });
  };

  const removeSlot = (day, idx) => {
    const slots = (openingHours[day] || []).filter((_, i) => i !== idx);
    onChange({ ...openingHours, [day]: slots });
  };

  const copyFrom = (sourceDay, targetDay) => {
    if (sourceDay && openingHours[sourceDay]) {
      onChange({ ...openingHours, [targetDay]: [...openingHours[sourceDay]] });
    }
  };

  return (
    <div className="border rounded p-3">
      <label className="form-label fw-semibold mb-3">
        <i className="bi bi-clock me-1"></i> Horaires d'ouverture
      </label>
      {/* Copy function */}
      <div className="d-flex gap-2 mb-3 align-items-center">
        <small className="text-muted">Copier depuis :</small>
        <select className="form-select form-select-sm" style={{ width: 'auto' }}
          onChange={(e) => {
            if (e.target.value) {
              const src = e.target.value;
              DAYS.filter(d => d !== src).forEach(d => copyFrom(src, d));
            }
          }}>
          <option value="">— Choisir un jour —</option>
          {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
        </select>
        <small className="text-muted">→ appliquer à tous les autres jours</small>
      </div>
      {DAYS.map(day => {
        const slots = openingHours[day] || [];
        const enabled = slots.length > 0;
        return (
          <div key={day} className={`d-flex align-items-start gap-2 mb-2 p-2 rounded ${enabled ? 'bg-light' : 'bg-secondary bg-opacity-10'}`}>
            <div className="form-check form-switch mt-1" style={{ minWidth: '100px' }}>
              <input className="form-check-input" type="checkbox" id={`day-${day}`}
                checked={enabled} onChange={() => toggleDay(day)} />
              <label className="form-check-label fw-semibold" htmlFor={`day-${day}`}>
                {DAY_LABELS[day]}
              </label>
            </div>
            {enabled && (
              <div className="d-flex flex-wrap gap-2 flex-grow-1 align-items-center">
                {slots.map((slot, idx) => (
                  <div key={idx} className="d-flex align-items-center gap-1">
                    <input type="time" className="form-control form-control-sm" style={{ width: '110px' }}
                      value={slot.start} onChange={(e) => updateSlot(day, idx, 'start', e.target.value)} />
                    <span className="text-muted">—</span>
                    <input type="time" className="form-control form-control-sm" style={{ width: '110px' }}
                      value={slot.end} onChange={(e) => updateSlot(day, idx, 'end', e.target.value)} />
                    <button type="button" className="btn btn-sm btn-outline-danger py-0 px-1"
                      onClick={() => removeSlot(day, idx)} title="Supprimer ce créneau">
                      <i className="bi bi-x"></i>
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-sm btn-outline-success py-0"
                  onClick={() => addSlot(day)} title="Ajouter un créneau">
                  <i className="bi bi-plus"></i> Créneau
                </button>
              </div>
            )}
            {!enabled && (
              <span className="text-muted small mt-1">Fermé</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Composant principal ─────────────────────────────────────────────────
export default function DoctorCabinets() {
  const [cabinets, setCabinets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGov, setFilterGov] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Dropdowns
  const [specialties, setSpecialties] = useState([]);
  const [cities, setCities] = useState([]);
  const [governorates, setGovernorates] = useState([]);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCabinet, setEditingCabinet] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Form
  const emptyForm = {
    name: '', address: '', city: '', latitude: '', longitude: '',
    phone_number: '', email: '', website: '',
    specialties: [], cnam_affiliated: false, cnam_code: '', accreditation: '',
    opening_hours: {}, appointment_duration: '30', timezone: 'Africa/Tunis',
    logo: null, banner: null, is_active: true,
  };
  const [form, setForm] = useState({ ...emptyForm });

  // Message
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(t); }, [message]);
  useEffect(() => { setCurrentPage(1); }, [search, filterGov, ordering]);

  // ── Fetch dropdowns — CHAQUE UN INDÉPENDAMMENT ────────────────
  // ⚠️ IMPORTANT : Ne PAS utiliser Promise.all car si UN SEUL endpoint
  // échoue (ex: 404), TOUS les dropdowns restent vides.
  // Chaque fetch gère ses propres erreurs.
  const fetchDropdowns = useCallback(async () => {
    // 1) Spécialités
    try {
      const specRes = await api.get('/cabinets/my-cabinets/dropdown_specialties/');
      setSpecialties(Array.isArray(specRes.data) ? specRes.data : []);
    } catch (err) {
      console.error('[MyCabinets] Erreur spécialités:', err);
      setSpecialties([]);
    }

    // 2) Gouvernorats
    try {
      const govRes = await api.get('/cabinets/my-cabinets/dropdown_governorates/');
      setGovernorates(Array.isArray(govRes.data) ? govRes.data : []);
    } catch (err) {
      console.error('[MyCabinets] Erreur gouvernorats:', err);
      setGovernorates([]);
    }

    // 3) Villes
    try {
      const cityRes = await api.get('/cabinets/my-cabinets/dropdown_cities/');
      setCities(Array.isArray(cityRes.data) ? cityRes.data : []);
    } catch (err) {
      console.error('[MyCabinets] Erreur villes:', err);
      setCities([]);
    }
  }, []);

  useEffect(() => { fetchDropdowns(); }, [fetchDropdowns]);

  // Filter cities when governorate changes
  const fetchCities = useCallback(async (govId) => {
    try {
      const params = govId ? { governorate: govId } : {};
      const { data } = await api.get('/cabinets/my-cabinets/dropdown_cities/', { params });
      setCities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[MyCabinets] Erreur villes filtrées:', err);
      setCities([]);
    }
  }, []);

  // ── Fetch cabinets ──────────────────────────────────────────────
  const fetchCabinets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (filterGov) params.city__governorate = filterGov;
      if (ordering) params.ordering = ordering;
      const { data } = await api.get('/cabinets/my-cabinets/', { params });
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
      setMessage("Erreur lors du chargement de vos cabinets.");
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  }, [search, filterGov, ordering, currentPage]);

  useEffect(() => { fetchCabinets(); }, [fetchCabinets]);

  // ── Form helpers ────────────────────────────────────────────────
  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreateModal = () => {
    setEditingCabinet(null);
    setForm({ ...emptyForm, opening_hours: {} });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = async (cab) => {
    try {
      const { data } = await api.get(`/cabinets/my-cabinets/${cab.id}/`);
      setEditingCabinet(data);

      // Convertir les opening_hours du backend vers le format éditeur
      let oh = {};
      if (data.opening_hours && typeof data.opening_hours === 'object') {
        Object.entries(data.opening_hours).forEach(([day, slots]) => {
          if (Array.isArray(slots) && slots.length > 0) {
            oh[day] = slots.map(slot => {
              if (typeof slot === 'string' && slot.includes('-')) {
                const [start, end] = slot.split('-');
                return { start: start.trim(), end: end.trim() };
              }
              return slot; // déjà en format objet
            });
          }
        });
      }

      setForm({
        name: data.name || '',
        address: data.address || '',
        city: data.city || '',
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        phone_number: data.phone_number || '',
        email: data.email || '',
        website: data.website || '',
        specialties: data.specialties || [],
        cnam_affiliated: data.cnam_affiliated ?? false,
        cnam_code: data.cnam_code || '',
        accreditation: data.accreditation || '',
        opening_hours: oh,
        appointment_duration: data.appointment_duration ?? '30',
        timezone: data.timezone || 'Africa/Tunis',
        logo: null,
        banner: null,
        is_active: data.is_active ?? true,
      });
      setFormErrors({});
      // Charger les villes pour le gouvernorat de ce cabinet
      if (data.city_detail?.governorate_id) {
        await fetchCities(data.city_detail.governorate_id);
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
    formData.append('address', form.address.trim());
    if (form.city) formData.append('city', form.city);
    if (form.latitude) formData.append('latitude', form.latitude);
    if (form.longitude) formData.append('longitude', form.longitude);
    formData.append('phone_number', form.phone_number);
    formData.append('email', form.email.trim());
    if (form.website) formData.append('website', form.website.trim());
    formData.append('cnam_affiliated', form.cnam_affiliated);
    if (form.cnam_code) formData.append('cnam_code', form.cnam_code.trim());
    if (form.accreditation) formData.append('accreditation', form.accreditation.trim());
    formData.append('appointment_duration', form.appointment_duration);
    formData.append('timezone', form.timezone);
    formData.append('is_active', form.is_active);

    // M2M
    if (form.specialties && form.specialties.length > 0) {
      form.specialties.forEach(id => formData.append('specialties', id));
    }

    // Opening hours — convertir vers le format backend "HH:MM-HH:MM"
    const oh = {};
    Object.entries(form.opening_hours || {}).forEach(([day, slots]) => {
      if (Array.isArray(slots) && slots.length > 0) {
        oh[day] = slots.filter(s => s.start && s.end).map(s => `${s.start}-${s.end}`);
      }
    });
    formData.append('opening_hours', JSON.stringify(oh));

    // Files
    if (form.logo) formData.append('logo', form.logo);
    if (form.banner) formData.append('banner', form.banner);

    try {
      if (editingCabinet) {
        await api.patch(`/cabinets/my-cabinets/${editingCabinet.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage('Cabinet modifié avec succès.');
      } else {
        await api.post('/cabinets/my-cabinets/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage('Cabinet créé avec succès.');
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
    if (!window.confirm(`Supprimer le cabinet "${cab.name}" ?`)) return;
    try {
      await api.delete(`/cabinets/my-cabinets/${cab.id}/`);
      setMessage(`Cabinet "${cab.name}" supprimé.`);
      setMessageType('success');
      fetchCabinets();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Erreur lors de la suppression.");
      setMessageType('danger');
    }
  };

  const handleToggleActive = async (cab) => {
    try {
      await api.post(`/cabinets/my-cabinets/${cab.id}/toggle_active/`);
      fetchCabinets();
    } catch (err) {
      setMessage("Erreur lors du changement d'état.");
      setMessageType('danger');
    }
  };

  const handleOrderToggle = (field) => setOrdering((prev) => (prev === field ? `-${field}` : field));
  const SortIcon = ({ field }) => ordering === field ? ' ▲' : ordering === `-${field}` ? ' ▼' : ' ↕';

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">
            <i className="bi bi-hospital me-2 text-primary"></i>
            Mes Cabinets
          </h2>
          <p className="text-muted mb-0">{totalCount} cabinet{totalCount > 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <i className="bi bi-plus-lg me-1"></i> Nouveau cabinet
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      {/* Filters */}
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
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filterGov} onChange={(e) => setFilterGov(e.target.value)}>
                <option value="">Tous les gouvernorats</option>
                {governorates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="col-md-5 text-end">
              <div className="btn-group btn-group-sm">
                <button className={`btn btn-sm ${ordering === 'name' || ordering === '-name' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => handleOrderToggle('name')}>Nom<SortIcon field="name" /></button>
                <button className={`btn btn-sm ${ordering === 'created_at' || ordering === '-created_at' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => handleOrderToggle('created_at')}>Date<SortIcon field="created_at" /></button>
                <button className={`btn btn-sm ${ordering === 'is_active' || ordering === '-is_active' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => handleOrderToggle('is_active')}>Statut<SortIcon field="is_active" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
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
              <p className="mt-2 text-muted">{search ? `Aucun cabinet trouvé pour "${search}"` : 'Aucun cabinet. Créez votre premier cabinet !'}</p>
              {!search && <button className="btn btn-primary mt-2" onClick={openCreateModal}>Créer un cabinet</button>}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3" style={{ width: '50px' }}>#</th>
                      <th>Cabinet</th>
                      <th>Ville</th>
                      <th>Téléphone</th>
                      <th>Spécialités</th>
                      <th className="text-center">CNAM</th>
                      <th className="text-center">Statut</th>
                      <th style={{ width: '160px' }} className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cabinets.map((cab, idx) => (
                      <tr key={cab.id}>
                        <td className="ps-3 text-muted">{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {cab.logo_url ? (
                              <img src={cab.logo_url} alt="" className="rounded" style={{ width: 36, height: 36, objectFit: 'cover' }} />
                            ) : (
                              <div className="bg-primary bg-opacity-10 rounded d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                                <i className="bi bi-hospital text-primary"></i>
                              </div>
                            )}
                            <div>
                              <div className="fw-semibold">{cab.name}</div>
                              <small className="text-muted">{cab.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>{cab.city_name} <small className="text-muted">({cab.governorate_name})</small></td>
                        <td>{cab.phone_number}</td>
                        <td>
                          {(cab.specialties_names || []).map((s, i) => (
                            <span key={i} className="badge bg-info text-dark me-1">{s}</span>
                          ))}
                        </td>
                        <td className="text-center">
                          <span className={`badge ${cab.cnam_affiliated ? 'bg-success' : 'bg-light text-dark'}`}>
                            {cab.cnam_affiliated ? 'Oui' : 'Non'}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className={`badge ${cab.is_active ? 'bg-success' : 'bg-secondary'}`}>
                            {cab.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => openEditModal(cab)} title="Modifier">
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className={`btn btn-sm ${cab.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                              onClick={() => handleToggleActive(cab)} title="Activer/Désactiver">
                              <i className="bi bi-power"></i>
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

      {/* ==================== MODAL CREATE / EDIT ==================== */}
      <Modal
        show={showModal}
        title={editingCabinet ? `Modifier : ${editingCabinet.name}` : 'Nouveau Cabinet'}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        submitLabel={submitting ? 'Enregistrement...' : (editingCabinet ? 'Mettre à jour' : 'Créer le cabinet')}
        submitDisabled={submitting}
        submitVariant={editingCabinet ? 'btn-warning' : 'btn-success'}
        size="modal-xl"
      >
        {/* Section 1 : Basic Info */}
        <h6 className="text-primary border-bottom pb-2 mb-3">
          <i className="bi bi-building me-1"></i> Informations générales
        </h6>
        <div className="row g-3">
          <div className="col-md-6">
            <FormField label="Nom du cabinet" required error={formErrors.name} helpText="Minimum 3 caractères">
              <input type="text" className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Ex: Cabinet Dr. Ben Ali" />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Adresse" required error={formErrors.address}>
              <textarea className={`form-control ${formErrors.address ? 'is-invalid' : ''}`}
                value={form.address} onChange={(e) => updateForm('address', e.target.value)} rows="2" placeholder="Adresse complète..." />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="Gouvernorat" error={formErrors.city}>
              <select className={`form-select ${formErrors.city ? 'is-invalid' : ''}`}
                value={form.city ? (cities.find(c => c.id == form.city)?.governorate_id || '') : ''}
                onChange={(e) => {
                  updateForm('city', '');
                  fetchCities(e.target.value);
                }}>
                <option value="">— Sélectionner —</option>
                {governorates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="Ville" required error={formErrors.city}>
              <select className={`form-select ${formErrors.city ? 'is-invalid' : ''}`}
                value={form.city} onChange={(e) => updateForm('city', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="Fuseau horaire" error={formErrors.timezone} helpText="Ex: Africa/Tunis">
              <input type="text" className={`form-control ${formErrors.timezone ? 'is-invalid' : ''}`}
                value={form.timezone} onChange={(e) => updateForm('timezone', e.target.value)} placeholder="Africa/Tunis" />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Téléphone" required error={formErrors.phone_number}>
              <input type="tel" className={`form-control ${formErrors.phone_number ? 'is-invalid' : ''}`}
                value={form.phone_number} onChange={(e) => updateForm('phone_number', e.target.value)} placeholder="+216 XX XXX XXX" />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Email" required error={formErrors.email}>
              <input type="email" className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                value={form.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="cabinet@example.com" />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Site web" error={formErrors.website}>
              <input type="url" className={`form-control ${formErrors.website ? 'is-invalid' : ''}`}
                value={form.website} onChange={(e) => updateForm('website', e.target.value)} placeholder="https://..." />
            </FormField>
          </div>
          <div className="col-md-3">
            <FormField label="Latitude" error={formErrors.latitude}>
              <input type="number" step="0.000001" className={`form-control ${formErrors.latitude ? 'is-invalid' : ''}`}
                value={form.latitude} onChange={(e) => updateForm('latitude', e.target.value)} placeholder="36.8065" />
            </FormField>
          </div>
          <div className="col-md-3">
            <FormField label="Longitude" error={formErrors.longitude}>
              <input type="number" step="0.000001" className={`form-control ${formErrors.longitude ? 'is-invalid' : ''}`}
                value={form.longitude} onChange={(e) => updateForm('longitude', e.target.value)} placeholder="10.1815" />
            </FormField>
          </div>
        </div>

        {/* Section 2 : Medical */}
        <h6 className="text-info border-bottom pb-2 mt-4 mb-3">
          <i className="bi bi-heart-pulse me-1"></i> Informations médicales
        </h6>
        <div className="row g-3">
          <div className="col-md-6">
            <FormField label="Spécialités" error={formErrors.specialties} helpText="Ctrl+clic pour plusieurs">
              <select multiple className={`form-control ${formErrors.specialties ? 'is-invalid' : ''}`} style={{ height: '100px' }}
                value={form.specialties} onChange={(e) => updateForm('specialties', Array.from(e.target.selectedOptions, o => o.value))}>
                {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>
          </div>
          <div className="col-md-3">
            <div className="form-check form-switch mt-4">
              <input className="form-check-input" type="checkbox" id="cnam_affiliated"
                checked={form.cnam_affiliated} onChange={(e) => updateForm('cnam_affiliated', e.target.checked)} />
              <label className="form-check-label fw-semibold" htmlFor="cnam_affiliated">Affilié CNAM</label>
            </div>
          </div>
          <div className="col-md-3">
            <FormField label="Code CNAM" error={formErrors.cnam_code}>
              <input type="text" className={`form-control ${formErrors.cnam_code ? 'is-invalid' : ''}`}
                value={form.cnam_code} onChange={(e) => updateForm('cnam_code', e.target.value)} />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Accréditation" error={formErrors.accreditation}>
              <textarea className={`form-control ${formErrors.accreditation ? 'is-invalid' : ''}`}
                value={form.accreditation} onChange={(e) => updateForm('accreditation', e.target.value)} rows="2" placeholder="Numéro d'accréditation..." />
            </FormField>
          </div>
          <div className="col-md-3">
            <FormField label="Durée consultation (min)" error={formErrors.appointment_duration} helpText="Par défaut 30 min">
              <input type="number" min="5" max="480" className={`form-control ${formErrors.appointment_duration ? 'is-invalid' : ''}`}
                value={form.appointment_duration} onChange={(e) => updateForm('appointment_duration', e.target.value)} />
            </FormField>
          </div>
          <div className="col-md-3">
            <div className="form-check form-switch mt-4">
              <input className="form-check-input" type="checkbox" id="cab_active"
                checked={form.is_active} onChange={(e) => updateForm('is_active', e.target.checked)} />
              <label className="form-check-label fw-semibold" htmlFor="cab_active">Cabinet actif</label>
            </div>
          </div>
        </div>

        {/* Section 3 : Opening Hours */}
        <h6 className="text-warning border-bottom pb-2 mt-4 mb-3">
          <i className="bi bi-clock-history me-1"></i> Horaires d'ouverture
        </h6>
        <OpeningHoursEditor
          openingHours={form.opening_hours}
          onChange={(oh) => updateForm('opening_hours', oh)}
        />

        {/* Section 4 : Media */}
        <h6 className="text-danger border-bottom pb-2 mt-4 mb-3">
          <i className="bi bi-image me-1"></i> Médias
        </h6>
        <div className="row g-3">
          <div className="col-md-6">
            <FormField label="Logo" error={formErrors.logo} helpText="JPG, PNG. Max 2 MB recommandé.">
              <input type="file" accept="image/png,image/jpeg,image/jpg"
                className={`form-control ${formErrors.logo ? 'is-invalid' : ''}`}
                onChange={(e) => updateForm('logo', e.target.files[0] || null)} />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Bannière" error={formErrors.banner} helpText="Image de couverture du cabinet.">
              <input type="file" accept="image/png,image/jpeg,image/jpg"
                className={`form-control ${formErrors.banner ? 'is-invalid' : ''}`}
                onChange={(e) => updateForm('banner', e.target.files[0] || null)} />
            </FormField>
          </div>
        </div>

        {/* Global errors */}
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