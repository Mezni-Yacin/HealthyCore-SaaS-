import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ── Config & Helpers ───────────────────────────────────────────────────────
const PLAN_TYPES = [
  { value: 'basic', label: 'Basique', color: 'secondary' },
  { value: 'pro', label: 'Professionnel', color: 'primary' },
  { value: 'enterprise', label: 'Entreprise', color: 'info' },
  { value: 'premium', label: 'Premium', color: 'warning' },
  { value: 'custom', label: 'Personnalisé', color: 'dark' },
];

const getPlanTypeInfo = (name) => PLAN_TYPES.find(p => p.value === name) || { label: name, color: 'secondary' };
const formatPrice = (price) => isNaN(parseFloat(price)) ? '0.000' : parseFloat(price).toFixed(3);

const INITIAL_FORM = {
  name: 'basic', display_name: '', description: '', monthly_price: '', yearly_price: '',
  max_doctors: 1, max_secretaries: 1, max_patients: 100, features: '',
  is_active: true, is_popular: false, discount_percentage: 0, order: 0,
};

// ── Composants UI ──────────────────────────────────────────────────────────
function Modal({ show, title, onClose, children, onSubmit, submitLabel, submitDisabled }) {
  if (!show) return null;
  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body" style={{ maxHeight: '70vh' }}>{children}</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={submitDisabled}>{submitLabel || 'Enregistrer'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, error, children, helpText }) {
  return (
    <div className="mb-3">
      <label className="form-label fw-semibold">{label} {required && <span className="text-danger">*</span>}</label>
      {children}
      {error && <div className="invalid-feedback d-block">{Array.isArray(error) ? error[0] : error}</div>}
      {helpText && <div className="form-text">{helpText}</div>}
    </div>
  );
}

