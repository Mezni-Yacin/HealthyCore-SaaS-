import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './SuperAdminDashboard.css';

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
function fmtDateShort(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatTND(v) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v || 0);
}

const ROLE_COLORS = {
  super_admin: '#dc2626', doctor: '#198754', patient: '#2563eb',
  secretary: '#7c3aed', lab_staff: '#0891b2', pharmacist: '#c026d3',
};
const ROLE_LABELS = {
  super_admin: 'Super Admin', doctor: 'Médecin', patient: 'Patient',
  secretary: 'Secrétaire', lab_staff: 'Labo', pharmacist: 'Pharmacien',
};
const AVATAR_COLORS = ['#6f42c1','#0d6efd','#198754','#d63384','#fd7e14','#0dcaf0','#dc3545','#20c997'];
function avatarColor(n) {
  let h = 0;
  for (let i = 0; i < (n||'').length; i++) h = n.charCodeAt(i) + ((h<<5)-h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/** Appel API résilient : renvoie {data, count} ou {data:[], count:0} */
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

/* ══════════════════ Composant principal ══════════════════ */

export default function SuperAdminDashboard() {
  const { user: authUser } = useAuth();

  // ── Horloge ──
  const [clock, setClock] = useState(timeFR());
  useEffect(() => { const t = setInterval(() => setClock(timeFR()), 1000); return () => clearInterval(t); }, []);

  // ── État ──
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Compteurs
  const [stats, setStats] = useState({
    usersTotal: 0, usersActive: 0, newThisMonth: 0, byRole: {},
    doctorsTotal: 0, doctorsActive: 0,
    cabinetsTotal: 0, cabinetsActive: 0, cabinetsInactive: 0,
    plansTotal: 0, plansActive: 0,
    subsTotal: 0, subsActive: 0, subsExpired: 0, revenue: 0,
    specialtiesTotal: 0, citiesTotal: 0, governoratesTotal: 0,
  });

  // Listes pour les tableaux
  const [recentUsers, setRecentUsers] = useState([]);
  const [topCabinets, setTopCabinets] = useState([]);
  const [activeSubs, setActiveSubs] = useState([]);
  const [plansList, setPlansList] = useState([]);
  const [topSpecialties, setTopSpecialties] = useState([]);
  const [topDoctors, setTopDoctors] = useState([]);
  const [geoData, setGeoData] = useState({ governorates: [], cities: [] });

  // ── Chargement complet ──
  const loadData = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);

    try {
      // ─────────────────────────────────────────────────
      // 1. UTILISATEURS  →  GET /users/user-management/
      //    Vue: UserManagementViewSet
      // ─────────────────────────────────────────────────
      const usersCount = await safeFetch('/users/user-management/', { page_size: 1 });
      const { data: usersRecent } = await safeFetch('/users/user-management/', { ordering: '-created_at', page_size: 5 });
      const { data: allUsers } = await safeFetch('/users/user-management/', { page_size: 1000 });

      const byRole = {};
      let activeCount = 0, newMonth = 0;
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

      allUsers.forEach(u => {
        const r = u.role || 'unknown';
        byRole[r] = (byRole[r] || 0) + 1;
        if (u.is_active) activeCount++;
        if (u.created_at && new Date(u.created_at) >= monthStart) newMonth++;
      });

      // ─────────────────────────────────────────────────
      // 2. CABINETS  →  GET /cabinets/
      // ─────────────────────────────────────────────────
      const cabinetsCount = await safeFetch('/cabinets/', { page_size: 1 });
      const cabinetsActiveCount = await safeFetch('/cabinets/', { page_size: 1, is_active: 'true' });
      const { data: cabinetsAll } = await safeFetch('/cabinets/', { page_size: 100, ordering: '-doctors_count' });

      const cabinetsInactive = cabinetsCount.count - cabinetsActiveCount.count;

      setTopCabinets(
        [...cabinetsAll]
          .sort((a, b) => (b.doctors_count || 0) - (a.doctors_count || 0))
          .slice(0, 5)
      );

      // ─────────────────────────────────────────────────
      // 3. MÉDECINS  →  GET /cabinets/doctors-management/
      //    Champs: id, user_id, full_name, email, phone_number,
      //            is_active, specialty_name, specialty_code,
      //            license_number, years_experience, consultation_price,
      //            accepts_new_patients, teleconsultation_available,
      //            rating, review_count, cabinets_count, profile_photo_url
      // ─────────────────────────────────────────────────
      const doctorsCount = await safeFetch('/cabinets/doctors-management/', { page_size: 1 });
      const { data: doctorsActiveList } = await safeFetch('/cabinets/doctors-management/', { page_size: 100, is_active: 'true' });
      const { data: doctorsRecentList } = await safeFetch('/cabinets/doctors-management/', { page_size: 5, ordering: '-rating' });

      setTopDoctors(doctorsRecentList);

      // ─────────────────────────────────────────────────
      // 4. PLANS D'ABONNEMENT  →  GET /users/subscription-plans/
      // ─────────────────────────────────────────────────
      const plansCount = await safeFetch('/users/subscription-plans/', { page_size: 100 });
      const plans = plansCount.data;
      setPlansList(plans);

      // ─────────────────────────────────────────────────
      // 5. ABONNEMENTS  →  GET /users/subscriptions/
      // ─────────────────────────────────────────────────
      const subsCount = await safeFetch('/users/subscriptions/', { page_size: 1 });
      const { data: subsAll } = await safeFetch('/users/subscriptions/', { page_size: 200, ordering: '-start_date' });

      const subsActive = subsAll.filter(s => s.is_active);
      const subsExpired = subsAll.filter(s => s.is_expired || !s.is_active);

      let revenue = 0;
      subsActive.forEach(s => {
        const price = s.plan_detail?.monthly_price
          || plans.find(p => p.id === s.plan)?.monthly_price
          || 0;
        revenue += parseFloat(price) || 0;
      });

      setActiveSubs(subsActive.slice(0, 6));

      // ─────────────────────────────────────────────────
      // 6. SPÉCIALITÉS  →  GET /users/specialties/
      // ─────────────────────────────────────────────────
      const specCount = await safeFetch('/users/specialties/', { page_size: 100 });
      setTopSpecialties(specCount.data.slice(0, 10));

      // ─────────────────────────────────────────────────
      // 7. GÉOGRAPHIE
      //    Gouvernorats  →  GET /users/governorates/
      //    Villes        →  GET /users/cities/
      // ─────────────────────────────────────────────────
      const govRes = await safeFetch('/users/governorates/', { page_size: 100 });
      const cityRes = await safeFetch('/users/cities/', { page_size: 1 });
      const { data: citiesList } = await safeFetch('/users/cities/', { page_size: 500, ordering: 'name' });

      // Compter les villes par gouvernorat
      const govWithCities = govRes.data.map(gov => ({
        ...gov,
        cities_count: citiesList.filter(c => c.governorate === gov.id || c.governorate_name === gov.name).length,
      }));

      setGeoData({ governorates: govWithCities, cities: citiesList });

      // ─────────────────────────────────────────────────
      // ASSEMBLAGE FINAL
      // ─────────────────────────────────────────────────
      setStats({
        usersTotal: usersCount.count,
        usersActive: activeCount,
        newThisMonth: newMonth,
        byRole,
        doctorsTotal: doctorsCount.count,
        doctorsActive: doctorsActiveList.length,
        cabinetsTotal: cabinetsCount.count,
        cabinetsActive: cabinetsActiveCount.count,
        cabinetsInactive,
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
    } catch {
      // Silencieux
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  /* ════════════ RENDU ════════════ */

  return (
    <div className="admin-dash">

      {/* ══════════ BANDEAU ══════════ */}
      <div className="adm-welcome">
        <div className="row align-items-center">
          <div className="col">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="pulse-dot"></span>
              <span className="welcome-clock">{clock}</span>
              {lastUpdate && (
                <span className="d-none d-md-inline" style={{ fontSize: '0.72rem', opacity: 0.5, marginLeft: '0.75rem' }}>
                  Dernière MAJ : {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <h2>Super Administrateur</h2>
            <p className="welcome-sub">
              Vue d'ensemble de la plateforme MedSaaS Pro —{' '}
              <strong>{stats.usersTotal}</strong> utilisateur(s),{' '}
              <strong>{stats.cabinetsTotal}</strong> cabinet(s),{' '}
              <strong>{stats.doctorsTotal}</strong> médecin(s).
            </p>
            <p className="welcome-date"><i className="bi bi-calendar3 me-1"></i>{dateFR()}</p>
          </div>
          <div className="col-auto d-none d-md-block">
            <button className="btn btn-sm px-3 py-2" onClick={loadData}
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '12px' }}>
              <i className="bi bi-arrow-clockwise me-1"></i>Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* ══════════ CARTES STATS ══════════ */}
      {loading ? (
        <div className="row g-3 mb-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="col-6 col-lg-4 col-xl-2"><div className="adm-skeleton" style={{ height:'140px' }}></div></div>)}
        </div>
      ) : (
        <div className="row g-3 mb-4">
          {/* Utilisateurs */}
          <div className="col-6 col-lg-4 col-xl-2">
            <div className="card adm-stat-card" style={{ borderLeftColor:'#4361ee' }}>
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background:'linear-gradient(135deg,#4361ee,#3a0ca3)' }}>
                    <i className="bi bi-people-fill"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-label">Utilisateurs</div>
                    <div className="stat-value" style={{ color:'#4361ee' }}>{stats.usersTotal}</div>
                  </div>
                </div>
                <div className="stat-sub">{stats.usersActive} actif(s)</div>
                {stats.newThisMonth > 0 && (
                  <div className="stat-trend" style={{ background:'rgba(25,135,84,0.1)', color:'#198754' }}>
                    <i className="bi bi-arrow-up-short"></i>+{stats.newThisMonth} ce mois
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Médecins */}
          <div className="col-6 col-lg-4 col-xl-2">
            <div className="card adm-stat-card" style={{ borderLeftColor:'#198754' }}>
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background:'linear-gradient(135deg,#198754,#0a6843)' }}>
                    <i className="bi bi-person-badge-fill"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-label">Médecins</div>
                    <div className="stat-value" style={{ color:'#198754' }}>{stats.doctorsTotal}</div>
                  </div>
                </div>
                <div className="stat-sub">{stats.doctorsActive} actif(s)</div>
              </div>
            </div>
          </div>

          {/* Cabinets */}
          <div className="col-6 col-lg-4 col-xl-2">
            <div className="card adm-stat-card" style={{ borderLeftColor:'#6f42c1' }}>
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background:'linear-gradient(135deg,#6f42c1,#563d9c)' }}>
                    <i className="bi bi-building"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-label">Cabinets</div>
                    <div className="stat-value" style={{ color:'#6f42c1' }}>{stats.cabinetsTotal}</div>
                  </div>
                </div>
                <div className="stat-sub">{stats.cabinetsActive} actifs / {stats.cabinetsInactive} inactifs</div>
              </div>
            </div>
          </div>

          {/* Abonnements */}
          <div className="col-6 col-lg-4 col-xl-2">
            <div className="card adm-stat-card" style={{ borderLeftColor:'#fd7e14' }}>
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background:'linear-gradient(135deg,#fd7e14,#e8590c)' }}>
                    <i className="bi bi-credit-card-2-front-fill"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-label">Abonnements</div>
                    <div className="stat-value" style={{ color:'#fd7e14' }}>{stats.subsActive}</div>
                  </div>
                </div>
                <div className="stat-sub">{stats.subsActive} actifs / {stats.subsExpired} expirés</div>
              </div>
            </div>
          </div>

          {/* Revenus */}
          <div className="col-6 col-lg-4 col-xl-2">
            <div className="card adm-stat-card" style={{ borderLeftColor:'#f72585' }}>
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background:'linear-gradient(135deg,#f72585,#b5179e)' }}>
                    <i className="bi bi-currency-dollar"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-label">Revenus</div>
                    <div className="stat-value" style={{ color:'#f72585', fontSize:'1.4rem' }}>
                      {formatTND(stats.revenue)}
                    </div>
                  </div>
                </div>
                <div className="stat-sub">TND / mois (actifs)</div>
              </div>
            </div>
          </div>

          {/* Géographie */}
          <div className="col-6 col-lg-4 col-xl-2">
            <div className="card adm-stat-card" style={{ borderLeftColor:'#0dcaf0' }}>
              <div className="stat-body">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="stat-icon-ring" style={{ background:'linear-gradient(135deg,#0dcaf0,#0a8fad)' }}>
                    <i className="bi bi-geo-alt-fill"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="stat-label">Géographie</div>
                    <div className="stat-value" style={{ color:'#0d9db8', fontSize:'1.4rem' }}>
                      {stats.governoratesTotal}
                    </div>
                  </div>
                </div>
                <div className="stat-sub">{stats.governoratesTotal} gouvernorats, {stats.citiesTotal} villes</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ACTIONS RAPIDES ══════════ */}
      <div className="mb-4">
        <h6 className="adm-section-title">
          <i className="bi bi-lightning-charge-fill"></i>Actions rapides
        </h6>
        <div className="row g-2 g-lg-3">
          {[
            { to: '/users', icon: 'bi-person-plus', bg: '#4361ee,#3a0ca3', label: 'Utilisateurs' },
            { to: '/doctors', icon: 'bi-person-badge', bg: '#198754,#0a6843', label: 'Médecins' },
            { to: '/cabinets', icon: 'bi-building', bg: '#6f42c1,#563d9c', label: 'Cabinets' },
            { to: '/subscriptions', icon: 'bi-credit-card-2-front', bg: '#fd7e14,#e8590c', label: 'Abonnements' },
            { to: '/plans', icon: 'bi-tags', bg: '#f72585,#b5179e', label: 'Plans' },
            { to: '/specialties', icon: 'bi-star', bg: '#0dcaf0,#0a8fad', label: 'Spécialités' },
            { to: '/governorates', icon: 'bi-map', bg: '#20c997,#0ca678', label: 'Gouvernorats' },
            { to: '/cities', icon: 'bi-geo-alt', bg: '#6c757d,#495057', label: 'Villes' },
          ].map(a => (
            <div key={a.to} className="col-4 col-md-3 col-lg-2">
              <Link to={a.to} className="adm-quick-action">
                <div className="qa-icon" style={{ background: `linear-gradient(135deg,${a.bg})` }}>
                  <i className={`bi ${a.icon}`}></i>
                </div>
                <span className="qa-label">{a.label}</span>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════ CONTENU ══════════ */}
      <div className="row g-4">

        {/* ══════ GAUCHE (8) ══════ */}
        <div className="col-lg-8">

          {/* ── Répartition par rôle ── */}
          <div className="adm-panel mb-4">
            <div className="panel-head">
              <h6><i className="bi bi-pie-chart-fill me-2" style={{ color:'#6f42c1' }}></i>Répartition par rôle</h6>
            </div>
            <div className="panel-body">
              {loading ? (
                <div className="adm-skeleton" style={{ height:'80px' }}></div>
              ) : Object.keys(stats.byRole).length === 0 ? (
                <div className="adm-empty" style={{ padding:'1.5rem' }}><i className="bi bi-people"></i><p>Aucun utilisateur</p></div>
              ) : (
                <div>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {Object.entries(stats.byRole).sort((a,b) => b[1]-a[1]).map(([role, count]) => {
                      const color = ROLE_COLORS[role] || '#6c757d';
                      const label = ROLE_LABELS[role] || role;
                      const pct = stats.usersTotal > 0 ? Math.round(count / stats.usersTotal * 100) : 0;
                      return (
                        <div key={role} className="adm-role-badge" style={{ background: `${color}15`, color }}>
                          <span className="role-dot" style={{ background: color }}></span>
                          {label} : <strong>{count}</strong>
                          <span style={{ opacity: 0.6, fontSize: '0.68rem' }}>({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ height:'10px', borderRadius:'10px', background:'#f1f5f9', overflow:'hidden', display:'flex' }}>
                    {Object.entries(stats.byRole).sort((a,b) => b[1]-a[1]).map(([role, count]) => {
                      const color = ROLE_COLORS[role] || '#6c757d';
                      const pct = stats.usersTotal > 0 ? (count / stats.usersTotal * 100) : 0;
                      if (pct < 1) return null;
                      return <div key={role} style={{ width:`${pct}%`, background:color, transition:'width 1s ease' }} title={`${ROLE_LABELS[role]||role} : ${count}`}></div>;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Top Médecins ── */}
          <div className="adm-panel mb-4">
            <div className="panel-head">
              <h6><i className="bi bi-person-badge-fill me-2" style={{ color:'#198754' }}></i>Médecins ({stats.doctorsTotal})</h6>
              <Link to="/doctors" className="btn btn-sm btn-outline-success ms-auto py-0 px-2" style={{ fontSize:'0.78rem' }}>
                Voir tout <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
            <div className="panel-body p-0">
              {loading ? (
                <div className="d-flex flex-column gap-2 p-3">{[1,2,3,4,5].map(i=><div key={i} className="adm-skeleton" style={{ height:'52px' }}></div>)}</div>
              ) : topDoctors.length === 0 ? (
                <div className="adm-empty"><i className="bi bi-person-badge"></i><p>Aucun médecin enregistré</p></div>
              ) : (
                <div className="table-responsive">
                  <table className="table adm-table">
                    <thead>
                      <tr>
                        <th>Médecin</th>
                        <th className="d-none d-md-table-cell">Email</th>
                        <th>Spécialité</th>
                        <th className="d-none d-lg-table-cell">Cabinets</th>
                        <th className="d-none d-lg-table-cell">Exp.</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topDoctors.map(doc => (
                        <tr key={doc.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {doc.profile_photo_url ? (
                                <img src={doc.profile_photo_url} alt="" style={{ width:36, height:36, borderRadius:10, objectFit:'cover' }} />
                              ) : (
                                <div className="user-avatar" style={{ background:'#198754' }}>
                                  {(doc.full_name||'D')[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="fw-semibold" style={{ fontSize:'0.87rem' }}>{doc.full_name}</div>
                                {doc.license_number && (
                                  <small className="text-muted" style={{ fontSize:'0.75rem' }}>N° {doc.license_number}</small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="d-none d-md-table-cell">
                            <span className="text-muted" style={{ fontSize:'0.82rem' }}>{doc.email || '—'}</span>
                          </td>
                          <td>
                            <span className="adm-badge" style={{ background:'rgba(25,135,84,0.1)', color:'#198754' }}>
                              {doc.specialty_name || '—'}
                            </span>
                          </td>
                          <td className="d-none d-lg-table-cell">
                            <span className="fw-bold" style={{ color:'#6f42c1' }}>{doc.cabinets_count || 0}</span>
                          </td>
                          <td className="d-none d-lg-table-cell">
                            <span className="text-muted" style={{ fontSize:'0.82rem' }}>{doc.years_experience ? `${doc.years_experience} an(s)` : '—'}</span>
                          </td>
                          <td>
                            <span className={`adm-badge ${doc.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                              <i className="bi bi-circle-fill" style={{ fontSize:'0.35rem' }}></i>
                              {doc.is_active ? 'Actif' : 'Inactif'}
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

          {/* ── Top Cabinets ── */}
          <div className="adm-panel mb-4">
            <div className="panel-head">
              <h6><i className="bi bi-hospital me-2" style={{ color:'#6f42c1' }}></i>Top Cabinets</h6>
              <Link to="/cabinets" className="btn btn-sm btn-outline-primary ms-auto py-0 px-2" style={{ fontSize:'0.78rem' }}>
                Voir tout <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
            <div className="panel-body p-0">
              {loading ? (
                <div className="d-flex flex-column gap-2 p-3">{[1,2,3].map(i=><div key={i} className="adm-skeleton" style={{ height:'60px' }}></div>)}</div>
              ) : topCabinets.length === 0 ? (
                <div className="adm-empty"><i className="bi bi-building"></i><p>Aucun cabinet enregistré</p></div>
              ) : (
                <div className="table-responsive">
                  <table className="table adm-table">
                    <thead>
                      <tr>
                        <th>Cabinet</th>
                        <th>Propriétaire</th>
                        <th className="d-none d-md-table-cell">Ville</th>
                        <th>Médecins</th>
                        <th>Secrétaires</th>
                        <th>Statut</th>
                        <th>Créé le</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCabinets.map(cab => (
                        <tr key={cab.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {cab.logo_url ? (
                                <img src={cab.logo_url} alt="" style={{ width:32, height:32, borderRadius:8, objectFit:'cover' }} />
                              ) : (
                                <div className="user-avatar" style={{ background:'#6f42c1' }}>
                                  {(cab.name||'C')[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="fw-semibold" style={{ fontSize:'0.87rem' }}>{cab.name}</div>
                                {cab.specialties_names && cab.specialties_names.length > 0 && (
                                  <small className="text-muted">{cab.specialties_names.slice(0,2).join(', ')}</small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize:'0.85rem' }}>{cab.owner_name || '—'}</td>
                          <td className="d-none d-md-table-cell">
                            <span className="text-muted" style={{ fontSize:'0.82rem' }}>
                              {cab.city_name || '—'}{cab.governorate_name ? ` — ${cab.governorate_name}` : ''}
                            </span>
                          </td>
                          <td><span className="fw-bold" style={{ color:'#198754' }}>{cab.doctors_count || 0}</span></td>
                          <td><span className="fw-bold" style={{ color:'#4361ee' }}>{cab.secretaries_count || 0}</span></td>
                          <td>
                            <span className={`adm-badge ${cab.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                              <i className="bi bi-circle-fill" style={{ fontSize:'0.35rem' }}></i>
                              {cab.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td><span className="text-muted" style={{ fontSize:'0.8rem' }}>{fmtDateShort(cab.created_at)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Utilisateurs récents ── */}
          <div className="adm-panel">
            <div className="panel-head">
              <h6><i className="bi bi-clock-history me-2 text-primary"></i>Utilisateurs récents</h6>
              <Link to="/users" className="btn btn-sm btn-outline-primary ms-auto py-0 px-2" style={{ fontSize:'0.78rem' }}>
                Voir tout <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
            <div className="panel-body p-0">
              {loading ? (
                <div className="d-flex flex-column gap-2 p-3">{[1,2,3,4].map(i=><div key={i} className="adm-skeleton" style={{ height:'52px' }}></div>)}</div>
              ) : recentUsers.length === 0 ? (
                <div className="adm-empty"><i className="bi bi-person-x"></i><p>Aucun utilisateur</p></div>
              ) : (
                <div className="table-responsive">
                  <table className="table adm-table">
                    <thead>
                      <tr>
                        <th>Utilisateur</th>
                        <th className="d-none d-md-table-cell">Email</th>
                        <th>Rôle</th>
                        <th>Statut</th>
                        <th>Inscription</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUsers.map(u => {
                        const fullName = u.full_name || `${u.first_name||''} ${u.last_name||''}`.trim() || u.username;
                        const color = ROLE_COLORS[u.role] || '#6c757d';
                        const roleLabel = u.role_display || ROLE_LABELS[u.role] || u.role || '—';
                        return (
                          <tr key={u.id}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div className="user-avatar" style={{ background: avatarColor(fullName) }}>
                                  {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-semibold">{fullName}</div>
                                  <small className="text-muted">@{u.username}</small>
                                </div>
                              </div>
                            </td>
                            <td className="d-none d-md-table-cell">
                              <span className="text-muted" style={{ fontSize:'0.82rem' }}>{u.email || '—'}</span>
                            </td>
                            <td>
                              <span className="adm-badge" style={{ background:`${color}18`, color }}>{roleLabel}</span>
                            </td>
                            <td>
                              <span className={`adm-badge ${u.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                                <i className="bi bi-circle-fill" style={{ fontSize:'0.35rem' }}></i>
                                {u.is_active ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                            <td>
                              <span className="text-muted" style={{ fontSize:'0.8rem' }}>{fmtDateShort(u.created_at)}</span>
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

        {/* ══════ DROITE (4) ══════ */}
        <div className="col-lg-4">

          {/* ── Plans d'abonnement ── */}
          <div className="adm-panel mb-4">
            <div className="panel-head">
              <h6><i className="bi bi-credit-card me-2" style={{ color:'#f72585' }}></i>Plans d'abonnement</h6>
              <Link to="/plans" className="btn btn-sm btn-outline-secondary ms-auto py-0 px-2" style={{ fontSize:'0.75rem' }}>Gérer</Link>
            </div>
            <div className="panel-body">
              {loading ? (
                <div className="d-flex flex-column gap-2">{[1,2].map(i=><div key={i} className="adm-skeleton" style={{ height:'60px' }}></div>)}</div>
              ) : plansList.length === 0 ? (
                <div className="adm-empty" style={{ padding:'1.5rem' }}><i className="bi bi-credit-card"></i><p>Aucun plan configuré</p></div>
              ) : (
                <div>
                  <div className="d-flex justify-content-between mb-3" style={{ fontSize:'0.82rem' }}>
                    <span className="text-muted">Plans actifs</span>
                    <strong>{stats.plansActive} / {stats.plansTotal}</strong>
                  </div>
                  {plansList.map(plan => {
                    const planSubs = activeSubs.filter(s => s.plan === plan.id);
                    const pct = stats.subsActive > 0 ? Math.round(planSubs.length / stats.subsActive * 100) : 0;
                    return (
                      <div key={plan.id} className="adm-item-row">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold" style={{ fontSize:'0.87rem' }}>
                              {plan.is_popular && <i className="bi bi-star-fill me-1" style={{ color:'#fd7e14', fontSize:'0.7rem' }}></i>}
                              {plan.display_name || plan.name || 'Plan'}
                            </span>
                          </div>
                          <div style={{ fontSize:'0.75rem', color:'#64748b' }}>
                            {formatTND(plan.monthly_price)} TND/mois
                            {plan.max_doctors && ` · ${plan.max_doctors} médecin(s) max`}
                          </div>
                          <div className="adm-progress-bar-wrap mt-1">
                            <div className="adm-progress-bar" style={{ width:`${pct}%`, background:'#6f42c1' }}></div>
                          </div>
                        </div>
                        <div className="text-end" style={{ minWidth:'50px' }}>
                          <div className="fw-bold" style={{ color:'#6f42c1' }}>{planSubs.length}</div>
                          <div style={{ fontSize:'0.68rem', color:'#94a3b8' }}>abonné(s)</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Abonnements actifs ── */}
          <div className="adm-panel mb-4">
            <div className="panel-head">
              <h6><i className="bi bi-lightning-fill me-2" style={{ color:'#fd7e14' }}></i>Abonnements actifs</h6>
              <Link to="/subscriptions" className="btn btn-sm btn-outline-secondary ms-auto py-0 px-2" style={{ fontSize:'0.75rem' }}>Voir tout</Link>
            </div>
            <div className="panel-body">
              {loading ? (
                <div className="d-flex flex-column gap-2">{[1,2,3].map(i=><div key={i} className="adm-skeleton" style={{ height:'44px' }}></div>)}</div>
              ) : activeSubs.length === 0 ? (
                <div className="adm-empty" style={{ padding:'1.5rem' }}><i className="bi bi-credit-card-2-front"></i><p>Aucun abonnement actif</p></div>
              ) : (
                <div>
                  {activeSubs.map(sub => {
                    const userName = sub.user_detail
                      ? `${sub.user_detail.first_name || ''} ${sub.user_detail.last_name || ''}`.trim() || sub.user_detail.username
                      : '—';
                    const planLabel = sub.plan_name
                      || sub.plan_detail?.display_name
                      || sub.plan_detail?.name
                      || '—';
                    const price = sub.plan_detail?.monthly_price || '—';
                    return (
                      <div key={sub.id} className="adm-item-row">
                        <div>
                          <div className="fw-semibold" style={{ fontSize:'0.87rem', color:'#1e293b' }}>{userName}</div>
                          <div style={{ fontSize:'0.75rem', color:'#64748b' }}>
                            {planLabel}{sub.period_display && ` · ${sub.period_display}`}
                          </div>
                        </div>
                        <div className="text-end">
                          {typeof sub.days_remaining === 'number' && (
                            <div style={{ fontSize:'0.75rem', color:'#64748b' }}>
                              {sub.days_remaining > 0 ? `${sub.days_remaining}j restant(s)` : 'Expire bientôt'}
                            </div>
                          )}
                          <div className="fw-bold" style={{ fontSize:'0.8rem', color:'#198754' }}>
                            {price !== '—' ? `${formatTND(price)} TND` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Spécialités ── */}
          <div className="adm-panel mb-4">
            <div className="panel-head">
              <h6><i className="bi bi-stars me-2" style={{ color:'#fd7e14' }}></i>Spécialités ({stats.specialtiesTotal})</h6>
              <Link to="/specialties" className="btn btn-sm btn-outline-secondary ms-auto py-0 px-2" style={{ fontSize:'0.75rem' }}>Gérer</Link>
            </div>
            <div className="panel-body">
              {loading ? (
                <div className="adm-skeleton" style={{ height:'80px' }}></div>
              ) : topSpecialties.length === 0 ? (
                <div className="adm-empty" style={{ padding:'1.5rem' }}><i className="bi bi-star"></i><p>Aucune spécialité</p></div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {topSpecialties.map(sp => (
                    <span key={sp.id} className="adm-badge" style={{ background:'rgba(253,126,20,0.1)', color:'#e8590c', padding:'0.4em 0.8em' }}>
                      {sp.name}{sp.code ? ` (${sp.code})` : ''}
                    </span>
                  ))}
                  {stats.specialtiesTotal > 10 && (
                    <Link to="/specialties" className="adm-badge" style={{ background:'#f1f5f9', color:'#64748b', padding:'0.4em 0.8em', textDecoration:'none' }}>
                      +{stats.specialtiesTotal - 10} autres
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Géographie : Gouvernorats & Villes ── */}
          <div className="adm-panel mb-4">
            <div className="panel-head">
              <h6><i className="bi bi-globe-americas me-2" style={{ color:'#0d9db8' }}></i>Géographie</h6>
              <div className="ms-auto d-flex gap-1">
                <Link to="/governorates" className="btn btn-sm btn-outline-secondary py-0 px-2" style={{ fontSize:'0.72rem' }}>Gouvernorats</Link>
                <Link to="/cities" className="btn btn-sm btn-outline-secondary py-0 px-2" style={{ fontSize:'0.72rem' }}>Villes</Link>
              </div>
            </div>
            <div className="panel-body">
              {loading ? (
                <div className="d-flex flex-column gap-2">{[1,2,3].map(i=><div key={i} className="adm-skeleton" style={{ height:'40px' }}></div>)}</div>
              ) : geoData.governorates.length === 0 ? (
                <div className="adm-empty" style={{ padding:'1.5rem' }}><i className="bi bi-geo-alt"></i><p>Aucune donnée géographique</p></div>
              ) : (
                <div>
                  {/* Compteurs */}
                  <div className="d-flex gap-3 mb-3">
                    <div className="flex-grow-1 text-center p-2 rounded-3" style={{ background:'#e7f1ff' }}>
                      <div className="fw-bold" style={{ color:'#4361ee', fontSize:'1.3rem' }}>{stats.governoratesTotal}</div>
                      <div style={{ fontSize:'0.72rem', color:'#64748b', fontWeight:600 }}>Gouvernorats</div>
                    </div>
                    <div className="flex-grow-1 text-center p-2 rounded-3" style={{ background:'d1e7dd' }}>
                      <div className="fw-bold" style={{ color:'#198754', fontSize:'1.3rem' }}>{stats.citiesTotal}</div>
                      <div style={{ fontSize:'0.72rem', color:'#64748b', fontWeight:600 }}>Villes</div>
                    </div>
                  </div>

                  {/* Liste des gouvernorats avec nombre de villes */}
                  <div style={{ maxHeight:'200px', overflowY:'auto' }}>
                    {geoData.governorates.slice(0, 10).map(gov => (
                      <div key={gov.id} className="adm-item-row" style={{ padding:'0.5rem 0' }}>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ width:8, height:8, borderRadius:'50%', background:'#0d9db8', flexShrink:0 }}></div>
                          <span className="fw-semibold" style={{ fontSize:'0.85rem', color:'#1e293b' }}>{gov.name}</span>
                          {gov.code && (
                            <span className="adm-badge" style={{ background:'#f1f5f9', color:'#64748b', fontSize:'0.65rem' }}>{gov.code}</span>
                          )}
                        </div>
                        <span className="text-muted" style={{ fontSize:'0.78rem' }}>
                          <i className="bi bi-building me-1" style={{ fontSize:'0.7rem' }}></i>
                          {gov.cities_count || 0} ville(s)
                        </span>
                      </div>
                    ))}
                  </div>

                  {stats.governoratesTotal > 10 && (
                    <div className="text-center mt-2">
                      <Link to="/governorates" style={{ fontSize:'0.8rem', color:'#6f42c1', textDecoration:'none' }}>
                        +{stats.governoratesTotal - 10} autres gouvernorats <i className="bi bi-arrow-right"></i>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Conseil ── */}
          <div className="adm-tip mb-3">
            <div className="d-flex align-items-start gap-3">
              <div className="tip-icon"><i className="bi bi-shield-check"></i></div>
              <p className="tip-text">
                Surveillez les <strong>abonnements expirés</strong> et les <strong>cabinets inactifs</strong>.
                Vous avez <strong>{stats.cabinetsInactive}</strong> cabinet(s) inactif(s) et{' '}
                <strong>{stats.subsExpired}</strong> abonnement(s) expiré(s) à traiter.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}