import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Dashboardcss/SuperAdminDashboard.css';

// Importation des graphiques Recharts
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, ComposedChart, Line
} from 'recharts';

/* ══════════════════ Helpers ══════════════════ */
const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function dateFR() {
  const d = new Date();
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
}

function timeFR() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDateShort(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTND(v) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v || 0);
}

function formatCompactNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num;
}

const ROLE_COLORS = {
  doctor: '#10b981', patient: '#6366f1', secretary: '#8b5cf6', 
  lab_staff: '#06b6d4', pharmacist: '#f59e0b', super_admin: '#ef4444',
};
const ROLE_LABELS = {
  doctor: 'Médecins', patient: 'Patients', secretary: 'Secrétaires', 
  lab_staff: 'Labos', pharmacist: 'Pharmaciens', super_admin: 'Admins',
};
const AVATAR_COLORS = ['#8b5cf6','#6366f1','#10b981','#ec4899','#f59e0b','#06b6d4','#ef4444','#14b8a6'];
function avatarColor(n) {
  let h = 0; for (let i = 0; i < (n||'').length; i++) h = n.charCodeAt(i) + ((h<<5)-h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

async function safeFetch(url, params = {}) {
  try {
    const res = await api.get(url, { params });
    const d = res.data;
    if (Array.isArray(d)) return { data: d, count: d.length };
    return { data: d.results || d.data || [], count: d.count ?? (d.results || d.data || []).length };
  } catch {
    return { data: [], count: 0 };
  }
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#ef4444'];
const CHART_GRADIENTS = [
  { id: 'colorUsers', start: '#6366f1', end: '#818cf8' },
  { id: 'colorRevenue', start: '#10b981', end: '#34d399' },
];

// Tooltip personnalisé pour Recharts
const ChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="adm-chart-tooltip">
        <p className="label">{label}</p>
        {payload.map((pl, i) => (
          <p key={i} className="value" style={{ color: pl.color }}>
            {pl.value} {pl.name}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/* ══════════════════ Composant principal ══════════════════ */
export default function SuperAdminDashboard() {
  const { user: authUser } = useAuth();

  const [clock, setClock] = useState(timeFR());
  useEffect(() => { const t = setInterval(() => setClock(timeFR()), 1000); return () => clearInterval(t); }, []);

  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const [stats, setStats] = useState({
    usersTotal: 0, usersActive: 0, newThisMonth: 0, byRole: {},
    doctorsTotal: 0, doctorsActive: 0,
    cabinetsTotal: 0, cabinetsActive: 0, cabinetsInactive: 0,
    plansTotal: 0, plansActive: 0,
    subsTotal: 0, subsActive: 0, subsExpired: 0, revenue: 0,
    specialtiesTotal: 0, citiesTotal: 0, governoratesTotal: 0,
  });

  // Données pour tableaux
  const [recentUsers, setRecentUsers] = useState([]);
  const [topCabinets, setTopCabinets] = useState([]);
  const [activeSubs, setActiveSubs] = useState([]);
  const [plansList, setPlansList] = useState([]);
  const [topDoctors, setTopDoctors] = useState([]);
  const [geoData, setGeoData] = useState({ governorates: [], cities: [] });

  // Données pour Graphiques
  const [growthData, setGrowthData] = useState([]);
  const [roleData, setRoleData] = useState([]);
  const [planChartData, setPlanChartData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);

  const loadData = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    try {
      // 1. UTILISATEURS
      const usersCount = await safeFetch('/users/manage/', { page_size: 1 });
      const { data: usersRecent } = await safeFetch('/users/manage/', { ordering: '-created_at', page_size: 5 });
      const { data: allUsers } = await safeFetch('/users/manage/', { page_size: 1000 });

      const byRole = {};
      let activeCount = 0, newMonth = 0;
      const signupsByMonth = Array(6).fill(0);
      const revenueByMonth = Array(6).fill(0);
      const currentYear = new Date().getFullYear();
      const today = new Date();

      allUsers.forEach(u => {
        const r = u.role || 'unknown';
        byRole[r] = (byRole[r] || 0) + 1;
        if (u.is_active) activeCount++;
        if (u.created_at) {
          const d = new Date(u.created_at);
          if (d.getFullYear() === currentYear && d.getMonth() === today.getMonth()) newMonth++;
          
          const monthDiff = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth());
          if (monthDiff >= 0 && monthDiff < 6) {
            signupsByMonth[5 - monthDiff]++;
          }
        }
      });

      const growth = signupsByMonth.map((val, i) => {
        const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
        return { mois: MOIS_COURTS[d.getMonth()], inscriptions: val };
      });
      setGrowthData(growth);

      setRoleData(Object.entries(byRole).map(([key, val]) => ({
        name: ROLE_LABELS[key] || key,
        value: val
      })));

      // 2. CABINETS
      const cabinetsCount = await safeFetch('/cabinets/', { page_size: 1 });
      const cabinetsActiveCount = await safeFetch('/cabinets/', { page_size: 1, is_active: 'true' });
      const { data: cabinetsAll } = await safeFetch('/cabinets/', { page_size: 100, ordering: '-doctors_count' });
      setTopCabinets([...cabinetsAll].sort((a, b) => (b.doctors_count || 0) - (a.doctors_count || 0)).slice(0, 5));

      // 3. MÉDECINS
      const doctorsCount = await safeFetch('/cabinets/doctors-management/', { page_size: 1 });
      const { data: doctorsActiveList } = await safeFetch('/cabinets/doctors-management/', { page_size: 100, is_active: 'true' });
      const { data: doctorsRecentList } = await safeFetch('/cabinets/doctors-management/', { page_size: 5, ordering: '-rating' });
      setTopDoctors(doctorsRecentList);

      // 4. PLANS & ABONNEMENTS
      const plansCount = await safeFetch('/users/subscription-plans/', { page_size: 100 });
      const plans = plansCount.data;
      setPlansList(plans);

      const subsCount = await safeFetch('/users/subscriptions/', { page_size: 1 });
      const { data: subsAll } = await safeFetch('/users/subscriptions/', { page_size: 200, ordering: '-start_date' });

      const subsActive = subsAll.filter(s => s.is_active);
      const subsExpired = subsAll.filter(s => s.is_expired || !s.is_active);
      let revenue = 0;
      subsActive.forEach(s => {
        const price = s.plan_detail?.monthly_price || plans.find(p => p.id === s.plan)?.monthly_price || 0;
        revenue += parseFloat(price) || 0;
      });
      setActiveSubs(subsActive.slice(0, 6));

      const planStats = plans.map(p => ({
        name: p.display_name || p.name,
        abonnes: subsActive.filter(s => s.plan === p.id).length,
        revenus: subsActive.filter(s => s.plan === p.id).length * parseFloat(p.monthly_price || 0)
      })).filter(p => p.abonnes > 0 || p.revenus > 0);
      setPlanChartData(planStats);

      // Simulation de données de revenus mensuels (à remplacer par des données réelles)
      const mockRevenueData = Array(6).fill(0).map((_, i) => ({
        mois: MOIS_COURTS[(today.getMonth() - (5 - i) + 12) % 12],
        revenus: Math.round((Math.random() * 5000 + 1000) * 100) / 100
      }));
      setRevenueData(mockRevenueData);

      // 5. GÉOGRAPHIE
      const govRes = await safeFetch('/users/governorates/', { page_size: 100 });
      const cityRes = await safeFetch('/users/cities/', { page_size: 1 });
      const { data: citiesList } = await safeFetch('/users/cities/', { page_size: 500, ordering: 'name' });

      const govWithCities = govRes.data.map(gov => ({
        ...gov,
        cities_count: citiesList.filter(c => c.governorate === gov.id || c.governorate_name === gov.name).length,
      }));
      setGeoData({ governorates: govWithCities, cities: citiesList });

      const specCount = await safeFetch('/users/specialties/', { page_size: 100 });

      setStats({
        usersTotal: usersCount.count,
        usersActive: activeCount,
        newThisMonth: newMonth,
        byRole,
        doctorsTotal: doctorsCount.count,
        doctorsActive: doctorsActiveList.length,
        cabinetsTotal: cabinetsCount.count,
        cabinetsActive: cabinetsActiveCount.count,
        cabinetsInactive: cabinetsCount.count - cabinetsActiveCount.count,
        plansTotal: plansCount.count,
        plansActive: plans.filter(p => p.is_active).length,
        subsTotal: subsCount.count,
        subsActive: subsActive.length,
        subsExpired: subsExpired.length,
        revenue,
        specialtiesTotal: specCount.count,
        citiesTotal: cityRes.count,
        governoratesTotal: govRes.count,
      });

      setRecentUsers(usersRecent.slice(0, 5));
      setLastUpdate(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="admin-dash">

      {/* ══════════ BANDEAU ══════════ */}
      <div className="adm-welcome">
        <div className="row align-items-center">
          <div className="col">
            <div className="d-flex align-items-center gap-3 mb-2">
              <span className="pulse-dot"></span>
              <span className="welcome-clock">{clock}</span>
              {lastUpdate && (
                <span className="d-none d-md-inline welcome-update">
                  <i className="bi bi-clock me-1"></i>
                  MAJ : {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <h2>Bonjour, {authUser?.first_name || 'Admin'} 👋</h2>
            <p className="welcome-sub">
              Vue d'ensemble de votre plateforme — <strong>{formatCompactNumber(stats.usersTotal)}</strong> utilisateurs, 
              <strong> {formatCompactNumber(stats.cabinetsTotal)}</strong> cabinets, 
              <strong> {formatCompactNumber(stats.doctorsTotal)}</strong> médecins.
            </p>
            <p className="welcome-date"><i className="bi bi-calendar3 me-1"></i>{dateFR()}</p>
          </div>
          <div className="col-auto d-none d-md-block">
            <button className="btn btn-refresh" onClick={loadData}>
              <i className="bi bi-arrow-clockwise me-2"></i>Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* ══════════ CARTES STATS ══════════ */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Utilisateurs', val: stats.usersTotal, sub: `${formatCompactNumber(stats.usersActive)} actifs`, icon: 'bi-people-fill', color: '#6366f1', bg: 'linear-gradient(135deg,#6366f1,#4f46e5)', trend: `+${stats.newThisMonth} ce mois` },
          { label: 'Médecins', val: stats.doctorsTotal, sub: `${formatCompactNumber(stats.doctorsActive)} actifs`, icon: 'bi-person-badge-fill', color: '#10b981', bg: 'linear-gradient(135deg,#10b981,#059669)' },
          { label: 'Cabinets', val: stats.cabinetsTotal, sub: `${stats.cabinetsActive} actifs / ${stats.cabinetsInactive} inactifs`, icon: 'bi-building', color: '#8b5cf6', bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
          { label: 'Abonnements', val: stats.subsActive, sub: `${stats.subsActive} actifs / ${stats.subsExpired} expirés`, icon: 'bi-credit-card-2-front-fill', color: '#f59e0b', bg: 'linear-gradient(135deg,#f59e0b,#d97706)' },
          { label: 'Revenus (TND)', val: formatTND(stats.revenue), sub: "Revenus mensuels", icon: 'bi-currency-dollar', color: '#ec4899', bg: 'linear-gradient(135deg,#ec4899,#db2777)' },
          { label: 'Géographie', val: stats.governoratesTotal, sub: `${stats.governoratesTotal} gov, ${stats.citiesTotal} villes`, icon: 'bi-geo-alt-fill', color: '#06b6d4', bg: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
        ].map((s, i) => (
          <div key={i} className="col-6 col-lg-4 col-xl-2">
            <div className="card adm-stat-card" style={{ borderLeftColor: s.color }}>
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background: s.bg }}><i className={`bi ${s.icon}`}></i></div>
                  <div className="flex-grow-1">
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ color: s.color, fontSize: s.val > 999 ? '1.4rem' : '2rem' }}>{s.val}</div>
                  </div>
                </div>
                <div className="stat-sub">{s.sub}</div>
                {s.trend && (
                  <div className="stat-trend">
                    <i className="bi bi-arrow-up-short"></i>{s.trend}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════ GRANDS GRAPHIQUES ══════════ */}
      <div className="row g-4 mb-4">
        
        {/* Graphique 1: Croissance des utilisateurs */}
        <div className="col-lg-7">
          <div className="adm-panel h-100">
            <div className="panel-head">
              <div className="d-flex align-items-center gap-2">
                <div className="panel-icon" style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
                  <i className="bi bi-graph-up-arrow"></i>
                </div>
                <h6>Croissance des utilisateurs</h6>
              </div>
              <span className="panel-badge">6 derniers mois</span>
            </div>
            <div className="panel-body" style={{ height: '320px' }}>
              {loading ? <div className="adm-skeleton h-100"></div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="mois" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="inscriptions" name="Inscriptions" stroke="#6366f1" strokeWidth={3} fill="url(#colorUsers)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Graphique 2: Répartition par rôle */}
        <div className="col-lg-5">
          <div className="adm-panel h-100">
            <div className="panel-head">
              <div className="d-flex align-items-center gap-2">
                <div className="panel-icon" style={{ background: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' }}>
                  <i className="bi bi-pie-chart-fill"></i>
                </div>
                <h6>Répartition par rôle</h6>
              </div>
            </div>
            <div className="panel-body" style={{ height: '320px' }}>
              {loading ? <div className="adm-skeleton h-100"></div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roleData} cx="50%" cy="45%" labelLine={false} outerRadius={85} fill="#8884d8" dataKey="value">
                      {roleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Graphique 3: Abonnements & Revenus */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="adm-panel">
            <div className="panel-head">
              <div className="d-flex align-items-center gap-2">
                <div className="panel-icon" style={{ background: 'linear-gradient(135deg,#10b981,#34d399)' }}>
                  <i className="bi bi-bar-chart-line-fill"></i>
                </div>
                <h6>Abonnements actifs par plan</h6>
              </div>
              <span className="panel-badge">{stats.subsActive} actifs</span>
            </div>
            <div className="panel-body" style={{ height: '280px' }}>
              {loading ? <div className="adm-skeleton h-100"></div> : planChartData.length === 0 ? (
                <div className="adm-empty"><i className="bi bi-inbox"></i><p>Aucun abonnement actif pour le moment</p></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} content={<ChartTooltip />} />
                    <Bar dataKey="abonnes" name="Abonnés actifs" radius={[8, 8, 0, 0]}>
                      {planChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ ACTIONS RAPIDES ══════════ */}
      <div className="mb-4">
        <h6 className="adm-section-title">
          <i className="bi bi-lightning-charge-fill"></i>
          Actions rapides
        </h6>
        <div className="row g-2 g-lg-3">
          {[
            { to: '/users', icon: 'bi-person-plus', bg: 'linear-gradient(135deg,#6366f1,#4f46e5)', label: 'Utilisateurs' },
            { to: '/doctors', icon: 'bi-person-badge', bg: 'linear-gradient(135deg,#10b981,#059669)', label: 'Médecins' },
            { to: '/cabinets', icon: 'bi-building', bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', label: 'Cabinets' },
            { to: '/subscriptions', icon: 'bi-credit-card-2-front', bg: 'linear-gradient(135deg,#f59e0b,#d97706)', label: 'Abonnements' },
            { to: '/plans', icon: 'bi-tags', bg: 'linear-gradient(135deg,#ec4899,#db2777)', label: 'Plans' },
            { to: '/specialties', icon: 'bi-star', bg: 'linear-gradient(135deg,#06b6d4,#0891b2)', label: 'Spécialités' },
            { to: '/governorates', icon: 'bi-map', bg: 'linear-gradient(135deg,#14b8a6,#0d9488)', label: 'Gouvernorats' },
            { to: '/cities', icon: 'bi-geo-alt', bg: 'linear-gradient(135deg,#6b7280,#4b5563)', label: 'Villes' },
          ].map(a => (
            <div key={a.to} className="col-4 col-md-3 col-lg-2">
              <Link to={a.to} className="adm-quick-action">
                <div className="qa-icon" style={{ background: a.bg }}><i className={`bi ${a.icon}`}></i></div>
                <span className="qa-label">{a.label}</span>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════ CONTENU (TABLEAUX & LISTES) ══════════ */}
      <div className="row g-4">

        {/* ══════ GAUCHE (8) ══════ */}
        <div className="col-lg-8">

          {/* Top Médecins */}
          <div className="adm-panel mb-4">
            <div className="panel-head">
              <div className="d-flex align-items-center gap-2">
                <div className="panel-icon" style={{ background: 'linear-gradient(135deg,#10b981,#34d399)' }}>
                  <i className="bi bi-person-badge-fill"></i>
                </div>
                <h6>Médecins les mieux notés</h6>
              </div>
              <Link to="/doctors" className="btn btn-outline-primary btn-sm ms-auto">
                Voir tout <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
            <div className="panel-body p-0">
              {loading ? <div className="p-3"><div className="adm-skeleton" style={{ height:'200px' }}></div></div> : (
                <div className="table-responsive">
                  <table className="table adm-table">
                    <thead>
                      <tr>
                        <th>Médecin</th>
                        <th className="d-none d-md-table-cell">Spécialité</th>
                        <th className="d-none d-lg-table-cell">Cabinets</th>
                        <th>Statut</th>
                        <th className="text-end">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topDoctors.map(doc => (
                        <tr key={doc.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {doc.profile_photo_url ? 
                                <img src={doc.profile_photo_url} alt="" className="avatar-img" /> : 
                                <div className="user-avatar" style={{ background:'#10b981' }}>
                                  {(doc.full_name||'D')[0].toUpperCase()}
                                </div>
                              }
                              <div>
                                <div className="fw-semibold user-name">{doc.full_name}</div>
                                <small className="text-muted user-email">{doc.email}</small>
                              </div>
                            </div>
                          </td>
                          <td className="d-none d-md-table-cell">
                            <span className="adm-badge specialty-badge">{doc.specialty_name || '—'}</span>
                          </td>
                          <td className="d-none d-lg-table-cell">
                            <span className="fw-bold" style={{ color:'#8b5cf6' }}>{doc.cabinets_count || 0}</span>
                          </td>
                          <td>
                            <span className={`adm-badge status-badge ${doc.is_active ? 'active' : 'inactive'}`}>
                              <i className="bi bi-circle-fill"></i>
                              {doc.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="text-end">
                            <span className="rating-stars">
                              {[...Array(5)].map((_, i) => (
                                <i key={i} className={`bi ${i < (doc.rating || 0) ? 'bi-star-fill' : 'bi-star'}`}></i>
                              ))}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Top Cabinets */}
          <div className="adm-panel">
            <div className="panel-head">
              <div className="d-flex align-items-center gap-2">
                <div className="panel-icon" style={{ background: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' }}>
                  <i className="bi bi-hospital"></i>
                </div>
                <h6>Cabinets les plus actifs</h6>
              </div>
              <Link to="/cabinets" className="btn btn-outline-primary btn-sm ms-auto">
                Voir tout <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
            <div className="panel-body p-0">
              {loading ? <div className="p-3"><div className="adm-skeleton" style={{ height:'200px' }}></div></div> : (
                <div className="table-responsive">
                  <table className="table adm-table">
                    <thead>
                      <tr>
                        <th>Cabinet</th>
                        <th className="d-none d-md-table-cell">Ville</th>
                        <th>Médecins</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCabinets.map(cab => (
                        <tr key={cab.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {cab.logo_url ? 
                                <img src={cab.logo_url} alt="" className="avatar-img" /> : 
                                <div className="user-avatar" style={{ background:'#8b5cf6' }}>
                                  {(cab.name||'C')[0].toUpperCase()}
                                </div>
                              }
                              <div className="fw-semibold cabinet-name">{cab.name}</div>
                            </div>
                          </td>
                          <td className="d-none d-md-table-cell">
                            <span className="text-muted city-name">{cab.city_name || '—'}</span>
                          </td>
                          <td>
                            <span className="fw-bold doctor-count" style={{ color:'#10b981' }}>
                              {cab.doctors_count || 0}
                            </span>
                          </td>
                          <td>
                            <span className={`adm-badge status-badge ${cab.is_active ? 'active' : 'inactive'}`}>
                              <i className="bi bi-circle-fill"></i>
                              {cab.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════ DROITE (4) ══════ */}
        <div className="col-lg-4">

          {/* Plans d'abonnement */}
          <div className="adm-panel mb-4">
            <div className="panel-head">
              <div className="d-flex align-items-center gap-2">
                <div className="panel-icon" style={{ background: 'linear-gradient(135deg,#ec4899,#f472b6)' }}>
                  <i className="bi bi-credit-card"></i>
                </div>
                <h6>Plans d'abonnement</h6>
              </div>
              <Link to="/plans" className="btn btn-outline-secondary btn-sm">Gérer</Link>
            </div>
            <div className="panel-body">
              {loading ? <div className="adm-skeleton" style={{ height:'100px' }}></div> : plansList.length === 0 ? (
                <div className="adm-empty"><i className="bi bi-credit-card"></i><p>Aucun plan</p></div>
              ) : (
                <div>
                  {plansList.slice(0, 4).map(plan => {
                    const planSubs = activeSubs.filter(s => s.plan === plan.id);
                    const pct = stats.subsActive > 0 ? Math.round(planSubs.length / stats.subsActive * 100) : 0;
                    return (
                      <div key={plan.id} className="adm-item-row">
                        <div className="flex-grow-1 me-2">
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold plan-name">
                              {plan.is_popular && <i className="bi bi-star-fill popular-star"></i>}
                              {plan.display_name || plan.name}
                            </span>
                          </div>
                          <div className="plan-price">{formatTND(plan.monthly_price)} TND/mois</div>
                          <div className="adm-progress-bar-wrap mt-1">
                            <div className="adm-progress-bar" style={{ width:`${pct}%`, background:'#8b5cf6' }}></div>
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold sub-count">{planSubs.length}</div>
                          <div className="sub-label">abonné(s)</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Abonnements actifs */}
          <div className="adm-panel mb-4">
            <div className="panel-head">
              <div className="d-flex align-items-center gap-2">
                <div className="panel-icon" style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)' }}>
                  <i className="bi bi-lightning-fill"></i>
                </div>
                <h6>Abonnements actifs</h6>
              </div>
              <Link to="/subscriptions" className="btn btn-outline-secondary btn-sm">Voir tout</Link>
            </div>
            <div className="panel-body">
              {loading ? <div className="adm-skeleton" style={{ height:'120px' }}></div> : activeSubs.length === 0 ? (
                <div className="adm-empty"><i className="bi bi-credit-card-2-front"></i><p>Aucun abonnement actif</p></div>
              ) : (
                <div>
                  {activeSubs.slice(0, 4).map(sub => {
                    const userName = sub.user_detail ? `${sub.user_detail.first_name || ''} ${sub.user_detail.last_name || ''}`.trim() || sub.user_detail.username : '—';
                    const planLabel = sub.plan_name || sub.plan_detail?.display_name || sub.plan_detail?.name || '—';
                    return (
                      <div key={sub.id} className="adm-item-row">
                        <div>
                          <div className="fw-semibold user-name">{userName}</div>
                          <div className="plan-label">{planLabel}</div>
                        </div>
                        <div className="text-end">
                          {typeof sub.days_remaining === 'number' && (
                            <div className="days-remaining">
                              {sub.days_remaining > 0 ? `${sub.days_remaining}j restants` : 'Expire'}
                            </div>
                          )}
                          <div className="fw-bold sub-price">{formatTND(sub.plan_detail?.monthly_price || 0)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Utilisateurs récents */}
          <div className="adm-panel">
            <div className="panel-head">
              <div className="d-flex align-items-center gap-2">
                <div className="panel-icon" style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
                  <i className="bi bi-clock-history"></i>
                </div>
                <h6>Inscriptions récentes</h6>
              </div>
              <Link to="/users" className="btn btn-outline-primary btn-sm">Voir tout</Link>
            </div>
            <div className="panel-body p-0">
              {loading ? <div className="p-3"><div className="adm-skeleton" style={{ height:'150px' }}></div></div> : (
                <div className="table-responsive">
                  <table className="table adm-table">
                    <tbody>
                      {recentUsers.map(u => {
                        const fullName = u.full_name || `${u.first_name||''} ${u.last_name||''}`.trim() || u.username;
                        return (
                          <tr key={u.id}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div className="user-avatar" style={{ background: avatarColor(fullName) }}>
                                  {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-semibold user-name">{fullName}</div>
                                  <small className="text-muted user-date">{fmtDateShort(u.created_at)}</small>
                                </div>
                              </div>
                            </td>
                            <td className="text-end">
                              <span className={`adm-badge status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                                {u.is_active ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}