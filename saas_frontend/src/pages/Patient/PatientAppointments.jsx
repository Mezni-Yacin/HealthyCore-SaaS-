import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Status mapping (couleurs uniquement, libellés via backend)        */
/* ------------------------------------------------------------------ */

const STATUS_BADGE_CLASS = {
  scheduled: 'primary',
  confirmed: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'secondary',
  no_show: 'danger', // Changé pour marquer l'échec
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Aligné sur le backend (AppointmentPagination page_size = 20)
const PAGE_SIZE = 20;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const PatientAppointments = () => {
  const navigate = useNavigate();

  /* ---- state ---- */
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterConsultationType, setFilterConsultationType] = useState('');
  const [filterTeleconsultation, setFilterTeleconsultation] = useState(false);

  /* ---- fetch ---- */
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page };
      if (filterStatus) params.status = filterStatus;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      if (filterConsultationType) params.consultation_type = filterConsultationType;
      if (filterTeleconsultation) params.is_teleconsultation = 'true';
      params.ordering = '-date_time';

      const { data } = await api.get('/appointments/patient/records/', {
        params,
      });
      setAppointments(data.results ?? data);
      setTotalCount(data.count ?? (Array.isArray(data) ? data.length : 0));
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          'Une erreur est survenue lors du chargement des rendez-vous.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterDateFrom, filterDateTo, filterConsultationType, filterTeleconsultation]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  /* ---- handlers ---- */
  const handleResetFilters = () => {
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterConsultationType('');
    setFilterTeleconsultation(false);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCardClick = (id) => {
    navigate(`/my-appointments/${id}`);
  };

  /* ---- derived ---- */
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const isPast = (dateTime) => new Date(dateTime) < new Date();
  const isFaded = (appt) => isPast(appt.date_time) && ['scheduled', 'confirmed'].includes(appt.status);

  /* ---- render helpers ---- */

  const renderStatusBadge = (status, statusDisplay) => (
    <span className={`badge bg-${STATUS_BADGE_CLASS[status] || 'secondary'} me-1`}>
      {statusDisplay || status}
    </span>
  );

  const renderConsultationBadge = (consultationType, consultationTypeDisplay) => (
    <span className="badge bg-light text-dark border me-1">
      {consultationTypeDisplay || consultationType}
    </span>
  );

  const renderTeleconsultBadge = (isTeleconsultation) => {
    if (!isTeleconsultation) return null;
    return (
      <span className="badge bg-white border border-primary text-primary">
        Téléconsultation
      </span>
    );
  };

  /* ============================= RENDER ============================= */

  if (loading && appointments.length === 0) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="text-muted small mt-2">Chargement des rendez-vous…</p>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* ---------- Header ---------- */}
      <div className="d-flex align-items-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-calendar-check me-2 text-primary" viewBox="0 0 16 16">
          <path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z" />
          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
        </svg>
        <h3 className="mb-0 fw-bold">Mes Rendez-vous</h3>
      </div>

      {/* ---------- Error ---------- */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-exclamation-triangle-fill me-2 flex-shrink-0" viewBox="0 0 16 16">
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
          </svg>
          {error}
        </div>
      )}

      {/* ---------- Filter Bar ---------- */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3 col-sm-6">
              <label htmlFor="filter-status" className="form-label fw-semibold small text-muted">Statut</label>
              <select id="filter-status" className="form-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
                <option value="">Tous les statuts</option>
                <option value="scheduled">Programmé</option>
                <option value="confirmed">Confirmé</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Complété</option>
                <option value="cancelled">Annulé</option>
                <option value="no_show">Non Présenté</option>
              </select>
            </div>

            <div className="col-md-3 col-sm-6">
              <label htmlFor="filter-type" className="form-label fw-semibold small text-muted">Type</label>
              <select id="filter-type" className="form-select" value={filterConsultationType} onChange={(e) => { setFilterConsultationType(e.target.value); setPage(1); }}>
                <option value="">Tous les types</option>
                <option value="first">Première consultation</option>
                <option value="followup">Suivi</option>
                <option value="emergency">Urgence</option>
                <option value="routine">Routine</option>
              </select>
            </div>

            <div className="col-md-2 col-sm-6">
              <label htmlFor="filter-date-from" className="form-label fw-semibold small text-muted">Date début</label>
              <input id="filter-date-from" type="date" className="form-control" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }} />
            </div>

            <div className="col-md-2 col-sm-6">
              <label htmlFor="filter-date-to" className="form-label fw-semibold small text-muted">Date fin</label>
              <input id="filter-date-to" type="date" className="form-control" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }} />
            </div>

            <div className="col-md-2 col-sm-6">
              <div className="form-check mt-4">
                <input type="checkbox" className="form-check-input" id="filter-tele" checked={filterTeleconsultation} onChange={(e) => { setFilterTeleconsultation(e.target.checked); setPage(1); }} />
                <label htmlFor="filter-tele" className="form-check-label small text-muted">Téléconsultation</label>
              </div>
            </div>

            <div className="col-12">
              <button type="button" className="btn btn-outline-secondary w-100" onClick={handleResetFilters} disabled={!filterStatus && !filterDateFrom && !filterDateTo && !filterConsultationType && !filterTeleconsultation}>
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Results Count ---------- */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="mb-0 text-muted small">
          {totalCount} rendez-vous{totalCount > 1 ? 's' : ''} trouvé{totalCount > 1 ? 's' : ''}
        </p>
      </div>

      {/* ---------- Empty State ---------- */}
      {!loading && !error && appointments.length === 0 && (
        <div className="text-center py-5">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" className="bi bi-calendar-x text-muted mb-3" viewBox="0 0 16 16">
            <path d="M6.146 7.146a.5.5 0 0 1 .708 0L8 8.293l1.146-1.147a.5.5 0 1 1 .708.708L8.707 9l1.147 1.146a.5.5 0 0 1-.708.708L8 9.707l-1.146 1.147a.5.5 0 0 1-.708-.708L7.293 9 6.146 7.854a.5.5 0 0 1 0-.708z" />
            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
          </svg>
          <h5 className="text-muted">Aucun rendez-vous trouvé</h5>
          <p className="text-muted small mb-3">
            {filterStatus || filterDateFrom || filterDateTo || filterConsultationType || filterTeleconsultation
              ? 'Aucun rendez-vous ne correspond à vos filtres.'
              : 'Vous n\'avez encore aucun rendez-vous.'}
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/book-appointment')}>
            Prendre un rendez-vous
          </button>
        </div>
      )}

      {/* ---------- Appointment Cards Grid ---------- */}
      {!loading && !error && appointments.length > 0 && (
        <div className="row g-3">
          {appointments.map((appt) => {
            const faded = isFaded(appt);
            return (
              <div className="col-lg-4 col-md-6" key={appt.id}>
                <div
                  className={`card border h-100 shadow-sm appointment-card ${faded ? 'opacity-75' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick(appt.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardClick(appt.id);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2 px-3">
                    {renderStatusBadge(appt.status, appt.status_display)}
                    <small className="text-muted">{formatTime(appt.date_time)}</small>
                  </div>

                  <div className="card-body d-flex flex-column">
                    <h6 className="fw-bold mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-person-fill me-1 text-primary" viewBox="0 0 16 16">
                        <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                      </svg>
                      Dr. {appt.doctor_name}
                    </h6>

                    <p className="text-muted small mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="bi bi-clock me-1" viewBox="0 0 16 16">
                        <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z" />
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" />
                      </svg>
                      {formatDateTime(appt.date_time)}
                      {appt.duration && (<span className="ms-1">({appt.duration} min)</span>)}
                    </p>

                    <p className="text-muted small mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="bi bi-geo-alt me-1" viewBox="0 0 16 16">
                        <path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A31.493 31.493 0 0 1 8 14.58a31.481 31.481 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94zM8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10z" />
                        <path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                      </svg>
                      {appt.cabinet_name || 'Non précisé'}
                    </p>

                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {renderConsultationBadge(appt.consultation_type, appt.consultation_type_display)}
                      {renderTeleconsultBadge(appt.is_teleconsultation)}
                    </div>

                    {appt.symptoms_summary && (
                      <p className="text-muted small mb-0 mt-auto" style={{ lineHeight: 1.4 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="bi bi-chat-left-text me-1" viewBox="0 0 16 16">
                          <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A2 2 0 0 0 3 11.586l-2 2V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12.793a.5.5 0 0 0 .854.353l2.853-2.853A1 1 0 0 1 4.414 12H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
                          <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z" />
                        </svg>
                        {appt.symptoms_summary}
                      </p>
                    )}
                  </div>

                  <div className="card-footer bg-white border-top py-2 px-3">
                    <small className="text-primary fw-semibold">
                      Voir les détails
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="bi bi-chevron-right ms-1" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M6.646 3.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L12.293 10 6.646 4.354a.5.5 0 0 1 0-.708z" />
                      </svg>
                    </small>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- Pagination ---------- */}
      {!loading && !error && appointments.length > 0 && totalPages > 1 && (
        <nav aria-label="Pagination des rendez-vous" className="mt-4">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => handlePageChange(page - 1)} disabled={page <= 1} aria-label="Page précédente">
                <span aria-hidden="true">&laquo;</span>
              </button>
            </li>

            {(() => {
              const pages = [];
              const maxVisible = 5;
              let start = Math.max(1, page - Math.floor(maxVisible / 2));
              let end = Math.min(totalPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) {
                start = Math.max(1, end - maxVisible + 1);
              }

              if (start > 1) {
                pages.push(
                  <li className="page-item" key={1}>
                    <button className="page-link" onClick={() => handlePageChange(1)}>1</button>
                  </li>
                );
                if (start > 2) {
                  pages.push(
                    <li className="page-item disabled" key="start-ellipsis">
                      <span className="page-link">...</span>
                    </li>
                  );
                }
              }

              for (let i = start; i <= end; i++) {
                pages.push(
                  <li className={`page-item ${i === page ? 'active' : ''}`} key={i}>
                    <button className="page-link" onClick={() => handlePageChange(i)}>{i}</button>
                  </li>
                );
              }

              if (end < totalPages) {
                if (end < totalPages - 1) {
                  pages.push(
                    <li className="page-item disabled" key="end-ellipsis">
                      <span className="page-link">...</span>
                    </li>
                  );
                }
                pages.push(
                  <li className="page-item" key={totalPages}>
                    <button className="page-link" onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
                  </li>
                );
              }

              return pages;
            })()}

            <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages} aria-label="Page suivante">
                <span aria-hidden="true">&raquo;</span>
              </button>
            </li>
          </ul>
          <p className="text-center text-muted small">Page {page} sur {totalPages}</p>
        </nav>
      )}

      {/* ---------- Inline Styles ---------- */}
      <style>{`
        .appointment-card {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .appointment-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 .5rem 1.2rem rgba(0, 0, 0, 0.12) !important;
        }
      `}</style>
    </div>
  );
};

export default PatientAppointments;