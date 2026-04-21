import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGES = {
  scheduled: 'primary',
  confirmed: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'secondary',
  no_show: 'dark',
};

const STATUS_LABELS = {
  scheduled: 'Planifie',
  confirmed: 'Confirme',
  in_progress: 'En cours',
  completed: 'Termine',
  cancelled: 'Annule',
  no_show: 'Absent',
};

const CANCELLATION_REASONS = [
  { value: '', label: '-- Selectionner une raison --' },
  { value: 'patient', label: 'Patient' },
  { value: 'doctor', label: 'Medecin' },
  { value: 'emergency', label: 'Urgence' },
  { value: 'weather', label: 'Meteo' },
  { value: 'other', label: 'Autre' },
];

const CANCELLATION_REASON_LABELS = {
  patient: 'Patient',
  doctor: 'Medecin',
  emergency: 'Urgence',
  weather: 'Meteo',
  other: 'Autre',
};

// ── Component ────────────────────────────────────────────────────────────────

const SecretaryAppointmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Data state
  const [appointment, setAppointment] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelForm, setCancelForm] = useState({
    cancellation_reason: '',
    cancellation_notes: '',
  });
  const [cancelErrors, setCancelErrors] = useState({});
  const [cancelling, setCancelling] = useState(false);

  // ── API Calls ──────────────────────────────────────────────────────────────

  const fetchAppointment = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setForbidden(false);
    try {
      const res = await api.get(`/appointments/secretary/records/${id}/`);
      setAppointment(res.data);
    } catch (err) {
      console.error('Error fetching appointment:', err);
      if (err.response?.status === 404) {
        setNotFound(true);
      } else if (err.response?.status === 403) {
        setForbidden(true);
      } else {
        setError(err.response?.data?.detail || err.message || 'Erreur lors du chargement du rendez-vous.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleGoBack = () => {
    navigate(-1);
  };

  const handlePrint = () => {
    window.print();
  };

  // Cancel modal
  const handleOpenCancelModal = () => {
    setCancelForm({ cancellation_reason: '', cancellation_notes: '' });
    setCancelErrors({});
    setShowCancelModal(true);
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setCancelErrors({});
  };

  const handleCancelFormChange = (e) => {
    const { name, value } = e.target;
    setCancelForm((prev) => ({ ...prev, [name]: value }));
    if (cancelErrors[name]) {
      setCancelErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateCancelForm = () => {
    const errors = {};
    if (!cancelForm.cancellation_reason) {
      errors.cancellation_reason = 'La raison de l\'annulation est requise.';
    }
    setCancelErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!validateCancelForm()) return;

    setCancelling(true);
    try {
      const payload = {
        cancellation_reason: cancelForm.cancellation_reason,
        cancellation_notes: cancelForm.cancellation_notes || undefined,
      };

      await api.post(`/appointments/secretary/records/${id}/cancel/`, payload);
      setShowCancelModal(false);
      fetchAppointment();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      if (err.response?.data) {
        const serverErrors = {};
        const data = err.response.data;
        Object.keys(data).forEach((key) => {
          serverErrors[key] = Array.isArray(data[key]) ? data[key][0] : data[key];
        });
        setCancelErrors(serverErrors);
      } else {
        setCancelErrors({ _general: err.message || 'Erreur lors de l\'annulation.' });
      }
    } finally {
      setCancelling(false);
    }
  };

  // ── Computed ───────────────────────────────────────────────────────────────

  const canCancel = appointment && !['completed', 'cancelled'].includes(appointment.status);

  // ── Render: Error / Loading / 404 / 403 ───────────────────────────────────

  const renderLoading = () => (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status" style={{ width: '4rem', height: '4rem' }}>
        <span className="visually-hidden">Chargement...</span>
      </div>
      <p className="mt-3 text-muted">Chargement du rendez-vous...</p>
    </div>
  );

  const renderNotFound = () => (
    <div className="text-center py-5">
      <i className="bi bi-calendar-x fs-1 text-muted d-block mb-3"></i>
      <h4 className="text-muted">Rendez-vous introuvable</h4>
      <p className="text-muted">
        Le rendez-vous avec l'identifiant <strong>#{id}</strong> n'existe pas ou a ete supprime.
      </p>
      <button className="btn btn-primary" onClick={handleGoBack}>
        <i className="bi bi-arrow-left me-1"></i>Retour
      </button>
    </div>
  );

  const renderForbidden = () => (
    <div className="text-center py-5">
      <i className="bi bi-shield-lock fs-1 text-warning d-block mb-3"></i>
      <h4 className="text-muted">Acces refuse</h4>
      <p className="text-muted">
        Vous n'avez pas les permissions necessaires pour consulter ce rendez-vous.
      </p>
      <button className="btn btn-primary" onClick={handleGoBack}>
        <i className="bi bi-arrow-left me-1"></i>Retour
      </button>
    </div>
  );

  const renderError = () => (
    <div className="text-center py-5">
      <i className="bi bi-exclamation-triangle fs-1 text-danger d-block mb-3"></i>
      <h4 className="text-muted">Une erreur est survenue</h4>
      <p className="text-danger">{error}</p>
      <div className="d-flex justify-content-center gap-2">
        <button className="btn btn-outline-primary" onClick={fetchAppointment}>
          <i className="bi bi-arrow-clockwise me-1"></i>Reessayer
        </button>
        <button className="btn btn-secondary" onClick={handleGoBack}>
          <i className="bi bi-arrow-left me-1"></i>Retour
        </button>
      </div>
    </div>
  );

  // ── Render: Main Detail ────────────────────────────────────────────────────

  const renderStatusBadge = (status, display) => {
    const variant = STATUS_BADGES[status] || 'secondary';
    const label = display || STATUS_LABELS[status] || status;
    return (
      <span className={`badge bg-${variant} text-uppercase`} style={{ fontSize: '0.85rem', letterSpacing: '0.03em' }}>
        {label}
      </span>
    );
  };

  const renderPatientCard = () => {
    const info = appointment.patient_info;
    if (!info) return null;

    return (
      <div className="card border-start border-4 border-primary h-100">
        <div className="card-header bg-light fw-semibold">
          <i className="bi bi-person me-2"></i>Informations du patient
        </div>
        <div className="card-body">
          <h5 className="card-title mb-3">{info.full_name || '-'}</h5>
          <div className="row g-2">
            <div className="col-sm-6">
              <div className="text-muted small">Date de naissance</div>
              <div>{formatDate(info.date_of_birth)}</div>
            </div>
            <div className="col-sm-6">
              <div className="text-muted small">Sexe</div>
              <div>{info.gender === 'M' ? 'Masculin' : info.gender === 'F' ? 'Feminin' : info.gender || '-'}</div>
            </div>
            <div className="col-sm-6">
              <div className="text-muted small">Telephone</div>
              <div>{info.phone_number || '-'}</div>
            </div>
            <div className="col-sm-6">
              <div className="text-muted small">E-mail</div>
              <div>{info.email || '-'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDoctorCabinetCards = () => {
    const doctorInfo = appointment.doctor_info;
    const cabinetInfo = appointment.cabinet_info;

    return (
      <div className="row g-3">
        {/* Doctor Card */}
        <div className="col-md-6">
          <div className="card border-start border-4 border-info h-100">
            <div className="card-header bg-light fw-semibold">
              <i className="bi bi-heart-pulse me-2"></i>Medecin
            </div>
            <div className="card-body">
              <h6 className="mb-2">{doctorInfo?.full_name || appointment.doctor_name || '-'}</h6>
              {doctorInfo?.specialty && (
                <div>
                  <span className="badge bg-info bg-opacity-10 text-info">
                    {doctorInfo.specialty}
                  </span>
                </div>
              )}
              {doctorInfo?.email && (
                <div className="text-muted small mt-2">
                  <i className="bi bi-envelope me-1"></i>{doctorInfo.email}
                </div>
              )}
              {doctorInfo?.license_number && (
                <div className="text-muted small">
                  <i className="bi bi-card-text me-1"></i>N° Licence: {doctorInfo.license_number}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cabinet Card */}
        <div className="col-md-6">
          <div className="card border-start border-4 border-success h-100">
            <div className="card-header bg-light fw-semibold">
              <i className="bi bi-building me-2"></i>Cabinet
            </div>
            <div className="card-body">
              <h6 className="mb-2">{cabinetInfo?.name || appointment.cabinet_name || '-'}</h6>
              {cabinetInfo?.address && (
                <div className="text-muted small">
                  <i className="bi bi-geo-alt me-1"></i>{cabinetInfo.address}
                  {cabinetInfo.city ? `, ${cabinetInfo.city}` : ''}
                </div>
              )}
              {cabinetInfo?.phone && (
                <div className="text-muted small">
                  <i className="bi bi-telephone me-1"></i>{cabinetInfo.phone}
                </div>
              )}
              {cabinetInfo?.email && (
                <div className="text-muted small">
                  <i className="bi bi-envelope me-1"></i>{cabinetInfo.email}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAppointmentDetails = () => {
    const apt = appointment;

    return (
      <div className="card">
        <div className="card-header bg-light fw-semibold">
          <i className="bi bi-info-circle me-2"></i>Details du rendez-vous
        </div>
        <div className="card-body p-0">
          <table className="table table-borderless mb-0">
            <tbody>
              <tr>
                <th className="text-muted ps-3" style={{ width: '35%', whiteSpace: 'nowrap' }}>Date et heure</th>
                <td className="ps-3 fw-semibold">{formatDateTime(apt.date_time)}</td>
              </tr>
              <tr>
                <th className="text-muted ps-3">Duree</th>
                <td className="ps-3">{apt.duration ? `${apt.duration} minutes` : '-'}</td>
              </tr>
              <tr>
                <th className="text-muted ps-3">Statut</th>
                <td className="ps-3">{renderStatusBadge(apt.status, apt.status_display)}</td>
              </tr>
              <tr>
                <th className="text-muted ps-3">Type de consultation</th>
                <td className="ps-3">{apt.consultation_type_display || apt.consultation_type || '-'}</td>
              </tr>
              <tr>
                <th className="text-muted ps-3">Teleconsultation</th>
                <td className="ps-3">
                  {apt.is_teleconsultation ? (
                    <span className="badge bg-info">
                      <i className="bi bi-camera-video me-1"></i>Oui
                    </span>
                  ) : (
                    <span className="badge bg-light text-dark border">Non</span>
                  )}
                </td>
              </tr>
              {(apt.created_by_name || apt.approved_by_name) && (
                <tr>
                  <th className="text-muted ps-3">Cree par</th>
                  <td className="ps-3">{apt.created_by_name || '-'}</td>
                </tr>
              )}
              {apt.approved_by_name && (
                <tr>
                  <th className="text-muted ps-3">Approuve par</th>
                  <td className="ps-3">{apt.approved_by_name}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSymptomsSection = () => {
    if (!appointment.symptoms) return null;
    return (
      <div className="card">
        <div className="card-header bg-light fw-semibold">
          <i className="bi bi-clipboard2-pulse me-2"></i>Symptomes
        </div>
        <div className="card-body">
          <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{appointment.symptoms}</p>
        </div>
      </div>
    );
  };

  const renderNotesSection = () => {
    if (!appointment.notes) return null;
    return (
      <div className="card">
        <div className="card-header bg-light fw-semibold">
          <i className="bi bi-journal-text me-2"></i>Notes
        </div>
        <div className="card-body">
          <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{appointment.notes}</p>
        </div>
      </div>
    );
  };

  const renderCancellationSection = () => {
    if (appointment.status !== 'cancelled') return null;

    const reasonLabel =
      appointment.cancellation_reason_display ||
      CANCELLATION_REASON_LABELS[appointment.cancellation_reason] ||
      appointment.cancellation_reason ||
      '-';

    return (
      <div className="card border-start border-4 border-danger">
        <div className="card-header bg-danger bg-opacity-10 text-danger fw-semibold">
          <i className="bi bi-x-circle me-2"></i>Annulation
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-sm-6">
              <div className="text-muted small">Raison</div>
              <div className="fw-semibold">{reasonLabel}</div>
            </div>
            {appointment.cancellation_notes && (
              <div className="col-sm-6">
                <div className="text-muted small">Notes d'annulation</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{appointment.cancellation_notes}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPrescriptionsSection = () => {
    // Placeholder section - ready for prescriptions data when available
    return (
      <div className="card">
        <div className="card-header bg-light fw-semibold">
          <i className="bi bi-capsule me-2"></i>Ordonnances
        </div>
        <div className="card-body text-center text-muted py-4">
          <i className="bi bi-file-earmark-medical fs-3 d-block mb-2"></i>
          <p className="mb-0">Aucune ordonnance associee a ce rendez-vous.</p>
        </div>
      </div>
    );
  };

  const renderAttachmentsSection = () => {
    // Placeholder section - ready for attachments data when available
    return (
      <div className="card">
        <div className="card-header bg-light fw-semibold">
          <i className="bi bi-paperclip me-2"></i>Pieces jointes
        </div>
        <div className="card-body text-center text-muted py-4">
          <i className="bi bi-file-earmark fs-3 d-block mb-2"></i>
          <p className="mb-0">Aucune piece jointe associee a ce rendez-vous.</p>
        </div>
      </div>
    );
  };

  const renderTimestamps = () => {
    if (!appointment.created_at) return null;

    return (
      <div className="text-center text-muted small mt-4 py-3 border-top">
        <div className="row justify-content-center g-3">
          {appointment.created_at && (
            <div className="col-auto">
              <i className="bi bi-clock-history me-1"></i>
              Cree le {formatDateTime(appointment.created_at)}
            </div>
          )}
          {appointment.updated_at && (
            <div className="col-auto">
              <i className="bi bi-pencil me-1"></i>
              Modifie le {formatDateTime(appointment.updated_at)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCancelModal = () => (
    <div
      className={`modal fade ${showCancelModal ? 'show d-block' : ''}`}
      tabIndex={-1}
      role="dialog"
      style={showCancelModal ? { backgroundColor: 'rgba(0,0,0,0.5)' } : {}}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleCancelSubmit} noValidate>
            {/* Header */}
            <div className="modal-header bg-danger text-white">
              <h5 className="modal-title">
                <i className="bi bi-x-circle me-2"></i>Annuler le rendez-vous
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={handleCloseCancelModal}></button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {/* General error */}
              {cancelErrors._general && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {cancelErrors._general}
                </div>
              )}

              <div className="mb-3">
                <div className="alert alert-warning mb-3">
                  <i className="bi bi-exclamation-circle me-2"></i>
                  Etes-vous sur de vouloir annuler ce rendez-vous ? Cette action ne peut pas etre annulee.
                </div>
              </div>

              {/* Cancellation Reason */}
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Raison de l'annulation <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${cancelErrors.cancellation_reason ? 'is-invalid' : ''}`}
                  name="cancellation_reason"
                  value={cancelForm.cancellation_reason}
                  onChange={handleCancelFormChange}
                >
                  {CANCELLATION_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {cancelErrors.cancellation_reason && (
                  <div className="invalid-feedback">{cancelErrors.cancellation_reason}</div>
                )}
              </div>

              {/* Cancellation Notes */}
              <div className="mb-0">
                <label className="form-label fw-semibold">Notes d'annulation</label>
                <textarea
                  className="form-control"
                  name="cancellation_notes"
                  rows={3}
                  placeholder="Ajoutez des precisions sur l'annulation (optionnel)..."
                  value={cancelForm.cancellation_notes}
                  onChange={handleCancelFormChange}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseCancelModal}
                disabled={cancelling}
              >
                Retour
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={cancelling}
              >
                {cancelling ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Annulation en cours...
                  </>
                ) : (
                  <>
                    <i className="bi bi-x-circle me-1"></i>
                    Confirmer l'annulation
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

  if (loading) return <div className="container-fluid py-4">{renderLoading()}</div>;
  if (notFound) return <div className="container-fluid py-4">{renderNotFound()}</div>;
  if (forbidden) return <div className="container-fluid py-4">{renderForbidden()}</div>;
  if (error) return <div className="container-fluid py-4">{renderError()}</div>;
  if (!appointment) return null;

  return (
    <div className="container-fluid py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/" className="text-decoration-none">Tableau de bord</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/appointments/secretary/" className="text-decoration-none">Rendez-vous</Link>
          </li>
          <li className="breadcrumb-item active">
            Dossier #{id}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 gap-3">
        <div>
          <h4 className="mb-1 fw-bold">
            <i className="bi bi-calendar2-check me-2 text-primary"></i>
            Rendez-vous #{id}
          </h4>
          <div className="d-flex align-items-center gap-2">
            {renderStatusBadge(appointment.status, appointment.status_display)}
            <span className="text-muted small">
              {appointment.patient_name && ` - ${appointment.patient_name}`}
            </span>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary d-print-none"
            onClick={handlePrint}
          >
            <i className="bi bi-printer me-1"></i>Imprimer
          </button>
          <button
            className="btn btn-outline-secondary d-print-none"
            onClick={handleGoBack}
          >
            <i className="bi bi-arrow-left me-1"></i>Retour
          </button>
          {canCancel && (
            <button
              className="btn btn-outline-danger d-print-none"
              onClick={handleOpenCancelModal}
            >
              <i className="bi bi-x-circle me-1"></i>Annuler
            </button>
          )}
        </div>
      </div>

      {/* Patient Card */}
      <div className="row g-3 mb-4">
        <div className="col-lg-12">
          {renderPatientCard()}
        </div>
      </div>

      {/* Doctor + Cabinet */}
      <div className="mb-4">
        {renderDoctorCabinetCards()}
      </div>

      {/* Appointment Details */}
      <div className="mb-4">
        {renderAppointmentDetails()}
      </div>

      {/* Symptoms */}
      {renderSymptomsSection() && (
        <div className="mb-4">{renderSymptomsSection()}</div>
      )}

      {/* Notes */}
      {renderNotesSection() && (
        <div className="mb-4">{renderNotesSection()}</div>
      )}

      {/* Cancellation Info */}
      {renderCancellationSection() && (
        <div className="mb-4">{renderCancellationSection()}</div>
      )}

      {/* Prescriptions (placeholder) */}
      <div className="mb-4">
        {renderPrescriptionsSection()}
      </div>

      {/* Attachments (placeholder) */}
      <div className="mb-4">
        {renderAttachmentsSection()}
      </div>

      {/* Timestamps */}
      {renderTimestamps()}

      {/* Cancel Modal */}
      {renderCancelModal()}
    </div>
  );
};

export default SecretaryAppointmentDetail;