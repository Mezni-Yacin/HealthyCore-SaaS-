import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  scheduled:       { label: 'Programme',      badge: 'primary'   },
  confirmed:       { label: 'Confirme',       badge: 'info'      },
  in_progress:     { label: 'En cours',       badge: 'warning'   },
  completed:       { label: 'Termine',        badge: 'success'   },
  cancelled:       { label: 'Annule',         badge: 'secondary' },
  no_show:         { label: 'Absent',         badge: 'dark'      },
};

const CONSULTATION_TYPE_MAP = {
  first:     'Premiere consultation',
  followup:  'Suivi',
  emergency: 'Urgence',
  routine:   'Routine',
};

const EMPTY_FORM = {
  patient: '',
  cabinet: '',
  date_time: '',
  duration: 30,
  consultation_type: 'first',
  is_teleconsultation: false,
  symptoms: '',
  notes: '',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toLocalDatetimeString(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DoctorAppointments() {
  const navigate = useNavigate();

  // ── Data state ──────────────────────────────────────────────────────────

  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [cabinets, setCabinets] = useState([]);

  // ── Pagination ──────────────────────────────────────────────────────────

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // ── Filters ─────────────────────────────────────────────────────────────

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    date_from: '',
    date_to: '',
    consultation_type: '',
  });

  // ── UI state ────────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Create modal ────────────────────────────────────────────────────────

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);

  // ── API calls ───────────────────────────────────────────────────────────

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page: currentPage };
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params[key] = val;
      });

      const res = await api.get('/appointments/doctor/', { params });
      setAppointments(res.data.results || res.data);
      setTotalCount(res.data.count || 0);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Erreur lors du chargement des rendez-vous.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get('/appointments/doctor/stats/');
      setStats(res.data);
    } catch {
      // Silently fail – stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchDropdowns = useCallback(async () => {
    try {
      const [patientsRes, cabinetsRes] = await Promise.all([
        api.get('/appointments/doctor/patients-dropdown/'),
        api.get('/appointments/doctor/cabinets-dropdown/'),
      ]);
      setPatients(patientsRes.data || []);
      setCabinets(cabinetsRes.data || []);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchStats();
    fetchDropdowns();
  }, [fetchStats, fetchDropdowns]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: '',
      date_from: '',
      date_to: '',
      consultation_type: '',
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // ── Create appointment ──────────────────────────────────────────────────

  const openCreateModal = () => {
    setCreateForm({ ...EMPTY_FORM });
    setCreateErrors({});
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm({ ...EMPTY_FORM });
    setCreateErrors({});
    setCreating(false);
  };

  const handleCreateChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCreateForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear field error on change
    if (createErrors[name]) {
      setCreateErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateCreateForm = () => {
    const errors = {};

    if (!createForm.patient) {
      errors.patient = 'Le patient est requis.';
    }
    if (!createForm.cabinet) {
      errors.cabinet = 'Le cabinet est requis.';
    }
    if (!createForm.date_time) {
      errors.date_time = 'La date et heure sont requises.';
    }
    if (!createForm.duration || createForm.duration <= 0) {
      errors.duration = 'La duree doit etre superieure a 0.';
    }
    if (createForm.duration > 480) {
      errors.duration = 'La duree ne peut pas depasser 480 minutes.';
    }
    if (!createForm.consultation_type) {
      errors.consultation_type = 'Le type de consultation est requis.';
    }

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    setCreating(true);
    try {
      const payload = {
        patient: Number(createForm.patient),
        cabinet: Number(createForm.cabinet),
        date_time: createForm.date_time,
        duration: Number(createForm.duration),
        consultation_type: createForm.consultation_type,
        is_teleconsultation: createForm.is_teleconsultation,
        symptoms: createForm.symptoms,
        notes: createForm.notes,
      };

      await api.post('/appointments/doctor/', payload);
      closeCreateModal();
      fetchAppointments();
      fetchStats();
    } catch (err) {
      if (err.response?.data) {
        const apiErrors = err.response.data;
        if (typeof apiErrors === 'object') {
          const fieldErrors = {};
          Object.entries(apiErrors).forEach(([key, messages]) => {
            fieldErrors[key] = Array.isArray(messages) ? messages.join(' ') : String(messages);
          });
          setCreateErrors(fieldErrors);
        }
      } else {
        setCreateErrors({ _general: 'Erreur lors de la creation du rendez-vous.' });
      }
    } finally {
      setCreating(false);
    }
  };

  // ── Pagination helpers ──────────────────────────────────────────────────

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const getPaginationRange = () => {
    const delta = 2;
    const range = [];
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    for (let i = left; i <= right; i++) {
      range.push(i);
    }
    return range;
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="container-fluid py-4">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1 fw-bold">Gestion des rendez-vous</h4>
          <p className="text-muted mb-0">Consultez et gerez vos rendez-vous</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <i className="bi bi-plus-lg me-1"></i>
          Nouveau rendez-vous
        </button>
      </div>

      {/* ── Stats cards ──────────────────────────────────────────────── */}
      <div className="row g-3 mb-4">
        {statsLoading ? (
          <div className="col-12">
            <div className="d-flex gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card flex-fill">
                  <div className="card-body">
                    <div className="placeholder-glow">
                      <h6 className="placeholder col-8"></h6>
                      <h4 className="placeholder col-4"></h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : stats ? (
          <>
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="rounded-3 bg-primary bg-opacity-10 p-3 me-3">
                      <i className="bi bi-calendar-day text-primary fs-4"></i>
                    </div>
                    <div>
                      <p className="text-muted mb-0 small">Aujourd'hui</p>
                      <h4 className="fw-bold mb-0">{stats.today}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="rounded-3 bg-info bg-opacity-10 p-3 me-3">
                      <i className="bi bi-calendar-check text-info fs-4"></i>
                    </div>
                    <div>
                      <p className="text-muted mb-0 small">A venir</p>
                      <h4 className="fw-bold mb-0">{stats.upcoming}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="rounded-3 bg-warning bg-opacity-10 p-3 me-3">
                      <i className="bi bi-calendar-week text-warning fs-4"></i>
                    </div>
                    <div>
                      <p className="text-muted mb-0 small">Cette semaine</p>
                      <h4 className="fw-bold mb-0">{stats.this_week}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="rounded-3 bg-success bg-opacity-10 p-3 me-3">
                      <i className="bi bi-check-circle text-success fs-4"></i>
                    </div>
                    <div>
                      <p className="text-muted mb-0 small">Completes</p>
                      <h4 className="fw-bold mb-0">{stats.completed}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label small fw-semibold">Recherche</label>
              <input
                type="text"
                className="form-control form-control-sm"
                name="search"
                placeholder="Patient, symptomes..."
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-semibold">Statut</label>
              <select
                className="form-select form-select-sm"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">Tous</option>
                {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-semibold">Date debut</label>
              <input
                type="date"
                className="form-control form-control-sm"
                name="date_from"
                value={filters.date_from}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-semibold">Date fin</label>
              <input
                type="date"
                className="form-control form-control-sm"
                name="date_to"
                value={filters.date_to}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-12 col-sm-6 col-md-2">
              <label className="form-label small fw-semibold">Type</label>
              <select
                className="form-select form-select-sm"
                name="consultation_type"
                value={filters.consultation_type}
                onChange={handleFilterChange}
              >
                <option value="">Tous</option>
                {Object.entries(CONSULTATION_TYPE_MAP).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-1">
              <button
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={handleResetFilters}
                title="Reinitialiser les filtres"
              >
                <i className="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────── */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-semibold">
            Rendez-vous
            {totalCount > 0 && (
              <span className="text-muted fw-normal ms-2">
                ({totalCount} resultats)
              </span>
            )}
          </h6>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Patient</th>
                  <th>Date / Heure</th>
                  <th>Cabinet</th>
                  <th>Duree</th>
                  <th>Statut</th>
                  <th>Type</th>
                  <th className="text-center">Teleconsult.</th>
                  <th className="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Chargement...</span>
                      </div>
                      <p className="mt-2 text-muted mb-0">Chargement des rendez-vous...</p>
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <i className="bi bi-calendar-x fs-1 text-muted d-block mb-2"></i>
                      <p className="text-muted mb-0">Aucun rendez-vous trouve.</p>
                    </td>
                  </tr>
                ) : (
                  appointments.map((apt) => {
                    const statusInfo = STATUS_MAP[apt.status] || { label: apt.status_display || apt.status, badge: 'secondary' };
                    return (
                      <tr key={apt.id}>
                        <td className="ps-3">
                          <div className="fw-semibold">{apt.patient_name || '-'}</div>
                          {apt.patient_info && (
                            <small className="text-muted">
                              {apt.patient_info.phone_number && (
                                <span className="me-2">{apt.patient_info.phone_number}</span>
                              )}
                              {apt.patient_info.email && <span>{apt.patient_info.email}</span>}
                            </small>
                          )}
                        </td>
                        <td>
                          <div>{formatDateTime(apt.date_time)}</div>
                          {apt.symptoms_summary && (
                            <small className="text-muted text-truncate d-block" style={{ maxWidth: 200 }}>
                              {apt.symptoms_summary}
                            </small>
                          )}
                        </td>
                        <td>
                          <span className="text-truncate d-inline-block" style={{ maxWidth: 160 }}>
                            {apt.cabinet_name || '-'}
                          </span>
                        </td>
                        <td>{apt.duration ? `${apt.duration} min` : '-'}</td>
                        <td>
                          <span className={`badge bg-${statusInfo.badge}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td>
                          <span className="text-capitalize">
                            {CONSULTATION_TYPE_MAP[apt.consultation_type] || apt.consultation_type_display || '-'}
                          </span>
                        </td>
                        <td className="text-center">
                          {apt.is_teleconsultation ? (
                            <i className="bi bi-camera-video text-primary" title="Teleconsultation"></i>
                          ) : (
                            <i className="bi bi-dash text-muted" title="Presentiel"></i>
                          )}
                        </td>
                        <td className="text-end pe-3">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => navigate(`/appointments/doctor/${apt.id}/`)}
                              title="Voir"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() => navigate(`/appointments/doctor/${apt.id}/`)}
                              title="Modifier"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="card-footer bg-transparent border-0 d-flex flex-wrap justify-content-between align-items-center gap-2">
              <small className="text-muted">
                {totalCount > 0
                  ? `Affichage ${startItem}-${endItem} sur ${totalCount}`
                  : 'Aucun resultat'}
              </small>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                    >
                      <i className="bi bi-chevron-double-left"></i>
                    </button>
                  </li>
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                  </li>
                  {getPaginationRange().map((page) => (
                    <li
                      key={page}
                      className={`page-item ${page === currentPage ? 'active' : ''}`}
                    >
                      <button className="page-link" onClick={() => handlePageChange(page)}>
                        {page}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </li>
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <i className="bi bi-chevron-double-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* ── Create modal ─────────────────────────────────────────────── */}
      {showCreateModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCreateModal();
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Nouveau rendez-vous</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeCreateModal}
                  disabled={creating}
                ></button>
              </div>

              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body">
                  {/* General error */}
                  {createErrors._general && (
                    <div className="alert alert-danger">
                      {createErrors._general}
                    </div>
                  )}

                  <div className="row g-3">
                    {/* Patient */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Patient <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${createErrors.patient ? 'is-invalid' : ''}`}
                        name="patient"
                        value={createForm.patient}
                        onChange={handleCreateChange}
                        disabled={creating}
                      >
                        <option value="">-- Selectionner un patient --</option>
                        {patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name}
                            {p.phone_number ? ` - ${p.phone_number}` : ''}
                          </option>
                        ))}
                      </select>
                      {createErrors.patient && (
                        <div className="invalid-feedback">{createErrors.patient}</div>
                      )}
                    </div>

                    {/* Cabinet */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Cabinet <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${createErrors.cabinet ? 'is-invalid' : ''}`}
                        name="cabinet"
                        value={createForm.cabinet}
                        onChange={handleCreateChange}
                        disabled={creating}
                      >
                        <option value="">-- Selectionner un cabinet --</option>
                        {cabinets.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.address ? ` - ${c.address}` : ''}
                          </option>
                        ))}
                      </select>
                      {createErrors.cabinet && (
                        <div className="invalid-feedback">{createErrors.cabinet}</div>
                      )}
                    </div>

                    {/* Date / Time */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Date et heure <span className="text-danger">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        className={`form-control ${createErrors.date_time ? 'is-invalid' : ''}`}
                        name="date_time"
                        value={createForm.date_time}
                        onChange={handleCreateChange}
                        disabled={creating}
                      />
                      {createErrors.date_time && (
                        <div className="invalid-feedback">{createErrors.date_time}</div>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">
                        Duree (min) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className={`form-control ${createErrors.duration ? 'is-invalid' : ''}`}
                        name="duration"
                        value={createForm.duration}
                        onChange={handleCreateChange}
                        min="5"
                        max="480"
                        disabled={creating}
                      />
                      {createErrors.duration && (
                        <div className="invalid-feedback">{createErrors.duration}</div>
                      )}
                    </div>

                    {/* Consultation type */}
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">
                        Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${createErrors.consultation_type ? 'is-invalid' : ''}`}
                        name="consultation_type"
                        value={createForm.consultation_type}
                        onChange={handleCreateChange}
                        disabled={creating}
                      >
                        {Object.entries(CONSULTATION_TYPE_MAP).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {createErrors.consultation_type && (
                        <div className="invalid-feedback">{createErrors.consultation_type}</div>
                      )}
                    </div>

                    {/* Teleconsultation */}
                    <div className="col-md-6">
                      <div className="form-check mt-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="is_teleconsultation"
                          id="createTeleconsultation"
                          checked={createForm.is_teleconsultation}
                          onChange={handleCreateChange}
                          disabled={creating}
                        />
                        <label className="form-check-label" htmlFor="createTeleconsultation">
                          Teleconsultation
                        </label>
                      </div>
                    </div>

                    {/* Symptoms */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Symptomes</label>
                      <textarea
                        className="form-control"
                        name="symptoms"
                        rows="3"
                        placeholder="Decrivez les symptomes du patient..."
                        value={createForm.symptoms}
                        onChange={handleCreateChange}
                        disabled={creating}
                      ></textarea>
                    </div>

                    {/* Notes */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Notes</label>
                      <textarea
                        className="form-control"
                        name="notes"
                        rows="3"
                        placeholder="Notes supplementaires..."
                        value={createForm.notes}
                        onChange={handleCreateChange}
                        disabled={creating}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={closeCreateModal}
                    disabled={creating}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Creation...
                      </>
                    ) : (
                      'Creer le rendez-vous'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}