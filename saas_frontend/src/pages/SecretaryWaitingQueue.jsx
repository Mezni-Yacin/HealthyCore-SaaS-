import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export default function SecretaryWaitingQueue() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ─── FETCH ENTRIES ───────────────────────────
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filterDoctor) params.doctor = filterDoctor;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/waiting-queue/secretary/today/', { params });
      console.log('[SecretaryWQ] entries :', res.data?.length, res.data);
      setEntries(res.data || []);
    } catch (err) {
      console.error('[SecretaryWQ] fetchEntries erreur :', err.response?.status, err.response?.data);
      setError('Erreur lors du chargement.');
    } finally {
      setLoading(false);
    }
  }, [filterDoctor, filterStatus]);

  // ─── FETCH STATS ─────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/waiting-queue/secretary/stats/');
      console.log('[SecretaryWQ] stats :', res.data);
      setStats(res.data);
    } catch (err) {
      console.error('[SecretaryWQ] fetchStats erreur :', err.response?.status);
    }
  }, []);

  // ─── FETCH DOCTORS ───────────────────────────
  const fetchDoctors = useCallback(async () => {
    try {
      const res = await api.get('/waiting-queue/secretary/doctors/');
      console.log('[SecretaryWQ] médecins :', res.data?.length);
      setDoctors(res.data || []);
    } catch (err) {
      console.error('[SecretaryWQ] fetchDoctors erreur :', err.response?.status);
    }
  }, []);

  // ─── AUTO-REFRESH (30s) ─────────────────────
  useEffect(() => {
    fetchEntries();
    fetchStats();
    fetchDoctors();
    const timer = setInterval(() => {
      fetchEntries();
      fetchStats();
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchEntries, fetchStats, fetchDoctors]);

  // ─── HELPERS ─────────────────────────────────
  const formatTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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

  const getPriorityBadge = (p) => {
    const map = {
      normal: { text: 'Normal', class: 'bg-light text-dark' },
      urgent: { text: 'Urgent', class: 'bg-warning text-dark' },
      emergency: { text: 'Urgence', class: 'bg-danger' },
      child: { text: 'Enfant', class: 'bg-info text-dark' },
      senior: { text: 'Sénior', class: 'bg-secondary' },
      pregnant: { text: 'Enceinte', class: 'bg-primary' },
    };
    const b = map[p] || map.normal;
    return <span className={`badge ${b.class}`}>{b.text}</span>;
  };

  // ✅ Séparer en 3 groupes
  const waitingEntries = entries.filter(e => e.status === 'waiting');
  const inProgressEntries = entries.filter(e => e.status === 'in_progress');
  const completedEntries = entries.filter(e =>
    ['completed', 'cancelled', 'no_show'].includes(e.status)
  );

  // ─── RENDER ───────────────────────────────────
  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">
            <i className="bi bi-people-fill me-2"></i>File d'Attente — Secrétariat
          </h3>
          <p className="text-muted mb-0">Vue d'ensemble de toutes les files d'attente</p>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-xl-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm border-start border-warning border-4">
              <div className="card-body text-center py-3">
                <h4 className="text-warning mb-1">{stats.total_waiting}</h4>
                <small className="text-muted">Attente</small>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm border-start border-success border-4">
              <div className="card-body text-center py-3">
                <h4 className="text-success mb-1">{stats.total_in_progress}</h4>
                <small className="text-muted">En cours</small>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm border-start border-primary border-4">
              <div className="card-body text-center py-3">
                <h4 className="text-primary mb-1">{stats.total_completed}</h4>
                <small className="text-muted">Terminés</small>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm border-start border-danger border-4">
              <div className="card-body text-center py-3">
                <h4 className="text-danger mb-1">{stats.total_no_show}</h4>
                <small className="text-muted">Absents</small>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm border-start border-secondary border-4">
              <div className="card-body text-center py-3">
                <h4 className="text-secondary mb-1">{stats.total_cancelled}</h4>
                <small className="text-muted">Annulés</small>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm border-start border-dark border-4">
              <div className="card-body text-center py-3">
                <h4 className="text-dark mb-1">{stats.total_today}</h4>
                <small className="text-muted">Total</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filtres ── */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-4">
              <label className="form-label mb-0 small fw-semibold">Médecin</label>
              <select className="form-select form-select-sm" value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}>
                <option value="">Tous les médecins</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.full_name}{d.specialty ? ` — ${d.specialty}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label mb-0 small fw-semibold">Statut</label>
              <select className="form-select form-select-sm" value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Tous les statuts</option>
                <option value="waiting">En attente</option>
                <option value="in_progress">En consultation</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
                <option value="no_show">Absent</option>
              </select>
            </div>
            <div className="col-md-5 d-flex align-items-end">
              <button className="btn btn-outline-secondary btn-sm"
                onClick={() => { setFilterDoctor(''); setFilterStatus(''); }}>
                <i className="bi bi-arrow-counterclockwise me-1"></i>Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          <i className="bi bi-exclamation-triangle me-2"></i>{error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Loading / Empty / Content */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-muted">Chargement...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-inbox display-4 text-muted"></i>
          <p className="mt-2 text-muted">Aucune entrée dans la file d'attente aujourd'hui.</p>
        </div>
      ) : (
        <>
          {/* ── En consultation ── */}
          {inProgressEntries.length > 0 && (
            <div className="mb-4">
              <h6 className="text-success mb-2">
                <i className="bi bi-person-workspace me-2"></i>En consultation ({inProgressEntries.length})
              </h6>
              <div className="row g-2">
                {inProgressEntries.map(entry => (
                  <div key={entry.id} className="col-xl-4 col-md-6">
                    <div className="card border-success h-100">
                      <div className="card-body">
                        <div className="d-flex align-items-start justify-content-between">
                          <div>
                            <h6 className="mb-1">
                              {entry.patient_info?.full_name || entry.patient_name || '—'}
                            </h6>
                            <small className="text-muted">
                              Dr. {entry.doctor_info?.full_name || entry.doctor_name || '—'}
                            </small>
                          </div>
                          {getStatusBadge(entry.status)}
                        </div>
                        <hr className="my-2" />
                        <div className="d-flex justify-content-between">
                          <small className="text-muted">
                            <i className="bi bi-tag me-1"></i>{entry.reason_display || '—'}
                          </small>
                          {entry.cabinet_info && (
                            <small className="text-muted">
                              <i className="bi bi-building me-1"></i>{entry.cabinet_info.name}
                            </small>
                          )}
                        </div>
                        {entry.appointment && (
                          <div className="mt-1">
                            <span className="badge bg-info text-dark">
                              <i className="bi bi-calendar-check me-1"></i>Rendez-vous lié
                            </span>
                          </div>
                        )}
                        <div className="mt-2 text-end">
                          <small className="text-muted">
                            Arrivé {formatTime(entry.joined_at)}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── En attente ── */}
          {waitingEntries.length > 0 && (
            <div className="mb-4">
              <h6 className="text-warning mb-2">
                <i className="bi bi-hourglass-split me-2"></i>En attente ({waitingEntries.length})
              </h6>
              <div className="card border-0 shadow-sm">
                <div className="table-responsive">
                  <table className="table table-hover mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th>Patient</th>
                        <th>Médecin</th>
                        <th>Cabinet</th>
                        <th>Priorité</th>
                        <th>Motif</th>
                        <th>RDV</th>
                        <th>Arrivée</th>
                        <th>Attente est.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitingEntries.map(entry => (
                        <tr key={entry.id}
                          className={
                            entry.priority === 'emergency' ? 'table-danger' :
                            entry.priority === 'urgent' ? 'table-warning' : ''
                          }>
                          <td>
                            <span className="badge bg-dark rounded-circle px-2 py-1">
                              {entry.position}
                            </span>
                          </td>
                          <td>
                            <strong>
                              {entry.patient_info?.full_name || entry.patient_name || '—'}
                            </strong>
                            {entry.patient_info?.phone_number && (
                              <small className="text-muted d-block">
                                {entry.patient_info.phone_number}
                              </small>
                            )}
                          </td>
                          <td>
                            {entry.doctor_info?.full_name || entry.doctor_name || '—'}
                          </td>
                          <td>
                            {entry.cabinet_info ? (
                              <small>{entry.cabinet_info.name}</small>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>{getPriorityBadge(entry.priority)}</td>
                          <td>{entry.reason_display || '—'}</td>
                          <td>
                            {entry.appointment ? (
                              <span className="badge bg-info text-dark">
                                <i className="bi bi-calendar-check"></i>
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>{formatTime(entry.joined_at)}</td>
                          <td>
                            {entry.estimated_wait_minutes != null ? (
                              <span className={`fw-bold ${
                                entry.estimated_wait_minutes > 30 ? 'text-danger' : 'text-muted'
                              }`}>
                                ~{entry.estimated_wait_minutes} min
                              </span>
                            ) : (
                              <span className="text-muted">?</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Terminés / Annulés / Absents ── */}
          {completedEntries.length > 0 && (
            <div>
              <h6 className="text-muted mb-2">
                <i className="bi bi-check2-circle me-2"></i>Traités ({completedEntries.length})
              </h6>
              <div className="card border-0 shadow-sm">
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Patient</th>
                        <th>Médecin</th>
                        <th>Cabinet</th>
                        <th>Statut</th>
                        <th>Motif</th>
                        <th>Arrivée</th>
                        <th>Attente</th>
                        <th>Durée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedEntries.map(entry => (
                        <tr key={entry.id} className="text-muted">
                          <td>
                            {entry.patient_info?.full_name || entry.patient_name || '—'}
                          </td>
                          <td>
                            {entry.doctor_info?.full_name || entry.doctor_name || '—'}
                          </td>
                          <td>{entry.cabinet_info?.name || '—'}</td>
                          <td>{getStatusBadge(entry.status)}</td>
                          <td>{entry.reason_display || '—'}</td>
                          <td>{formatTime(entry.joined_at)}</td>
                          <td>{formatMinutes(entry.actual_wait_minutes)}</td>
                          <td>{formatMinutes(entry.consultation_duration_minutes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}