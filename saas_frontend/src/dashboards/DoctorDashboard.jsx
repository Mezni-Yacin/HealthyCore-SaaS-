// src/dashboards/DoctorDashboard.jsx
// ──────────────────────────────────────────────────────────────
// Tableau de bord Médecin — Premium
// MedSaaS Pro | Bootstrap 5 CDN | Service api | useAuth
// ──────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Dashboardcss/DoctorDashboard.css';


/* ══════════════════ Helpers ══════════════════ */

/** Jours et mois en français */
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** Date complète en français : "mercredi 25 juin 2026" */
function dateFR() {
  const d = new Date();
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Heure en direct HH:MM:SS */
function timeFR() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Formatte HH:MM depuis ISO */
function fmtTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Statut badge */
function statusBadge(status) {
  const s = (status || '').toLowerCase();
  const map = {
    confirmed: { label: 'Confirmé', cls: 'bg-success-subtle text-success' },
    confirmé:  { label: 'Confirmé', cls: 'bg-success-subtle text-success' },
    pending:   { label: 'En attente', cls: 'bg-warning-subtle text-warning' },
    en_attente:{ label: 'En attente', cls: 'bg-warning-subtle text-warning' },
    cancelled: { label: 'Annulé', cls: 'bg-danger-subtle text-danger' },
    annulé:    { label: 'Annulé', cls: 'bg-danger-subtle text-danger' },
    completed: { label: 'Terminé', cls: 'bg-info-subtle text-info' },
    terminé:   { label: 'Terminé', cls: 'bg-info-subtle text-info' },
    in_progress:{ label: 'En cours', cls: 'bg-primary-subtle text-primary' },
    en_cours:  { label: 'En cours', cls: 'bg-primary-subtle text-primary' },
    no_show:   { label: 'Absent', cls: 'bg-danger-subtle text-danger' },
    absent:    { label: 'Absent', cls: 'bg-danger-subtle text-danger' },
    upcoming:  { label: 'À venir', cls: 'bg-primary-subtle text-primary' },
    waiting:   { label: 'En salle', cls: 'bg-warning-subtle text-warning' },
  };
  const m = map[s] || { label: status || '—', cls: 'bg-secondary-subtle text-secondary' };
  return <span className={`doc-badge ${m.cls}`}>{m.label}</span>;
}

/** Couleurs pour les avatars patients */
const AVATAR_COLORS = ['#0d6efd','#198754','#6f42c1','#d63384','#fd7e14','#0dcaf0','#dc3545','#20c997'];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ══════════════════ Composant principal ══════════════════ */

export default function DoctorDashboard() {
  const { user } = useAuth();

  // ── Horloge en temps réel ──
  const [clock, setClock] = useState(timeFR());
  useEffect(() => {
    const t = setInterval(() => setClock(timeFR()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Données ──
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayAppts: 0,
    queueCount: 0,
    totalPatients: 0,
    unread: 0,
    todayCompleted: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);

  // ── Chargement ──
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      // ✅ RDV du médecin — endpoint CORRECT : /appointments/doctor/
      const apptRes = await api.get('/appointments/doctor/', {
        params: { date: today, page_size: 10 },
      }).catch(() => ({ data: { results: [] } }));
      const apptList = apptRes.data.results || apptRes.data || [];
      setAppointments(apptList);

      const completed = apptList.filter(
        a => (a.status || '').toLowerCase() === 'completed' || (a.status || '').toLowerCase() === 'terminé'
      ).length;

      // ✅ File d'attente du jour — déjà fonctionnel
      const queueRes = await api.get('/waiting-queue/doctor/today/')
        .catch(() => ({ data: [] }));
      const queueList = queueRes.data.results || queueRes.data || [];
      setQueue(queueList);

      // ✅ Nombre total de patients (dossiers médicaux du médecin)
      // Endpoint CORRECT : /medical-records/doctor/stats/
      const recordsStatsRes = await api.get('/medical-records/doctor/stats/')
        .catch(() => ({ data: {} }));
      const totalPatients = recordsStatsRes.data.total_records
        || recordsStatsRes.data.total_patients
        || recordsStatsRes.data.count
        || 0;

      // Messages non-lus — déjà fonctionnel
      const msgRes = await api.get('/messaging/conversations/')
        .catch(() => ({ data: [] }));
      const msgList = msgRes.data.results || msgRes.data || [];
      const unread = msgList.reduce((s, c) => s + (c.unread_count || 0), 0);

      // Patients récents (les 5 premiers RDV du jour pour en extraire les noms)
      const patientMap = {};
      apptList.forEach(a => {
        const name = a.patient_name || a.patient_first_name || '';
        if (name && !patientMap[name]) {
          patientMap[name] = {
            name,
            time: a.start_time || a.time_slot,
            reason: a.reason || a.notes || '',
          };
        }
      });
      setRecentPatients(Object.values(patientMap).slice(0, 5));

      setStats({
        todayAppts: apptList.length,
        queueCount: queueList.length,
        totalPatients,
        unread,
        todayCompleted: completed,
      });
    } catch {
      // Silencieux — les valeurs par défaut restent à 0
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    // Refresh toutes les 30s
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  /* ════════════ RENDU ════════════ */

  return (
    <div className="doc-dash">

      {/* ══════════ BANDEAU BIENVENUE ══════════ */}
      <div className="doc-welcome">
        <div className="row align-items-center">
          <div className="col">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="pulse-dot"></span>
              <span className="welcome-clock">{clock}</span>
            </div>
            <h2>
              Bonjour Dr. {user?.first_name || user?.username || 'Médecin'}
            </h2>
            <p className="welcome-sub">
              {stats.todayAppts > 0
                ? `Vous avez ${stats.todayAppts} rendez-vous aujourd'hui.`
                : 'Aucun rendez-vous programmé pour aujourd\'hui.'}
            </p>
            <p className="welcome-date">
              <i className="bi bi-calendar3 me-1"></i>{dateFR()}
            </p>
          </div>
          <div className="col-auto d-none d-md-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
              style={{
                width: '68px',
                height: '68px',
                background: 'rgba(255,255,255,0.12)',
                fontSize: '1.5rem',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            >
              {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ CARTES STATISTIQUES ══════════ */}
      {loading ? (
        <div className="row g-3 mb-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="col-6 col-lg-3">
              <div className="doc-skeleton" style={{ height: '140px' }}></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="row g-3 mb-4">
          {/* RDV aujourd'hui */}
          <div className="col-6 col-lg-3">
            <div className="card doc-stat-card">
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background: 'linear-gradient(135deg, #0d6efd, #073b8a)' }}>
                    <i className="bi bi-calendar-check"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-label">RDV aujourd'hui</div>
                    <div className="stat-value" style={{ color: '#0d6efd' }}>{stats.todayAppts}</div>
                  </div>
                </div>
                <div className="stat-progress">
                  <div className="bar" style={{ width: `${stats.todayAppts > 0 ? (stats.todayCompleted / stats.todayAppts * 100) : 0}%`, background: '#0d6efd' }}></div>
                </div>
                <div className="stat-sub">{stats.todayCompleted} terminé(s) sur {stats.todayAppts}</div>
              </div>
            </div>
          </div>

          {/* En salle d'attente */}
          <div className="col-6 col-lg-3">
            <div className="card doc-stat-card">
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background: 'linear-gradient(135deg, #fd7e14, #e8590c)' }}>
                    <i className="bi bi-hourglass-split"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-label">Salle d'attente</div>
                    <div className="stat-value" style={{ color: '#fd7e14' }}>{stats.queueCount}</div>
                  </div>
                </div>
                <div className="stat-sub">
                  {stats.queueCount > 0
                    ? `${stats.queueCount} patient(s) en attente`
                    : 'Aucun patient en attente'}
                </div>
              </div>
            </div>
          </div>

          {/* Total patients */}
          <div className="col-6 col-lg-3">
            <div className="card doc-stat-card">
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background: 'linear-gradient(135deg, #198754, #0a6843)' }}>
                    <i className="bi bi-people-fill"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-label">Mes patients</div>
                    <div className="stat-value" style={{ color: '#198754' }}>{stats.totalPatients}</div>
                  </div>
                </div>
                <div className="stat-sub">Dossiers médicaux</div>
              </div>
            </div>
          </div>

          {/* Messages non-lus */}
          <div className="col-6 col-lg-3">
            <div className="card doc-stat-card">
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background: 'linear-gradient(135deg, #6f42c1, #563d9c)' }}>
                    <i className="bi bi-chat-dots-fill"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-label">Messages</div>
                    <div className="stat-value" style={{ color: '#6f42c1' }}>{stats.unread}</div>
                  </div>
                </div>
                <div className="stat-sub">
                  {stats.unread > 0 ? 'Non lu(s)' : 'Boîte vide'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ACTIONS RAPIDES ══════════ */}
      <div className="mb-4">
        <h6 className="doc-section-title">
          <i className="bi bi-lightning-charge-fill"></i>Actions rapides
        </h6>
        <div className="row g-2 g-lg-3">
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/waiting-queue" className="doc-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #fd7e14, #e8590c)' }}>
                <i className="bi bi-hourglass-split"></i>
              </div>
              <span className="qa-label">File d'attente</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/appointments" className="doc-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #0d6efd, #073b8a)' }}>
                <i className="bi bi-calendar-plus"></i>
              </div>
              <span className="qa-label">Nouveau RDV</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/medical-records" className="doc-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #198754, #0a6843)' }}>
                <i className="bi bi-file-earmark-plus"></i>
              </div>
              <span className="qa-label">Nouveau dossier</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/my-schedule" className="doc-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #0dcaf0, #0a8fad)' }}>
                <i className="bi bi-calendar3"></i>
              </div>
              <span className="qa-label">Emploi du temps</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/my-cabinets" className="doc-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #6f42c1, #563d9c)' }}>
                <i className="bi bi-building"></i>
              </div>
              <span className="qa-label">Mes cabinets</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/messages" className="doc-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #d63384, #b02a6e)' }}>
                <i className="bi bi-chat-dots"></i>
              </div>
              <span className="qa-label">Messages</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════ CONTENU PRINCIPAL : Timeline + Panneaux latéraux ══════════ */}
      <div className="row g-4">

        {/* ── COLONNE GAUCHE : Timeline des RDV ── */}
        <div className="col-lg-7">
          <div className="doc-panel h-100">
            <div className="panel-head">
              <h6>
                <i className="bi bi-clock-history me-2 text-primary"></i>
                RDV du jour
              </h6>
              <Link to="/appointments" className="btn btn-sm btn-outline-primary ms-auto py-0 px-2" style={{ fontSize: '0.78rem' }}>
                Voir tout <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
            <div className="panel-body">
              {loading ? (
                <div className="d-flex flex-column gap-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="doc-skeleton" style={{ height: '70px' }}></div>
                  ))}
                </div>
              ) : appointments.length === 0 ? (
                <div className="doc-empty">
                  <i className="bi bi-calendar-x"></i>
                  <p>Aucun rendez-vous aujourd'hui</p>
                  <Link to="/appointments" className="btn btn-sm btn-primary mt-2">
                    <i className="bi bi-plus-lg me-1"></i>Planifier un RDV
                  </Link>
                </div>
              ) : (
                <div className="doc-timeline">
                  {appointments.map((apt, idx) => {
                    const s = (apt.status || '').toLowerCase();
                    const dotClass = s === 'completed' || s === 'terminé' ? 'done'
                      : s === 'in_progress' || s === 'en_cours' ? 'current'
                      : s === 'cancelled' || s === 'annulé' || s === 'no_show' || s === 'absent' ? 'cancelled'
                      : '';

                    const patientName = apt.patient_name || apt.patient_first_name || 'Patient';
                    const patientInitial = patientName[0].toUpperCase();

                    return (
                      <div key={apt.id || idx} className="doc-tl-item">
                        <div className={`doc-tl-dot ${dotClass}`}></div>
                        <div className="doc-tl-card">
                          <div className="d-flex align-items-start justify-content-between gap-2">
                            <div className="d-flex align-items-start gap-2 flex-grow-1">
                              <div
                                className="doc-patient-avatar d-none d-sm-flex"
                                style={{ background: avatarColor(patientName) }}
                              >
                                {patientInitial}
                              </div>
                              <div>
                                <div className="doc-tl-name">{patientName}</div>
                                <p className="doc-tl-info">
                                  {apt.reason || apt.notes || apt.motif || 'Consultation générale'}
                                </p>
                                {apt.cabinet_name && (
                                  <p className="doc-tl-info">
                                    <i className="bi bi-building me-1"></i>{apt.cabinet_name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-end flex-shrink-0">
                              <div className="doc-tl-time">{fmtTime(apt.start_time || apt.time_slot)}</div>
                              <div className="mt-1">{statusBadge(apt.status)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── COLONNE DROITE : File + Patients + Conseil ── */}
        <div className="col-lg-5">

          {/* File d'attente en direct */}
          <div className="doc-panel mb-4">
            <div className="panel-head">
              <h6>
                <i className="bi bi-hourglass-split me-2" style={{ color: '#fd7e14' }}></i>
                Salle d'attente
              </h6>
              {stats.queueCount > 0 && (
                <span className="panel-badge">{stats.queueCount}</span>
              )}
              <Link to="/waiting-queue" className="btn btn-sm btn-outline-warning ms-2 py-0 px-2" style={{ fontSize: '0.75rem' }}>
                Gérer <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
            <div className="panel-body">
              {loading ? (
                <div className="d-flex flex-column gap-2">
                  {[1,2].map(i => (
                    <div key={i} className="doc-skeleton" style={{ height: '52px' }}></div>
                  ))}
                </div>
              ) : queue.length === 0 ? (
                <div className="doc-empty" style={{ padding: '1.5rem 1rem' }}>
                  <i className="bi bi-emoji-smile" style={{ color: '#198754', fontSize: '1.8rem' }}></i>
                  <p style={{ color: '#198754' }}>Aucun patient en attente</p>
                </div>
              ) : (
                <div>
                  {queue.slice(0, 4).map((item, idx) => {
                    const name = item.patient_name || item.patient_first_name || item.patient?.first_name || 'Patient';
                    return (
                      <div key={item.id || idx} className="doc-queue-item">
                        <div className="doc-queue-num">{idx + 1}</div>
                        <div className="flex-grow-1">
                          <div className="doc-queue-name">{name}</div>
                          <p className="doc-queue-time">
                            <i className="bi bi-clock me-1"></i>
                            Arrivé à {fmtTime(item.joined_at || item.created_at)}
                          </p>
                        </div>
                        {item.appointment_id && (
                          <span className="doc-badge bg-primary-subtle text-primary" style={{ fontSize: '0.65rem' }}>
                            <i className="bi bi-calendar-check"></i>RDV
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {queue.length > 4 && (
                    <Link to="/waiting-queue" className="d-block text-center mt-2" style={{ fontSize: '0.8rem', color: '#fd7e14', fontWeight: 600 }}>
                      +{queue.length - 4} autre(s) patient(s)
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Patients du jour */}
          <div className="doc-panel mb-4">
            <div className="panel-head">
              <h6>
                <i className="bi bi-people me-2 text-success"></i>
                Patients du jour
              </h6>
            </div>
            <div className="panel-body" style={{ padding: '0.75rem 1.25rem' }}>
              {recentPatients.length === 0 ? (
                <div className="doc-empty" style={{ padding: '1.25rem 1rem' }}>
                  <i className="bi bi-person-x"></i>
                  <p>Aucun patient aujourd'hui</p>
                </div>
              ) : (
                recentPatients.map((p, idx) => (
                  <div key={idx} className="doc-patient-row">
                    <div className="doc-patient-avatar" style={{ background: avatarColor(p.name) }}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <div className="flex-grow-1">
                      <div className="doc-patient-name">{p.name}</div>
                      <p className="doc-patient-meta">
                        {p.reason || 'Consultation'}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                      {fmtTime(p.time)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Conseil du jour */}
          <div className="doc-tip">
            <div className="d-flex align-items-start gap-3">
              <div className="tip-icon">
                <i className="bi bi-lightbulb"></i>
              </div>
              <p className="tip-text">
                Pensez à consulter la <strong>file d'attente</strong> avant chaque consultation
                pour appeler le patient suivant. Vous pouvez aussi mettre à jour les dossiers
                médicaux en temps réel depuis le tableau de bord.
              </p>
            </div>
          </div>

          {/* Liens utiles */}
          <div className="d-grid gap-2 mt-3">
            <Link to="/my-secretaries" className="btn btn-outline-secondary btn-sm text-start">
              <i className="bi bi-person-workspace me-2"></i>Gérer mes secrétaires
            </Link>
            <Link to="/cabinet-directory" className="btn btn-outline-secondary btn-sm text-start">
              <i className="bi bi-search me-2"></i>Annuaire des cabinets
            </Link>
            <Link to="/profile" className="btn btn-outline-secondary btn-sm text-start">
              <i className="bi bi-gear me-2"></i>Paramètres du profil
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}