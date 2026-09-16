import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const cardStyle = { borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };

export default function PatientWaitingQueue() {
  const [doctors, setDoctors] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const [form, setForm] = useState({
    doctor: '', priority: 'normal', reason: 'consultation', reason_details: ''
  });

  // ─── FETCH DOCTORS ───────────────────────────
  const fetchDoctors = useCallback(async () => {
    try {
      const res = await api.get('/waiting-queue/patient/doctors/');
      setDoctors(res.data || []);
    } catch (err) {
      console.error('[PatientWQ] fetchDoctors erreur :', err.response?.status);
    }
  }, []);

  // ─── FETCH CURRENT STATUS ────────────────────
  const fetchCurrentStatus = useCallback(async () => {
    try {
      const res = await api.get('/waiting-queue/patient/current/');
      setCurrentStatus(res.data);
    } catch (err) {
      setCurrentStatus({ in_queue: false, message: "Vous n'êtes pas dans une file d'attente." });
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── FETCH HISTORY ───────────────────────────
  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/waiting-queue/patient/');
      setHistory(res.data || []);
    } catch (err) {
      console.error('[PatientWQ] fetchHistory erreur :', err.response?.status);
    }
  }, []);

  // ─── AUTO-REFRESH (15s) ─────────────────────
  useEffect(() => {
    fetchDoctors();
    fetchCurrentStatus();
    fetchHistory();
    const timer = setInterval(fetchCurrentStatus, 15000);
    return () => clearInterval(timer);
  }, [fetchDoctors, fetchCurrentStatus, fetchHistory]);

  // ─── REJOINDRE UNE FILE ──────────────────────
  const handleJoin = async (e) => {
    e.preventDefault();
    if (!form.doctor) {
      setError('Veuillez sélectionner un médecin.');
      return;
    }
    setJoining(true);
    setError('');
    try {
      const payload = {
        doctor: Number(form.doctor),
        priority: form.priority,
        reason: form.reason,
        reason_details: form.reason_details || '',
      };
      await api.post('/waiting-queue/patient/join/', payload);
      setForm({ doctor: '', priority: 'normal', reason: 'consultation', reason_details: '' });
      fetchCurrentStatus();
      fetchHistory();
    } catch (err) {
      const msg = err.response?.data;
      if (typeof msg === 'object' && msg !== null) {
        const firstError = Object.values(msg)[0];
        setError(Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        setError(msg?.detail || "Erreur lors de l'inscription.");
      }
    } finally {
      setJoining(false);
    }
  };

  // ─── QUITTER LA FILE ─────────────────────────
  const handleLeave = async () => {
    if (!currentStatus?.id) {
      setError("Impossible de quitter : entrée introuvable.");
      return;
    }
    if (!window.confirm("Voulez-vous vraiment quitter la file d'attente ?")) return;
    setLeaving(true);
    setError('');
    try {
      await api.post(`/waiting-queue/patient/${currentStatus.id}/leave/`);
      fetchCurrentStatus();
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur.');
    } finally {
      setLeaving(false);
    }
  };

  // ─── HELPERS ─────────────────────────────────
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const formatMinutes = (min) => (min != null ? `${min} min` : '—');

  const getStatusBadge = (s) => {
    const map = {
      waiting: 'bg-warning-subtle text-warning',
      in_progress: 'bg-success-subtle text-success',
      completed: 'bg-primary-subtle text-primary',
      cancelled: 'bg-secondary-subtle text-secondary',
      no_show: 'bg-danger-subtle text-danger',
    };
    const labels = {
      waiting: 'En attente', in_progress: 'En consultation', completed: 'Terminé', cancelled: 'Annulé', no_show: 'Absent'
    };
    return <span className={`badge ${map[s] || map.waiting} px-3 py-2`}>{labels[s] || s}</span>;
  };

  // ─── RENDER ───────────────────────────────────
  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1"><i className="bi bi-hourglass-split me-2 text-primary"></i>File d'Attente</h2>
          <p className="text-muted mb-0">Consultez votre position et rejoignez une file d'attente</p>
        </div>
        {!currentStatus?.in_queue && !loading && (
          <span className="badge bg-light text-dark border fs-6 px-3 py-2 rounded-3">
            <i className="bi bi-wifi me-1 text-success"></i> Mise à jour en temps réel
          </span>
        )}
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" style={{borderRadius: '12px'}}>
          <i className="bi bi-exclamation-triangle me-2"></i>{error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* ── Statut actuel ── */}
      <div className="card mb-4" style={cardStyle}>
        <div className="card-header bg-white border-0 py-3">
          <h6 className="mb-0 fw-bold"><i className="bi bi-broadcast me-2 text-primary"></i>Mon Statut Actuel</h6>
        </div>
        <div className="card-body p-4 text-center">
          {loading ? (
            <div className="py-5"><div className="spinner-border text-primary"></div></div>
          ) : currentStatus?.in_queue ? (
            <div className="d-flex flex-column align-items-center">
              
              <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                <span className="fw-bold fs-2">{(currentStatus.people_ahead ?? 0) + 1}</span>
              </div>

              <h4 className="fw-bold mb-1">Vous êtes en position {currentStatus.people_ahead + 1}</h4>
              <p className="text-muted mb-4">
                {currentStatus.people_ahead === 0 ? "C'est à vous !" : `${currentStatus.people_ahead} personne(s) avant vous`}
                {currentStatus.estimated_wait_minutes != null && (
                  <span className="ms-2">· Temps estimé : <strong className="text-primary">~{currentStatus.estimated_wait_minutes} min</strong></span>
                )}
              </p>

              <div className="row g-3 w-100 mb-4 text-start">
                <div className="col-md-3 col-6">
                  <div className="bg-light p-3 rounded-3 h-100">
                    <small className="text-muted d-block text-uppercase fw-bold mb-1" style={{fontSize: '0.7rem'}}><i className="bi bi-person-badge me-1"></i>Médecin</small>
                    <p className="mb-0 fw-bold">{currentStatus.doctor_info?.full_name || '—'}</p>
                    {currentStatus.doctor_info?.specialty && <small className="text-muted">{currentStatus.doctor_info.specialty}</small>}
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="bg-light p-3 rounded-3 h-100">
                    <small className="text-muted d-block text-uppercase fw-bold mb-1" style={{fontSize: '0.7rem'}}><i className="bi bi-tag me-1"></i>Motif</small>
                    <p className="mb-0 fw-bold">{currentStatus.reason_display || '—'}</p>
                    <small className="text-muted">Arrivé à {formatTime(currentStatus.joined_at)}</small>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="bg-light p-3 rounded-3 h-100">
                    <small className="text-muted d-block text-uppercase fw-bold mb-1" style={{fontSize: '0.7rem'}}><i className="bi bi-building me-1"></i>Cabinet</small>
                    <p className="mb-0 fw-bold">{currentStatus.cabinet_info?.name || '—'}</p>
                    {currentStatus.cabinet_info?.address && <small className="text-muted text-truncate d-block">{currentStatus.cabinet_info.address}</small>}
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="bg-light p-3 rounded-3 h-100">
                    <small className="text-muted d-block text-uppercase fw-bold mb-1" style={{fontSize: '0.7rem'}}><i className="bi bi-calendar-check me-1"></i>Rendez-vous</small>
                    <p className="mb-0 fw-bold">{currentStatus.appointment ? 'Oui' : 'Sans RDV'}</p>
                    {currentStatus.appointment && <small className="text-success">Lié automatiquement</small>}
                  </div>
                </div>
              </div>

              <button className="btn btn-outline-danger rounded-3 px-4" onClick={handleLeave} disabled={leaving}>
                {leaving ? <><span className="spinner-border spinner-border-sm me-1"></span>Annulation...</> : <><i className="bi bi-x-circle me-1"></i>Quitter la file</>}
              </button>
            </div>
          ) : (
            <div className="py-5">
              <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
              <h5 className="mt-3 text-muted">{currentStatus?.message || "Vous n'êtes pas dans une file d'attente."}</h5>
            </div>
          )}
        </div>
      </div>

      {/* ── Formulaire rejoindre ── */}
      {!currentStatus?.in_queue && !loading && (
        <div className="card mb-4" style={cardStyle}>
          <div className="card-header bg-primary text-white" style={{ borderRadius: '16px 16px 0 0' }}>
            <h6 className="mb-0 fw-bold"><i className="bi bi-person-plus me-2"></i>Rejoindre une file d'attente</h6>
          </div>
          <div className="card-body p-4">
            <form onSubmit={handleJoin}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Médecin <span className="text-danger">*</span></label>
                  <select className="form-select" value={form.doctor} onChange={(e) => setForm(prev => ({ ...prev, doctor: e.target.value }))} required>
                    <option value="">-- Choisir un médecin --</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>Dr. {d.full_name}{d.specialty ? ` — ${d.specialty}` : ''} ({d.waiting_count || 0} en attente)</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-semibold">Priorité</label>
                  <select className="form-select" value={form.priority} onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="child">Enfant</option>
                    <option value="senior">Sénior</option>
                    <option value="pregnant">Enceinte</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-semibold">Motif</label>
                  <select className="form-select" value={form.reason} onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}>
                    <option value="consultation">Consultation</option>
                    <option value="follow_up">Suivi</option>
                    <option value="emergency">Urgence</option>
                    <option value="vaccination">Vaccination</option>
                    <option value="certificate">Certificat</option>
                    <option value="prescription_renewal">Renouvellement</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">Détails</label>
                  <input type="text" className="form-control" value={form.reason_details} onChange={(e) => setForm(prev => ({ ...prev, reason_details: e.target.value }))} placeholder="Décrivez brièvement votre motif..." />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary rounded-3 px-4" disabled={joining || !form.doctor}>
                    {joining ? <><span className="spinner-border spinner-border-sm me-1"></span>Inscription...</> : <><i className="bi bi-arrow-right-circle me-1"></i>Rejoindre la file</>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Historique ── */}
      {history.length > 0 && (
        <div className="card" style={cardStyle}>
          <div className="card-header bg-white border-0 py-3">
            <h6 className="mb-0 fw-bold"><i className="bi bi-clock-history me-2 text-primary"></i>Historique <span className="badge bg-secondary-subtle text-secondary ms-2">{history.filter(h => h.status !== 'waiting').length}</span></h6>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="text-uppercase text-muted" style={{fontSize: '0.75rem'}}>
                    <th className="ps-4">Date</th><th>Médecin</th><th>Motif</th><th>Cabinet</th><th>Statut</th><th>Attente</th><th className="pe-4">Durée</th>
                  </tr>
                </thead>
                <tbody>
                  {history.filter(h => h.status !== 'waiting').map(h => (
                    <tr key={h.id}>
                      <td className="ps-4">
                        <div className="fw-semibold">{formatDate(h.joined_at)}</div>
                        <small className="text-muted">{formatTime(h.joined_at)}</small>
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{h.doctor_info?.full_name || h.doctor_name || '—'}</div>
                        {h.doctor_info?.specialty && <small className="text-muted">{h.doctor_info.specialty}</small>}
                      </td>
                      <td className="text-muted">{h.reason_display || '—'}</td>
                      <td className="text-muted">{h.cabinet_info?.name || '—'}</td>
                      <td>{getStatusBadge(h.status)}</td>
                      <td className="fw-semibold">{formatMinutes(h.actual_wait_minutes)}</td>
                      <td className="pe-4 text-muted">{formatMinutes(h.consultation_duration_minutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}