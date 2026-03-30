// src/pages/PlansManagement.jsx
// VERSION FINALE - Permet plusieurs plans avec le même type

import React, { useState, useEffect } from 'react';
import api from '../../services/api';

// Types de plans disponibles
const PLAN_TYPES = [
  { value: 'basic', label: 'Basique', color: 'secondary' },
  { value: 'pro', label: 'Professionnel', color: 'primary' },
  { value: 'enterprise', label: 'Entreprise', color: 'info' },
  { value: 'premium', label: 'Premium', color: 'warning' },
  { value: 'custom', label: 'Personnalisé', color: 'dark' },
];

// Helper pour obtenir les infos d'un type de plan
const getPlanTypeInfo = (name) => {
  return PLAN_TYPES.find(p => p.value === name) || { label: name, color: 'secondary' };
};

// Helper pour formater le prix
const formatPrice = (price) => {
  const num = parseFloat(price);
  if (isNaN(num)) return '0.000';
  return num.toFixed(3);
};

// Forme initiale du formulaire
const INITIAL_FORM = {
  name: 'basic',
  display_name: '',
  description: '',
  monthly_price: '',
  yearly_price: '',
  max_doctors: 1,
  max_secretaries: 1,
  max_patients: 100,
  features: '',
  is_active: true,
  is_popular: false,
  discount_percentage: 0,
  order: 0,
};

