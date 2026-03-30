// src/pages/SubscriptionsManagement.jsx
// VERSION CORRIGÉE V3 - Compatible avec le backend Django

import React, { useState, useEffect } from 'react';
import api from '../../services/api';

// Helper pour calculer la date de fin selon la période
const calculateEndDate = (period) => {
  const now = new Date();
  const days = {
    monthly: 30,
    quarterly: 90,
    semiannual: 180,
    yearly: 365,
  };
  return new Date(now.getTime() + (days[period] || 30) * 24 * 60 * 60 * 1000);
};

// Helper pour formater une date
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('fr-TN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (e) {
    return '-';
  }
};

// Helper pour le temps restant
const getDaysRemaining = (endDate) => {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end - now;
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

// Affichage des périodes
const PERIOD_DISPLAY = {
  'monthly': 'Mensuel (30 jours)',
  'quarterly': 'Trimestriel (90 jours)',
  'semiannual': 'Semestriel (180 jours)',
  'yearly': 'Annuel (365 jours)',
};

// Affichage des plans
const PLAN_DISPLAY = {
  'basic': 'Basique',
  'pro': 'Professionnel',
  'enterprise': 'Entreprise',
  'premium': 'Premium',
};

export default function SubscriptionsManagement() {
  // États
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Formulaire
  const [form, setForm] = useState({
    user: '',
    plan: '',
    period: 'monthly',
    is_active: true,
    auto_renew: true,
    payment_method: '',
  });

  // Données de référence
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscribedUserIds, setSubscribedUserIds] = useState(new Set());

  // ====================== CHARGEMENT DES DONNÉES ======================

  const fetchData = async () => {
    setLoading(true);
    try {
      // ✅ CORRECTION: Utiliser les bons endpoints
      const [subsRes, usersRes, plansRes] = await Promise.all([
        api.get('/users/subscriptions/'),
        api.get('/users/manage/'),  // ✅ Bon endpoint pour les utilisateurs
        api.get('/users/subscription-plans/'),
      ]);

      // Gérer la pagination éventuelle
      const subsData = subsRes.data.results || subsRes.data;
      const usersData = usersRes.data.results || usersRes.data;
      const plansData = plansRes.data.results || plansRes.data;

      console.log('Abonnements chargés:', subsData);
      console.log('Utilisateurs chargés:', usersData);
      console.log('Plans chargés:', plansData);

      setSubscriptions(subsData);
      setUsers(usersData);
      setPlans(plansData.filter(p => p.is_active));

      // Identifier les utilisateurs ayant déjà un abonnement
      const subscribedIds = new Set(subsData.map(s => s.user?.id || s.user));
      setSubscribedUserIds(subscribedIds);

    } catch (err) {
      console.error('Erreur chargement :', err);
      console.error('Détails erreur:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ====================== GESTION DU MODAL ======================

  const openModal = (sub = null) => {
    if (sub) {
      setForm({
        user: sub.user?.id || sub.user,
        plan: sub.plan?.id || sub.plan,
        period: sub.period || 'monthly',
        is_active: sub.is_active ?? true,
        auto_renew: sub.auto_renew ?? true,
        payment_method: sub.payment_method || '',
      });
      setEditingSub(sub);
    } else {
      setForm({
        user: '',
        plan: '',
        period: 'monthly',
        is_active: true,
        auto_renew: true,
        payment_method: '',
      });
      setEditingSub(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSub(null);
  };

  // ====================== CRÉATION / MODIFICATION ======================

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!form.user || !form.plan) {
      alert('❌ Utilisateur et Plan sont obligatoires');
      return;
    }

    // Vérifier si l'utilisateur a déjà un abonnement (en mode création)
    if (!editingSub && subscribedUserIds.has(parseInt(form.user))) {
      alert('❌ Cet utilisateur possède déjà un abonnement actif.');
      return;
    }

    setSaving(true);

    // Construire le payload
    // ✅ CORRECTION: Ne pas envoyer end_date, le backend le calcule automatiquement
    const payload = {
      user: parseInt(form.user),
      plan: parseInt(form.plan),
      period: form.period,
      is_active: form.is_active,
      auto_renew: form.auto_renew,
      payment_method: form.payment_method || null,
    };

    console.log('Payload envoyé:', payload);

    try {
      if (editingSub) {
        // Mise à jour
        const updatePayload = { ...payload };
        delete updatePayload.user; // Ne pas modifier l'utilisateur
        
        await api.patch(`/users/subscriptions/${editingSub.id}/`, updatePayload);
        alert('✅ Abonnement modifié avec succès !');
      } else {
        // Création
        await api.post('/users/subscriptions/', payload);
        alert('✅ Nouvel abonnement créé avec succès !');
      }
      
      fetchData();
      closeModal();
    } catch (err) {
      console.error('Erreur complète du serveur :', err.response?.data);
      
      let errorMsg = 'Erreur inconnue';
      const data = err.response?.data;
      
      if (data?.user) {
        errorMsg = Array.isArray(data.user) ? data.user[0] : data.user;
      } else if (data?.plan) {
        errorMsg = Array.isArray(data.plan) ? data.plan[0] : data.plan;
      } else if (data?.detail) {
        errorMsg = data.detail;
      } else if (data?.non_field_errors) {
        errorMsg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
      } else if (typeof data === 'string') {
        errorMsg = data;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      alert('❌ Erreur : ' + errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // ====================== SUPPRESSION ======================

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer cet abonnement ?\n\nCette action est irréversible.')) return;
    
    try {
      await api.delete(`/users/subscriptions/${id}/`);
      alert('✅ Abonnement supprimé');
      fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message;
      alert('❌ Erreur : ' + errorMsg);
    }
  };

  // ====================== UTILISATEURS DISPONIBLES ======================

  const getAvailableUsers = () => {
    if (editingSub) {
      return users;
    }
    return users.filter(u => !subscribedUserIds.has(u.id));
  };

  const availableUsers = getAvailableUsers();
  const canCreateNew = availableUsers.length > 0 && plans.length > 0;

  // ====================== RENDU ======================

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} />
        <p className="mt-3 text-muted">Chargement des abonnements...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h3 fw-bold text-primary mb-1">
            <i className="bi bi-credit-card-2-front me-2"></i>
            Gestion des Abonnements
          </h2>
          <p className="text-muted mb-0">
            Gérez les abonnements des utilisateurs
          </p>
        </div>
        <button 
          className="btn btn-primary btn-lg" 
          onClick={() => openModal()}
          disabled={!canCreateNew}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Nouvel Abonnement
        </button>
      </div>

      {/* Statistiques */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-primary mb-0">{subscriptions.length}</h2>
              <small className="text-muted">Total abonnements</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-success mb-0">
                {subscriptions.filter(s => s.is_active && getDaysRemaining(s.end_date) > 0).length}
              </h2>
              <small className="text-muted">Actifs</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-warning mb-0">
                {subscriptions.filter(s => {
                  const days = getDaysRemaining(s.end_date);
                  return s.is_active && days > 0 && days <= 7;
                }).length}
              </h2>
              <small className="text-muted">Expire bientôt</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-info mb-0">{users.length - subscribedUserIds.size}</h2>
              <small className="text-muted">Sans abonnement</small>
            </div>
          </div>
        </div>
      </div>

      {/* Alerte si aucun utilisateur disponible */}
      {!canCreateNew && (
        <div className="alert alert-warning mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {users.length === 0 
            ? 'Aucun utilisateur enregistré. Créez d\'abord des utilisateurs.'
            : plans.length === 0 
              ? 'Aucun plan d\'abonnement actif. Créez d\'abord des plans.'
              : 'Tous les utilisateurs ont déjà un abonnement.'
          }
        </div>
      )}

      {/* Table des abonnements */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Utilisateur</th>
                <th>Plan</th>
                <th>Période</th>
                <th>Date début</th>
                <th>Date fin</th>
                <th>Statut</th>
                <th>Renouv.</th>
                <th>Paiement</th>
                <th style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(sub => {
                const daysRemaining = getDaysRemaining(sub.end_date);
                const isExpired = daysRemaining <= 0;
                const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;
                
                return (
                  <tr 
                    key={sub.id} 
                    className={isExpired ? 'table-danger' : isExpiringSoon ? 'table-warning' : ''}
                  >
                    <td>
                      <div className="d-flex align-items-center">
                        <div 
                          className="bg-primary rounded-circle text-white d-flex align-items-center justify-content-center me-2"
                          style={{ width: '36px', height: '36px', fontSize: '0.9rem' }}
                        >
                          {(sub.user_detail?.full_name?.[0] || sub.user_detail?.username?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-bold">
                            {sub.user_detail?.full_name || sub.user_detail?.username || `User #${sub.user}`}
                          </div>
                          <small className="text-muted">{sub.user_detail?.role_display}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-primary fs-6">
                        {PLAN_DISPLAY[sub.plan_detail?.name || sub.plan_name] || sub.plan_name || `Plan #${sub.plan}`}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark">
                        {PERIOD_DISPLAY[sub.period] || sub.period}
                      </span>
                    </td>
                    <td>{formatDate(sub.start_date)}</td>
                    <td>
                      <div>
                        {formatDate(sub.end_date)}
                        {isExpired && (
                          <span className="badge bg-danger ms-2">Expiré</span>
                        )}
                        {isExpiringSoon && (
                          <span className="badge bg-warning text-dark ms-2">
                            {daysRemaining}j restant{daysRemaining > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${sub.is_active && !isExpired ? 'bg-success' : 'bg-secondary'}`}>
                        {sub.is_active && !isExpired ? '✅ Actif' : '❌ Inactif'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${sub.auto_renew ? 'bg-info' : 'bg-secondary'}`}>
                        {sub.auto_renew ? '✅ Oui' : '❌ Non'}
                      </span>
                    </td>
                    <td>
                      {sub.payment_method || <span className="text-muted">-</span>}
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button 
                          className="btn btn-outline-warning" 
                          onClick={() => openModal(sub)}
                          title="Modifier"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button 
                          className="btn btn-outline-danger" 
                          onClick={() => handleDelete(sub.id)}
                          title="Supprimer"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-5">
                    <div className="text-muted">
                      <i className="bi bi-inbox display-4"></i>
                      <p className="mt-3 mb-0">Aucun abonnement trouvé</p>
                      <small>Créez le premier abonnement en cliquant sur le bouton ci-dessus</small>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====================== MODAL ====================== */}
      {showModal && (
        <div 
          className="modal show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  {editingSub ? '✏️ Modifier l\'abonnement' : '➕ Nouvel abonnement'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={closeModal}
                ></button>
              </div>
              
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="row g-3">
                    {/* Utilisateur */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Utilisateur *</label>
                      {editingSub ? (
                        <div>
                          <input 
                            type="text" 
                            className="form-control bg-light" 
                            value={`${editingSub.user_detail?.full_name || editingSub.user_detail?.username} (${editingSub.user_detail?.role_display})`}
                            disabled 
                          />
                          <small className="text-muted">
                            <i className="bi bi-lock me-1"></i>
                            L'utilisateur ne peut pas être modifié
                          </small>
                        </div>
                      ) : (
                        <select 
                          className="form-select" 
                          value={form.user} 
                          onChange={e => setForm({ ...form, user: e.target.value })} 
                          required
                        >
                          <option value="">— Choisir un utilisateur —</option>
                          {availableUsers.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.first_name} {u.last_name} ({u.role_display || u.role}) — {u.email || u.username}
                            </option>
                          ))}
                        </select>
                      )}
                      {!editingSub && availableUsers.length === 0 && (
                        <small className="text-danger">Aucun utilisateur disponible</small>
                      )}
                    </div>

                    {/* Plan */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Plan *</label>
                      <select 
                        className="form-select" 
                        value={form.plan} 
                        onChange={e => setForm({ ...form, plan: e.target.value })} 
                        required
                      >
                        <option value="">— Choisir un plan —</option>
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>
                            {PLAN_DISPLAY[p.name] || p.name_display || p.name} — {parseFloat(p.monthly_price).toFixed(3)} TND/mois
                          </option>
                        ))}
                      </select>
                      {plans.length === 0 && (
                        <small className="text-danger">Aucun plan actif disponible</small>
                      )}
                    </div>

                    {/* Période */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Période</label>
                      <select 
                        className="form-select" 
                        value={form.period} 
                        onChange={e => setForm({ ...form, period: e.target.value })}
                      >
                        {Object.entries(PERIOD_DISPLAY).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Méthode de paiement */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Méthode de paiement</label>
                      <select 
                        className="form-select" 
                        value={form.payment_method} 
                        onChange={e => setForm({ ...form, payment_method: e.target.value })}
                      >
                        <option value="">— Non spécifié —</option>
                        <option value="Stripe">Stripe</option>
                        <option value="Virement">Virement bancaire</option>
                        <option value="Espèces">Espèces</option>
                        <option value="Chèque">Chèque</option>
                        <option value="Gratuit">Gratuit (offre)</option>
                      </select>
                    </div>

                    {/* Date de fin calculée */}
                    <div className="col-12">
                      <div className="alert alert-info d-flex align-items-center mb-0">
                        <i className="bi bi-calendar-check me-2 fs-5"></i>
                        <div>
                          <strong>Date de fin calculée :</strong>{' '}
                          {calculateEndDate(form.period).toLocaleDateString('fr-TN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Options */}
                    <div className="col-12">
                      <div className="row">
                        <div className="col-md-6">
                          <div className="form-check form-switch">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              id="is_active" 
                              checked={form.is_active} 
                              onChange={e => setForm({ ...form, is_active: e.target.checked })} 
                            />
                            <label className="form-check-label" htmlFor="is_active">
                              Abonnement actif
                            </label>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="form-check form-switch">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              id="auto_renew" 
                              checked={form.auto_renew} 
                              onChange={e => setForm({ ...form, auto_renew: e.target.checked })} 
                            />
                            <label className="form-check-label" htmlFor="auto_renew">
                              Renouvellement automatique
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-2"></i>
                        {editingSub ? 'Enregistrer' : 'Créer l\'abonnement'}
                      </>
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