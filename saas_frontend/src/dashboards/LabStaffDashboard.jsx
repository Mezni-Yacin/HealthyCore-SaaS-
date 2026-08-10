import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function LabStaffDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [labName, setLabName] = useState('Laboratoire');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // On lance les deux requêtes en parallèle
        const [statsRes, labRes] = await Promise.all([
          api.get('/laboratories/staff/stats/'),
          api.get('/laboratories/staff/my-lab/').catch(() => null) // Ignore l'erreur si le labo n'est pas encore créé
        ]);
        
        setStats(statsRes.data);
        if (labRes?.data?.name) setLabName(labRes.data.name);
      } catch (err) {
        console.error("Erreur de chargement du dashboard", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Style pour les cartes de statistiques
  const statCards = [
    { 
      label: 'Revenus du Mois', 
      value: stats ? `${Number(stats.month_revenue).toFixed(3)} TND` : '...',
      icon: 'bi-cash-coin', 
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      shadow: 'rgba(5, 150, 105, 0.3)'
    },
    { 
      label: 'Analyses du Jour', 
      value: stats?.today_count ?? '...', 
      icon: 'bi-calendar-day', 
      gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
      shadow: 'rgba(37, 99, 235, 0.3)'
    },
    { 
      label: 'Attente Prélèvement', 
      value: stats?.pending_sample ?? '...', 
      icon: 'bi-droplet-half', 
      gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
      shadow: 'rgba(99, 102, 241, 0.3)'
    },
    { 
      label: 'En Cours d\'Analyse', 
      value: stats?.in_progress ?? '...', 
      icon: 'bi-hourglass-split', 
      gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      shadow: 'rgba(217, 119, 6, 0.3)'
    },
  ];

  return (
    <div className="container-fluid py-4" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* En-tête de bienvenue */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1 d-flex align-items-center">
          <i className="bi bi-clipboard2-data me-2 text-primary"></i>
          Tableau de Bord
        </h2>
        <p className="text-muted mb-0">
          Bienvenue sur l'espace de gestion de <strong className="text-dark">{labName}</strong>
        </p>
      </div>

      {/* Grille des Statistiques Principales */}
      <div className="row g-4 mb-4">
        {statCards.map((card, index) => (
          <div key={index} className="col-xl-3 col-md-6">
            <div 
              className="card border-0 h-100" 
              style={{ 
                background: card.gradient, 
                borderRadius: 16, 
                boxShadow: `0 10px 25px -5px ${card.shadow}`
              }}
            >
              <div className="card-body d-flex align-items-center p-4 text-white">
                <div className="flex-grow-1">
                  <div className="text-white-50 small fw-semibold text-uppercase mb-2" style={{ letterSpacing: '0.5px' }}>
                    {card.label}
                  </div>
                  {loading ? (
                    <div className="spinner-border spinner-border-sm text-white" role="status"></div>
                  ) : (
                    <h3 className="mb-0 fw-bold" style={{ fontSize: '1.75rem' }}>{card.value}</h3>
                  )}
                </div>
                <div 
                  className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                  style={{ 
                    width: 60, 
                    height: 60, 
                    background: 'rgba(255,255,255,0.2)', 
                    backdropFilter: 'blur(10px)' 
                  }}
                >
                  <i className={`bi ${card.icon}`} style={{ fontSize: '1.8rem' }}></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ligne 2 : Alertes et Actions Rapides */}
      <div className="row g-4">
        
        {/* Colonne Gauche : Alertes Urgentes */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
            <div className="card-header bg-white border-0 py-3 d-flex align-items-center">
              <h5 className="mb-0 fw-bold"><i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>Cas Urgents & Anomalies</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                
                {/* Carte Urgents */}
                <div className="col-md-6">
                  <div 
                    className="p-4 rounded-4 h-100 d-flex flex-column justify-content-between"
                    style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)', border: '1px solid #fecaca' }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <div className="text-danger small fw-bold text-uppercase">Demandes Urgentes / STAT</div>
                        <div className="display-4 fw-bold text-danger mt-2">{loading ? '...' : stats?.urgent || 0}</div>
                      </div>
                      <i className="bi bi-lightning-charge-fill text-danger" style={{ fontSize: '2rem' }}></i>
                    </div>
                    <p className="text-danger small mb-0 opacity-75">À traiter en priorité absolue.</p>
                  </div>
                </div>

                {/* Carte Résultats Anormaux */}
                <div className="col-md-6">
                  <div 
                    className="p-4 rounded-4 h-100 d-flex flex-column justify-content-between"
                    style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)', border: '1px solid #fde68a' }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <div className="text-warning small fw-bold text-uppercase">Résultats Anormaux</div>
                        <div className="display-4 fw-bold text-warning mt-2">{loading ? '...' : stats?.abnormal_count || 0}</div>
                      </div>
                      <i className="bi bi-shield-exclamation text-warning" style={{ fontSize: '2rem' }}></i>
                    </div>
                    <p className="text-warning small mb-0 opacity-75">Nécessitent une attention médicale.</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Colonne Droite : Raccourcis d'Actions */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
            <div className="card-header bg-white border-0 py-3">
              <h5 className="mb-0 fw-bold"><i className="bi bi-lightning-fill text-primary me-2"></i>Actions Rapides</h5>
            </div>
            <div className="card-body d-grid gap-3">
              
              <button 
                className="btn btn-primary btn-lg d-flex align-items-center justify-content-between py-3 px-4 border-0"
                style={{ borderRadius: 12, background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}
                onClick={() => navigate('/lab-staff')}
              >
                <span className="d-flex align-items-center fw-semibold">
                  <i className="bi bi-list-task me-3" style={{ fontSize: '1.2rem' }}></i>
                  Gérer les Demandes
                </span>
                <i className="bi bi-arrow-right-circle"></i>
              </button>

              <button 
                className="btn btn-success btn-lg d-flex align-items-center justify-content-between py-3 px-4 border-0"
                style={{ borderRadius: 12, background: 'linear-gradient(135deg, #059669, #10b981)' }}
                onClick={() => navigate('/lab-staff')}
              >
                <span className="d-flex align-items-center fw-semibold">
                  <i className="bi bi-cash-coin me-3" style={{ fontSize: '1.2rem' }}></i>
                  Encaisser un Paiement
                </span>
                <i className="bi bi-arrow-right-circle"></i>
              </button>

              <button 
                className="btn btn-secondary btn-lg d-flex align-items-center justify-content-between py-3 px-4 border-0"
                style={{ borderRadius: 12, background: 'linear-gradient(135deg, #475569, #64748b)' }}
                onClick={() => navigate('/lab-staff')}
              >
                <span className="d-flex align-items-center fw-semibold">
                  <i className="bi bi-grid-3x3-gap me-3" style={{ fontSize: '1.2rem' }}></i>
                  Catalogue des Analyses
                </span>
                <i className="bi bi-arrow-right-circle"></i>
              </button>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}