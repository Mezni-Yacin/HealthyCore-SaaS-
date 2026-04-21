import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const CANCELLATION_REASON_MAP = {
  patient:  'Patient',
  doctor:   'Medecin',
  emergency: 'Urgence',
  weather:  'Meteo',
  other:    'Autre',
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

export default function DoctorAppointmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  // ── Data state ──────────────────────────────────────────────────────────

  const [appointment, setAppointment] = useState(null);
  const [cabinets, setCabinets] = useState([]);

  // ── UI state ────────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Edit mode ───────────────────────────────────────────────────────────

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Cancel modal ────────────────────────────────────────────────────────

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelForm, setCancelForm] = useState({
    cancellation_reason: '',
    cancellation_notes: '',
  });
  const [cancelErrors, setCancelErrors] = useState({});
  const [cancelling, setCancelling] = useState(false);

  // ── Status action state ─────────────────────────────────────────────────

  const [actionLoading, setActionLoading] = useState('');
  const [actionError, setActionError] = useState('');

  // ── API calls ───────────────────────────────────────────────────────────

  const fetchAppointment = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/appointments/doctor/${id}/`);
      setAppointment(res.data);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Erreur lors du chargement du rendez-vous.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchCabinets = useCallback(async () => {
    try {
      const res = await api.get('/appointments/doctor/cabinets-dropdown/');
      setCabinets(res.data || []);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchAppointment();
    fetchCabinets();
  }, [fetchAppointment, fetchCabinets]);

  // ── Initialize edit form from current data ──────────────────────────────

  const startEditing = () => {
    if (!appointment) return;
    setEditForm({
      date_time: toLocalDatetimeString(appointment.date_time),
      duration: appointment.duration,
      cabinet: appointment.cabinet,
      consultation_type: appointment.consultation_type,
      symptoms: appointment.symptoms || '',
      notes: appointment.notes || '',
      is_teleconsultation: appointment.is_teleconsultation || false,
    });
    setEditErrors({});
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditForm({});
    setEditErrors({});
    setSaving(false);
  };

  // ── Edit handlers ───────────────────────────────────────────────────────

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (editErrors[name]) {
      setEditErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateEditForm = () => {
    const errors = {};

    if (!editForm.date_time) {
      errors.date_time = 'La date et heure sont requises.';
    }
    if (!editForm.duration || Number(editForm.duration) <= 0) {
      errors.duration = 'La duree doit etre superieure a 0.';
    }
    if (Number(editForm.duration) > 480) {
      errors.duration = 'La duree ne peut pas depasser 480 minutes.';
    }
    if (!editForm.cabinet) {
      errors.cabinet = 'Le cabinet est requis.';
    }
    if (!editForm.consultation_type) {
      errors.consultation_type = 'Le type de consultation est requis.';
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;

    setSaving(true);
    try {
      const payload = {
        date_time: editForm.date_time,
        duration: Number(editForm.duration),
        cabinet: Number(editForm.cabinet),
        consultation_type: editForm.consultation_type,
        symptoms: editForm.symptoms,
        notes: editForm.notes,
        is_teleconsultation: editForm.is_teleconsultation,
      };

      const res = await api.patch(`/appointments/doctor/${id}/`, payload);
      setAppointment(res.data);
      cancelEditing();
    } catch (err) {
      if (err.response?.data) {
        const apiErrors = err.response.data;
        if (typeof apiErrors === 'object') {
          const fieldErrors = {};
          Object.entries(apiErrors).forEach(([key, messages]) => {
            fieldErrors[key] = Array.isArray(messages) ? messages.join(' ') : String(messages);
          });
          setEditErrors(fieldErrors);
        }
      } else {
        setEditErrors({ _general: 'Erreur lors de la mise a jour.' });
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Status actions ──────────────────────────────────────────────────────

  const handleStatusAction = async (action) => {
    setActionLoading(action);
    setActionError('');
    try {
      const res = await api.post(`/appointments/doctor/${id}/${action}/`);
      setAppointment(res.data);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Erreur lors du changement de statut.';
      setActionError(msg);
    } finally {
      setActionLoading('');
    }
  };

  // ── Cancel modal handlers ───────────────────────────────────────────────

  const openCancelModal = () => {
    setCancelForm({ cancellation_reason: '', cancellation_notes: '' });
    setCancelErrors({});
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancelForm({ cancellation_reason: '', cancellation_notes: '' });
    setCancelErrors({});
    setCancelling(false);
  };

  const handleCancelChange = (e) => {
    const { name, value } = e.target;
    setCancelForm((prev) => ({ ...prev, [name]: value }));
    if (cancelErrors[name]) {
      setCancelErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!cancelForm.cancellation_reason) {
      errors.cancellation_reason = 'La raison est obligatoire.';
    }
    setCancelErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCancelling(true);
    try {
      const payload = {
        cancellation_reason: cancelForm.cancellation_reason,
        cancellation_notes: cancelForm.cancellation_notes,
      };
      const res = await api.post(`/appointments/doctor/${id}/cancel/`, payload);
      setAppointment(res.data);
      closeCancelModal();
    } catch (err) {
      if (err.response?.data) {
        const apiErrors = err.response.data;
        if (typeof apiErrors === 'object') {
          const fieldErrors = {};
          Object.entries(apiErrors).forEach(([key, messages]) => {
            fieldErrors[key] = Array.isArray(messages) ? messages.join(' ') : String(messages);
          });
          setCancelErrors(fieldErrors);
        }
      } else {
        setCancelErrors({ _general: "Erreur lors de l'annulation." });
      }
    } finally {
      setCancelling(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-2 text-muted">Chargement du rendez-vous...</p>
        </div>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="container-fluid py-4">
        <button className="btn btn-outline-secondary mb-3" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left me-1"></i>
          Retour
        </button>
        <div className="alert alert-danger d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      </div>
    );
  }

  if (!appointment) return null;

  const statusInfo = STATUS_MAP[appointment.status] || {
    label: appointment.status_display || appointment.status,
    badge: 'secondary',
  };

  const canConfirm = appointment.status === 'scheduled';
  const canStart = appointment.status === 'confirmed' || appointment.status === 'scheduled';
  const canComplete = appointment.status === 'in_progress' || appointment.status === 'confirmed';
  const canCancel = !['completed', 'cancelled'].includes(appointment.status);
  const canEdit = !['completed', 'cancelled'].includes(appointment.status);

  return (
    <div className="container-fluid py-4">
      {/* ── Back + header ────────────────────────────────────────────── */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <button
            className="btn btn-outline-secondary btn-sm mb-2"
            onClick={() => navigate(-1)}
          >
            <i className="bi bi-arrow-left me-1"></i>
            Retour
          </button>
          <h4 className="fw-bold mb-1">
            Rendez-vous #{appointment.id}
          </h4>
          <p className="text-muted mb-0">
            Cree le {formatDateTime(appointment.created_at)}
            {appointment.last_modified_by_name && (
              <span className="ms-2">
                | Modifie par {appointment.last_modified_by_name}
              </span>
            )}
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {canEdit && !editing && (
            <button className="btn btn-outline-primary" onClick={startEditing}>
              <i className="bi bi-pencil me-1"></i>
              Modifier
            </button>
          )}
          {editing && (
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={cancelEditing}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEditSubmit}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-1"></i>
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Action error ─────────────────────────────────────────────── */}
      {actionError && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {actionError}
          <button className="btn-close ms-auto" onClick={() => setActionError('')}></button>
        </div>
      )}

      {/* ── Status + Type badges ─────────────────────────────────────── */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        <span className={`badge bg-${statusInfo.badge} fs-6 px-3 py-2`}>
          {statusInfo.label}
        </span>
        <span className="badge bg-light text-dark border fs-6 px-3 py-2">
          {CONSULTATION_TYPE_MAP[appointment.consultation_type] || appointment.consultation_type_display || '-'}
        </span>
        {appointment.is_teleconsultation && (
          <span className="badge bg-info text-dark fs-6 px-3 py-2">
            <i className="bi bi-camera-video me-1"></i>
            Teleconsultation
          </span>
        )}
      </div>

      {/* ── Main info cards ──────────────────────────────────────────── */}
      <div className="row g-3 mb-4">
        {/* Patient info */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-0 pt-3 pb-0">
              <h6 className="fw-bold text-primary mb-0">
                <i className="bi bi-person me-1"></i>
                Patient
              </h6>
            </div>
            <div className="card-body">
              {appointment.patient_info ? (
                <div>
                  <h5 className="fw-bold mb-2">
                    {appointment.patient_info.full_name || '-'}
                  </h5>
                  <ul className="list-unstyled mb-0 space-y-1">
                    {appointment.patient_info.phone_number && (
                      <li className="mb-1">
                        <i className="bi bi-telephone text-muted me-2"></i>
                        {appointment.patient_info.phone_number}
                      </li>
                    )}
                    {appointment.patient_info.email && (
                      <li className="mb-1">
                        <i className="bi bi-envelope text-muted me-2"></i>
                        {appointment.patient_info.email}
                      </li>
                    )}
                    {appointment.patient_info.date_of_birth && (
                      <li className="mb-1">
                        <i className="bi bi-calendar3 text-muted me-2"></i>
                        Date de naissance : {formatDate(appointment.patient_info.date_of_birth)}
                      </li>
                    )}
                    {appointment.patient_info.gender && (
                      <li className="mb-1">
                        <i className="bi bi-gender-ambiguous text-muted me-2"></i>
                        Genre : {appointment.patient_info.gender}
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <p className="text-muted mb-0">-</p>
              )}
            </div>
          </div>
        </div>

        {/* Cabinet info */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-0 pt-3 pb-0">
              <h6 className="fw-bold text-primary mb-0">
                <i className="bi bi-building me-1"></i>
                Cabinet
              </h6>
            </div>
            <div className="card-body">
              {appointment.cabinet_info ? (
                <div>
                  <h5 className="fw-bold mb-2">
                    {appointment.cabinet_info.name || '-'}
                  </h5>
                  <ul className="list-unstyled mb-0">
                    {appointment.cabinet_info.address && (
                      <li className="mb-1">
                        <i className="bi bi-geo-alt text-muted me-2"></i>
                        {appointment.cabinet_info.address}
                      </li>
                    )}
                    {appointment.cabinet_info.city && (
                      <li className="mb-1">
                        <i className="bi bi-pin-map text-muted me-2"></i>
                        {appointment.cabinet_info.city}
                      </li>
                    )}
                    {appointment.cabinet_info.phone && (
                      <li className="mb-1">
                        <i className="bi bi-telephone text-muted me-2"></i>
                        {appointment.cabinet_info.phone}
                      </li>
                    )}
                    {appointment.cabinet_info.email && (
                      <li className="mb-1">
                        <i className="bi bi-envelope text-muted me-2"></i>
                        {appointment.cabinet_info.email}
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <p className="text-muted mb-0">-</p>
              )}
            </div>
          </div>
        </div>

        {/* Doctor info */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-0 pt-3 pb-0">
              <h6 className="fw-bold text-primary mb-0">
                <i className="bi bi-heart-pulse me-1"></i>
                Medecin
              </h6>
            </div>
            <div className="card-body">
              {appointment.doctor_info ? (
                <div>
                  <h5 className="fw-bold mb-2">
                    {appointment.doctor_info.full_name || '-'}
                  </h5>
                  <ul className="list-unstyled mb-0">
                    {appointment.doctor_info.specialty && (
                      <li className="mb-1">
                        <i className="bi bi-briefcase-medical text-muted me-2"></i>
                        {appointment.doctor_info.specialty}
                      </li>
                    )}
                    {appointment.doctor_info.email && (
                      <li className="mb-1">
                        <i className="bi bi-envelope text-muted me-2"></i>
                        {appointment.doctor_info.email}
                      </li>
                    )}
                    {appointment.doctor_info.license_number && (
                      <li className="mb-1">
                        <i className="bi bi-card-text text-muted me-2"></i>
                        N. licence : {appointment.doctor_info.license_number}
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <p className="text-muted mb-0">-</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit form ────────────────────────────────────────────────── */}
      {editing && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-transparent border-0">
            <h6 className="fw-bold mb-0">
              <i className="bi bi-pencil-square me-1"></i>
              Modifier le rendez-vous
            </h6>
          </div>
          <div className="card-body">
            {editErrors._general && (
              <div className="alert alert-danger">{editErrors._general}</div>
            )}

            <div className="row g-3">
              {/* Date/time */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Date et heure <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  className={`form-control ${editErrors.date_time ? 'is-invalid' : ''}`}
                  name="date_time"
                  value={editForm.date_time || ''}
                  onChange={handleEditChange}
                />
                {editErrors.date_time && (
                  <div className="invalid-feedback">{editErrors.date_time}</div>
                )}
              </div>

              {/* Duration */}
              <div className="col-md-3">
                <label className="form-label fw-semibold">
                  Duree (min) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  className={`form-control ${editErrors.duration ? 'is-invalid' : ''}`}
                  name="duration"
                  value={editForm.duration || ''}
                  onChange={handleEditChange}
                  min="5"
                  max="480"
                />
                {editErrors.duration && (
                  <div className="invalid-feedback">{editErrors.duration}</div>
                )}
              </div>

              {/* Cabinet */}
              <div className="col-md-3">
                <label className="form-label fw-semibold">
                  Cabinet <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${editErrors.cabinet ? 'is-invalid' : ''}`}
                  name="cabinet"
                  value={editForm.cabinet || ''}
                  onChange={handleEditChange}
                >
                  <option value="">-- Selectionner --</option>
                  {cabinets.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.address ? ` - ${c.address}` : ''}
                    </option>
                  ))}
                </select>
                {editErrors.cabinet && (
                  <div className="invalid-feedback">{editErrors.cabinet}</div>
                )}
              </div>

              {/* Consultation type */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Type de consultation <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${editErrors.consultation_type ? 'is-invalid' : ''}`}
                  name="consultation_type"
                  value={editForm.consultation_type || ''}
                  onChange={handleEditChange}
                >
                  {Object.entries(CONSULTATION_TYPE_MAP).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                {editErrors.consultation_type && (
                  <div className="invalid-feedback">{editErrors.consultation_type}</div>
                )}
              </div>

              {/* Teleconsultation */}
              <div className="col-md-6">
                <div className="form-check mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="is_teleconsultation"
                    id="editTeleconsultation"
                    checked={editForm.is_teleconsultation || false}
                    onChange={handleEditChange}
                  />
                  <label className="form-check-label" htmlFor="editTeleconsultation">
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
                  placeholder="Symptomes du patient..."
                  value={editForm.symptoms || ''}
                  onChange={handleEditChange}
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
                  value={editForm.notes || ''}
                  onChange={handleEditChange}
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Read-only details ────────────────────────────────────────── */}
      {!editing && (
        <div className="row g-3 mb-4">
          {/* Symptoms */}
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent border-0 pt-3 pb-0">
                <h6 className="fw-bold mb-0">
                  <i className="bi bi-clipboard2-pulse me-1"></i>
                  Symptomes
                </h6>
              </div>
              <div className="card-body">
                {appointment.symptoms ? (
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {appointment.symptoms}
                  </p>
                ) : (
                  <p className="text-muted mb-0 fst-italic">Aucun symptome renseigne.</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent border-0 pt-3 pb-0">
                <h6 className="fw-bold mb-0">
                  <i className="bi bi-journal-text me-1"></i>
                  Notes
                </h6>
              </div>
              <div className="card-body">
                {appointment.notes ? (
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {appointment.notes}
                  </p>
                ) : (
                  <p className="text-muted mb-0 fst-italic">Aucune note.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancellation info ────────────────────────────────────────── */}
      {appointment.status === 'cancelled' && (
        <div className="card border-0 shadow-sm mb-4 border-start border-danger border-4">
          <div className="card-body">
            <h6 className="fw-bold text-danger mb-3">
              <i className="bi bi-x-circle me-1"></i>
              Informations d'annulation
            </h6>
            <div className="row g-2">
              <div className="col-md-4">
                <span className="text-muted small">Raison :</span>
                <div className="fw-semibold">
                  {appointment.cancellation_reason_display ||
                    CANCELLATION_REASON_MAP[appointment.cancellation_reason] ||
                    appointment.cancellation_reason ||
                    '-'}
                </div>
              </div>
              {appointment.cancellation_notes && (
                <div className="col-md-8">
                  <span className="text-muted small">Notes :</span>
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {appointment.cancellation_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Appointment details table ────────────────────────────────── */}
      {!editing && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-transparent border-0">
            <h6 className="fw-bold mb-0">
              <i className="bi bi-info-circle me-1"></i>
              Details
            </h6>
          </div>
          <div className="card-body p-0">
            <table className="table table-borderless mb-0">
              <tbody>
                <tr>
                  <th className="ps-3 text-muted" style={{ width: '200px' }}>Date / Heure</th>
                  <td className="fw-semibold">{formatDateTime(appointment.date_time)}</td>
                </tr>
                <tr>
                  <th className="ps-3 text-muted">Duree</th>
                  <td>{appointment.duration ? `${appointment.duration} minutes` : '-'}</td>
                </tr>
                <tr>
                  <th className="ps-3 text-muted">Statut</th>
                  <td>
                    <span className={`badge bg-${statusInfo.badge}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                </tr>
                <tr>
                  <th className="ps-3 text-muted">Type de consultation</th>
                  <td>
                    {CONSULTATION_TYPE_MAP[appointment.consultation_type] ||
                      appointment.consultation_type_display ||
                      '-'}
                  </td>
                </tr>
                <tr>
                  <th className="ps-3 text-muted">Teleconsultation</th>
                  <td>
                    {appointment.is_teleconsultation ? (
                      <span className="text-primary fw-semibold">Oui</span>
                    ) : (
                      <span className="text-muted">Non</span>
                    )}
                  </td>
                </tr>
                {appointment.approved_by_name && (
                  <tr>
                    <th className="ps-3 text-muted">Confirme par</th>
                    <td>{appointment.approved_by_name}</td>
                  </tr>
                )}
                {appointment.created_by_name && (
                  <tr>
                    <th className="ps-3 text-muted">Cree par</th>
                    <td>{appointment.created_by_name}</td>
                  </tr>
                )}
                <tr>
                  <th className="ps-3 text-muted">Derniere modification</th>
                  <td>{formatDateTime(appointment.updated_at)}</td>
                </tr>
                <tr>
                  <th className="ps-3 text-muted">Rappel 24h</th>
                  <td>
                    {appointment.reminder_sent_24h ? (
                      <span className="text-success"><i className="bi bi-check-circle me-1"></i>Envoye</span>
                    ) : (
                      <span className="text-muted"><i className="bi bi-dash-circle me-1"></i>Non envoye</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <th className="ps-3 text-muted">Rappel 1h</th>
                  <td>
                    {appointment.reminder_sent_1h ? (
                      <span className="text-success"><i className="bi bi-check-circle me-1"></i>Envoye</span>
                    ) : (
                      <span className="text-muted"><i className="bi bi-dash-circle me-1"></i>Non envoye</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Status action buttons ────────────────────────────────────── */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent border-0">
          <h6 className="fw-bold mb-0">
            <i className="bi bi-lightning me-1"></i>
            Actions
          </h6>
        </div>
        <div className="card-body">
          <div className="d-flex flex-wrap gap-2">
            {canConfirm && (
              <button
                className="btn btn-info text-white"
                onClick={() => handleStatusAction('confirm')}
                disabled={actionLoading === 'confirm'}
              >
                {actionLoading === 'confirm' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Confirmation...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-1"></i>
                    Confirmer
                  </>
                )}
              </button>
            )}

            {canStart && (
              <button
                className="btn btn-warning text-dark"
                onClick={() => handleStatusAction('start')}
                disabled={actionLoading === 'start'}
              >
                {actionLoading === 'start' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Demarrage...
                  </>
                ) : (
                  <>
                    <i className="bi bi-play-circle me-1"></i>
                    Commencer
                  </>
                )}
              </button>
            )}

            {canComplete && (
              <button
                className="btn btn-success"
                onClick={() => handleStatusAction('complete')}
                disabled={actionLoading === 'complete'}
              >
                {actionLoading === 'complete' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Completion...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle me-1"></i>
                    Terminer
                  </>
                )}
              </button>
            )}

            {canCancel && (
              <button
                className="btn btn-outline-danger"
                onClick={openCancelModal}
                disabled={!!actionLoading}
              >
                <i className="bi bi-x-circle me-1"></i>
                Annuler
              </button>
            )}
          </div>

          {(!canConfirm && !canStart && !canComplete && !canCancel) && (
            <p className="text-muted mb-0 fst-italic">
              Aucune action disponible pour ce rendez-vous.
            </p>
          )}
        </div>
      </div>

      {/* ── Cancel modal ─────────────────────────────────────────────── */}
      {showCancelModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCancelModal();
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-x-circle text-danger me-2"></i>
                  Annuler le rendez-vous
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeCancelModal}
                  disabled={cancelling}
                ></button>
              </div>

              <form onSubmit={handleCancelSubmit}>
                <div className="modal-body">
                  {cancelErrors._general && (
                    <div className="alert alert-danger">{cancelErrors._general}</div>
                  )}

                  <p className="text-muted mb-3">
                    Veuillez indiquer la raison de l'annulation du rendez-vous.
                  </p>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Raison de l'annulation <span className="text-danger">*</span>
                    </label>
                    <select
                      className={`form-select ${cancelErrors.cancellation_reason ? 'is-invalid' : ''}`}
                      name="cancellation_reason"
                      value={cancelForm.cancellation_reason}
                      onChange={handleCancelChange}
                      disabled={cancelling}
                    >
                      <option value="">-- Selectionner une raison --</option>
                      {Object.entries(CANCELLATION_REASON_MAP).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {cancelErrors.cancellation_reason && (
                      <div className="invalid-feedback">{cancelErrors.cancellation_reason}</div>
                    )}
                  </div>

                  <div className="mb-0">
                    <label className="form-label fw-semibold">
                      Notes (optionnel)
                    </label>
                    <textarea
                      className="form-control"
                      name="cancellation_notes"
                      rows="3"
                      placeholder="Precisez si necessaire..."
                      value={cancelForm.cancellation_notes}
                      onChange={handleCancelChange}
                      disabled={cancelling}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={closeCancelModal}
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
                        Annulation...
                      </>
                    ) : (
                      'Confirmer l\'annulation'
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