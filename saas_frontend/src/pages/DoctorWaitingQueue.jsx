import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

export default function DoctorWaitingQueue() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('waiting');
  const searchTimerRef = useRef(null);

  const [form, setForm] = useState({
    patient: '', priority: 'normal', reason: 'consultation', reason_details: '', notes: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // ─── FETCH ENTRIES ────────────────────────────
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      const res = await api.get('/waiting-queue/doctor/today/', { params });
      // ✅ Debug : vérifier ce que l'API retourne réellement
      console.log('[DoctorWQ] entries reçues :', res.data?.length, res.data);
      setEntries(res.data || []);
    } catch (err) {
      console.error('[DoctorWQ] fetchEntries erreur :', err.response?.status, err.response?.data);
      setError("Erreur lors du chargement de la file d'attente.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  // ─── FETCH STATS ──────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/waiting-queue/doctor/stats/');
      console.log('[DoctorWQ] stats :', res.data);
      setStats(res.data);
    } catch (err) {
      console.error('[DoctorWQ] fetchStats erreur :', err.response?.status);
    }
  }, []);

  // ─── FETCH PATIENTS (avec debounce) ───────────
  const fetchPatients = useCallback(async (search = '') => {
    try {
      const params = search ? { search } : {};
      const res = await api.get('/waiting-queue/doctor/patients-dropdown/', { params });
      setPatients(res.data || []);
    } catch (err) {
      console.error('[DoctorWQ] fetchPatients erreur :', err.response?.status);
    }
  }, []);

  // ─── AUTO-REFRESH ─────────────────────────────
  useEffect(() => {
    fetchEntries();
    fetchStats();
    fetchPatients();
    const timer = setInterval(() => {
      fetchEntries();
      fetchStats();
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchEntries, fetchStats, fetchPatients]);

  // ─── AJOUTER UN PATIENT ───────────────────────
  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!form.patient) {
      setFormErrors({ patient: ['Veuillez sélectionner un patient.'] });
      return;
    }
    setSubmitting(true);
    setFormErrors({});
    try {
      const payload = {
        patient: Number(form.patient),
        priority: form.priority,
        reason: form.reason,
        reason_details: form.reason_details || '',
        notes: form.notes || '',
      };
      console.log('[DoctorWQ] POST payload :', payload);
      const res = await api.post('/waiting-queue/doctor/', payload);
      console.log('[DoctorWQ] POST 201 réponse :', res.data);

      setShowModal(false);
      setForm({ patient: '', priority: 'normal', reason: 'consultation', reason_details: '', notes: '' });
      // ✅ Recharger immédiatement après ajout
      fetchEntries();
      fetchStats();
    } catch (err) {
      console.error('[DoctorWQ] POST erreur :', err.response?.status, err.response?.data);
      // ✅ Afficher les erreurs champ par champ depuis DRF
      const errors = err.response?.data || {};
      setFormErrors(errors);
      if (errors.detail && !errors.patient) {
        setError(errors.detail);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── ACTIONS ──────────────────────────────────
  const handleCallPatient = async (id) => {
    try {
      await api.post(`/waiting-queue/doctor/${id}/call/`);
      fetchEntries();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'appel.');
    }
  };

  const handleComplete = async (id) => {
    try {
      await api.post(`/waiting-queue/doctor/${id}/complete/`);
      fetchEntries();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur.');
    }
  };

  const handleNoShow = async (id) => {
    if (!window.confirm('Marquer ce patient comme absent ?')) return;
    try {
      await api.post(`/waiting-queue/doctor/${id}/no-show/`);
      fetchEntries();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur.');
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Retirer ce patient de la file ?')) return;
    try {
      await api.delete(`/waiting-queue/doctor/${id}/`);
      fetchEntries();
      fetchStats();
    } catch (err) {
      setError('Erreur lors de la suppression.');
    }
  };

  // ─── HELPERS ──────────────────────────────────
  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMinutes = (min) => {
    if (min == null || min === undefined) return '—';
    return `${min} min`;
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

  // ✅ Séparation en 3 groupes à partir des données du serveur
  const waitingEntries = entries.filter(e => e.status === 'waiting');
  const inProgressEntry = entries.find(e => e.status === 'in_progress');
  const completedEntries = entries.filter(e => ['completed', 'cancelled', 'no_show'].includes(e.status));

  // ✅ Recherche patient avec debounce (300ms)
  const handlePatientSearch = (value) => {
    const found = patients.find(p => p.full_name === value);
    if (found) {
      setForm(prev => ({ ...prev, patient: found.id }));
    } else {
      setForm(prev => ({ ...prev, patient: '' }));
    }

    // Debounce : attendre 300ms avant de chercher sur le serveur
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value && value.length >= 2) {
      searchTimerRef.current = setTimeout(() => {
        fetchPatients(value);
      }, 300);
    } else if (value.length === 0) {
      fetchPatients(); // Recharger la liste complète
    }
  };

  // Nettoyer le timer au démontage
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // ─── RENDER ───────────────────────────────────
  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1"><i className="bi bi-people-fill me-2"></i>File d'Attente</h3>
          <p className="text-muted mb-0">Gérez la file d'attente de vos patients</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-person-plus me-2"></i>Ajouter un patient
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm border-start border-warning border-4">
              <div className="card-body text-center py-3">
                <h4 className="text-warning mb-1">{stats.today_waiting}</h4>
                <small className="text-muted">En attente</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm border-start border-success border-4">
              <div className="card-body text-center py-3">
                <h4 className="text-success mb-1">{stats.today_in_progress}</h4>
                <small className="text-muted">En consultation</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm border-start border-primary border-4">
              <div className="card-body text-center py-3">
                <h4 className="text-primary mb-1">{stats.today_completed}</h4>
                <small className="text-muted">Terminés</small>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm border-start border-danger border-4">
              <div className="card-body text-center py-3">
                <h4 className="text-danger mb-1">{stats.today_no_show}</h4>
                <small className="text-muted">Absents</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body d-flex flex-wrap align-items-center gap-2">
          <div className="btn-group" role="group">
            {[
              { key: 'waiting', label: 'En attente', icon: 'bi-hourglass-split' },
              { key: 'in_progress', label: 'En cours', icon: 'bi-person-workspace' },
              { key: 'all', label: 'Tous', icon: 'bi-list-ul' },
            ].map(f => (
              <button key={f.key}
                className={`btn btn-sm ${filterStatus === f.key ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilterStatus(f.key)}>
                <i className={`bi ${f.icon} me-1`}></i>{f.label}
              </button>
            ))}
          </div>
          <div className="ms-auto d-flex align-items-center gap-3">
            {stats?.avg_wait_minutes != null && (
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-clock me-1"></i>Attente moy. : <strong>{stats.avg_wait_minutes} min</strong>
              </span>
            )}
            {stats?.avg_consultation_minutes != null && (
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                <i className="bi bi-heart-pulse me-1"></i>Consult. moy. : <strong>{stats.avg_consultation_minutes} min</strong>
              </span>
            )}
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
          <p className="mt-2 text-muted">Chargement de la file d'attente...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-inbox display-4 text-muted"></i>
          <p className="mt-2 text-muted">
            {filterStatus !== 'all'
              ? `Aucun patient avec le statut "${filterStatus}".`
              : 'La file d\'attente est vide.'}
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {/* ── Patient en consultation ── */}
          {inProgressEntry && filterStatus !== 'waiting' && (
            <div className="col-12">
              <h6 className="text-success mb-3">
                <i className="bi bi-person-workspace me-2"></i>En consultation
              </h6>
              <div className="card border-success shadow-sm">
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-md-3">
                      <h5 className="mb-1">
                        {inProgressEntry.patient_info?.full_name || inProgressEntry.patient_name || '—'}
                      </h5>
                      <small className="text-muted">
                        Arrivé {formatTime(inProgressEntry.joined_at)}
                        {inProgressEntry.patient_info?.phone_number && (
                          <span className="d-block">{inProgressEntry.patient_info.phone_number}</span>
                        )}
                      </small>
                    </div>
                    <div className="col-md-2">{getPriorityBadge(inProgressEntry.priority)}</div>
                    <div className="col-md-2">
                      <span className="text-muted">
                        <i className="bi bi-tag me-1"></i>{inProgressEntry.reason_display}
                      </span>
                    </div>
                    {inProgressEntry.cabinet_info && (
                      <div className="col-md-2">
                        <small className="text-muted">
                          <i className="bi bi-building me-1"></i>{inProgressEntry.cabinet_info.name}
                        </small>
                      </div>
                    )}
                    {inProgressEntry.appointment && (
                      <div className="col-md-1">
                        <span className="badge bg-info text-dark">
                          <i className="bi bi-calendar-check me-1"></i>RDV
                        </span>
                      </div>
                    )}
                    <div className="col-md-2 text-end">
                      <button className="btn btn-success btn-sm"
                        onClick={() => handleComplete(inProgressEntry.id)}
                        title="Terminer la consultation">
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
              <h6 className="text-warning mb-3">
                <i className="bi bi-hourglass-split me-2"></i>En attente ({waitingEntries.length})
              </h6>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th>Patient</th>
                      <th>Priorité</th>
                      <th>Motif</th>
                      <th>Cabinet</th>
                      <th>RDV</th>
                      <th>Arrivée</th>
                      <th>Attente est.</th>
                      <th>Détails</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitingEntries.map((entry) => (
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
                          <strong>{entry.patient_info?.full_name || entry.patient_name || '—'}</strong>
                          {entry.patient_info?.phone_number && (
                            <small className="text-muted d-block">{entry.patient_info.phone_number}</small>
                          )}
                        </td>
                        <td>{getPriorityBadge(entry.priority)}</td>
                        <td><span className="text-muted">{entry.reason_display}</span></td>
                        <td>
                          {entry.cabinet_info ? (
                            <small>{entry.cabinet_info.name}</small>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
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
                            <span className={`fw-bold ${entry.estimated_wait_minutes > 30 ? 'text-danger' : 'text-muted'}`}>
                              ~{entry.estimated_wait_minutes} min
                            </span>
                          ) : entry.wait_time != null ? (
                            <span className={`fw-bold ${entry.wait_time > 30 ? 'text-danger' : 'text-muted'}`}>
                              ~{entry.wait_time} min
                            </span>
                          ) : (
                            <span className="text-muted">?</span>
                          )}
                        </td>
                        <td><small className="text-muted">{entry.reason_details || '—'}</small></td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-success"
                              onClick={() => handleCallPatient(entry.id)}
                              title="Appeler ce patient">
                              <i className="bi bi-megaphone"></i>
                            </button>
                            <button className="btn btn-outline-danger"
                              onClick={() => handleNoShow(entry.id)}
                              title="Marquer absent">
                              <i className="bi bi-x-circle"></i>
                            </button>
                            <button className="btn btn-outline-secondary"
                              onClick={() => handleRemove(entry.id)}
                              title="Retirer">
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Terminés / Annulés / Absents ── */}
          {filterStatus === 'all' && completedEntries.length > 0 && (
            <div className="col-12">
              <h6 className="text-muted mb-3">
                <i className="bi bi-check2-circle me-2"></i>Terminés / Annulés ({completedEntries.length})
              </h6>
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Patient</th>
                      <th>Statut</th>
                      <th>Motif</th>
                      <th>Arrivée</th>
                      <th>Attente réelle</th>
                      <th>Durée consult.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedEntries.map((entry) => (
                      <tr key={entry.id} className="text-muted">
                        <td>{entry.position}</td>
                        <td>{entry.patient_info?.full_name || entry.patient_name || '—'}</td>
                        <td>{getStatusBadge(entry.status)}</td>
                        <td>{entry.reason_display}</td>
                        <td>{formatTime(entry.joined_at)}</td>
                        <td>{formatMinutes(entry.actual_wait_minutes)}</td>
                        <td>{formatMinutes(entry.consultation_duration_minutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ MODAL AJOUT PATIENT ═══════════════ */}
      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-person-plus me-2"></i>Ajouter un patient à la file
                </h5>
                <button type="button" className="btn-close btn-close-white"
                  onClick={() => { setShowModal(false); setFormErrors({}); }}></button>
              </div>
              <form onSubmit={handleAddPatient}>
                <div className="modal-body">
                  {/* ✅ Erreur générale */}
                  {formErrors.detail && (
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-triangle me-2"></i>{formErrors.detail}
                    </div>
                  )}
                  {/* ✅ Erreur non-champ (ex: erreur serveur) */}
                  {formErrors.non_field_errors && (
                    <div className="alert alert-danger">
                      {Array.isArray(formErrors.non_field_errors)
                        ? formErrors.non_field_errors.map((e, i) => <div key={i}>{e}</div>)
                        : formErrors.non_field_errors}
                    </div>
                  )}

                  <div className="row g-3">
                    {/* ── Patient (datalist) ── */}
                    <div className="col-md-12">
                      <label className="form-label fw-semibold">
                        Patient <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${formErrors.patient ? 'is-invalid' : ''}`}
                        list="patients-list"
                        placeholder="Tapez au moins 2 lettres pour rechercher..."
                        value={
                          form.patient
                            ? (patients.find(p => String(p.id) === String(form.patient))?.full_name || '')
                            : ''
                        }
                        onChange={(e) => handlePatientSearch(e.target.value)}
                        onFocus={() => { if (patients.length === 0) fetchPatients(); }}
                        autoComplete="off"
                      />
                      <datalist id="patients-list">
                        {patients.map(p => (
                          <option key={p.id} value={p.full_name}>
                            {p.full_name}{p.phone_number ? ` (Tel: ${p.phone_number})` : ''}
                          </option>
                        ))}
                      </datalist>
                      {formErrors.patient && (
                        <div className="invalid-feedback">
                          {Array.isArray(formErrors.patient)
                            ? formErrors.patient[0]
                            : formErrors.patient}
                        </div>
                      )}
                      <div className="form-text">
                        {form.patient ? (
                          <span className="text-success">
                            <i className="bi bi-check-circle me-1"></i>Patient sélectionné
                          </span>
                        ) : (
                          <span>Saisissez le nom du patient</span>
                        )}
                      </div>
                    </div>

                    {/* ── Priorité ── */}
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Priorité</label>
                      <select className="form-select" value={form.priority}
                        onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}>
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                        <option value="emergency">Urgence</option>
                        <option value="child">Enfant</option>
                        <option value="senior">Personne âgée</option>
                        <option value="pregnant">Femme enceinte</option>
                      </select>
                    </div>

                    {/* ── Motif ── */}
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Motif</label>
                      <select className="form-select" value={form.reason}
                        onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}>
                        <option value="consultation">Consultation générale</option>
                        <option value="follow_up">Suivi / Contrôle</option>
                        <option value="emergency">Urgence</option>
                        <option value="vaccination">Vaccination</option>
                        <option value="analysis">Résultat d'analyses</option>
                        <option value="certificate">Certificat médical</option>
                        <option value="prescription_renewal">Renouvellement d'ordonnance</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>

                    {/* ── Détails du motif ── */}
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Détails du motif</label>
                      <input type="text" className="form-control" value={form.reason_details}
                        onChange={(e) => setForm(prev => ({ ...prev, reason_details: e.target.value }))}
                        placeholder="Description courte..." />
                    </div>

                    {/* ── Notes ── */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Notes</label>
                      <textarea className="form-control" rows="2" value={form.notes}
                        onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Notes supplémentaires pour le médecin..." />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => { setShowModal(false); setFormErrors({}); }}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary"
                    disabled={submitting || !form.patient}>
                    {submitting ? (
                      <><span className="spinner-border spinner-border-sm me-1"></span>Ajout en cours...</>
                    ) : (
                      <><i className="bi bi-plus-lg me-1"></i>Ajouter à la file</>
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