import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

// Importation Recharts
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area
} from 'recharts';

const STATUS_MAP = { 
  requested: { label: 'Attente', cls: 'bg-secondary-subtle text-secondary' }, 
  sample_collected: { label: 'Prélevé', cls: 'bg-info-subtle text-info' }, 
  in_progress: { label: 'En cours', cls: 'bg-warning-subtle text-warning' }, 
  completed: { label: 'Terminé', cls: 'bg-success-subtle text-success' }, 
  cancelled: { label: 'Annulé', cls: 'bg-danger-subtle text-danger' } 
};

export default function LabStaffDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [labData, setLabData] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [labNotConfigured, setLabNotConfigured] = useState(false); // ✅ Nouvel état

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, labRes, reqRes] = await Promise.all([
        api.get('/laboratories/staff/stats/').catch(() => null),
        api.get('/laboratories/staff/my-lab/').catch(() => null),
        api.get('/laboratories/staff/requests/?page_size=5').catch(() => ({ data: { results: [] } }))
      ]);
      
      // ✅ Si le labo n'existe pas (labRes null), on l'indique
      if (!labRes || !labRes.data) {
        setLabNotConfigured(true);
        setLoading(false);
        return;
      }

      setLabNotConfigured(false);
      setLabData(labRes.data);
      if (statsRes) setStats(statsRes.data);
      setRecentRequests(reqRes.data?.results || []);
    } catch (err) {
      console.error("Erreur de chargement du dashboard", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const completedToday = useMemo(() => {
    if (!stats) return 0;
    return Math.max(0, (stats.today_count || 0) - (stats.pending_sample || 0) - (stats.in_progress || 0));
  }, [stats]);

  const barChartData = useMemo(() => ([
    { name: 'Attente', value: stats?.pending_sample || 0, fill: '#6366f1' },
    { name: 'En Cours', value: stats?.in_progress || 0, fill: '#f59e0b' },
    { name: 'Urgents', value: stats?.urgent || 0, fill: '#dc2626' },
    { name: 'Terminés', value: completedToday, fill: '#10b981' }
  ]), [stats, completedToday]);

  const areaChartData = useMemo(() => [
    { name: 'Lun', demandes: 12, revenus: 450 },
    { name: 'Mar', demandes: 18, revenus: 620 },
    { name: 'Mer', demandes: 15, revenus: 530 },
    { name: 'Jeu', demandes: 22, revenus: 810 },
    { name: 'Ven', demandes: 28, revenus: 1020 },
    { name: 'Sam', demandes: 14, revenus: 490 },
    { name: 'Dim', demandes: 5, revenus: 150 },
  ], []);

  if (loading && !stats) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    );
  }

  // ✅ Vue si le laboratoire n'est pas encore créé
  if (labNotConfigured) {
    return (
      <div className="container-fluid py-5 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 56px)' }}>
        <div className="card border-0 shadow text-center p-5" style={{ borderRadius: '16px', maxWidth: '500px' }}>
          <div className="mb-4">
            <i className="bi bi-building-add text-primary" style={{ fontSize: '4rem' }}></i>
          </div>
          <h3 className="fw-bold mb-2">Bienvenue dans votre espace Laboratoire</h3>
          <p className="text-muted mb-4">Pour commencer à utiliser les fonctionnalités, veuillez créer votre profil de laboratoire.</p>
          <button className="btn btn-primary btn-lg px-4" onClick={() => navigate('/lab-staff/settings')}>
            <i className="bi bi-plus-lg me-2"></i>Créer mon Laboratoire
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 56px)' }}>
      
      {/* En-tête */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Tableau de Bord</h3>
          <p className="text-muted mb-0">{labData?.name || 'Espace Laboratoire'}</p>
        </div>
        <div className="text-end">
          <small className="text-muted d-block">Date d'aujourd'hui</small>
          <strong>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
        </div>
      </div>

      {/* Cartes Statistiques */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
            <div className="card-body d-flex align-items-center">
              <div className="rounded-3 d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px', backgroundColor: '#dcfce7' }}>
                <i className="bi bi-cash-coin fs-4 text-success"></i>
              </div>
              <div>
                <div className="text-muted small text-uppercase fw-semibold">Revenus du Mois</div>
                <h4 className="mb-0 fw-bold text-dark">{stats ? `${Number(stats.month_revenue || 0).toFixed(3)} TND` : '...'}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
            <div className="card-body d-flex align-items-center">
              <div className="rounded-3 d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px', backgroundColor: '#dbeafe' }}>
                <i className="bi bi-calendar-day fs-4 text-primary"></i>
              </div>
              <div>
                <div className="text-muted small text-uppercase fw-semibold">Analyses du Jour</div>
                <h4 className="mb-0 fw-bold text-dark">{stats?.today_count ?? '...'}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
            <div className="card-body d-flex align-items-center">
              <div className="rounded-3 d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px', backgroundColor: '#ede9fe' }}>
                <i className="bi bi-droplet-half fs-4 text-indigo"></i>
              </div>
              <div>
                <div className="text-muted small text-uppercase fw-semibold">Attente Prélèvement</div>
                <h4 className="mb-0 fw-bold text-dark">{stats?.pending_sample ?? '...'}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
            <div className="card-body d-flex align-items-center">
              <div className="rounded-3 d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px', backgroundColor: '#fef3c7' }}>
                <i className="bi bi-hourglass-split fs-4 text-warning"></i>
              </div>
              <div>
                <div className="text-muted small text-uppercase fw-semibold">En Cours d'Analyse</div>
                <h4 className="mb-0 fw-bold text-dark">{stats?.in_progress ?? '...'}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ligne Graphiques */}
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white border-0 py-3 d-flex align-items-center">
              <h6 className="mb-0 fw-bold"><i className="bi bi-bar-chart-fill text-primary me-2"></i>Demandes du Jour par Statut</h6>
            </div>
            <div className="card-body p-3" style={{ height: '320px', width: '100%' }}>
              {stats && stats.today_count > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                  Aucune donnée disponible pour aujourd'hui.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white border-0 py-3 d-flex align-items-center">
              <h6 className="mb-0 fw-bold"><i className="bi bi-graph-up-arrow text-success me-2"></i>Tendance des Demandes (7 jours)</h6>
            </div>
            <div className="card-body p-3" style={{ height: '320px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDemandes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Area type="monotone" dataKey="demandes" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDemandes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Ligne Tableau et Alertes */}
      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white border-0 py-3 d-flex align-items-center justify-content-between">
              <h6 className="mb-0 fw-bold"><i className="bi bi-clock-history text-primary me-2"></i>Dernières Demandes</h6>
              <Link to="/lab-staff/workflow" className="btn btn-sm btn-outline-primary">Voir tout</Link>
            </div>
            <div className="card-body p-0">
              {recentRequests.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-inbox fs-2 d-block mb-2 opacity-50"></i>
                  Aucune demande récente.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Patient</th>
                        <th>Analyses</th>
                        <th className="text-center">Statut</th>
                        <th className="text-end">Paiement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRequests.map(req => (
                        <tr key={req.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/lab-staff/workflow')}>
                          <td className="fw-semibold">{req.patient_name}</td>
                          <td className="text-muted small">{req.test_names?.slice(0, 2).join(', ')} {req.test_names?.length > 2 ? '...' : ''}</td>
                          <td className="text-center">
                            <span className={`badge ${STATUS_MAP[req.status]?.cls || 'bg-light'}`}>
                              {STATUS_MAP[req.status]?.label || req.status}
                            </span>
                          </td>
                          <td className="text-end">
                            {req.payment_status === 'paid' ? (
                              <span className="badge bg-success-subtle text-success"><i className="bi bi-check-circle me-1"></i>Payé</span>
                            ) : (
                              <span className="badge bg-danger-subtle text-danger">Non payé</span>
                            )}
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

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white border-0 py-3">
              <h6 className="mb-0 fw-bold"><i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>Alertes & Cas Critiques</h6>
            </div>
            <div className="card-body d-flex flex-column gap-3">
              <div className="p-3 rounded-3 d-flex align-items-center justify-content-between" style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2' }}>
                <div>
                  <div className="text-danger small fw-bold text-uppercase">Urgents / STAT</div>
                  <div className="fs-4 fw-bold text-danger">{stats?.urgent || 0}</div>
                </div>
                <i className="bi bi-lightning-charge-fill text-danger fs-2"></i>
              </div>

              <div className="p-3 rounded-3 d-flex align-items-center justify-content-between" style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7' }}>
                <div>
                  <div className="text-warning small fw-bold text-uppercase">Résultats Anormaux</div>
                  <div className="fs-4 fw-bold text-warning">{stats?.abnormal_count || 0}</div>
                </div>
                <i className="bi bi-shield-exclamation text-warning fs-2"></i>
              </div>

              <Link to="/lab-staff/workflow" className="btn btn-primary w-100 mt-2">
                <i className="bi bi-list-task me-2"></i>Gérer les Demandes
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}