// ── Composant Principal ────────────────────────────────────────────────────
export default function PlansManagement() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users/subscription-plans/');
      const plansData = data.results || data;
      plansData.sort((a, b) => (a.order || 0) - (b.order || 0) || parseFloat(a.monthly_price || 0) - parseFloat(b.monthly_price || 0));
      setPlans(plansData);
    } catch (err) {
      setMessage("Impossible de charger les plans.");
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const generateUniqueDisplayName = (type) => {
    const existingNames = plans.map(p => p.display_name?.toLowerCase().trim());
    const typeInfo = getPlanTypeInfo(type);
    let displayName = typeInfo.label;
    let counter = 1;
    while (existingNames.includes(displayName.toLowerCase().trim())) {
      displayName = `${typeInfo.label} ${counter}`;
      counter++;
    }
    return displayName;
  };

  const openModal = (plan = null) => {
    setFormErrors({});
    if (plan) {
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
      setForm({ ...INITIAL_FORM, display_name: generateUniqueDisplayName('basic'), order: plans.length });
      setEditingPlan(null);
    }
    setShowModal(true);
  };

  const handleTypeChange = (newType) => {
    if (!editingPlan) {
      setForm({ ...form, name: newType, display_name: generateUniqueDisplayName(newType) });
    } else {
      setForm({ ...form, name: newType });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});

    const payload = {
      ...form,
      display_name: form.display_name.trim(),
      monthly_price: parseFloat(form.monthly_price) || 0,
      yearly_price: parseFloat(form.yearly_price) || 0,
      max_doctors: parseInt(form.max_doctors) || 1,
      max_secretaries: parseInt(form.max_secretaries) || 0,
      max_patients: parseInt(form.max_patients) || 100,
      features: form.features ? form.features.split(',').map(f => f.trim()).filter(Boolean) : [],
      discount_percentage: parseInt(form.discount_percentage) || 0,
      order: parseInt(form.order) || 0,
    };

    try {
      if (editingPlan) {
        await api.patch(`/users/subscription-plans/${editingPlan.id}/`, payload);
        setMessage("Plan modifié avec succès.");
      } else {
        await api.post('/users/subscription-plans/', payload);
        setMessage("Nouveau plan créé avec succès.");
      }
      setMessageType('success');
      fetchPlans();
      setShowModal(false);
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object') {
        setFormErrors(errors);
        setMessage(errors.detail || errors.display_name?.[0] || 'Vérifiez les champs en erreur.');
      } else {
        setMessage("Erreur lors de l'enregistrement.");
      }
      setMessageType('danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce plan ? Si des abonnements l\'utilisent, la suppression échouera.')) return;
    try {
      await api.delete(`/users/subscription-plans/${id}/`);
      setMessage("Plan supprimé.");
      setMessageType('success');
      fetchPlans();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Impossible de supprimer ce plan.");
      setMessageType('danger');
    }
  };

  const handleDuplicate = async (plan) => {
    const payload = { ...plan, display_name: generateUniqueDisplayName(plan.name), order: plans.length, is_popular: false };
    delete payload.id;
    try {
      await api.post('/users/subscription-plans/', payload);
      setMessage("Plan dupliqué avec succès.");
      setMessageType('success');
      fetchPlans();
    } catch (err) {
      setMessage("Erreur lors de la duplication.");
      setMessageType('danger');
    }
  };

  const stats = {
    total: plans.length,
    active: plans.filter(p => p.is_active).length,
    popular: plans.filter(p => p.is_popular).length,
    byType: PLAN_TYPES.map(type => ({ ...type, count: plans.filter(p => p.name === type.value).length }))
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1"><i className="bi bi-credit-card-2-front me-2 text-primary"></i>Plans d'Abonnement</h2>
          <p className="text-muted mb-0">Créez et gérez vos offres d'abonnement</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <i className="bi bi-plus-lg me-1"></i> Nouveau Plan
        </button>
      </div>

      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6"><div className="card border-0 shadow-sm h-100 bg-primary bg-opacity-10"><div className="card-body"><small className="text-muted d-block">Total Plans</small><h4 className="mb-0 text-primary">{stats.total}</h4></div></div></div>
        <div className="col-md-3 col-6"><div className="card border-0 shadow-sm h-100 bg-success bg-opacity-10"><div className="card-body"><small className="text-muted d-block">Actifs</small><h4 className="mb-0 text-success">{stats.active}</h4></div></div></div>
        <div className="col-md-3 col-6"><div className="card border-0 shadow-sm h-100 bg-warning bg-opacity-10"><div className="card-body"><small className="text-muted d-block">Populaires</small><h4 className="mb-0 text-warning">{stats.popular}</h4></div></div></div>
        <div className="col-md-3 col-6">
          <div className="card border-0 shadow-sm h-100 bg-light">
            <div className="card-body">
              <small className="text-muted d-block mb-2">Répartition</small>
              <div className="d-flex flex-wrap gap-1">
                {stats.byType.filter(t => t.count > 0).map(t => (
                  <span key={t.value} className={`badge bg-${t.color} bg-opacity-10 text-${t.color}`}>{t.label}: {t.count}</span>
                ))}
                {stats.byType.every(t => t.count === 0) && <span className="text-muted small">Aucun plan</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          ) : plans.length === 0 ? (
            <div className="text-center py-5"><i className="bi bi-credit-card display-1 text-muted"></i><p className="mt-2 text-muted">Aucun plan configuré.</p></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Nom du plan</th>
                    <th>Type</th>
                    <th>Prix Mensuel</th>
                    <th>Prix Annuel</th>
                    <th className="text-center">Limites (Doc/Sec/Pat)</th>
                    <th className="text-center">Statut</th>
                    <th style={{ width: '150px' }} className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => {
                    const typeInfo = getPlanTypeInfo(plan.name);
                    return (
                      <tr key={plan.id} className={!plan.is_active ? 'table-light' : ''}>
                        <td className="ps-3">
                          <div className="fw-bold">
                            {plan.display_name}
                            {plan.is_popular && <span className="badge bg-warning bg-opacity-10 text-warning ms-2"><i className="bi bi-star-fill me-1"></i>Populaire</span>}
                            {plan.discount_percentage > 0 && <span className="badge bg-danger bg-opacity-10 text-danger ms-2">-{plan.discount_percentage}%</span>}
                          </div>
                          <small className="text-muted text-truncate d-block" style={{ maxWidth: '250px' }}>{plan.description || 'Aucune description'}</small>
                        </td>
                        <td><span className={`badge bg-${typeInfo.color} bg-opacity-10 text-${typeInfo.color}`}>{typeInfo.label}</span></td>
                        <td className="fw-bold">{formatPrice(plan.monthly_price)} <small className="text-muted">TND</small></td>
                        <td className="fw-bold">{formatPrice(plan.yearly_price)} <small className="text-muted">TND</small></td>
                        <td className="text-center small text-muted">{plan.max_doctors} / {plan.max_secretaries} / {plan.max_patients}</td>
                        <td className="text-center"><span className={`badge ${plan.is_active ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'}`}>{plan.is_active ? 'Actif' : 'Inactif'}</span></td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-secondary" onClick={() => handleDuplicate(plan)} title="Dupliquer"><i className="bi bi-copy"></i></button>
                            <button className="btn btn-outline-primary" onClick={() => openModal(plan)} title="Modifier"><i className="bi bi-pencil"></i></button>
                            <button className="btn btn-outline-danger" onClick={() => handleDelete(plan.id)} title="Supprimer"><i className="bi bi-trash"></i></button>
                          </div>
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

      <Modal 
        show={showModal} 
        title={editingPlan ? 'Modifier le Plan' : 'Créer un Nouveau Plan'} 
        onClose={() => setShowModal(false)} 
        onSubmit={handleSave}
        submitDisabled={saving}
        submitLabel={saving ? 'Enregistrement...' : (editingPlan ? 'Enregistrer' : 'Créer le plan')}
      >
        <div className="row g-3">
          <div className="col-md-6">
            <FormField label="Type de plan" error={formErrors.name} helpText="Plusieurs plans peuvent avoir le même type">
              <select className={`form-select ${formErrors.name ? 'is-invalid' : ''}`} value={form.name} onChange={e => handleTypeChange(e.target.value)}>
                {PLAN_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Nom du plan" required error={formErrors.display_name} helpText="Ce nom doit être unique">
              <input type="text" className={`form-control ${formErrors.display_name ? 'is-invalid' : ''}`} value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} required />
            </FormField>
          </div>
          <div className="col-12">
            <FormField label="Description" error={formErrors.description}>
              <textarea className="form-control" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Prix Mensuel (TND)" required error={formErrors.monthly_price}>
              <input type="number" step="0.001" min="0" className={`form-control ${formErrors.monthly_price ? 'is-invalid' : ''}`} value={form.monthly_price} onChange={e => setForm({ ...form, monthly_price: e.target.value })} required />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Prix Annuel (TND)" required error={formErrors.yearly_price}>
              <input type="number" step="0.001" min="0" className={`form-control ${formErrors.yearly_price ? 'is-invalid' : ''}`} value={form.yearly_price} onChange={e => setForm({ ...form, yearly_price: e.target.value })} required />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="Max Médecins" error={formErrors.max_doctors}>
              <input type="number" min="1" className="form-control" value={form.max_doctors} onChange={e => setForm({ ...form, max_doctors: e.target.value })} />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="Max Secrétaires" error={formErrors.max_secretaries}>
              <input type="number" min="0" className="form-control" value={form.max_secretaries} onChange={e => setForm({ ...form, max_secretaries: e.target.value })} />
            </FormField>
          </div>
          <div className="col-md-4">
            <FormField label="Max Patients" error={formErrors.max_patients}>
              <input type="number" min="1" className="form-control" value={form.max_patients} onChange={e => setForm({ ...form, max_patients: e.target.value })} />
            </FormField>
          </div>
          <div className="col-12">
            <FormField label="Fonctionnalités" error={formErrors.features} helpText="Séparez par des virgules">
              <input type="text" className="form-control" value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} placeholder="rdv_illimites, support_24h" />
            </FormField>
          </div>
          <div className="col-md-4">
            <div className="form-check form-switch mt-2">
              <input className="form-check-input" type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              <label className="form-check-label" htmlFor="is_active">Plan actif</label>
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-check form-switch mt-2">
              <input className="form-check-input" type="checkbox" id="is_popular" checked={form.is_popular} onChange={e => setForm({ ...form, is_popular: e.target.checked })} />
              <label className="form-check-label" htmlFor="is_popular">Mis en avant</label>
            </div>
          </div>
          <div className="col-md-4">
            <FormField label="Réduction %">
              <input type="number" min="0" max="100" className="form-control" value={form.discount_percentage} onChange={e => setForm({ ...form, discount_percentage: e.target.value })} />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Ordre d'affichage" helpText="Les plans sont triés par ordre croissant">
              <input type="number" min="0" className="form-control" value={form.order} onChange={e => setForm({ ...form, order: e.target.value })} />
            </FormField>
          </div>
        </div>
      </Modal>
    </div>
  );
}