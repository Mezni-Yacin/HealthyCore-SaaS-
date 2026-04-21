import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

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
      console.log('[PatientWQ] médecins :', res.data?.length);
      setDoctors(res.data || []);
    } catch (err) {
      console.error('[PatientWQ] fetchDoctors erreur :', err.response?.status);
    }
  }, []);

  // ─── FETCH CURRENT STATUS ────────────────────
  const fetchCurrentStatus = useCallback(async () => {
    try {
      const res = await api.get('/waiting-queue/patient/current/');
      console.log('[PatientWQ] currentStatus :', res.data);
      setCurrentStatus(res.data);
    } catch (err) {
      console.error('[PatientWQ] fetchCurrentStatus erreur :', err.response?.status);
      // ✅ 404 = pas de profil patient → message par défaut
      setCurrentStatus({ in_queue: false, message: "Vous n'êtes pas dans une file d'attente." });
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── FETCH HISTORY ───────────────────────────
  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/waiting-queue/patient/');
      console.log('[PatientWQ] historique :', res.data?.length);
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
      console.log('[PatientWQ] JOIN payload :', payload);
      const res = await api.post('/waiting-queue/patient/join/', payload);
      console.log('[PatientWQ] JOIN 201 :', res.data);

      setForm({ doctor: '', priority: 'normal', reason: 'consultation', reason_details: '' });
      fetchCurrentStatus();
      fetchHistory();
    } catch (err) {
      console.error('[PatientWQ] JOIN erreur :', err.response?.status, err.response?.data);
      const msg = err.response?.data;
      if (typeof msg === 'object' && msg !== null) {
        // ✅ Extraire la première erreur (DRF renvoie {field: [message]})
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
    // ✅ Guard : vérifier qu'on a bien un ID
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
      console.error('[PatientWQ] LEAVE erreur :', err.response?.status, err.response?.data);
      setError(err.response?.data?.detail || 'Erreur.');
    } finally {
      setLeaving(false);
    }
  };

  // ─── HELPERS ─────────────────────────────────
  const formatTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const formatMinutes = (min) => {
    if (min == null || min === undefined) return '—';
    return `${min} min`;
  };

  const getStatusBadge = (s) => {
    const map = {
      waiting: { text: 'En attente', class: 'bg-warning text-dark' },
      in_progress: { text: 'En consultation', class: 'bg-success' },
      completed: { text: 'Terminé', class: 'bg-primary' },
      cancelled: { text: 'Annulé', class: 'bg-secondary' },
      no_show: { text: 'Absent', class: 'bg-danger' },
    };
    const b = map[s] || map.waiting;
    return <span className={`badge ${b.class}`}>{b.text}</span>;
  };

  // ─── RENDER ───────────────────────────────────
  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1"><i className="bi bi-hourglass-split me-2"></i>File d'Attente</h3>
          <p className="text-muted mb-0">Consultez votre position et rejoignez une file d'attente</p>
        </div>
        {!currentStatus?.in_queue && !loading && (
          <span className="badge bg-light text-dark border fs-6 px-3 py-2">
            <i className="bi bi-wifi me-1"></i>Auto-rafraîchissement 15s
          </span>
        )}
      </div>

      {/* ── Statut actuel ── */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-light">
          <h6 className="mb-0"><i className="bi bi-broadcast me-2"></i>Mon Statut Actuel</h6>
        </div>
        <div className="card-body text-center py-4">
          {loading ? (
            <div className="spinner-border text-primary" role="status"></div>
          ) : currentStatus?.in_queue ? (
            <div>
              <div className="mb-3">
                <span className="badge bg-warning text-dark fs-6 px-4 py-2">
                  <i className="bi bi-hourglass-split me-2"></i>En attente
                </span>
              </div>
              <h4>
                Votre position :{' '}
                <span className="text-primary">
                  {/* ✅ people_ahead peut être 0 ou manquant */}
                  {(currentStatus.people_ahead ?? 0) + 1}
                </span>
              </h4>
              <p className="text-muted mb-3">
                Personnes avant vous :{' '}
                <strong>{currentStatus.people_ahead ?? 0}</strong>
                {currentStatus.estimated_wait_minutes != null && (
                  <span className="ms-2">
                    · Temps estimé :{' '}
                    <strong className="text-primary">
                      ~{currentStatus.estimated_wait_minutes} min
                    </strong>
                  </span>
                )}
              </p>

              <div className="row justify-content-center g-3 mb-3">
                {/* Médecin */}
                <div className="col-md-3 col-6">
                  <div className="card bg-light h-100">
                    <div className="card-body">
                      <small className="text-muted d-block mb-1">
                        <i className="bi bi-person-badge me-1"></i>Médecin
                      </small>
                      <p className="mb-0 fw-bold">
                        {currentStatus.doctor_info?.full_name || '—'}
                      </p>
                      {currentStatus.doctor_info?.specialty && (
                        <small className="text-muted">{currentStatus.doctor_info.specialty}</small>
                      )}
                    </div>
                  </div>
                </div>
                {/* Motif */}
                <div className="col-md-3 col-6">
                  <div className="card bg-light h-100">
                    <div className="card-body">
                      <small className="text-muted d-block mb-1">
                        <i className="bi bi-tag me-1"></i>Motif
                      </small>
                      <p className="mb-0 fw-bold">{currentStatus.reason_display || '—'}</p>
                      <small className="text-muted">
                        Arrivé à {formatTime(currentStatus.joined_at)}
                      </small>
                    </div>
                  </div>
                </div>
                {/* Cabinet */}
                <div className="col-md-3 col-6">
                  <div className="card bg-light h-100">
                    <div className="card-body">
                      <small className="text-muted d-block mb-1">
                        <i className="bi bi-building me-1"></i>Cabinet
                      </small>
                      <p className="mb-0 fw-bold">
                        {currentStatus.cabinet_info?.name || '—'}
                      </p>
                      {currentStatus.cabinet_info?.address && (
                        <small className="text-muted">{currentStatus.cabinet_info.address}</small>
                      )}
                    </div>
                  </div>
                </div>
                {/* RDV */}
                <div className="col-md-3 col-6">
                  <div className="card bg-light h-100">
                    <div className="card-body">
                      <small className="text-muted d-block mb-1">
                        <i className="bi bi-calendar-check me-1"></i>Rendez-vous
                      </small>
                      <p className="mb-0 fw-bold">
                        {currentStatus.appointment ? 'Oui' : 'Sans RDV'}
                      </p>
                      {currentStatus.appointment && (
                        <small className="text-success">Lié automatiquement</small>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button className="btn btn-danger" onClick={handleLeave} disabled={leaving}>
                {leaving ? (
                  <><span className="spinner-border spinner-border-sm me-1"></span>...</>
                ) : (
                  <><i className="bi bi-x-circle me-1"></i>Quitter la file</>
                )}
              </button>
            </div>
          ) : (
            <div className="py-2">
              <i className="bi bi-check-circle display-4 text-success"></i>
              <p className="mt-2 text-muted">
                {currentStatus?.message || "Vous n'êtes pas dans une file d'attente."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          <i className="bi bi-exclamation-triangle me-2"></i>{error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* ── Formulaire rejoindre ── */}
      {!currentStatus?.in_queue && !loading && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0">
              <i className="bi bi-person-plus me-2"></i>Rejoindre une file d'attente
            </h6>
          </div>
          <div className="card-body">
            <form onSubmit={handleJoin}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Médecin <span className="text-danger">*</span>
                  </label>
                  <select className="form-select" value={form.doctor}
                    onChange={(e) => setForm(prev => ({ ...prev, doctor: e.target.value }))}
                    required>
                    <option value="">-- Choisir un médecin --</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.full_name}
                        {d.specialty ? ` — ${d.specialty}` : ''}
                        ({d.waiting_count || 0} en attente)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-semibold">Priorité</label>
                  <select className="form-select" value={form.priority}
                    onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="child">Enfant</option>
                    <option value="senior">Sénior</option>
                    <option value="pregnant">Enceinte</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-semibold">Motif</label>
                  <select className="form-select" value={form.reason}
                    onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}>
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
                  <input type="text" className="form-control" value={form.reason_details}
                    onChange={(e) => setForm(prev => ({ ...prev, reason_details: e.target.value }))}
                    placeholder="Décrivez brièvement votre motif..." />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary" disabled={joining || !form.doctor}>
                    {joining ? (
                      <><span className="spinner-border spinner-border-sm me-1"></span>Inscription...</>
                    ) : (
                      <><i className="bi bi-arrow-right-circle me-1"></i>Rejoindre la file</>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Historique ── */}
      {history.length > 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-light">
            <h6 className="mb-0">
              <i className="bi bi-clock-history me-2"></i>Historique
              <span className="badge bg-secondary ms-2">
                {history.filter(h => h.status !== 'waiting').length}
              </span>
            </h6>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Médecin</th>
                    <th>Motif</th>
                    <th>Cabinet</th>
                    <th>Statut</th>
                    <th>Attente</th>
                    <th>Durée</th>
                  </tr>
                </thead>
                <tbody>
                  {history
                    .filter(h => h.status !== 'waiting')
                    .map(h => (
                    <tr key={h.id}>
                      <td>
                        <div className="fw-semibold">{formatDate(h.joined_at)}</div>
                        <small className="text-muted">{formatTime(h.joined_at)}</small>
                      </td>
                      <td>
                        <strong>{h.doctor_info?.full_name || h.doctor_name || '—'}</strong>
                        {h.doctor_info?.specialty && (
                          <small className="text-muted d-block">{h.doctor_info.specialty}</small>
                        )}
                      </td>
                      <td>{h.reason_display || '—'}</td>
                      <td>{h.cabinet_info?.name || '—'}</td>
                      <td>{getStatusBadge(h.status)}</td>
                      <td>{formatMinutes(h.actual_wait_minutes)}</td>
                      <td>{formatMinutes(h.consultation_duration_minutes)}</td>
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