export default function PlansManagement() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Formulaire
  const [form, setForm] = useState(INITIAL_FORM);

  // Charger les plans
  const fetchPlans = async () => {
    try {
      const res = await api.get('/users/subscription-plans/');
      const data = res.data.results || res.data;
      // Trier par ordre puis par prix
      data.sort((a, b) => {
        const orderDiff = (a.order || 0) - (b.order || 0);
        if (orderDiff !== 0) return orderDiff;
        return parseFloat(a.monthly_price || 0) - parseFloat(b.monthly_price || 0);
      });
      setPlans(data);
    } catch (err) {
      console.error('Erreur chargement plans:', err);
      setError('Impossible de charger les plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Générer un nom unique
  const generateUniqueDisplayName = () => {
    const existingNames = plans.map(p => p.display_name?.toLowerCase().trim());
    const typeInfo = getPlanTypeInfo(form.name);
    let baseName = `${typeInfo.label}`;
    let displayName = baseName;
    let counter = 1;
    
    while (existingNames.includes(displayName.toLowerCase().trim())) {
      displayName = `${baseName} ${counter}`;
      counter++;
    }
    
    return displayName;
  };

  // Ouvrir le modal
  const openModal = (plan = null) => {
    setError(null);
    
    if (plan) {
      // Mode édition
      setForm({
        name: plan.name || 'basic',
        display_name: plan.display_name || '',
        description: plan.description || '',
        monthly_price: plan.monthly_price?.toString() || '0',
        yearly_price: plan.yearly_price?.toString() || '0',
        max_doctors: parseInt(plan.max_doctors) || 1,
        max_secretaries: parseInt(plan.max_secretaries) || 1,
        max_patients: parseInt(plan.max_patients) || 100,
        features: Array.isArray(plan.features) ? plan.features.join(', ') : (plan.features || ''),
        is_active: plan.is_active ?? true,
        is_popular: plan.is_popular ?? false,
        discount_percentage: parseInt(plan.discount_percentage) || 0,
        order: parseInt(plan.order) || plans.length,
      });
      setEditingPlan(plan);
    } else {
      // Mode création - générer un nom unique basé sur le type
      setForm({
        ...INITIAL_FORM,
        display_name: generateUniqueDisplayName(),
        order: plans.length,
      });
      setEditingPlan(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPlan(null);
    setError(null);
    setForm(INITIAL_FORM);
  };

  // Validation du formulaire
  const validateForm = () => {
    const errors = [];
    
    if (!form.display_name?.trim()) {
      errors.push('Le nom du plan est obligatoire');
    }
    
    const monthlyPrice = parseFloat(form.monthly_price);
    const yearlyPrice = parseFloat(form.yearly_price);
    
    if (isNaN(monthlyPrice) || monthlyPrice < 0) {
      errors.push('Le prix mensuel doit être un nombre positif');
    }
    
    if (isNaN(yearlyPrice) || yearlyPrice < 0) {
      errors.push('Le prix annuel doit être un nombre positif');
    }
    
    if (parseInt(form.max_doctors) < 1) {
      errors.push('Le nombre maximum de médecins doit être au moins 1');
    }
    
    return errors;
  };

  // Sauvegarder
  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      return;
    }

    const monthlyPrice = parseFloat(form.monthly_price) || 0;
    const yearlyPrice = parseFloat(form.yearly_price) || 0;

    setSaving(true);

    // Préparer le payload
    const payload = {
      name: form.name,
      display_name: form.display_name.trim(),
      description: form.description?.trim() || '',
      monthly_price: monthlyPrice,
      yearly_price: yearlyPrice,
      max_doctors: parseInt(form.max_doctors) || 1,
      max_secretaries: parseInt(form.max_secretaries) || 1,
      max_patients: parseInt(form.max_patients) || 100,
      features: form.features 
        ? form.features.split(',').map(f => f.trim()).filter(Boolean) 
        : [],
      is_active: Boolean(form.is_active),
      is_popular: Boolean(form.is_popular),
      discount_percentage: parseInt(form.discount_percentage) || 0,
      order: parseInt(form.order) || 0,
    };

    console.log('Payload envoyé:', payload);

    try {
      if (editingPlan) {
        await api.patch(`/users/subscription-plans/${editingPlan.id}/`, payload);
        alert('✅ Plan modifié avec succès !');
      } else {
        await api.post('/users/subscription-plans/', payload);
        alert('✅ Nouveau plan créé avec succès !');
      }
      fetchPlans();
      closeModal();
    } catch (err) {
      console.error('ERREUR:', err.response?.data);
      
      let errorMsg = 'Erreur lors de l\'enregistrement';
      const data = err.response?.data;
      
      if (data) {
        const errorParts = [];
        
        if (data.display_name) {
          errorParts.push(`Nom: ${Array.isArray(data.display_name) ? data.display_name[0] : data.display_name}`);
        }
        if (data.name) {
          errorParts.push(`Type: ${Array.isArray(data.name) ? data.name[0] : data.name}`);
        }
        if (data.monthly_price) {
          errorParts.push(`Prix mensuel: ${Array.isArray(data.monthly_price) ? data.monthly_price[0] : data.monthly_price}`);
        }
        if (data.yearly_price) {
          errorParts.push(`Prix annuel: ${Array.isArray(data.yearly_price) ? data.yearly_price[0] : data.yearly_price}`);
        }
        if (data.detail) {
          errorParts.push(data.detail);
        }
        if (data.non_field_errors) {
          errorParts.push(Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors);
        }
        
        if (errorParts.length > 0) {
          errorMsg = errorParts.join('\n');
        }
      }
      
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Supprimer
  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer ce plan ?\n\nNote: Si ce plan est utilisé par des abonnements, la suppression échouera.')) return;
    
    try {
      await api.delete(`/users/subscription-plans/${id}/`);
      alert('✅ Plan supprimé');
      fetchPlans();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Impossible de supprimer ce plan';
      alert('❌ ' + errorMsg);
    }
  };

  // Dupliquer un plan
  const handleDuplicate = async (plan) => {
    // Générer un nom unique pour la copie
    const existingNames = plans.map(p => p.display_name?.toLowerCase().trim());
    let newName = `${plan.display_name} (copie)`;
    let counter = 1;
    
    while (existingNames.includes(newName.toLowerCase().trim())) {
      newName = `${plan.display_name} (copie ${counter})`;
      counter++;
    }
    
    const payload = {
      name: plan.name,
      display_name: newName,
      description: plan.description || '',
      monthly_price: parseFloat(plan.monthly_price) || 0,
      yearly_price: parseFloat(plan.yearly_price) || 0,
      max_doctors: parseInt(plan.max_doctors) || 1,
      max_secretaries: parseInt(plan.max_secretaries) || 1,
      max_patients: parseInt(plan.max_patients) || 100,
      features: Array.isArray(plan.features) ? plan.features : [],
      is_active: true,
      is_popular: false,
      discount_percentage: parseInt(plan.discount_percentage) || 0,
      order: plans.length,
    };

    try {
      await api.post('/users/subscription-plans/', payload);
      alert('✅ Plan dupliqué avec succès !');
      fetchPlans();
    } catch (err) {
      console.error('Erreur duplication:', err.response?.data);
      alert('❌ Erreur lors de la duplication: ' + (err.response?.data?.display_name?.[0] || 'Erreur inconnue'));
    }
  };

  // Mettre à jour le nom d'affichage quand le type change (uniquement en mode création)
  const handleTypeChange = (newType) => {
    if (!editingPlan) {
      // En mode création, générer un nouveau nom basé sur le type
      const existingNames = plans.map(p => p.display_name?.toLowerCase().trim());
      const typeInfo = getPlanTypeInfo(newType);
      let baseName = typeInfo.label;
      let displayName = baseName;
      let counter = 1;
      
      while (existingNames.includes(displayName.toLowerCase().trim())) {
        displayName = `${baseName} ${counter}`;
        counter++;
      }
      
      setForm({ 
        ...form, 
        name: newType,
        display_name: displayName 
      });
    } else {
      setForm({ ...form, name: newType });
    }
  };

  // Statistiques
  const stats = {
    total: plans.length,
    active: plans.filter(p => p.is_active).length,
    popular: plans.filter(p => p.is_popular).length,
    byType: PLAN_TYPES.map(type => ({
      ...type,
      count: plans.filter(p => p.name === type.value).length
    }))
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} />
        <p className="mt-3 text-muted">Chargement des plans...</p>
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
            Gestion des Plans d'Abonnement
          </h2>
          <p className="text-muted mb-0">
            Créez et gérez vos offres d'abonnement
          </p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => openModal()}>
          <i className="bi bi-plus-circle me-2"></i>
          Nouveau Plan
        </button>
      </div>

      {/* Statistiques */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-primary mb-0">{stats.total}</h2>
              <small className="text-muted">Plans créés</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-success mb-0">{stats.active}</h2>
              <small className="text-muted">Plans actifs</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-warning mb-0">{stats.popular}</h2>
              <small className="text-muted">Mis en avant</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <small className="text-muted d-block mb-2">Par type</small>
              <div className="d-flex justify-content-center gap-2 flex-wrap">
                {stats.byType.filter(t => t.count > 0).map(type => (
                  <span key={type.value} className={`badge bg-${type.color}`}>
                    {type.label}: {type.count}
                  </span>
                ))}
                {stats.byType.every(t => t.count === 0) && (
                  <span className="text-muted small">Aucun plan</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerte si aucun plan */}
      {plans.length === 0 && (
        <div className="alert alert-info mb-4">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Aucun plan configuré.</strong> Créez votre premier plan d'abonnement pour commencer.
        </div>
      )}

      {/* Table des plans */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Nom du plan</th>
                <th>Type</th>
                <th>Prix mensuel</th>
                <th>Prix annuel</th>
                <th className="text-center">Médecins</th>
                <th className="text-center">Secrétaires</th>
                <th className="text-center">Patients</th>
                <th className="text-center">Statut</th>
                <th style={{ width: '150px' }} className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan, index) => {
                const typeInfo = getPlanTypeInfo(plan.name);
                return (
                  <tr key={plan.id} className={!plan.is_active ? 'table-secondary' : ''}>
                    <td className="text-muted">{index + 1}</td>
                    <td>
                      <div>
                        <strong>{plan.display_name}</strong>
                        {plan.is_popular && (
                          <span className="badge bg-warning text-dark ms-2">
                            <i className="bi bi-star-fill me-1"></i>Populaire
                          </span>
                        )}
                        {plan.discount_percentage > 0 && (
                          <span className="badge bg-danger ms-2">
                            -{plan.discount_percentage}%
                          </span>
                        )}
                        <br />
                        <small className="text-muted">
                          {plan.description?.substring(0, 50) || 'Aucune description'}
                          {plan.description?.length > 50 && '...'}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className={`badge bg-${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td>
                      <strong>{formatPrice(plan.monthly_price)}</strong>
                      <small className="text-muted"> TND</small>
                    </td>
                    <td>
                      <strong>{formatPrice(plan.yearly_price)}</strong>
                      <small className="text-muted"> TND</small>
                    </td>
                    <td className="text-center">{plan.max_doctors || '-'}</td>
                    <td className="text-center">{plan.max_secretaries || '-'}</td>
                    <td className="text-center">{plan.max_patients || '-'}</td>
                    <td className="text-center">
                      <span className={`badge ${plan.is_active ? 'bg-success' : 'bg-secondary'}`}>
                        {plan.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm d-flex justify-content-center">
                        <button 
                          className="btn btn-outline-primary" 
                          onClick={() => handleDuplicate(plan)}
                          title="Dupliquer"
                        >
                          <i className="bi bi-copy"></i>
                        </button>
                        <button 
                          className="btn btn-outline-warning" 
                          onClick={() => openModal(plan)}
                          title="Modifier"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button 
                          className="btn btn-outline-danger" 
                          onClick={() => handleDelete(plan.id)}
                          title="Supprimer"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {plans.length === 0 && (
                <tr>
                  <td colSpan="10" className="text-center py-5">
                    <div className="text-muted">
                      <i className="bi bi-credit-card display-4"></i>
                      <p className="mt-3 mb-0">Aucun plan configuré</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div 
          className="modal show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  {editingPlan ? '✏️ Modifier le Plan' : '➕ Créer un Nouveau Plan'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  {/* Afficher les erreurs */}
                  {error && (
                    <div className="alert alert-danger mb-3">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
                    </div>
                  )}
                  
                  <div className="row g-3">
                    {/* Type de plan */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Type de plan</label>
                      <select 
                        className="form-select" 
                        value={form.name} 
                        onChange={e => handleTypeChange(e.target.value)}
                      >
                        {PLAN_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      <small className="text-muted">
                        Plusieurs plans peuvent avoir le même type
                      </small>
                    </div>

                    {/* Nom d'affichage (UNIQUE) */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        Nom du plan <span className="text-danger">*</span>
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.display_name}
                        onChange={e => setForm({ ...form, display_name: e.target.value })}
                        placeholder="ex: Basic Starter, Pro Plus 2024"
                        required
                      />
                      <small className="text-muted">
                        Ce nom doit être unique
                      </small>
                    </div>

                    {/* Description */}
                    <div className="col-12">
                      <label className="form-label fw-bold">Description</label>
                      <textarea 
                        className="form-control" 
                        rows="2"
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        placeholder="Décrivez les avantages de ce plan..."
                      />
                    </div>

                    {/* Prix */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        Prix Mensuel (TND) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input 
                          type="number" 
                          step="0.001" 
                          min="0"
                          className="form-control" 
                          value={form.monthly_price}
                          onChange={e => setForm({ ...form, monthly_price: e.target.value })}
                          placeholder="0.000"
                          required
                        />
                        <span className="input-group-text">TND</span>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        Prix Annuel (TND) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input 
                          type="number" 
                          step="0.001" 
                          min="0"
                          className="form-control" 
                          value={form.yearly_price}
                          onChange={e => setForm({ ...form, yearly_price: e.target.value })}
                          placeholder="0.000"
                          required
                        />
                        <span className="input-group-text">TND</span>
                      </div>
                      <small className="text-muted">
                        💡 Conseil: appliquez une réduction (ex: 10 mois au lieu de 12)
                      </small>
                    </div>

                    {/* Limites */}
                    <div className="col-12">
                      <h6 className="text-muted border-bottom pb-2 mb-3">
                        <i className="bi bi-sliders me-2"></i>Limites
                      </h6>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-bold">Max Médecins</label>
                      <input 
                        type="number" 
                        min="1"
                        className="form-control" 
                        value={form.max_doctors}
                        onChange={e => setForm({ ...form, max_doctors: parseInt(e.target.value) || 1 })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-bold">Max Secrétaires</label>
                      <input 
                        type="number" 
                        min="0"
                        className="form-control" 
                        value={form.max_secretaries}
                        onChange={e => setForm({ ...form, max_secretaries: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-bold">Max Patients</label>
                      <input 
                        type="number" 
                        min="1"
                        className="form-control" 
                        value={form.max_patients}
                        onChange={e => setForm({ ...form, max_patients: parseInt(e.target.value) || 100 })}
                      />
                    </div>

                    {/* Fonctionnalités */}
                    <div className="col-12">
                      <label className="form-label fw-bold">Fonctionnalités</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.features}
                        onChange={e => setForm({ ...form, features: e.target.value })}
                        placeholder="rdv_illimites, support_24h, stats_avancées, exports_pdf"
                      />
                      <small className="text-muted">Séparez par des virgules</small>
                    </div>

                    {/* Options */}
                    <div className="col-12">
                      <h6 className="text-muted border-bottom pb-2 mb-3">
                        <i className="bi bi-gear me-2"></i>Options
                      </h6>
                    </div>

                    <div className="col-md-4">
                      <div className="form-check form-switch mt-2">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          id="is_active"
                          checked={form.is_active}
                          onChange={e => setForm({ ...form, is_active: e.target.checked })}
                        />
                        <label className="form-check-label" htmlFor="is_active">
                          <i className="bi bi-check-circle text-success me-1"></i>
                          Plan actif
                        </label>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="form-check form-switch mt-2">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          id="is_popular"
                          checked={form.is_popular}
                          onChange={e => setForm({ ...form, is_popular: e.target.checked })}
                        />
                        <label className="form-check-label" htmlFor="is_popular">
                          <i className="bi bi-star-fill text-warning me-1"></i>
                          Mis en avant
                        </label>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-bold">Réduction %</label>
                      <div className="input-group input-group-sm">
                        <input 
                          type="number" 
                          min="0" 
                          max="100"
                          className="form-control" 
                          value={form.discount_percentage}
                          onChange={e => setForm({ ...form, discount_percentage: parseInt(e.target.value) || 0 })}
                        />
                        <span className="input-group-text">%</span>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">Ordre d'affichage</label>
                      <input 
                        type="number" 
                        min="0"
                        className="form-control" 
                        value={form.order}
                        onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                      />
                      <small className="text-muted">Les plans sont triés par ordre croissant</small>
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
                        {editingPlan ? 'Enregistrer les modifications' : 'Créer le plan'}
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