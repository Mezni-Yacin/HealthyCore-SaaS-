// src/dashboards/PatientDashboard.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Dashboardcss/PatientDashboard.css';

// Importation Recharts
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';

/* ══════════════════ Helpers ══════════════════ */

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

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

function fmtDayMonth(str) {
  if (!str) return { day: '—', month: '' };
  const d = new Date(str);
  return { day: d.getDate(), month: MOIS_COURT[d.getMonth()] };
}

function fmtDateFull(str) {
  if (!str) return '—';
  const d = new Date(str);
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  const map = {
    confirmed:   { label: 'Confirmé', cls: 'bg-success-subtle text-success' },
    pending:     { label: 'En attente', cls: 'bg-warning-subtle text-warning' },
    cancelled:   { label: 'Annulé', cls: 'bg-danger-subtle text-danger' },
    completed:   { label: 'Terminé', cls: 'bg-info-subtle text-info' },
    no_show:     { label: 'Absent', cls: 'bg-danger-subtle text-danger' },
  };
  const m = map[s] || { label: status || '—', cls: 'bg-secondary-subtle text-secondary' };
  return <span className={`pat-badge ${m.cls}`}>{m.label}</span>;
}

const AVATAR_COLORS = ['#0d6efd', '#198754', '#6f42c1', '#d63384', '#fd7e14', '#0dcaf0', '#dc3545', '#20c997'];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// Couleurs pour les graphiques Recharts
const CHART_COLORS = {
  primary: '#0d6efd',
  success: '#198754',
  warning: '#fd7e14',
  danger: '#dc3545',
  info: '#0dcaf0'
};

/* ══════════════════ Composant principal ══════════════════ */

