import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useNavigate, useParams } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Mapping tables                                                     */
/* ------------------------------------------------------------------ */

const STATUS_BADGE_CLASS = {
  scheduled: 'primary',
  confirmed: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'secondary',
  no_show: 'dark',
};

const STATUS_LABEL = {
  scheduled: 'Planifie',
  confirmed: 'Confirme',
  in_progress: 'En cours',
  completed: 'Termine',
  cancelled: 'Annule',
  no_show: 'Absent',
};

const CONSULTATION_LABEL = {
  first: 'Premiere consultation',
  followup: 'Suivi',
  emergency: 'Urgence',
  routine: 'Routine',
};

const CANCELLATION_REASON_LABEL = {
  patient: 'Patient',
  doctor: 'Medecin',
  emergency: 'Urgence',
  weather: 'Meteo',
  other: 'Autre',
};

const CANCELLATION_REASON_OPTIONS = [
  { value: 'patient', label: 'Patient - indisponible' },
  { value: 'doctor', label: 'Medecin - indisponible' },
  { value: 'emergency', label: 'Situation d\'urgence' },
  { value: 'weather', label: 'Conditions meteorologiques' },
  { value: 'other', label: 'Autre raison' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isAppointmentPast = (dateStr) => {
  if (!dateStr) return true;
  return new Date(dateStr) < new Date();
};

const CANCELLABLE_STATUSES = ['scheduled', 'confirmed'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const PatientAppointmentDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  /* ---- state ---- */
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  /* cancel modal */
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationNotes, setCancellationNotes] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  /* ---- fetch ---- */
  const fetchAppointment = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const { data } = await api.get(
        `/appointments/patient/records/${id}/`
      );
      setAppointment(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(
          err.response?.data?.detail ||
            err.response?.data?.message ||
            'Une erreur est survenue lors du chargement du rendez-vous.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  /* ---- derived ---- */
  const canCancel =
    appointment &&
    CANCELLABLE_STATUSES.includes(appointment.status) &&
    !isAppointmentPast(appointment.date_time);

  /* ---- handlers ---- */
  const handleBack = () => {
    navigate('/my-appointments');
  };

  const handleOpenCancelModal = () => {
    setCancellationReason('');
    setCancellationNotes('');
    setCancelError(null);
    setShowCancelModal(true);
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setCancelError(null);
  };

  const handleCancelAppointment = async () => {
    if (!cancellationReason) {
      setCancelError('Veuillez selectionner une raison d\'annulation.');
      return;
    }

    setCancelSubmitting(true);
    setCancelError(null);

    try {
      await api.post(`/appointments/patient/records/${id}/cancel/`, {
        cancellation_reason: cancellationReason,
        cancellation_notes: cancellationNotes || undefined,
      });

      setShowCancelModal(false);
      // Refetch the updated appointment
      await fetchAppointment();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.cancellation_reason?.[0] ||
        err.response?.data?.message ||
        'Une erreur est survenue lors de l\'annulation. Veuillez reessayer.';
      setCancelError(msg);
    } finally {
      setCancelSubmitting(false);
    }
  };

  /* ---- render helpers ---- */

  const renderStatusBadge = (status, statusDisplay) => (
    <span className={`badge bg-${STATUS_BADGE_CLASS[status] || 'secondary'} fs-6`}>
      {STATUS_LABEL[status] || statusDisplay || status}
    </span>
  );

  /* ============================= RENDER ============================= */

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    );
  }

  /* ---------- 404 ---------- */
  if (notFound) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            fill="currentColor"
            className="bi bi-question-circle text-muted mb-3"
            viewBox="0 0 16 16"
          >
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
            <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.318-2.673-2.318-1.387 0-2.324.847-2.446 2.079z" />
            <path d="M7.496 11.273a.982.982 0 0 0 1.008 0 .75.75 0 0 0 0-1.22.982.982 0 0 0-1.008 0 .75.75 0 0 0 0 1.22z" />
          </svg>
          <h4 className="text-muted">Rendez-vous introuvable</h4>
          <p className="text-muted">
            Le rendez-vous que vous recherchez n'existe pas ou a ete supprime.
          </p>
          <button className="btn btn-primary" onClick={handleBack}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              className="bi bi-arrow-left me-1"
              viewBox="0 0 16 16"
            >
              <path
                fillRule="evenodd"
                d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"
              />
            </svg>
            Retour a mes rendez-vous
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            className="bi bi-exclamation-triangle-fill me-2 flex-shrink-0"
            viewBox="0 0 16 16"
          >
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
          </svg>
          {error}
        </div>
        <button className="btn btn-outline-primary" onClick={handleBack}>
          Retour a mes rendez-vous
        </button>
      </div>
    );
  }

  if (!appointment) return null;

  /* ---------- Detail Content ---------- */
  return (
    <div className="container py-4">
      {/* Back button */}
      <button
        className="btn btn-outline-secondary btn-sm mb-3"
        onClick={handleBack}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          className="bi bi-arrow-left me-1"
          viewBox="0 0 16 16"
        >
          <path
            fillRule="evenodd"
            d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"
          />
        </svg>
        Retour
      </button>

      {/* ---------- Header ---------- */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            fill="currentColor"
            className="bi bi-calendar-check me-2 text-primary"
            viewBox="0 0 16 16"
          >
            <path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z" />
            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
          </svg>
          <div>
            <h4 className="mb-0 fw-bold">
              Rendez-vous #{appointment.id}
            </h4>
          </div>
        </div>
        <div className="mt-2 mt-md-0">
          {renderStatusBadge(appointment.status, appointment.status_display)}
        </div>
      </div>

      {/* ---------- Content Cards ---------- */}
      <div className="row g-4">
        {/* Left column: Doctor & Cabinet */}
        <div className="col-lg-5">
          {/* Doctor info card */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-primary bg-opacity-10 border-0 py-2 px-3">
              <h6 className="mb-0 fw-semibold text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  fill="currentColor"
                  className="bi bi-person-badge me-1"
                  viewBox="0 0 16 16"
                >
                  <path d="M6.5 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                  <path d="M4.5 0A2.5 2.5 0 0 0 2 2.5V14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2.5A2.5 2.5 0 0 0 11.5 0h-7zM3 2.5A1.5 1.5 0 0 1 4.5 1h7A1.5 1.5 0 0 1 13 2.5v10.795a4.2 4.2 0 0 0-.776-.492C11.392 12.387 10.063 12 8 12s-3.392.387-4.224.803a4.2 4.2 0 0 0-.776.492V2.5z" />
                </svg>
                Medecin
              </h6>
            </div>
            <div className="card-body">
              {appointment.doctor_info ? (
                <>
                  <h5 className="fw-bold mb-1">
                    Dr. {appointment.doctor_info.full_name || appointment.doctor_name}
                  </h5>
                  {appointment.doctor_info.specialty && (
                    <p className="mb-1">
                      <span className="text-muted small me-1">Specialite :</span>
                      <span className="fw-medium">{appointment.doctor_info.specialty}</span>
                    </p>
                  )}
                  {appointment.doctor_info.license_number && (
                    <p className="mb-1">
                      <span className="text-muted small me-1">N. licence :</span>
                      <span className="fw-medium">{appointment.doctor_info.license_number}</span>
                    </p>
                  )}
                  {appointment.doctor_info.email && (
                    <p className="mb-0">
                      <span className="text-muted small me-1">Email :</span>
                      <a
                        href={`mailto:${appointment.doctor_info.email}`}
                        className="text-decoration-none"
                      >
                        {appointment.doctor_info.email}
                      </a>
                    </p>
                  )}
                </>
              ) : (
                <p className="mb-0 fw-bold">
                  Dr. {appointment.doctor_name}
                </p>
              )}
            </div>
          </div>

          {/* Cabinet info card */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-primary bg-opacity-10 border-0 py-2 px-3">
              <h6 className="mb-0 fw-semibold text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  fill="currentColor"
                  className="bi bi-building me-1"
                  viewBox="0 0 16 16"
                >
                  <path d="M4 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-9 3A1.5 1.5 0 0 0 0 7v1.5A1.5 1.5 0 0 0 1.5 10H2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5h.5A1.5 1.5 0 0 0 16 8.5V7a1.5 1.5 0 0 0-1.5-1.5H15v-3A1.5 1.5 0 0 0 13.5 1h-11A1.5 1.5 0 0 0 1 2.5v3h-.5zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5v3h-12v-3zm-.5 4a.5.5 0 0 0-.5.5v1.5a.5.5 0 0 0 .5.5h.5v-3h-.5zm13.5 3h.5a.5.5 0 0 0 .5-.5V7a.5.5 0 0 0-.5-.5H15v3h-.5zM4 10v5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-5H4z" />
                </svg>
                Cabinet
              </h6>
            </div>
            <div className="card-body">
              {appointment.cabinet_info ? (
                <>
                  <h6 className="fw-bold mb-1">
                    {appointment.cabinet_info.name || appointment.cabinet_name}
                  </h6>
                  {appointment.cabinet_info.address && (
                    <p className="mb-1 small">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        fill="currentColor"
                        className="bi bi-geo-alt me-1"
                        viewBox="0 0 16 16"
                      >
                        <path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A31.493 31.493 0 0 1 8 14.58a31.481 31.481 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94zM8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10z" />
                        <path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                      </svg>
                      {appointment.cabinet_info.address}
                    </p>
                  )}
                  {appointment.cabinet_info.phone && (
                    <p className="mb-0 small">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        fill="currentColor"
                        className="bi bi-telephone me-1"
                        viewBox="0 0 16 16"
                      >
                        <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328z" />
                      </svg>
                      <a
                        href={`tel:${appointment.cabinet_info.phone}`}
                        className="text-decoration-none"
                      >
                        {appointment.cabinet_info.phone}
                      </a>
                    </p>
                  )}
                </>
              ) : (
                <p className="mb-0">
                  {appointment.cabinet_name || 'Non precise'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Appointment details */}
        <div className="col-lg-7">
          {/* Appointment details card */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-primary bg-opacity-10 border-0 py-2 px-3">
              <h6 className="mb-0 fw-semibold text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  fill="currentColor"
                  className="bi bi-info-circle me-1"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                  <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                </svg>
                Details du rendez-vous
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {/* Date & Time */}
                <div className="col-sm-6">
                  <p className="mb-0 small text-muted fw-semibold">Date et heure</p>
                  <p className="mb-0 fw-medium">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      className="bi bi-calendar-event me-1"
                      viewBox="0 0 16 16"
                    >
                      <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z" />
                      <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
                    </svg>
                    {formatDateTime(appointment.date_time)}
                  </p>
                </div>

                {/* Duration */}
                <div className="col-sm-6">
                  <p className="mb-0 small text-muted fw-semibold">Duree</p>
                  <p className="mb-0 fw-medium">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      className="bi bi-hourglass me-1"
                      viewBox="0 0 16 16"
                    >
                      <path d="M2 1.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06l-.562.28.562.28A4.5 4.5 0 0 1 12.5 12v1h1a.5.5 0 0 1 0 1h-11a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06l.562-.28-.562-.28A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1-.5-.5zm2.5.5v1a3.5 3.5 0 0 0 1.989 3.158L8 7.5l1.011-.342A3.5 3.5 0 0 0 11 4V2H4.5zM4 13v1h8v-1H4z" />
                    </svg>
                    {appointment.duration ? `${appointment.duration} minute${appointment.duration > 1 ? 's' : ''}` : '—'}
                  </p>
                </div>

                {/* Consultation type */}
                <div className="col-sm-6">
                  <p className="mb-0 small text-muted fw-semibold">Type de consultation</p>
                  <p className="mb-0">
                    <span className="badge bg-light text-dark border">
                      {CONSULTATION_LABEL[appointment.consultation_type] ||
                        appointment.consultation_type_display ||
                        appointment.consultation_type}
                    </span>
                  </p>
                </div>

                {/* Teleconsultation */}
                <div className="col-sm-6">
                  <p className="mb-0 small text-muted fw-semibold">Mode</p>
                  <p className="mb-0">
                    {appointment.is_teleconsultation ? (
                      <span className="badge border border-primary text-primary">
                        Teleconsultation
                      </span>
                    ) : (
                      <span className="badge border border-success text-success">
                        Consultation en cabinet
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Symptoms section */}
          {appointment.symptoms && (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-header bg-warning bg-opacity-10 border-0 py-2 px-3">
                <h6 className="mb-0 fw-semibold text-warning">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    className="bi bi-clipboard2-pulse me-1"
                    viewBox="0 0 16 16"
                  >
                    <path d="M9.5 0a.5.5 0 0 1 .5.5.5.5 0 0 0 .5.5.5.5 0 0 1 .5.5V2a.5.5 0 0 1-.5.5h-5A.5.5 0 0 1 5 2v-.5a.5.5 0 0 1 .5-.5.5.5 0 0 0 .5-.5.5.5 0 0 1 .5-.5h3Z" />
                    <path d="M3 2.5a.5.5 0 0 1 .5-.5A1.5 1.5 0 0 1 5 2v.5A1.5 1.5 0 0 1 3.5 4 1.5 1.5 0 0 1 2 2.5v-.5a.5.5 0 0 1 .5-.5h.5Z" />
                    <path d="M1 7.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v.5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-.5Zm4 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v.5a.5.5 0 0 1-.5.5H5.5a.5.5 0 0 1-.5-.5v-.5Zm4 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v.5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-.5Zm-6 4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v.5a.5.5 0 0 1-.5.5H3.5a.5.5 0 0 1-.5-.5v-.5Zm4 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v.5a.5.5 0 0 1-.5.5H7.5a.5.5 0 0 1-.5-.5v-.5Zm4 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v.5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-.5Z" />
                    <path d="M4 2v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2h-2v1a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V2H4Zm7 0v1h1V2h-1ZM5 2v1h1V2H5Z" />
                  </svg>
                  Symptomes
                </h6>
              </div>
              <div className="card-body">
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                  {appointment.symptoms}
                </p>
              </div>
            </div>
          )}

          {/* Notes section */}
          {appointment.notes && (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-header bg-info bg-opacity-10 border-0 py-2 px-3">
                <h6 className="mb-0 fw-semibold text-info">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    className="bi bi-journal-text me-1"
                    viewBox="0 0 16 16"
                  >
                    <path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z" />
                    <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z" />
                    <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z" />
                  </svg>
                  Notes
                </h6>
              </div>
              <div className="card-body">
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                  {appointment.notes}
                </p>
              </div>
            </div>
          )}

          {/* Cancellation info section */}
          {appointment.status === 'cancelled' && (
            <div className="card border-0 shadow-sm mb-3 border-start border-danger border-4">
              <div className="card-header bg-danger bg-opacity-10 border-0 py-2 px-3">
                <h6 className="mb-0 fw-semibold text-danger">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    className="bi bi-x-octagon me-1"
                    viewBox="0 0 16 16"
                  >
                    <path d="M4.54.146A.5.5 0 0 1 4.893 0h6.214a.5.5 0 0 1 .353.146l4.994 4.994a.5.5 0 0 1 .146.353v6.214a.5.5 0 0 1-.146.353l-4.994 4.994a.5.5 0 0 1-.353.146H4.893a.5.5 0 0 1-.353-.146L.146 11.46A.5.5 0 0 1 0 11.107V4.893a.5.5 0 0 1 .146-.353L4.54.146zM5.1 1 1 5.1v5.8L5.1 15h5.8l4.1-4.1V5.1L10.9 1H5.1z" />
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                  </svg>
                  Annulation
                </h6>
              </div>
              <div className="card-body">
                {appointment.cancellation_reason && (
                  <p className="mb-1">
                    <span className="text-muted small me-1">Raison :</span>
                    <span className="fw-medium">
                      {CANCELLATION_REASON_LABEL[appointment.cancellation_reason] ||
                        appointment.cancellation_reason_display ||
                        appointment.cancellation_reason}
                    </span>
                  </p>
                )}
                {appointment.cancellation_notes && (
                  <p className="mb-0">
                    <span className="text-muted small me-1">Details :</span>
                    <span>{appointment.cancellation_notes}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Reminders info */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-success bg-opacity-10 border-0 py-2 px-3">
              <h6 className="mb-0 fw-semibold text-success">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  fill="currentColor"
                  className="bi bi-bell me-1"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.805.78 1H1c.299-.195.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z" />
                </svg>
                Rappels
              </h6>
            </div>
            <div className="card-body py-2">
              <div className="d-flex flex-wrap gap-3">
                <span className="small">
                  {appointment.reminder_sent_24h ? (
                    <span className="text-success">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        fill="currentColor"
                        className="bi bi-check-circle-fill me-1"
                        viewBox="0 0 16 16"
                      >
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                      </svg>
                      Rappel 24h envoye
                    </span>
                  ) : (
                    <span className="text-muted">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        fill="currentColor"
                        className="bi bi-dash-circle me-1"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                        <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z" />
                      </svg>
                      Rappel 24h non envoye
                    </span>
                  )}
                </span>
                <span className="small">
                  {appointment.reminder_sent_1h ? (
                    <span className="text-success">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        fill="currentColor"
                        className="bi bi-check-circle-fill me-1"
                        viewBox="0 0 16 16"
                      >
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                      </svg>
                      Rappel 1h envoye
                    </span>
                  ) : (
                    <span className="text-muted">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        fill="currentColor"
                        className="bi bi-dash-circle me-1"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                        <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z" />
                      </svg>
                      Rappel 1h non envoye
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Cancel button */}
          {canCancel && (
            <div className="d-flex justify-content-end mt-3">
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleOpenCancelModal}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-x-circle me-1"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                </svg>
                Annuler le rendez-vous
              </button>
            </div>
          )}

          {/* Non-cancellable status notice */}
          {!canCancel && appointment.status !== 'cancelled' && appointment.status !== 'completed' && appointment.status !== 'no_show' && (
            <div className="alert alert-warning small py-2 mt-3 mb-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-info-circle me-1"
                viewBox="0 0 16 16"
              >
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
              </svg>
              Ce rendez-vous ne peut plus etre annule. Le rendez-vous est en cours.
            </div>
          )}

          {/* Past date notice */}
          {!canCancel && appointment.status === 'scheduled' && isAppointmentPast(appointment.date_time) && (
            <div className="alert alert-warning small py-2 mt-3 mb-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-info-circle me-1"
                viewBox="0 0 16 16"
              >
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
              </svg>
              La date de ce rendez-vous est passee. L'annulation n'est plus possible.
            </div>
          )}
        </div>
      </div>

      {/* ---------- Timestamps ---------- */}
      <div className="card border-0 shadow-sm mt-4">
        <div className="card-body py-2">
          <div className="row small text-muted">
            <div className="col-sm-6">
              <span className="fw-semibold">Cree le :</span>{' '}
              {appointment.created_by_name
                ? `${appointment.created_by_name} - `
                : ''}
              {formatDate(appointment.created_at)}
            </div>
            <div className="col-sm-6">
              <span className="fw-semibold">Modifie le :</span>{' '}
              {appointment.last_modified_by_name
                ? `${appointment.last_modified_by_name} - `
                : ''}
              {formatDate(appointment.updated_at)}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Cancel Modal ---------- */}
      {showCancelModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="currentColor"
                    className="bi bi-exclamation-triangle text-warning me-2"
                    viewBox="0 0 16 16"
                  >
                    <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057zm1.044-.451a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z" />
                    <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995z" />
                  </svg>
                  Confirmer l'annulation
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseCancelModal}
                  disabled={cancelSubmitting}
                  aria-label="Fermer"
                />
              </div>

              <div className="modal-body">
                <p className="mb-3">
                  Etes-vous sur de vouloir annuler votre rendez-vous avec{' '}
                  <strong>Dr. {appointment.doctor_name}</strong> du{' '}
                  <strong>{formatDateTime(appointment.date_time)}</strong> ?
                </p>

                {/* Cancellation error */}
                {cancelError && (
                  <div className="alert alert-danger small py-2" role="alert">
                    {cancelError}
                  </div>
                )}

                {/* Cancellation reason */}
                <div className="mb-3">
                  <label
                    htmlFor="cancellation-reason"
                    className="form-label fw-semibold"
                  >
                    Raison de l'annulation <span className="text-danger">*</span>
                  </label>
                  <select
                    id="cancellation-reason"
                    className="form-select"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    disabled={cancelSubmitting}
                  >
                    <option value="">-- Selectionnez une raison --</option>
                    {CANCELLATION_REASON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cancellation notes */}
                <div className="mb-0">
                  <label
                    htmlFor="cancellation-notes"
                    className="form-label fw-semibold"
                  >
                    Notes supplementaires (optionnel)
                  </label>
                  <textarea
                    id="cancellation-notes"
                    className="form-control"
                    rows={3}
                    placeholder="Ajoutez des details supplementaires si necessaire..."
                    value={cancellationNotes}
                    onChange={(e) => setCancellationNotes(e.target.value)}
                    disabled={cancelSubmitting}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleCloseCancelModal}
                  disabled={cancelSubmitting}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleCancelAppointment}
                  disabled={cancelSubmitting || !cancellationReason}
                >
                  {cancelSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-1"
                        role="status"
                        aria-hidden="true"
                      />
                      Annulation en cours...
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-x-circle me-1"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                      </svg>
                      Confirmer l'annulation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientAppointmentDetail;