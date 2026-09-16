import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const cardStyle = { borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };

export default function DoctorWaitingQueue() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('waiting');

  const [form, setForm] = useState({
    patient: '', priority: 'normal', reason: 'consultation', reason_details: '', notes: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // ─── FETCH ENTRIES ────────────────────────────
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const params = {};
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      const res = await api.get('/waiting-queue/doctor/today/', { params });
      setEntries(res.data || []);
    } catch (err) {
      setError("Erreur lors du chargement de la file d'attente.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  // ─── FETCH STATS ──────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/waiting-queue/doctor/stats/');
      setStats(res.data);
    } catch (err) {}
  }, []);

  // ─── FETCH PATIENTS ───────────────────────────
  const fetchPatients = useCallback(async () => {
    try {
      const res = await api.get('/waiting-queue/doctor/patients-dropdown/');
      setPatients(res.data || []);
    } catch (err) {}
  }, []);

  // ─── AUTO-REFRESH ─────────────────────────────
  useEffect(() => {
    fetchEntries(); fetchStats(); fetchPatients();
    const timer = setInterval(() => { fetchEntries(); fetchStats(); }, 30000);
    return () => clearInterval(timer);
  }, [fetchEntries, fetchStats, fetchPatients]);

  // ─── AJOUTER UN PATIENT ───────────────────────
  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!form.patient) { setFormErrors({ patient: ['Veuillez sélectionner un patient.'] }); return; }
    setSubmitting(true); setFormErrors({});
    try {
      const payload = {
        patient: Number(form.patient), priority: form.priority, reason: form.reason,
        reason_details: form.reason_details || '', notes: form.notes || '',
      };
      await api.post('/waiting-queue/doctor/', payload);
      setShowModal(false);
      setForm({ patient: '', priority: 'normal', reason: 'consultation', reason_details: '', notes: '' });
      fetchEntries(); fetchStats();
    } catch (err) {
      const errors = err.response?.data || {};
      setFormErrors(errors);
      if (errors.detail && !errors.patient) setError(errors.detail);
    } finally { setSubmitting(false); }
  };

  // ─── ACTIONS ──────────────────────────────────
  const handleAction = async (id, action, confirmMsg = null) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await api.post(`/waiting-queue/doctor/${id}/${action}/`);
      fetchEntries(); fetchStats();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'action.');
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Retirer ce patient de la file ?')) return;
    try {
      await api.delete(`/waiting-queue/doctor/${id}/`);
      fetchEntries(); fetchStats();
    } catch (err) { setError('Erreur lors de la suppression.'); }
  };

  // ─── HELPERS ──────────────────────────────────
  const formatTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
  const formatMinutes = (min) => (min != null ? `${min} min` : '—');

  const getPriorityBadge = (p) => {
    const map = {
      normal: 'bg-secondary-subtle text-secondary', urgent: 'bg-warning-subtle text-warning',
      emergency: 'bg-danger-subtle text-danger', child: 'bg-info-subtle text-info',
      senior: 'bg-primary-subtle text-primary', pregnant: 'bg-success-subtle text-success',
    };
    return <span className={`badge ${map[p] || map.normal} px-3 py-2`}>{p}</span>; 
  };

  const getStatusBadge = (s) => {
    const map = {
      waiting: 'bg-warning-subtle text-warning', in_progress: 'bg-success-subtle text-success',
      completed: 'bg-primary-subtle text-primary', cancelled: 'bg-secondary-subtle text-secondary',
      no_show: 'bg-danger-subtle text-danger',
    };
    return <span className={`badge ${map[s] || map.waiting} px-3 py-2`}>{s}</span>;
  };

  const waitingEntries = entries.filter(e => e.status === 'waiting');
  const inProgressEntry = entries.find(e => e.status === 'in_progress');
  const completedEntries = entries.filter(e => ['completed', 'cancelled', 'no_show'].includes(e.status));

  // ─── RENDER ───────────────────────────────────
  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1"><i className="bi bi-people-fill me-2 text-primary"></i>File d'Attente</h2>
          <p className="text-muted mb-0">Gérez la file d'attente de vos patients en temps réel</p>
        </div>
        <button className="btn btn-primary px-4 py-2 rounded-3" onClick={() => setShowModal(true)}>
          <i className="bi bi-person-plus me-2"></i>Ajouter un patient
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="row g-3 mb-4">
          {[
            { label: 'En attente', val: stats.today_waiting, color: 'warning', icon: 'bi-hourglass-split' },
            { label: 'En consultation', val: stats.today_in_progress, color: 'success', icon: 'bi-person-workspace' },
            { label: 'Terminés', val: stats.today_completed, color: 'primary', icon: 'bi-check2-circle' },
            { label: 'Absents', val: stats.today_no_show, color: 'danger', icon: 'bi-x-circle' }
          ].map((s, i) => (
            <div key={i} className="col-md-3 col-6">
              <div className="card h-100 p-3" style={cardStyle}>
                <div className="d-flex align-items-center gap-3">
                  <div className={`bg-${s.color} bg-opacity-10 text-${s.color} rounded-3 d-flex align-items-center justify-content-center`} style={{ width: '48px', height: '48px' }}>
                    <i className={`bi ${s.icon} fs-4`}></i>
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold">{s.val}</h5>
                    <small className="text-muted">{s.label}</small>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres & Moyennes */}
      <div className="card mb-4" style={cardStyle}>
        <div className="card-body d-flex flex-wrap align-items-center gap-3">
          <div className="btn-group" role="group">
            {[
              { key: 'waiting', label: 'En attente', icon: 'bi-hourglass-split' },
              { key: 'in_progress', label: 'En cours', icon: 'bi-person-workspace' },
              { key: 'all', label: 'Tous', icon: 'bi-list-ul' },
            ].map(f => (
              <button key={f.key} className={`btn btn-sm rounded-3 px-3 ${filterStatus === f.key ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilterStatus(f.key)}>
                <i className={`bi ${f.icon} me-1`}></i>{f.label}
              </button>
            ))}
          </div>
          <div className="ms-auto d-flex align-items-center gap-4 text-muted small">
            {stats?.avg_wait_minutes != null && (
              <span><i className="bi bi-clock me-1"></i>Attente moy. : <strong className="text-dark">{stats.avg_wait_minutes} min</strong></span>
            )}
            {stats?.avg_consultation_minutes != null && (
              <span><i className="bi bi-heart-pulse me-1"></i>Consult. moy. : <strong className="text-dark">{stats.avg_consultation_minutes} min</strong></span>
            )}
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" style={{borderRadius: '12px'}}>
          <i className="bi bi-exclamation-triangle me-2"></i>{error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Loading / Empty / Content */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted">Chargement de la file d'attente...</p></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-inbox text-muted" style={{fontSize: '3rem'}}></i>
          <p className="mt-3 text-muted">{filterStatus !== 'all' ? `Aucun patient avec le statut "${filterStatus}".` : 'La file d\'attente est vide.'}</p>
        </div>
      ) : (
        <div className="row g-4">
          {/* ── Patient en consultation ── */}
          {inProgressEntry && filterStatus !== 'waiting' && (
            <div className="col-12">
              <h6 className="text-success mb-3 fw-bold text-uppercase" style={{fontSize: '0.8rem'}}><i className="bi bi-person-workspace me-2"></i>En consultation</h6>
              <div className="card border-success border-2 shadow-sm" style={{borderRadius: '16px'}}>
                <div className="card-body p-4">
                  <div className="row align-items-center">
                    <div className="col-md-4">
                      <h5 className="mb-1 fw-bold">{inProgressEntry.patient_info?.full_name || inProgressEntry.patient_name || '—'}</h5>
                      <small className="text-muted">Arrivé à {formatTime(inProgressEntry.joined_at)} {inProgressEntry.patient_info?.phone_number && `• ${inProgressEntry.patient_info.phone_number}`}</small>
                    </div>
                    <div className="col-md-2">{getPriorityBadge(inProgressEntry.priority_display)}</div>
                    <div className="col-md-3">
                      <span className="text-muted"><i className="bi bi-tag me-1"></i>{inProgressEntry.reason_display}</span>
                    </div>
                    <div className="col-md-3 text-end">
                      <button className="btn btn-success btn-sm rounded-3 px-4" onClick={() => handleAction(inProgressEntry.id, 'complete')}>
                        <i className="bi bi-check-lg me-1"></i>Terminer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── File d'attente ── */}
          {waitingEntries.length > 0 && (
            <div className="col-12">
              <h6 className="text-warning mb-3 fw-bold text-uppercase" style={{fontSize: '0.8rem'}}><i className="bi bi-hourglass-split me-2"></i>En attente ({waitingEntries.length})</h6>
              <div className="card" style={cardStyle}>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr className="text-uppercase text-muted" style={{fontSize: '0.75rem'}}>
                          <th className="ps-4" style={{ width: '60px' }}>Pos.</th>
                          <th>Patient</th>
                          <th>Priorité</th>
                          <th>Motif</th>
                          <th>Arrivée</th>
                          <th>Attente est.</th>
                          <th className="pe-4 text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waitingEntries.map((entry) => (
                          <tr key={entry.id} className={entry.priority === 'emergency' ? 'table-danger' : entry.priority === 'urgent' ? 'table-warning' : ''}>
                            <td className="ps-4">
                              <span className="badge bg-dark bg-opacity-75 rounded-circle p-2 fw-bold">{entry.position}</span>
                            </td>
                            <td>
                              <div className="fw-bold text-dark">{entry.patient_info?.full_name || entry.patient_name || '—'}</div>
                              {entry.patient_info?.phone_number && <small className="text-muted">{entry.patient_info.phone_number}</small>}
                            </td>
                            <td>{getPriorityBadge(entry.priority_display)}</td>
                            <td><span className="text-muted">{entry.reason_display}</span></td>
                            <td className="text-muted">{formatTime(entry.joined_at)}</td>
                            <td className="fw-bold">
                              {entry.estimated_wait_minutes != null ? `~${entry.estimated_wait_minutes} min` : entry.wait_time != null ? `~${entry.wait_time} min` : '—'}
                            </td>
                            <td className="pe-4 text-end">
                              <div className="btn-group btn-group-sm">
                                <button className="btn btn-success rounded-3 px-2" onClick={() => handleAction(entry.id, 'call')} title="Appeler"><i className="bi bi-megaphone"></i></button>
                                <button className="btn btn-outline-danger rounded-3 px-2" onClick={() => handleAction(entry.id, 'no-show', 'Marquer absent ?')} title="Absent"><i className="bi bi-x-circle"></i></button>
                                <button className="btn btn-outline-secondary rounded-3 px-2" onClick={() => handleRemove(entry.id)} title="Retirer"><i className="bi bi-trash"></i></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Terminés / Annulés ── */}
          {filterStatus === 'all' && completedEntries.length > 0 && (
            <div className="col-12">
              <h6 className="text-muted mb-3 fw-bold text-uppercase" style={{fontSize: '0.8rem'}}><i className="bi bi-check2-circle me-2"></i>Historique ({completedEntries.length})</h6>
              <div className="card" style={cardStyle}>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr className="text-uppercase text-muted" style={{fontSize: '0.75rem'}}>
                          <th className="ps-4">#</th><th>Patient</th><th>Statut</th><th>Motif</th><th>Attente réelle</th><th className="pe-4">Durée consult.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedEntries.map((entry) => (
                          <tr key={entry.id} className="text-muted">
                            <td className="ps-4">{entry.position}</td>
                            <td className="fw-semibold">{entry.patient_info?.full_name || entry.patient_name || '—'}</td>
                            <td>{getStatusBadge(entry.status_display)}</td>
                            <td>{entry.reason_display}</td>
                            <td>{formatMinutes(entry.actual_wait_minutes)}</td>
                            <td className="pe-4">{formatMinutes(entry.consultation_duration_minutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ MODAL AJOUT PATIENT ═══════════════ */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{borderRadius: '16px', border: 'none'}}>
              <div className="modal-header bg-primary text-white" style={{borderRadius: '16px 16px 0 0'}}>
                <h5 className="modal-title fw-bold"><i className="bi bi-person-plus me-2"></i>Ajouter à la file d'attente</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => { setShowModal(false); setFormErrors({}); }} disabled={submitting}></button>
              </div>
              <form onSubmit={handleAddPatient}>
                <div className="modal-body p-4">
                  {formErrors.detail && <div className="alert alert-danger" style={{borderRadius: '12px'}}><i className="bi bi-exclamation-triangle me-2"></i>{formErrors.detail}</div>}
                  {formErrors.non_field_errors && <div className="alert alert-danger">{Array.isArray(formErrors.non_field_errors) ? formErrors.non_field_errors.join(' ') : formErrors.non_field_errors}</div>}

                  <div className="row g-3">
                    {/* ── Patient (Select) ── */}
                    <div className="col-md-12">
                      <label className="form-label fw-semibold">Patient <span className="text-danger">*</span></label>
                      <select 
                        className={`form-select ${formErrors.patient ? 'is-invalid' : ''}`}
                        value={form.patient}
                        onChange={(e) => setForm(prev => ({ ...prev, patient: e.target.value }))}
                        required
                      >
                        <option value="">-- Sélectionner un patient --</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.full_name} {p.phone_number ? `(${p.phone_number})` : ''}
                          </option>
                        ))}
                      </select>
                      {formErrors.patient && <div className="invalid-feedback">{Array.isArray(formErrors.patient) ? formErrors.patient[0] : formErrors.patient}</div>}
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Priorité</label>
                      <select className="form-select" value={form.priority} onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}>
                        <option value="normal">Normal</option><option value="urgent">Urgent</option><option value="emergency">Urgence</option><option value="child">Enfant</option><option value="senior">Personne âgée</option><option value="pregnant">Femme enceinte</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Motif</label>
                      <select className="form-select" value={form.reason} onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}>
                        <option value="consultation">Consultation générale</option><option value="follow_up">Suivi / Contrôle</option><option value="emergency">Urgence</option><option value="vaccination">Vaccination</option><option value="analysis">Résultat d'analyses</option><option value="certificate">Certificat médical</option><option value="prescription_renewal">Renouvellement d'ordonnance</option><option value="other">Autre</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Détails</label>
                      <input type="text" className="form-control" value={form.reason_details} onChange={(e) => setForm(prev => ({ ...prev, reason_details: e.target.value }))} placeholder="Description courte..." />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold">Notes</label>
                      <textarea className="form-control" rows="2" value={form.notes} onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Notes pour le médecin..."></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top-0 p-4">
                  <button type="button" className="btn btn-light px-4 rounded-3" onClick={() => { setShowModal(false); setFormErrors({}); }} disabled={submitting}>Annuler</button>
                  <button type="submit" className="btn btn-primary px-4 rounded-3" disabled={submitting || !form.patient}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-1"></span>Ajout...</> : <><i className="bi bi-plus-lg me-1"></i>Ajouter à la file</>}
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