import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toLocalDateTimeInput = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGES = {
  scheduled: 'primary',
  confirmed: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'secondary',
  no_show: 'dark',
};

const STATUSES = [
  { value: '', label: 'Tous les statuts' },
  { value: 'scheduled', label: 'Planifie' },
  { value: 'confirmed', label: 'Confirme' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Termine' },
  { value: 'cancelled', label: 'Annule' },
  { value: 'no_show', label: 'Absent' },
];

const CONSULTATION_TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'first', label: 'Premiere consultation' },
  { value: 'followup', label: 'Suivi' },
  { value: 'emergency', label: 'Urgence' },
  { value: 'routine', label: 'Routine' },
];

const CONSULTATION_TYPE_OPTIONS = CONSULTATION_TYPES.filter((t) => t.value);

const PAGE_SIZE = 15;

// ── Component ────────────────────────────────────────────────────────────────

const SecretaryAppointments = () => {
  const navigate = useNavigate();

  // Data state
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [cabinets, setCabinets] = useState([]);

  // Pagination state (backend-driven)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // UI state
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    doctor: '',
    cabinet: '',
    date_from: '',
    date_to: '',
    consultation_type: '',
  });

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    patient: '',
    doctor: '',
    cabinet: '',
    date_time: '',
    duration: 30,
    consultation_type: '',
    is_teleconsultation: false,
    symptoms: '',
    notes: '',
  });
  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);

  // ── API Calls ──────────────────────────────────────────────────────────────

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        page_size: PAGE_SIZE,
      };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.doctor) params.doctor = filters.doctor;
      if (filters.cabinet) params.cabinet = filters.cabinet;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.consultation_type) params.consultation_type = filters.consultation_type;

      // ✅ FIX: URL corrigée (sans records/)
      const res = await api.get('/appointments/secretary/', { params });
      const data = res.data;

      // Support both paginated and non-paginated responses
      if (Array.isArray(data)) {
        setAppointments(data);
        setTotalCount(data.length);
      } else if (data.results) {
        setAppointments(data.results);
        setTotalCount(data.count || data.results.length);
      } else {
        setAppointments([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err.response?.data?.detail || err.message || 'Erreur lors du chargement des rendez-vous.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      // ✅ FIX: URL corrigée
      const res = await api.get('/appointments/secretary/stats/');
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchDropdowns = useCallback(async () => {
    try {
      // ✅ FIX: URLs corrigées
      const [doctorsRes, patientsRes, cabinetsRes] = await Promise.all([
        api.get('/appointments/secretary/doctors-dropdown/'),
        api.get('/appointments/secretary/patients-dropdown/'),
        api.get('/appointments/secretary/cabinets-dropdown/'),
      ]);
      setDoctors(doctorsRes.data || []);
      setPatients(patientsRes.data || []);
      setCabinets(cabinetsRes.data || []);
    } catch (err) {
      console.error('Error fetching dropdowns:', err);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchStats();
    fetchDropdowns();
  }, [fetchStats, fetchDropdowns]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: '',
      doctor: '',
      cabinet: '',
      date_from: '',
      date_to: '',
      consultation_type: '',
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPaginationPages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Create modal
  const handleOpenCreateModal = () => {
    setCreateForm({
      patient: '',
      doctor: '',
      cabinet: '',
      date_time: toLocalDateTimeInput(new Date()),
      duration: 30,
      consultation_type: '',
      is_teleconsultation: false,
      symptoms: '',
      notes: '',
    });
    setCreateErrors({});
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCreateErrors({});
  };

  const handleCreateFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCreateForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (createErrors[name]) {
      setCreateErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateCreateForm = () => {
    const errors = {};
    if (!createForm.patient) errors.patient = 'Le patient est requis.';
    if (!createForm.doctor) errors.doctor = 'Le medecin est requis.';
    if (!createForm.cabinet) errors.cabinet = 'Le cabinet est requis.';
    if (!createForm.date_time) errors.date_time = 'La date et heure sont requises.';
    if (!createForm.duration || createForm.duration < 5) errors.duration = 'La duree doit etre au moins 5 minutes.';
    if (!createForm.consultation_type) errors.consultation_type = 'Le type de consultation est requis.';
    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    setCreating(true);
    try {
      const payload = {
        patient: createForm.patient,
        doctor: createForm.doctor,
        cabinet: createForm.cabinet,
        date_time: createForm.date_time,
        duration: Number(createForm.duration),
        consultation_type: createForm.consultation_type,
        is_teleconsultation: createForm.is_teleconsultation,
        symptoms: createForm.symptoms || undefined,
        notes: createForm.notes || undefined,
      };

      // ✅ FIX: URL corrigée
      await api.post('/appointments/secretary/', payload);
      setShowCreateModal(false);
      fetchAppointments();
      fetchStats();
    } catch (err) {
      console.error('Error creating appointment:', err);
      if (err.response?.data) {
        const serverErrors = {};
        const data = err.response.data;
        Object.keys(data).forEach((key) => {
          serverErrors[key] = Array.isArray(data[key]) ? data[key][0] : data[key];
        });
        setCreateErrors(serverErrors);
      } else {
        setCreateErrors({ _general: err.message || 'Erreur lors de la creation.' });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleViewDetail = (id) => {
    navigate(`/appointments/secretary/${id}/`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderStatCards = () => {
    if (statsLoading) {
      return (
        <div className="row g-3 mb-4">
          {[1, 2, 3].map((i) => (
            <div className="col-md-4" key={i}>
              <div className="card">
                <div className="card-body d-flex align-items-center justify-content-center" style={{ minHeight: 100 }}>
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!stats) return null;

    const cards = [
      {
        label: "Aujourd'hui",
        value: stats.today ?? 0,
        icon: 'bi-calendar-day',
        color: 'primary',
      },
      {
        label: 'A venir',
        value: stats.upcoming ?? 0,
        icon: 'bi-calendar-event',
        color: 'info',
      },
      {
        label: 'Completes cette semaine',
        value: stats.completed ?? 0,
        icon: 'bi-check-circle',
        color: 'success',
      },
    ];

    return (
      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div className="col-md-4" key={card.label}>
            <div className={`card border-${card.color} h-100`}>
              <div className="card-body text-center">
                <i className={`bi ${card.icon} fs-2 text-${card.color} mb-2 d-block`}></i>
                <h3 className="mb-1">{card.value}</h3>
                <p className="text-muted mb-0">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFilterBar = () => (
    <div className="card mb-4">
      <div className="card-body">
        <div className="row g-2 align-items-end">
          {/* Search */}
          <div className="col-md-3 col-lg-2">
            <label className="form-label small fw-semibold mb-1">Recherche</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                name="search"
                placeholder="Patient / Medecin"
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          {/* Status */}
          <div className="col-md-2 col-lg-2">
            <label className="form-label small fw-semibold mb-1">Statut</label>
            <select
              className="form-select form-select-sm"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Doctor */}
          <div className="col-md-2 col-lg-2">
            <label className="form-label small fw-semibold mb-1">Medecin</label>
            <select
              className="form-select form-select-sm"
              name="doctor"
              value={filters.doctor}
              onChange={handleFilterChange}
            >
              <option value="">Tous les medecins</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}{d.specialty ? ` - ${d.specialty}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Cabinet */}
          <div className="col-md-2 col-lg-2">
            <label className="form-label small fw-semibold mb-1">Cabinet</label>
            <select
              className="form-select form-select-sm"
              name="cabinet"
              value={filters.cabinet}
              onChange={handleFilterChange}
            >
              <option value="">Tous les cabinets</option>
              {cabinets.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="col-md-2 col-lg-1">
            <label className="form-label small fw-semibold mb-1">Du</label>
            <input
              type="date"
              className="form-control form-control-sm"
              name="date_from"
              value={filters.date_from}
              onChange={handleFilterChange}
            />
          </div>

          {/* Date To */}
          <div className="col-md-2 col-lg-1">
            <label className="form-label small fw-semibold mb-1">Au</label>
            <input
              type="date"
              className="form-control form-control-sm"
              name="date_to"
              value={filters.date_to}
              onChange={handleFilterChange}
            />
          </div>

          {/* Consultation Type */}
          <div className="col-md-2 col-lg-2">
            <label className="form-label small fw-semibold mb-1">Type</label>
            <select
              className="form-select form-select-sm"
              name="consultation_type"
              value={filters.consultation_type}
              onChange={handleFilterChange}
            >
              {CONSULTATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Reset */}
          <div className="col-md-auto col-lg-auto">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handleResetFilters}
              title="Reinitialiser les filtres"
            >
              <i className="bi bi-arrow-counterclockwise me-1"></i>
              Reinitialiser
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStatusBadge = (status, display) => {
    const variant = STATUS_BADGES[status] || 'secondary';
    const label = display || status;
    return (
      <span className={`badge bg-${variant} text-capitalize`}>
        {label}
      </span>
    );
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3 text-muted">Chargement des rendez-vous...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button className="btn btn-sm btn-outline-danger float-end" onClick={fetchAppointments}>
            Reessayer
          </button>
        </div>
      );
    }

    if (!appointments.length) {
      return (
        <div className="text-center py-5">
          <i className="bi bi-calendar-x fs-1 text-muted d-block mb-3"></i>
          <h5 className="text-muted">Aucun rendez-vous trouve</h5>
          <p className="text-muted">Modifiez vos filtres ou creez un nouveau rendez-vous.</p>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <i className="bi bi-plus-circle me-1"></i>Nouveau rendez-vous
          </button>
        </div>
      );
    }

    return (
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th className="text-center" style={{ width: '50px' }}>#</th>
              <th>Patient</th>
              <th>Medecin</th>
              <th>Date / Heure</th>
              <th>Cabinet</th>
              <th className="text-center">Duree</th>
              <th className="text-center">Statut</th>
              <th className="text-center">Type</th>
              <th className="text-center" style={{ width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((apt, index) => {
              const rowNum = (currentPage - 1) * PAGE_SIZE + index + 1;
              return (
                <tr key={apt.id} className="cursor-pointer" onClick={() => handleViewDetail(apt.id)}>
                  <td className="text-center text-muted small">{rowNum}</td>
                  <td>
                    <div className="fw-semibold">{apt.patient_name || '-'}</div>
                    {apt.is_teleconsultation && (
                      <span className="badge bg-info bg-opacity-10 text-info mt-1" style={{ fontSize: '0.7rem' }}>
                        <i className="bi bi-camera-video me-1"></i>Teleconsultation
                      </span>
                    )}
                  </td>
                  <td>{apt.doctor_name || '-'}</td>
                  <td>
                    <div>{formatDateTime(apt.date_time)}</div>
                  </td>
                  <td className="text-muted small">{apt.cabinet_name || '-'}</td>
                  <td className="text-center">
                    {apt.duration ? `${apt.duration} min` : '-'}
                  </td>
                  <td className="text-center">
                    {renderStatusBadge(apt.status, apt.status_display)}
                  </td>
                  <td className="text-center">
                    <span className="badge bg-light text-dark border">
                      {apt.consultation_type_display || apt.consultation_type || '-'}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetail(apt.id);
                      }}
                      title="Voir les details"
                    >
                      <i className="bi bi-eye"></i>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = getPaginationPages();

    return (
      <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between mt-3 gap-2">
        <div className="text-muted small">
          Affichage de {(currentPage - 1) * PAGE_SIZE + 1} a{' '}
          {Math.min(currentPage * PAGE_SIZE, totalCount)} sur {totalCount} rendez-vous
        </div>
        <nav>
          <ul className="pagination pagination-sm mb-0">
            {/* Previous */}
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <i className="bi bi-chevron-left"></i>
              </button>
            </li>

            {/* First page + ellipsis */}
            {pages[0] > 1 && (
              <>
                <li className="page-item">
                  <button className="page-link" onClick={() => handlePageChange(1)}>1</button>
                </li>
                {pages[0] > 2 && (
                  <li className="page-item disabled">
                    <span className="page-link">...</span>
                  </li>
                )}
              </>
            )}

            {/* Page numbers */}
            {pages.map((page) => (
              <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(page)}>
                  {page}
                </button>
              </li>
            ))}

            {/* Last page + ellipsis */}
            {pages[pages.length - 1] < totalPages && (
              <>
                {pages[pages.length - 1] < totalPages - 1 && (
                  <li className="page-item disabled">
                    <span className="page-link">...</span>
                  </li>
                )}
                <li className="page-item">
                  <button className="page-link" onClick={() => handlePageChange(totalPages)}>
                    {totalPages}
                  </button>
                </li>
              </>
            )}

            {/* Next */}
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    );
  };

  const renderCreateModal = () => (
    <div
      className={`modal fade ${showCreateModal ? 'show d-block' : ''}`}
      tabIndex={-1}
      role="dialog"
      style={showCreateModal ? { backgroundColor: 'rgba(0,0,0,0.5)' } : {}}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <form onSubmit={handleCreateSubmit} noValidate>
            {/* Header */}
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-calendar-plus me-2 text-primary"></i>
                Nouveau rendez-vous
              </h5>
              <button type="button" className="btn-close" onClick={handleCloseCreateModal}></button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {/* General error */}
              {createErrors._general && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
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
                    onChange={handleCreateFormChange}
                  >
                    <option value="">-- Selectionner un patient --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}{p.phone_number ? ` (${p.phone_number})` : ''}
                      </option>
                    ))}
                  </select>
                  {createErrors.patient && (
                    <div className="invalid-feedback">{createErrors.patient}</div>
                  )}
                </div>

                {/* Doctor */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Medecin <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${createErrors.doctor ? 'is-invalid' : ''}`}
                    name="doctor"
                    value={createForm.doctor}
                    onChange={handleCreateFormChange}
                  >
                    <option value="">-- Selectionner un medecin --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name}{d.specialty ? ` - ${d.specialty}` : ''}
                      </option>
                    ))}
                  </select>
                  {createErrors.doctor && (
                    <div className="invalid-feedback">{createErrors.doctor}</div>
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
                    onChange={handleCreateFormChange}
                  >
                    <option value="">-- Selectionner un cabinet --</option>
                    {cabinets.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.address ? ` - ${c.address}` : ''}
                      </option>
                    ))}
                  </select>
                  {createErrors.cabinet && (
                    <div className="invalid-feedback">{createErrors.cabinet}</div>
                  )}
                </div>

                {/* Consultation Type */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Type de consultation <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select ${createErrors.consultation_type ? 'is-invalid' : ''}`}
                    name="consultation_type"
                    value={createForm.consultation_type}
                    onChange={handleCreateFormChange}
                  >
                    <option value="">-- Selectionner un type --</option>
                    {CONSULTATION_TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {createErrors.consultation_type && (
                    <div className="invalid-feedback">{createErrors.consultation_type}</div>
                  )}
                </div>

                {/* Date Time */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Date et heure <span className="text-danger">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    className={`form-control ${createErrors.date_time ? 'is-invalid' : ''}`}
                    name="date_time"
                    value={createForm.date_time}
                    onChange={handleCreateFormChange}
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
                    onChange={handleCreateFormChange}
                    min={5}
                    max={480}
                    step={5}
                  />
                  {createErrors.duration && (
                    <div className="invalid-feedback">{createErrors.duration}</div>
                  )}
                </div>

                {/* Teleconsultation */}
                <div className="col-md-3 d-flex align-items-end pb-1">
                  <div className="form-check form-switch mt-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="is_teleconsultation"
                      name="is_teleconsultation"
                      checked={createForm.is_teleconsultation}
                      onChange={handleCreateFormChange}
                    />
                    <label className="form-check-label" htmlFor="is_teleconsultation">
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
                    rows={3}
                    placeholder="Decrivez les symptomes du patient..."
                    value={createForm.symptoms}
                    onChange={handleCreateFormChange}
                  />
                </div>

                {/* Notes */}
                <div className="col-12">
                  <label className="form-label fw-semibold">Notes</label>
                  <textarea
                    className="form-control"
                    name="notes"
                    rows={3}
                    placeholder="Notes supplementaires..."
                    value={createForm.notes}
                    onChange={handleCreateFormChange}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseCreateModal}
                disabled={creating}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Creation en cours...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-1"></i>
                    Creer le rendez-vous
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // ── Main Render ────────────────────────────────────────────────────────────

  return (
    <div className="container-fluid py-4">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 gap-3">
        <div>
          <h4 className="mb-1 fw-bold">
            <i className="bi bi-calendar2-check me-2 text-primary"></i>
            Gestion des rendez-vous
          </h4>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item">
                <Link to="/" className="text-decoration-none">Tableau de bord</Link>
              </li>
              <li className="breadcrumb-item active">Rendez-vous</li>
            </ol>
          </nav>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleOpenCreateModal}
        >
          <i className="bi bi-plus-circle me-1"></i>
          Nouveau rendez-vous
        </button>
      </div>

      {/* Stats Cards */}
      {renderStatCards()}

      {/* Filter Bar */}
      {renderFilterBar()}

      {/* Table Card */}
      <div className="card">
        <div className="card-header bg-white d-flex align-items-center justify-content-between py-3">
          <h6 className="mb-0 fw-semibold">
            <i className="bi bi-list-ul me-2"></i>
            Liste des rendez-vous
          </h6>
          <span className="badge bg-light text-dark border">
            {totalCount} resultat{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="card-body p-0">
          {renderTable()}
        </div>
        {totalPages > 1 && (
          <div className="card-footer bg-white">
            {renderPagination()}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {renderCreateModal()}
    </div>
  );
};

export default SecretaryAppointments;