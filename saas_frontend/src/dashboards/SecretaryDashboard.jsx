// src/dashboards/SecretaryDashboard.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Dashboardcss/SecretaryDashboard.css';

// Importation Recharts
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';

/* ══════════════════ Helpers ══════════════════ */

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function dateFR() {
  const d = new Date();
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

function timeFR() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  const map = {
    scheduled:    { label: 'Programmé', cls: 'bg-primary-subtle text-primary' },
    confirmed:    { label: 'Confirmé', cls: 'bg-success-subtle text-success' },
    in_progress:  { label: 'En cours', cls: 'bg-warning-subtle text-warning' },
    completed:    { label: 'Terminé', cls: 'bg-info-subtle text-info' },
    cancelled:    { label: 'Annulé', cls: 'bg-danger-subtle text-danger' },
    no_show:      { label: 'Absent', cls: 'bg-danger-subtle text-danger' },
  };
  const m = map[s] || { label: status || '—', cls: 'bg-secondary-subtle text-secondary' };
  return <span className={`sec-badge ${m.cls}`}>{m.label}</span>;
}

/* ══════════════════ Composant principal ══════════════════ */

export default function SecretaryDashboard() {
  const { user } = useAuth();

  // ── Horloge ──
  const [clock, setClock] = useState(timeFR());
  useEffect(() => {
    const t = setInterval(() => setClock(timeFR()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Données ──
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayAppts: 0,
    todayCompleted: 0,
    todayCancelled: 0,
    queueCount: 0,
    totalRecords: 0,
    unread: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // ── Chargement ──
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      // ✅ RDV du jour
      const apptRes = await api.get('/appointments/secretary/', {
        params: { date: today, page_size: 100 },
      }).catch(() => ({ data: { results: [] } }));
      const apptList = apptRes.data.results || apptRes.data || [];
      setAppointments(apptList);

      const completed = apptList.filter(a => (a.status || '').toLowerCase() === 'completed').length;
      const cancelled = apptList.filter(a => ['cancelled', 'no_show'].includes((a.status || '').toLowerCase())).length;

      // ✅ File d'attente
      const queueRes = await api.get('/waiting-queue/secretary/today/').catch(() => ({ data: [] }));
      const queueList = queueRes.data.results || queueRes.data || [];
      setQueue(queueList);

      // ✅ Dossiers médicaux
      const recRes = await api.get('/medical-records/secretary/stats/').catch(() => ({ data: {} }));
      const totalRecords = recRes.data.total_records || recRes.data.total_patients || recRes.data.count || 0;

      // ✅ Messages
      const msgRes = await api.get('/messaging/conversations/').catch(() => ({ data: [] }));
      const msgList = msgRes.data.results || msgRes.data || [];
      const unread = msgList.reduce((s, c) => s + (c.unread_count || 0), 0);

      // Générer des alertes intelligentes
      const autoAlerts = [];
      const pendingAppts = apptList.filter(a => (a.status || '').toLowerCase() === 'scheduled');
      if (pendingAppts.length > 0) {
        autoAlerts.push({
          type: 'warning',
          icon: 'bi-clock',
          iconBg: '#ffc107',
          title: `${pendingAppts.length} RDV en attente de confirmation`,
          desc: 'Pensez à confirmer ou rappeler les patients.',
        });
      }
      if (queueList.length > 3) {
        autoAlerts.push({
          type: 'danger',
          icon: 'bi-people-fill',
          iconBg: '#ef5350',
          title: `${queueList.length} patients en salle d'attente`,
          desc: 'La file est chargée, prévenez le médecin.',
        });
      }
      if (unread > 0) {
        autoAlerts.push({
          type: 'info',
          icon: 'bi-envelope',
          iconBg: '#42a5f5',
          title: `${unread} message(s) non lu(s)`,
          desc: 'Consultez votre boîte de réception.',
        });
      }

      setAlerts(autoAlerts);
      setStats({
        todayAppts: apptList.length,
        todayCompleted: completed,
        todayCancelled: cancelled,
        queueCount: queueList.length,
        totalRecords,
        unread,
      });
    } catch {
      // Silencieux
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ── Séparation des RDV : à venir vs passés ──
  // ✅ FIX: Utiliser date_time (champ du backend) au lieu de start_time
  const now = new Date();
  const upcomingAppts = appointments.filter(a => {
    const t = a.date_time || a.start_time;
    if (!t) return true;
    return new Date(t) >= now;
  });
  const pastAppts = appointments.filter(a => {
    const t = a.date_time || a.start_time;
    if (!t) return false;
    return new Date(t) < now;
  });

  // ── Calculs pour les graphiques (Recharts) ──
  const { statusData, hourlyData } = useMemo(() => {
    const statusCounts = {
      'Confirmés': 0,
      'Terminés': 0,
      'Programmés': 0, // Inclut scheduled et in_progress
      'Annulés': 0,
    };
    
    const hourCounts = {};
    // Initialiser les heures de 8h à 18h
    for(let i=8; i<=18; i++) {
      hourCounts[`${i}h`] = 0;
    }

    appointments.forEach(apt => {
      // ✅ FIX: Statuts exacts du backend
      const s = (apt.status || '').toLowerCase();
      if (s === 'completed') statusCounts['Terminés']++;
      else if (s === 'confirmed') statusCounts['Confirmés']++;
      else if (s === 'scheduled' || s === 'in_progress') statusCounts['Programmés']++;
      else if (s === 'cancelled' || s === 'no_show') statusCounts['Annulés']++;
      
      // ✅ FIX: Utiliser date_time (champ du backend) au lieu de start_time
      const t = apt.date_time || apt.start_time;
      if (t) {
        const d = new Date(t);
        const h = d.getHours();
        if (h >= 8 && h <= 18) {
          hourCounts[`${h}h`] = (hourCounts[`${h}h`] || 0) + 1;
        }
      }
    });

    const sData = [
      { name: 'Confirmés', value: statusCounts['Confirmés'], color: '#0d6efd' },
      { name: 'Terminés', value: statusCounts['Terminés'], color: '#198754' },
      { name: 'Programmés', value: statusCounts['Programmés'], color: '#ffc107' },
      { name: 'Annulés', value: statusCounts['Annulés'], color: '#dc3545' },
    ].filter(item => item.value > 0);

    const hData = Object.entries(hourCounts).map(([hour, count]) => ({ name: hour, rdv: count }));

    return { statusData: sData, hourlyData: hData };
  }, [appointments]);

  /* ════════════ RENDU ════════════ */

  return (
    <div className="sec-dash">

      {/* ══════════ BANDEAU BIENVENUE ══════════ */}
      <div className="sec-welcome">
        <div className="row align-items-center">
          <div className="col">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="pulse-dot"></span>
              <span className="welcome-clock">{clock}</span>
            </div>
            <h2>
              Bonjour {user?.first_name || user?.username || 'Secrétaire'} !
            </h2>
            <p className="welcome-sub">
              {stats.todayAppts > 0
                ? `Vous avez ${stats.todayAppts} rendez-vous à gérer aujourd'hui.`
                : 'Journée calme — aucun rendez-vous programmé.'}
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
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="col-6 col-lg-3">
              <div className="sec-skeleton" style={{ height: '140px' }}></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="row g-3 mb-4">
          {/* RDV aujourd'hui */}
          <div className="col-6 col-lg-3">
            <div className="card sec-stat-card">
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
                  <div
                    className="bar"
                    style={{
                      width: `${stats.todayAppts > 0 ? (stats.todayCompleted / stats.todayAppts * 100) : 0}%`,
                      background: '#0d6efd',
                    }}
                  ></div>
                </div>
                <div className="stat-sub">
                  {stats.todayCompleted} terminé(s) · {stats.todayCancelled} annulé(s)
                </div>
              </div>
            </div>
          </div>

          {/* Salle d'attente */}
          <div className="col-6 col-lg-3">
            <div className="card sec-stat-card">
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background: 'linear-gradient(135deg, #fd7e14, #e8590c)' }}>
                    <i className="bi bi-people-fill"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-label">Salle d'attente</div>
                    <div className="stat-value" style={{ color: '#fd7e14' }}>{stats.queueCount}</div>
                  </div>
                </div>
                <div className="stat-sub">
                  {stats.queueCount > 0
                    ? `${stats.queueCount} patient(s) en attente`
                    : 'Salle vide'}
                </div>
              </div>
            </div>
          </div>

          {/* Dossiers */}
          <div className="col-6 col-lg-3">
            <div className="card sec-stat-card">
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background: 'linear-gradient(135deg, #198754, #0a6843)' }}>
                    <i className="bi bi-folder2-open"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-label">Dossiers</div>
                    <div className="stat-value" style={{ color: '#198754' }}>{stats.totalRecords}</div>
                  </div>
                </div>
                <div className="stat-sub">Dossiers médicaux</div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="col-6 col-lg-3">
            <div className="card sec-stat-card">
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

      {/* ══════════ ALERTES INTELLIGENTES ══════════ */}
      {!loading && alerts.length > 0 && (
        <div className="mb-4">
          <h6 className="sec-section-title">
            <i className="bi bi-bell-fill"></i>Alertes du jour
          </h6>
          <div className="row g-3">
            {alerts.map((alert, idx) => (
              <div key={idx} className="col-md-6 col-lg-4">
                <div className={`sec-alert-card alert-${alert.type}-card`}>
                  <div className="alert-icon" style={{ background: alert.iconBg }}>
                    <i className={`bi ${alert.icon}`}></i>
                  </div>
                  <div>
                    <div className="alert-title">{alert.title}</div>
                    <p className="alert-desc">{alert.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ ACTIONS RAPIDES ══════════ */}
      <div className="mb-4">
        <h6 className="sec-section-title">
          <i className="bi bi-lightning-charge-fill"></i>Actions rapides
        </h6>
        <div className="row g-2 g-lg-3">
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/appointments/secretary" className="sec-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #0d6efd, #073b8a)' }}>
                <i className="bi bi-calendar-plus"></i>
              </div>
              <span className="qa-label">Nouveau RDV</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/secretary-queue" className="sec-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #fd7e14, #e8590c)' }}>
                <i className="bi bi-hourglass-split"></i>
              </div>
              <span className="qa-label">File d'attente</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/secretary-records" className="sec-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #198754, #0a6843)' }}>
                <i className="bi bi-file-earmark-plus"></i>
              </div>
              <span className="qa-label">Dossiers</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/secretary-cabinets" className="sec-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #6f42c1, #563d9c)' }}>
                <i className="bi bi-building"></i>
              </div>
              <span className="qa-label">Cabinet</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/messages" className="sec-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #d63384, #b02a6e)' }}>
                <i className="bi bi-chat-dots"></i>
              </div>
              <span className="qa-label">Messages</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/profile" className="sec-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #0dcaf0, #0a8fad)' }}>
                <i className="bi bi-person"></i>
              </div>
              <span className="qa-label">Mon profil</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════ ANALYTIQUE SANTÉ (RECHARTS) ══════════ */}
      <div className="mb-4">
        <h6 className="sec-section-title">
          <i className="bi bi-graph-up-arrow"></i>Vue d'ensemble de la journée
        </h6>
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="sec-panel h-100">
              <div className="panel-head">
                <h6><i className="bi bi-activity me-2 text-primary"></i>Charge de la journée</h6>
              </div>
              <div className="panel-body" style={{ height: '300px', padding: '1rem 1.25rem' }}>
                {appointments.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRdv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d6efd" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0d6efd" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="rdv" name="Rendez-vous" stroke="#0d6efd" strokeWidth={3} fillOpacity={1} fill="url(#colorRdv)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted small d-flex align-items-center justify-content-center h-100">
                    Aucune donnée disponible pour aujourd'hui
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="sec-panel h-100">
              <div className="panel-head">
                <h6><i className="bi bi-pie-chart me-2 text-success"></i>Statut des RDV</h6>
              </div>
              <div className="panel-body d-flex align-items-center justify-content-center" style={{ height: '300px', padding: '1rem' }}>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}>
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted small">Aucune donnée disponible</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ CONTENU PRINCIPAL ══════════ */}
      <div className="row g-4">

        {/* ── COLONNE GAUCHE : RDV du jour ── */}
        <div className="col-lg-8">
          <div className="sec-panel h-100">
            <div className="panel-head">
              <h6>
                <i className="bi bi-calendar3 me-2 text-primary"></i>
                Rendez-vous du jour
              </h6>
              <span className="sec-badge bg-primary-subtle text-primary me-2">
                {stats.todayAppts} au total
              </span>
              <Link to="/appointments/secretary" className="btn btn-sm btn-outline-primary ms-auto py-0 px-2" style={{ fontSize: '0.78rem' }}>
                Voir tout <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
            <div className="panel-body">
              {loading ? (
                <div className="d-flex flex-column gap-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="sec-skeleton" style={{ height: '64px' }}></div>
                  ))}
                </div>
              ) : appointments.length === 0 ? (
                <div className="sec-empty">
                  <i className="bi bi-calendar-x"></i>
                  <p>Aucun rendez-vous aujourd'hui</p>
                  <Link to="/appointments/secretary" className="btn btn-sm btn-primary mt-2">
                    <i className="bi bi-plus-lg me-1"></i>Planifier un RDV
                  </Link>
                </div>
              ) : (
                <div>
                  {upcomingAppts.length > 0 && (
                    <>
                      <div className="d-flex align-items-center gap-2 mb-2 mt-1">
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#198754' }}>
                          <i className="bi bi-arrow-down-circle me-1"></i>À venir ({upcomingAppts.length})
                        </span>
                        <hr style={{ flex: 1, margin: 0, borderColor: '#e9ecef' }} />
                      </div>
                      {upcomingAppts.map((apt, idx) => {
                        const patientName = apt.patient_name || apt.patient_first_name || 'Patient';
                        const s = (apt.status || '').toLowerCase();
                        const isCurrent = s === 'in_progress';
                        const bgColor = isCurrent ? 'rgba(253,126,20,0.08)' : 'transparent';
                        const borderColor = isCurrent ? '#fd7e14' : 'transparent';

                        return (
                          <div
                            key={apt.id || idx}
                            className="sec-appt-row"
                            style={{ background: bgColor, borderLeft: isCurrent ? '3px solid #fd7e14' : '3px solid transparent', borderRadius: '8px', padding: '0.7rem 0.85rem' }}
                          >
                            <div className="sec-appt-time-box" style={{ background: isCurrent ? 'rgba(253,126,20,0.15)' : 'var(--sec-blue-light)', color: isCurrent ? '#e8590c' : '#0d6efd' }}>
                              {/* ✅ FIX: Utiliser date_time */}
                              <span className="time-val">{fmtTime(apt.date_time || apt.start_time)}</span>
                              <span className="time-label">heure</span>
                            </div>
                            <div className="flex-grow-1">
                              <div className="sec-appt-name">
                                {patientName}
                                {isCurrent && (
                                  <span className="sec-badge bg-warning-subtle text-warning ms-2">
                                    <i className="bi bi-circle-fill" style={{ fontSize: '0.4rem' }}></i>En cours
                                  </span>
                                )}
                              </div>
                              <p className="sec-appt-meta">
                                {apt.doctor_name || apt.doctor_first_name || 'Dr. —'}
                                {apt.cabinet_name && ` · ${apt.cabinet_name}`}
                                {apt.reason && ` · ${apt.reason}`}
                              </p>
                            </div>
                            <div className="text-end flex-shrink-0 d-flex flex-column gap-1 align-items-end">
                              {statusBadge(apt.status)}
                              {apt.id && (
                                <Link to={`/appointments/secretary/${apt.id}`} className="text-decoration-none" style={{ fontSize: '0.72rem', color: '#0d6efd', fontWeight: 600 }}>
                                  <i className="bi bi-eye me-1"></i>Détails
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {pastAppts.length > 0 && (
                    <>
                      <div className="d-flex align-items-center gap-2 mb-2 mt-3">
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#94a3b8' }}>
                          <i className="bi bi-check-circle me-1"></i>Passés ({pastAppts.length})
                        </span>
                        <hr style={{ flex: 1, margin: 0, borderColor: '#f1f5f9' }} />
                      </div>
                      {pastAppts.slice(0, 4).map((apt, idx) => {
                        const patientName = apt.patient_name || apt.patient_first_name || 'Patient';
                        return (
                          <div
                            key={apt.id || `past-${idx}`}
                            className="sec-appt-row"
                            style={{ opacity: 0.7 }}
                          >
                            <div className="sec-appt-time-box" style={{ background: '#f1f5f9', color: '#94a3b8' }}>
                              {/* ✅ FIX: Utiliser date_time */}
                              <span className="time-val">{fmtTime(apt.date_time || apt.start_time)}</span>
                              <span className="time-label">heure</span>
                            </div>
                            <div className="flex-grow-1">
                              <div className="sec-appt-name" style={{ color: '#94a3b8' }}>{patientName}</div>
                              <p className="sec-appt-meta">
                                {apt.doctor_name || apt.doctor_first_name || 'Dr. —'}
                              </p>
                            </div>
                            <div className="text-end flex-shrink-0">
                              {statusBadge(apt.status)}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── COLONNE DROITE ── */}
        <div className="col-lg-4">

          {/* File d'attente en direct */}
          <div className="sec-panel mb-4">
            <div className="panel-head">
              <h6>
                <i className="bi bi-hourglass-split me-2" style={{ color: '#fd7e14' }}></i>
                Salle d'attente
              </h6>
              {stats.queueCount > 0 && (
                <span style={{
                  background: '#dc3545',
                  color: '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.2em 0.55em',
                  borderRadius: '8px',
                  marginLeft: 'auto',
                }}>
                  {stats.queueCount}
                </span>
              )}
              <Link to="/secretary-queue" className="btn btn-sm btn-outline-warning ms-2 py-0 px-2" style={{ fontSize: '0.75rem' }}>
                Gérer
              </Link>
            </div>
            <div className="panel-body">
              {loading ? (
                <div className="d-flex flex-column gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="sec-skeleton" style={{ height: '52px' }}></div>
                  ))}
                </div>
              ) : queue.length === 0 ? (
                <div className="sec-empty" style={{ padding: '1.5rem 1rem' }}>
                  <i className="bi bi-emoji-smile" style={{ color: '#198754', fontSize: '1.8rem' }}></i>
                  <p style={{ color: '#198754' }}>Salle d'attente vide</p>
                </div>
              ) : (
                <div>
                  {queue.slice(0, 5).map((item, idx) => {
                    const name = item.patient_name || item.patient_first_name || item.patient?.first_name || 'Patient';
                    return (
                      <div key={item.id || idx} className="sec-queue-item">
                        <div className="sec-queue-num">{idx + 1}</div>
                        <div className="flex-grow-1">
                          <div className="sec-queue-name">{name}</div>
                          <p className="sec-queue-time">
                            <i className="bi bi-clock me-1"></i>
                            Arrivé à {fmtTime(item.joined_at || item.created_at)}
                          </p>
                        </div>
                        {item.appointment_id && (
                          <span className="sec-badge bg-primary-subtle text-primary" style={{ fontSize: '0.62rem' }}>
                            <i className="bi bi-calendar-check"></i>RDV
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {queue.length > 5 && (
                    <Link to="/secretary-queue" className="d-block text-center mt-2" style={{ fontSize: '0.8rem', color: '#fd7e14', fontWeight: 600 }}>
                      +{queue.length - 5} autre(s) patient(s)
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Résumé du jour */}
          <div className="sec-panel mb-4">
            <div className="panel-head">
              <h6>
                <i className="bi bi-clipboard-data me-2 text-success"></i>
                Bilan du jour
              </h6>
            </div>
            <div className="panel-body">
              <div className="sec-summary-row">
                <span className="sec-summary-label">
                  <i className="bi bi-calendar-check text-primary"></i>Total RDV
                </span>
                <span className="sec-summary-value">{stats.todayAppts}</span>
              </div>
              <div className="sec-summary-row">
                <span className="sec-summary-label">
                  <i className="bi bi-check-circle text-success"></i>Terminés
                </span>
                <span className="sec-summary-value" style={{ color: '#198754' }}>{stats.todayCompleted}</span>
              </div>
              <div className="sec-summary-row">
                <span className="sec-summary-label">
                  <i className="bi bi-x-circle text-danger"></i>Annulés / Absents
                </span>
                <span className="sec-summary-value" style={{ color: '#dc3545' }}>{stats.todayCancelled}</span>
              </div>
              <div className="sec-summary-row">
                <span className="sec-summary-label">
                  <i className="bi bi-hourglass-split" style={{ color: '#fd7e14' }}></i>En attente
                </span>
                <span className="sec-summary-value" style={{ color: '#fd7e14' }}>
                  {stats.todayAppts - stats.todayCompleted - stats.todayCancelled}
                </span>
              </div>
              <div className="sec-summary-row">
                <span className="sec-summary-label">
                  <i className="bi bi-people-fill" style={{ color: '#fd7e14' }}></i>Salle d'attente
                </span>
                <span className="sec-summary-value" style={{ color: '#fd7e14' }}>{stats.queueCount}</span>
              </div>

              {/* Barre de progression du jour */}
              {stats.todayAppts > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                    <span>Progression de la journée</span>
                    <span>{Math.round(stats.todayCompleted / stats.todayAppts * 100)}%</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '6px', background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${stats.todayCompleted / stats.todayAppts * 100}%`,
                      background: 'linear-gradient(90deg, #198754, #20c997)',
                      borderRadius: '6px',
                      transition: 'width 1s ease',
                    }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conseil */}
          <div className="sec-tip mb-3">
            <div className="d-flex align-items-start gap-3">
              <div className="tip-icon">
                <i className="bi bi-lightbulb"></i>
              </div>
              <p className="tip-text">
                Pensez à <strong>vérifier la file d'attente</strong> régulièrement et à
                <strong> confirmer les RDV en attente</strong> pour éviter les oublis.
                Un rappel SMS aux patients peut réduire le taux d'absence.
              </p>
            </div>
          </div>

          {/* Liens utiles */}
          <div className="d-grid gap-2">
            <Link to="/secretary-cabinets" className="btn btn-outline-secondary btn-sm text-start">
              <i className="bi bi-building me-2"></i>Paramètres du cabinet
            </Link>
            <Link to="/secretary-records" className="btn btn-outline-secondary btn-sm text-start">
              <i className="bi bi-search me-2"></i>Rechercher un patient
            </Link>
            <Link to="/messages" className="btn btn-outline-secondary btn-sm text-start">
              <i className="bi bi-send me-2"></i>Envoyer un rappel
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}