export default function PatientDashboard() {
  const { user } = useAuth();

  const [clock, setClock] = useState(timeFR());
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({ upcomingAppts: 0, recordsCount: 0, unread: 0, inQueue: false, queuePosition: null });
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]); // Pour les graphiques
  const [records, setRecords] = useState([]);
  const [queueInfo, setQueueInfo] = useState(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const apptRes = await api.get('/appointments/patient/records/', {
        params: { page_size: 50, ordering: 'start_time' },
      }).catch(() => ({ data: { results: [] } }));
      
      const allAppts = apptRes.data.results || apptRes.data || [];
      setAllAppointments(allAppts); // On sauvegarde tout pour l'analytique

      const now = new Date();
      const apptList = allAppts.filter(a => {
        const s = (a.status || '').toLowerCase();
        if (s === 'cancelled' || s === 'no_show') return false;
        const t = a.start_time || a.date || a.appointment_date || a.time_slot;
        if (!t) return true; 
        return new Date(t) >= new Date(now.toDateString()); 
      });
      setAppointments(apptList);

      const recRes = await api.get('/medical-records/patient/', { params: { page_size: 5 } }).catch(() => ({ data: { results: [], count: 0 } }));
      const recList = recRes.data.results || recRes.data || [];
      setRecords(recList);

      // ✅ FIX: Récupérer les messages non-lus de Cabinet ET Directs en même temps
      const [msgRes, directMsgRes] = await Promise.all([
        api.get('/messaging/conversations/').catch(() => ({ data: [] })),
        api.get('/messaging/direct-conversations/').catch(() => ({ data: [] }))
      ]);

      const msgList = msgRes.data.results || msgRes.data || [];
      const directMsgList = directMsgRes.data.results || directMsgRes.data || [];
      const unreadCabinet = msgList.reduce((s, c) => s + (c.unread_count || 0), 0);
      const unreadDirect = directMsgList.reduce((s, c) => s + (c.unread_count || 0), 0);
      const unread = unreadCabinet + unreadDirect;

      const queueRes = await api.get('/waiting-queue/patient/current/').catch(() => ({ data: null }));
      const queueData = queueRes.data?.results?.[0] || queueRes.data;
      const activeQueue = queueData || null;

      setStats({
        upcomingAppts: apptList.length,
        recordsCount: recRes.data.count || recList.length,
        unread,
        inQueue: !!activeQueue,
        queuePosition: activeQueue?.position || null,
      });
      setQueueInfo(activeQueue);
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    const t = setInterval(() => setClock(timeFR()), 1000);
    const interval = setInterval(loadData, 30000);
    return () => { clearInterval(t); clearInterval(interval); };
  }, [loadData]);

    // ── Calculs pour les graphiques (Recharts) ──
  const { rdvData, statusData } = useMemo(() => {
    // 1. Données pour l'AreaChart (6 derniers mois)
    const months = [];
    const today = new Date();
    for(let i=5; i>=0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({ name: MOIS_COURT[d.getMonth()], rdv: 0 });
    }

    allAppointments.forEach(a => {
      // ✅ FIX: On récupère TOUTES les clés possibles, avec created_at en secours
      const dateStr = a.start_time || a.date || a.appointment_date || a.time_slot || a.created_at;
      if (!dateStr) return;
      
      const d = new Date(dateStr);
      // ✅ FIX: Sécurité si la date est corrompue
      if (isNaN(d.getTime())) return;

      const diff = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth());
      
      // Si le RDV est dans les 6 derniers mois (diff comprise entre 0 et 5)
      if (diff >= 0 && diff < 6) {
        months[5 - diff].rdv++;
      }
    });

    // 2. Données pour le PieChart (Répartition des statuts)
    const statusCounts = allAppointments.reduce((acc, apt) => {
      const s = (apt.status || 'unknown').toLowerCase();
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const statusLabels = {
      confirmed: 'Confirmés', completed: 'Terminés', pending: 'En attente', cancelled: 'Annulés', no_show: 'Absents'
    };

    const sData = Object.entries(statusCounts).map(([key, val]) => ({
      name: statusLabels[key] || key, value: val, key
    }));

    return { rdvData: months, statusData: sData };
  }, [allAppointments]);

  const nextAppt = appointments.length > 0 ? appointments[0] : null;
  const nextDm = nextAppt ? fmtDayMonth(nextAppt.date || nextAppt.appointment_date || nextAppt.start_time) : null;
  const nextDayName = nextAppt ? JOURS[new Date(nextAppt.date || nextAppt.appointment_date || nextAppt.start_time).getDay()] : '';

  return (
    <div className="pat-dash">
      
      {/* ══════════ BANDEAU BIENVENUE ══════════ */}
      <div className="pat-welcome">
        <div className="row align-items-center">
          <div className="col">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="pulse-dot"></span>
              <span className="welcome-clock">{clock}</span>
            </div>
            <h2>Bonjour {user?.first_name || user?.username || 'Utilisateur'} !</h2>
            <p className="welcome-sub">
              Bienvenue dans votre espace santé. Retrouvez vos rendez-vous, dossiers médicaux et communiquez avec votre médecin.
            </p>
            <p className="welcome-date">
              <i className="bi bi-calendar3 me-1"></i>{dateFR()}
            </p>
          </div>
          <div className="col-auto d-none d-md-flex align-items-center gap-3">
            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white" style={{ width: '68px', height: '68px', background: 'rgba(255,255,255,0.12)', fontSize: '1.5rem', border: '2px solid rgba(255,255,255,0.2)' }}>
              {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ CARTES STATISTIQUES ══════════ */}
      {loading ? (
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="col-6 col-lg-3"><div className="pat-skeleton" style={{ height: '140px' }}></div></div>)}
        </div>
      ) : (
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3">
            <div className="card pat-stat-card">
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background: 'linear-gradient(135deg, #0d6efd, #073b8a)' }}><i className="bi bi-calendar-event"></i></div>
                  <div className="flex-grow-1">
                    <div className="stat-label">RDV à venir</div>
                    <div className="stat-value" style={{ color: '#0d6efd' }}>{stats.upcomingAppts}</div>
                  </div>
                </div>
                <div className="stat-sub">{stats.upcomingAppts > 0 ? 'Prochain(s) rendez-vous' : 'Aucun RDV planifié'}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="card pat-stat-card">
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background: 'linear-gradient(135deg, #198754, #0a6843)' }}><i className="bi bi-file-medical"></i></div>
                  <div className="flex-grow-1">
                    <div className="stat-label">Dossiers médicaux</div>
                    <div className="stat-value" style={{ color: '#198754' }}>{stats.recordsCount}</div>
                  </div>
                </div>
                <div className="stat-sub">Historique de santé</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="card pat-stat-card">
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background: stats.inQueue ? 'linear-gradient(135deg, #fd7e14, #e8590c)' : 'linear-gradient(135deg, #94a3b8, #64748b)' }}><i className="bi bi-hourglass-split"></i></div>
                  <div className="flex-grow-1">
                    <div className="stat-label">Ma file</div>
                    <div className="stat-value" style={{ color: stats.inQueue ? '#fd7e14' : '#94a3b8' }}>{stats.inQueue ? `N°${stats.queuePosition || '...'}` : 'Libre'}</div>
                  </div>
                </div>
                <div className="stat-sub">{stats.inQueue ? 'En salle d\'attente' : 'Aucune attente'}</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="card pat-stat-card">
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background: 'linear-gradient(135deg, #6f42c1, #563d9c)' }}><i className="bi bi-chat-dots-fill"></i></div>
                  <div className="flex-grow-1">
                    <div className="stat-label">Messages</div>
                    <div className="stat-value" style={{ color: '#6f42c1' }}>{stats.unread}</div>
                  </div>
                </div>
                <div className="stat-sub">{stats.unread > 0 ? 'Non lu(s)' : 'Boîte vide'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ANALYTIQUE SANTÉ (RECHARTS) ══════════ */}
      <div className="mb-4">
        <h6 className="pat-section-title">
          <i className="bi bi-graph-up-arrow"></i>Vue d'ensemble de votre santé
        </h6>
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="pat-panel h-100">
              <div className="panel-head">
                <h6><i className="bi bi-activity me-2 text-primary"></i>Activité des 6 derniers mois</h6>
              </div>
              <div className="panel-body" style={{ height: '300px', padding: '1rem 1.25rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rdvData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="pat-panel h-100">
              <div className="panel-head">
                <h6><i className="bi bi-pie-chart me-2 text-success"></i>Statut des RDV</h6>
              </div>
              <div className="panel-body d-flex align-items-center justify-content-center" style={{ height: '300px', padding: '1rem' }}>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}>
                        {statusData.map((entry, index) => {
                          const colors = [CHART_COLORS.success, CHART_COLORS.info, CHART_COLORS.warning, CHART_COLORS.danger, '#6c757d'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
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

      {/* ══════════ ACTIONS RAPIDES ══════════ */}
      <div className="mb-4">
        <h6 className="pat-section-title">
          <i className="bi bi-lightning-charge-fill"></i>Actions rapides
        </h6>
        <div className="row g-2 g-lg-3">
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/cabinet-directory" className="pat-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #0d6efd, #073b8a)' }}><i className="bi bi-search"></i></div>
              <span className="qa-label">Trouver médecin</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/my-appointments" className="pat-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #198754, #0a6843)' }}><i className="bi bi-calendar-plus"></i></div>
              <span className="qa-label">Prendre RDV</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/patient-records" className="pat-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #fd7e14, #e8590c)' }}><i className="bi bi-file-medical"></i></div>
              <span className="qa-label">Mes dossiers</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/patient-queue" className="pat-quick-action">
              <div className="qa-icon" style={{ background: stats.inQueue ? 'linear-gradient(135deg, #dc3545, #b02a37)' : 'linear-gradient(135deg, #94a3b8, #64748b)' }}><i className="bi bi-hourglass-split"></i></div>
              <span className="qa-label">Ma file</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/messages" className="pat-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #6f42c1, #563d9c)' }}><i className="bi bi-chat-dots"></i></div>
              <span className="qa-label">Messages</span>
            </Link>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <Link to="/profile" className="pat-quick-action">
              <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #0dcaf0, #0a8fad)' }}><i className="bi bi-person"></i></div>
              <span className="qa-label">Mon profil</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════ CONTENU PRINCIPAL ══════════ */}
      <div className="row g-4">

        {/* ── COLONNE GAUCHE ── */}
        <div className="col-lg-7">
          {/* Prochain RDV Hero */}
          <div className="mb-4">
            <h6 className="pat-section-title">
              <i className="bi bi-calendar-check"></i>Mon prochain rendez-vous
            </h6>
            {loading ? (
              <div className="pat-skeleton" style={{ height: '220px' }}></div>
            ) : nextAppt ? (
              <div className="pat-next-appt">
                <div className="appt-hero">
                  <div className="row align-items-center">
                    <div className="col-auto text-center" style={{ minWidth: '90px' }}>
                      <div className="appt-date">{nextDm.day}</div>
                      <div className="appt-month">{nextDm.month}</div>
                      <div className="appt-day-name">{nextDayName}</div>
                    </div>
                    <div className="col">
                      <div className="appt-label">Prochain rendez-vous</div>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <i className="bi bi-clock" style={{ fontSize: '1.1rem', opacity: 0.8 }}></i>
                        <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{fmtTime(nextAppt.start_time || nextAppt.time_slot)}</span>
                      </div>
                    </div>
                    <div className="col-auto d-none d-md-block">{statusBadge(nextAppt.status)}</div>
                  </div>
                </div>
                <div className="appt-detail">
                  <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                    <div>
                      <div className="appt-doctor">
                        <i className="bi bi-person-badge me-1" style={{ color: '#0d6efd' }}></i>
                        Dr. {nextAppt.doctor_name || nextAppt.doctor_first_name || '—'}
                      </div>
                      <div className="appt-specialty">{nextAppt.specialty_name || nextAppt.specialty || 'Consultation générale'}</div>
                    </div>
                    <div>
                      <Link to={`/my-appointments/${nextAppt.id}`} className="btn btn-sm btn-outline-primary">
                        <i className="bi bi-eye me-1"></i>Détails
                      </Link>
                    </div>
                  </div>
                  <hr style={{ margin: '0.75rem 0', borderColor: '#f1f5f9' }} />
                  <div className="row g-3">
                    <div className="col-sm-6">
                      <div className="appt-info-row">
                        <i className="bi bi-geo-alt"></i>
                        <span>{nextAppt.cabinet_name || nextAppt.cabinet || 'Adresse non précisée'}</span>
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="appt-info-row">
                        <i className="bi bi-chat-left-text"></i>
                        <span>{nextAppt.reason || nextAppt.notes || nextAppt.motif || 'Consultation'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pat-panel">
                <div className="pat-empty" style={{ padding: '2.5rem 1rem' }}>
                  <i className="bi bi-calendar-x"></i>
                  <p className="mb-2">Aucun rendez-vous à venir</p>
                  <Link to="/cabinet-directory" className="btn btn-sm btn-success">
                    <i className="bi bi-search me-1"></i>Trouver un médecin
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Liste des RDV suivants */}
          {appointments.length > 1 && (
            <div className="pat-panel">
              <div className="panel-head">
                <h6><i className="bi bi-calendar-range me-2 text-primary"></i>Mes rendez-vous</h6>
                <Link to="/my-appointments" className="btn btn-sm btn-outline-primary ms-auto py-0 px-2" style={{ fontSize: '0.78rem' }}>
                  Voir tout <i className="bi bi-arrow-right ms-1"></i>
                </Link>
              </div>
              <div className="panel-body">
                {appointments.slice(1, 6).map((apt, idx) => {
                  const dm = fmtDayMonth(apt.date || apt.appointment_date || apt.start_time);
                  const docName = apt.doctor_name || apt.doctor_first_name || 'Dr. —';
                  return (
                    <div key={apt.id || idx} className="pat-appt-item">
                      <div className="pat-appt-date-box">
                        <div className="box-day">{dm.day}</div>
                        <div className="box-month">{dm.month}</div>
                      </div>
                      <div className="pat-appt-info flex-grow-1">
                        <div className="appt-doc-name">{docName}</div>
                        <div className="appt-doc-meta">
                          {apt.specialty_name || apt.specialty || 'Consultation'}
                          {apt.cabinet_name && ` — ${apt.cabinet_name}`}
                        </div>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <div className="appt-time"><i className="bi bi-clock me-1"></i>{fmtTime(apt.start_time || apt.time_slot)}</div>
                        <div className="mt-1">{statusBadge(apt.status)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── COLONNE DROITE ── */}
        <div className="col-lg-5">
          {/* Statut file d'attente */}
          <div className="mb-4">
            <h6 className="pat-section-title">
              <i className="bi bi-hourglass-split"></i>Mon statut d'attente
            </h6>
            {loading ? (
              <div className="pat-skeleton" style={{ height: '160px' }}></div>
            ) : stats.inQueue ? (
              <div className="pat-queue-card queue-active">
                <div className="queue-inner">
                  <div className="queue-icon-wrap" style={{ background: 'rgba(253,126,20,0.15)' }}>
                    <i className="bi bi-hourglass-split" style={{ color: '#fd7e14' }}></i>
                  </div>
                  <div className="queue-title" style={{ color: '#e8590c' }}>Vous êtes dans la file d'attente</div>
                  <p className="queue-sub mb-2" style={{ color: '#64748b' }}>
                    {stats.queuePosition ? `Votre position : N°${stats.queuePosition}` : 'En attente de votre passage'}
                  </p>
                  {queueInfo?.cabinet_name && (
                    <p className="queue-sub" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      <i className="bi bi-building me-1"></i>{queueInfo.cabinet_name}
                    </p>
                  )}
                  <Link to="/patient-queue" className="btn btn-sm btn-warning mt-2">
                    <i className="bi bi-eye me-1"></i>Voir ma position
                  </Link>
                </div>
              </div>
            ) : (
              <div className="pat-queue-card queue-empty">
                <div className="queue-inner">
                  <div className="queue-icon-wrap" style={{ background: 'rgba(25,135,84,0.15)' }}>
                    <i className="bi bi-check-circle" style={{ color: '#198754' }}></i>
                  </div>
                  <div className="queue-title" style={{ color: '#198754' }}>Aucune attente en cours</div>
                  <p className="queue-sub">Vous n'êtes pas dans une file d'attente actuellement.</p>
                </div>
              </div>
            )}
          </div>

          {/* Dossiers médicaux récents */}
          <div className="pat-panel mb-4">
            <div className="panel-head">
              <h6><i className="bi bi-file-earmark-medical me-2" style={{ color: '#198754' }}></i>Dossiers médicaux</h6>
              <Link to="/patient-records" className="btn btn-sm btn-outline-success ms-auto py-0 px-2" style={{ fontSize: '0.78rem' }}>
                Voir tout <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
            <div className="panel-body" style={{ padding: '0.75rem 1.25rem' }}>
              {loading ? (
                <div className="d-flex flex-column gap-2">
                  {[1, 2, 3].map(i => <div key={i} className="pat-skeleton" style={{ height: '52px' }}></div>)}
                </div>
              ) : records.length === 0 ? (
                <div className="pat-empty" style={{ padding: '1.5rem 1rem' }}>
                  <i className="bi bi-file-earmark-x"></i>
                  <p>Aucun dossier médical</p>
                </div>
              ) : (
                records.map((rec, idx) => {
                  const docName = rec.doctor_name || rec.doctor_first_name || 'Dr. —';
                  const title = rec.title || rec.diagnosis || rec.reason || `Dossier ${idx + 1}`;
                  const date = rec.created_at || rec.date || '';
                  return (
                    <div key={rec.id || idx} className="pat-record-row">
                      <div className="pat-record-icon" style={{ background: avatarColor(title) }}>
                        <i className="bi bi-file-earmark-medical"></i>
                      </div>
                      <div className="flex-grow-1">
                        <div className="pat-record-title">{title}</div>
                        <p className="pat-record-meta">
                          Dr. {docName}{date && ` — ${fmtDateFull(date)}`}
                        </p>
                      </div>
                      {rec.id && (
                        <Link to={`/patient-records/${rec.id}`} className="btn btn-sm btn-outline-secondary py-0 px-1" style={{ fontSize: '0.72rem' }}>
                          <i className="bi bi-eye"></i>
                        </Link>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Conseil santé */}
          <div className="pat-tip mb-3">
            <div className="d-flex align-items-start gap-3">
              <div className="tip-icon">
                <i className="bi bi-heart-pulse"></i>
              </div>
              <p className="tip-text">
                N'oubliez pas de préparer votre <strong>liste de médicaments</strong> actuels et vos <strong>questions</strong> avant votre prochain rendez-vous. Cela aide votre médecin à mieux vous suivre.
              </p>
            </div>
          </div>

          {/* Liens utiles */}
          <div className="d-grid gap-2">
            <Link to="/messages" className="btn btn-outline-secondary btn-sm text-start">
              <i className="bi bi-chat-dots me-2"></i>Contacter mon médecin
            </Link>
            <Link to="/cabinet-directory" className="btn btn-outline-secondary btn-sm text-start">
              <i className="bi bi-search me-2"></i>Rechercher un spécialiste
            </Link>
            <Link to="/profile" className="btn btn-outline-secondary btn-sm text-start">
              <i className="bi bi-shield-check me-2"></i>Confidentialité & données
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}