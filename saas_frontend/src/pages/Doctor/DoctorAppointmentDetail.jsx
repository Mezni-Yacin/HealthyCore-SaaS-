import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const cardStyle = { borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };
const iconBox = (color) => ({ width: '48px', height: '48px', borderRadius: '12px', background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' });

const STATUS_MAP = {
  scheduled:       { label: 'Programmé',      badge: 'bg-primary-subtle text-primary' },
  confirmed:       { label: 'Confirmé',       badge: 'bg-info-subtle text-info' },
  in_progress:     { label: 'En cours',       badge: 'bg-warning-subtle text-warning' },
  completed:       { label: 'Terminé',        badge: 'bg-success-subtle text-success' },
  cancelled:       { label: 'Annulé',         badge: 'bg-secondary-subtle text-secondary' },
  no_show:         { label: 'Absent',         badge: 'bg-dark-subtle text-dark' },
};

const CONSULTATION_TYPE_MAP = {
  first: 'Première consultation', followup: 'Suivi', emergency: 'Urgence', routine: 'Routine',
};

const CANCELLATION_REASON_MAP = {
  patient: 'Patient', doctor: 'Médecin', emergency: 'Urgence', weather: 'Météo', other: 'Autre',
};

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toLocalDatetimeString(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DoctorAppointmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [appointment, setAppointment] = useState(null);
  const [cabinets, setCabinets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelForm, setCancelForm] = useState({ cancellation_reason: '', cancellation_notes: '' });
  const [cancelErrors, setCancelErrors] = useState({});
  const [cancelling, setCancelling] = useState(false);

  const [actionLoading, setActionLoading] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchAppointment = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get(`/appointments/doctor/${id}/`);
      setAppointment(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement du rendez-vous.');
    } finally { setLoading(false); }
  }, [id]);

  const fetchCabinets = useCallback(async () => {
    try { const res = await api.get('/appointments/doctor/cabinets-dropdown/'); setCabinets(res.data || []); } catch {}
  }, []);

  useEffect(() => { fetchAppointment(); fetchCabinets(); }, [fetchAppointment, fetchCabinets]);

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
    setEditErrors({}); setEditing(true);
  };

  const cancelEditing = () => { setEditing(false); setEditForm({}); setEditErrors({}); setSaving(false); };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (editErrors[name]) setEditErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setEditErrors({});
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
      if (err.response?.data && typeof err.response.data === 'object') setEditErrors(err.response.data);
      else setEditErrors({ _general: 'Erreur lors de la mise à jour.' });
    } finally { setSaving(false); }
  };

  const handleStatusAction = async (action) => {
    setActionLoading(action); setActionError('');
    try {
      const res = await api.post(`/appointments/doctor/${id}/${action}/`);
      setAppointment(res.data);
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Erreur lors du changement de statut.');
    } finally { setActionLoading(''); }
  };

  const openCancelModal = () => { setCancelForm({ cancellation_reason: '', cancellation_notes: '' }); setCancelErrors({}); setShowCancelModal(true); };
  const closeCancelModal = () => { setShowCancelModal(false); setCancelErrors({}); setCancelling(false); };

  const handleCancelChange = (e) => {
    const { name, value } = e.target;
    setCancelForm(prev => ({ ...prev, [name]: value }));
    if (cancelErrors[name]) setCancelErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelForm.cancellation_reason) { setCancelErrors({ cancellation_reason: 'La raison est obligatoire.' }); return; }
    setCancelling(true);
    try {
      const res = await api.post(`/appointments/doctor/${id}/cancel/`, cancelForm);
      setAppointment(res.data);
      closeCancelModal();
    } catch (err) {
      if (err.response?.data && typeof err.response.data === 'object') setCancelErrors(err.response.data);
      else setCancelErrors({ _general: "Erreur lors de l'annulation." });
    } finally { setCancelling(false); }
  };

  if (loading) return <div className="container-fluid py-5 text-center"><div className="spinner-border text-primary"></div></div>;
  if (error && !appointment) return <div className="container-fluid py-4"><div className="alert alert-danger">{error}</div><button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Retour</button></div>;
  if (!appointment) return null;

  const statusInfo = STATUS_MAP[appointment.status] || { label: appointment.status, badge: 'bg-secondary-subtle text-secondary' };
  const canConfirm = appointment.status === 'scheduled';
  const canStart = appointment.status === 'confirmed' || appointment.status === 'scheduled';
  const canComplete = appointment.status === 'in_progress' || appointment.status === 'confirmed';
  const canCancel = !['completed', 'cancelled'].includes(appointment.status);
  const canEdit = !['completed', 'cancelled'].includes(appointment.status);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-light btn-sm rounded-3 p-2" onClick={() => navigate(-1)}><i className="bi bi-arrow-left fs-6"></i></button>
          <div>
            <h2 className="fw-bold mb-1 h4">Rendez-vous #{appointment.id}</h2>
            <p className="text-muted mb-0">Créé le {formatDateTime(appointment.created_at)}</p>
          </div>
        </div>
        <div className="d-flex gap-2">
          {canEdit && !editing && <button className="btn btn-outline-primary rounded-3 px-4" onClick={startEditing}><i className="bi bi-pencil me-1"></i>Modifier</button>}
          {editing && (
            <>
              <button className="btn btn-light rounded-3 px-4" onClick={cancelEditing}>Annuler</button>
              <button className="btn btn-success rounded-3 px-4" onClick={handleEditSubmit} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Sauvegarde...</> : <><i className="bi bi-check-lg me-1"></i>Enregistrer</>}
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && <div className="alert alert-danger">{actionError}</div>}

      <div className="d-flex flex-wrap gap-2 mb-4">
        <span className={`badge ${statusInfo.badge} px-3 py-2`}>{statusInfo.label}</span>
        <span className="badge bg-light text-dark border px-3 py-2">{CONSULTATION_TYPE_MAP[appointment.consultation_type] || appointment.consultation_type_display || '—'}</span>
        {appointment.is_teleconsultation && <span className="badge bg-info-subtle text-info px-3 py-2"><i className="bi bi-camera-video me-1"></i>Téléconsultation</span>}
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card h-100 p-3" style={cardStyle}>
            <div className="d-flex align-items-center gap-3">
              <div style={iconBox('#2563eb')}><i className="bi bi-person-fill"></i></div>
              <div>
                <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Patient</small>
                <h6 className="mb-0">{appointment.patient_info?.full_name || '—'}</h6>
                {appointment.patient_info?.phone_number && <small className="text-muted">{appointment.patient_info.phone_number}</small>}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100 p-3" style={cardStyle}>
            <div className="d-flex align-items-center gap-3">
              <div style={iconBox('#7c3aed')}><i className="bi bi-building"></i></div>
              <div>
                <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Cabinet</small>
                <h6 className="mb-0">{appointment.cabinet_info?.name || '—'}</h6>
                {appointment.cabinet_info?.city && <small className="text-muted">{appointment.cabinet_info.city}</small>}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100 p-3" style={cardStyle}>
            <div className="d-flex align-items-center gap-3">
              <div style={iconBox('#059669')}><i className="bi bi-heart-pulse"></i></div>
              <div>
                <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Médecin</small>
                <h6 className="mb-0">{appointment.doctor_info?.full_name || '—'}</h6>
                {appointment.doctor_info?.specialty && <small className="text-muted">{appointment.doctor_info.specialty}</small>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="card mb-4" style={cardStyle}>
          <div className="card-header bg-white border-0 py-3"><h6 className="fw-bold mb-0"><i className="bi bi-pencil-square me-2 text-primary"></i>Modifier le rendez-vous</h6></div>
          <div className="card-body">
            {editErrors._general && <div className="alert alert-danger">{editErrors._general}</div>}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Date et heure <span className="text-danger">*</span></label>
                <input type="datetime-local" name="date_time" className={`form-control ${editErrors.date_time ? 'is-invalid' : ''}`} value={editForm.date_time || ''} onChange={handleEditChange} />
                {editErrors.date_time && <div className="invalid-feedback">{editErrors.date_time}</div>}
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Durée (min) <span className="text-danger">*</span></label>
                <input type="number" name="duration" className={`form-control ${editErrors.duration ? 'is-invalid' : ''}`} value={editForm.duration || ''} onChange={handleEditChange} min="5" max="480" />
                {editErrors.duration && <div className="invalid-feedback">{editErrors.duration}</div>}
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold">Cabinet <span className="text-danger">*</span></label>
                <select name="cabinet" className={`form-select ${editErrors.cabinet ? 'is-invalid' : ''}`} value={editForm.cabinet || ''} onChange={handleEditChange}>
                  <option value="">-- Sélectionner --</option>
                  {cabinets.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {editErrors.cabinet && <div className="invalid-feedback">{editErrors.cabinet}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Type <span className="text-danger">*</span></label>
                <select name="consultation_type" className={`form-select ${editErrors.consultation_type ? 'is-invalid' : ''}`} value={editForm.consultation_type || ''} onChange={handleEditChange}>
                  {Object.entries(CONSULTATION_TYPE_MAP).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div className="col-md-6 d-flex align-items-center">
                <div className="form-check mt-3">
                  <input className="form-check-input" type="checkbox" name="is_teleconsultation" id="editTele" checked={editForm.is_teleconsultation || false} onChange={handleEditChange} />
                  <label className="form-check-label fw-semibold" htmlFor="editTele">Téléconsultation</label>
                </div>
              </div>
              <div className="col-12">
                <label className="form-label fw-semibold">Symptômes</label>
                <textarea name="symptoms" rows="2" className="form-control" value={editForm.symptoms || ''} onChange={handleEditChange}></textarea>
              </div>
              <div className="col-12">
                <label className="form-label fw-semibold">Notes</label>
                <textarea name="notes" rows="2" className="form-control" value={editForm.notes || ''} onChange={handleEditChange}></textarea>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="row g-4 mb-4">
          <div className="col-md-6">
            <div className="card h-100" style={cardStyle}>
              <div className="card-header bg-white border-0 py-3"><h6 className="fw-bold mb-0"><i className="bi bi-clipboard2-pulse me-2 text-primary"></i>Symptômes</h6></div>
              <div className="card-body">
                {appointment.symptoms ? <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{appointment.symptoms}</p> : <p className="text-muted fst-italic mb-0">Aucun symptôme renseigné.</p>}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100" style={cardStyle}>
              <div className="card-header bg-white border-0 py-3"><h6 className="fw-bold mb-0"><i className="bi bi-journal-text me-2 text-primary"></i>Notes</h6></div>
              <div className="card-body">
                {appointment.notes ? <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{appointment.notes}</p> : <p className="text-muted fst-italic mb-0">Aucune note.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-4" style={cardStyle}>
        <div className="card-header bg-white border-0 py-3"><h6 className="fw-bold mb-0"><i className="bi bi-info-circle me-2 text-primary"></i>Détails</h6></div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4"><small className="text-muted d-block">Date / Heure</small><span className="fw-bold">{formatDateTime(appointment.date_time)}</span></div>
            <div className="col-md-4"><small className="text-muted d-block">Durée</small><span className="fw-bold">{appointment.duration ? `${appointment.duration} minutes` : '—'}</span></div>
            <div className="col-md-4"><small className="text-muted d-block">Statut</small><span className={`badge ${statusInfo.badge} px-3 py-2`}>{statusInfo.label}</span></div>
            <div className="col-md-4"><small className="text-muted d-block">Type</small><span className="fw-bold">{CONSULTATION_TYPE_MAP[appointment.consultation_type] || '—'}</span></div>
            <div className="col-md-4"><small className="text-muted d-block">Téléconsultation</small><span className="fw-bold">{appointment.is_teleconsultation ? 'Oui' : 'Non'}</span></div>
            {appointment.approved_by_name && <div className="col-md-4"><small className="text-muted d-block">Confirmé par</small><span className="fw-bold">{appointment.approved_by_name}</span></div>}
          </div>
        </div>
      </div>

      <div className="card" style={cardStyle}>
        <div className="card-header bg-white border-0 py-3"><h6 className="fw-bold mb-0"><i className="bi bi-lightning me-2 text-primary"></i>Actions</h6></div>
        <div className="card-body">
          {actionError && <div className="alert alert-danger">{actionError}</div>}
          <div className="d-flex flex-wrap gap-2">
            {canConfirm && <button className="btn btn-info text-white rounded-3 px-4" onClick={() => handleStatusAction('confirm')} disabled={actionLoading === 'confirm'}>{actionLoading === 'confirm' ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-check-circle me-1"></i>Confirmer</>}</button>}
            {canStart && <button className="btn btn-warning text-dark rounded-3 px-4" onClick={() => handleStatusAction('start')} disabled={actionLoading === 'start'}>{actionLoading === 'start' ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-play-circle me-1"></i>Commencer</>}</button>}
            {canComplete && <button className="btn btn-success rounded-3 px-4" onClick={() => handleStatusAction('complete')} disabled={actionLoading === 'complete'}>{actionLoading === 'complete' ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-check2-circle me-1"></i>Terminer</>}</button>}
            {canCancel && <button className="btn btn-outline-danger rounded-3 px-4" onClick={openCancelModal} disabled={!!actionLoading}><i className="bi bi-x-circle me-1"></i>Annuler</button>}
          </div>
        </div>
      </div>

      {showCancelModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={(e) => e.target === e.currentTarget && closeCancelModal()}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{borderRadius: '16px', border: 'none'}}>
              <div className="modal-header bg-danger text-white" style={{borderRadius: '16px 16px 0 0'}}>
                <h5 className="modal-title fw-bold"><i className="bi bi-x-circle me-2"></i>Annuler le rendez-vous</h5>
                <button type="button" className="btn-close btn-close-white" onClick={closeCancelModal} disabled={cancelling}></button>
              </div>
              <form onSubmit={handleCancelSubmit}>
                <div className="modal-body p-4">
                  {cancelErrors._general && <div className="alert alert-danger">{cancelErrors._general}</div>}
                  <p className="text-muted">Veuillez indiquer la raison de l'annulation du rendez-vous.</p>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Raison <span className="text-danger">*</span></label>
                    <select name="cancellation_reason" className={`form-select ${cancelErrors.cancellation_reason ? 'is-invalid' : ''}`} value={cancelForm.cancellation_reason} onChange={handleCancelChange} required>
                      <option value="">-- Sélectionner --</option>
                      {Object.entries(CANCELLATION_REASON_MAP).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    {cancelErrors.cancellation_reason && <div className="invalid-feedback">{cancelErrors.cancellation_reason}</div>}
                  </div>
                  <div className="mb-0">
                    <label className="form-label fw-semibold">Notes (optionnel)</label>
                    <textarea name="cancellation_notes" rows="2" className="form-control" value={cancelForm.cancellation_notes} onChange={handleCancelChange} placeholder="Précisez si nécessaire..."></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top-0 p-4">
                  <button type="button" className="btn btn-light px-4 rounded-3" onClick={closeCancelModal} disabled={cancelling}>Retour</button>
                  <button type="submit" className="btn btn-danger px-4 rounded-3" disabled={cancelling}>
                    {cancelling ? <><span className="spinner-border spinner-border-sm me-1"></span>Annulation...</> : "Confirmer l'annulation"}
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