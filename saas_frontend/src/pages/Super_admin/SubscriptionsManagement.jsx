import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ── Helpers & Config ───────────────────────────────────────────────────────
const calculateEndDate = (period) => {
  const now = new Date();
  const days = { monthly: 30, quarterly: 90, semiannual: 180, yearly: 365 };
  return new Date(now.getTime() + (days[period] || 30) * 24 * 60 * 60 * 1000);
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getDaysRemaining = (endDate) => {
  if (!endDate) return null;
  const diffMs = new Date(endDate) - new Date();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

const PERIOD_DISPLAY = {
  'monthly': 'Mensuel', 'quarterly': 'Trimestriel', 'semiannual': 'Semestriel', 'yearly': 'Annuel',
};

const PLAN_DISPLAY = {
  'basic': 'Basique', 'pro': 'Professionnel', 'enterprise': 'Entreprise', 'premium': 'Premium', 'custom': 'Personnalisé',
};

// ── Composants UI ──────────────────────────────────────────────────────────
function Modal({ show, title, onClose, children, onSubmit, submitLabel, submitDisabled, submitVariant }) {
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
              <button type="submit" className={`btn ${submitVariant || 'btn-primary'}`} disabled={submitDisabled}>{submitLabel || 'Enregistrer'}</button>
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
export default function SubscriptionsManagement() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({ user: '', plan: '', period: 'monthly', is_active: true, auto_renew: true, payment_method: '' });
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscribedUserIds, setSubscribedUserIds] = useState(new Set());
  
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subsRes, usersRes, plansRes] = await Promise.all([
        api.get('/users/subscriptions/'),
        api.get('/users/manage/'),
        api.get('/users/subscription-plans/'),
      ]);

      const subsData = subsRes.data.results || subsRes.data;
      const usersData = usersRes.data.results || usersRes.data;
      const plansData = plansRes.data.results || plansRes.data;

      setSubscriptions(subsData);
      setUsers(usersData);
      setPlans(plansData.filter(p => p.is_active));
      setSubscribedUserIds(new Set(subsData.map(s => s.user?.id || s.user)));
    } catch (err) {
      setMessage("Erreur lors du chargement des données.");
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = (sub = null) => {
    setFormErrors({});
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
      setForm({ user: '', plan: '', period: 'monthly', is_active: true, auto_renew: true, payment_method: '' });
      setEditingSub(null);
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});

    const payload = {
      user: parseInt(form.user),
      plan: parseInt(form.plan),
      period: form.period,
      is_active: form.is_active,
      auto_renew: form.auto_renew,
      payment_method: form.payment_method || null,
    };

    try {
      if (editingSub) {
        const updatePayload = { ...payload };
        delete updatePayload.user;
        await api.patch(`/users/subscriptions/${editingSub.id}/`, updatePayload);
        setMessage("Abonnement modifié avec succès.");
      } else {
        await api.post('/users/subscriptions/', payload);
        setMessage("Nouvel abonnement créé avec succès.");
      }
      setMessageType('success');
      fetchData();
      setShowModal(false);
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object') {
        setFormErrors(errors);
        setMessage(errors.detail || errors.user?.[0] || errors.non_field_errors?.[0] || 'Vérifiez les champs.');
      } else {
        setMessage("Erreur lors de l'enregistrement.");
      }
      setMessageType('danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet abonnement ?')) return;
    try {
      await api.delete(`/users/subscriptions/${id}/`);
      setMessage("Abonnement supprimé.");
      setMessageType('success');
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Erreur lors de la suppression.");
      setMessageType('danger');
    }
  };

  const getAvailableUsers = () => editingSub ? users : users.filter(u => !subscribedUserIds.has(u.id));
  const availableUsers = getAvailableUsers();
  const canCreateNew = availableUsers.length > 0 && plans.length > 0;

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.is_active && getDaysRemaining(s.end_date) > 0).length,
    expiring: subscriptions.filter(s => { const d = getDaysRemaining(s.end_date); return s.is_active && d > 0 && d <= 7; }).length,
    noSub: users.length - subscribedUserIds.size
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1"><i className="bi bi-credit-card-2-front me-2 text-primary"></i>Gestion des Abonnements</h2>
          <p className="text-muted mb-0">Gérez les abonnements des utilisateurs</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()} disabled={!canCreateNew}>
          <i className="bi bi-plus-lg me-1"></i> Nouvel Abonnement
        </button>
      </div>

      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      {!canCreateNew && !loading && (
        <div className="alert alert-warning mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {users.length === 0 ? 'Aucun utilisateur enregistré.' : plans.length === 0 ? 'Aucun plan d\'abonnement actif.' : 'Tous les utilisateurs ont déjà un abonnement.'}
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6"><div className="card border-0 shadow-sm h-100 bg-primary bg-opacity-10"><div className="card-body"><small className="text-muted d-block">Total</small><h4 className="mb-0 text-primary">{stats.total}</h4></div></div></div>
        <div className="col-md-3 col-6"><div className="card border-0 shadow-sm h-100 bg-success bg-opacity-10"><div className="card-body"><small className="text-muted d-block">Actifs</small><h4 className="mb-0 text-success">{stats.active}</h4></div></div></div>
        <div className="col-md-3 col-6"><div className="card border-0 shadow-sm h-100 bg-warning bg-opacity-10"><div className="card-body"><small className="text-muted d-block">Expire bientôt</small><h4 className="mb-0 text-warning">{stats.expiring}</h4></div></div></div>
        <div className="col-md-3 col-6"><div className="card border-0 shadow-sm h-100 bg-info bg-opacity-10"><div className="card-body"><small className="text-muted d-block">Sans abonnement</small><h4 className="mb-0 text-info">{stats.noSub}</h4></div></div></div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-5"><i className="bi bi-inbox display-1 text-muted"></i><p className="mt-2 text-muted">Aucun abonnement trouvé.</p></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Utilisateur</th>
                    <th>Plan</th>
                    <th>Période</th>
                    <th>Date fin</th>
                    <th className="text-center">Statut</th>
                    <th className="text-center">Renouv.</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map(sub => {
                    const daysRemaining = getDaysRemaining(sub.end_date);
                    const isExpired = daysRemaining <= 0;
                    const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;
                    return (
                      <tr key={sub.id} className={isExpired ? 'table-danger' : isExpiringSoon ? 'table-warning' : ''}>
                        <td className="ps-3">
                          <div className="d-flex align-items-center gap-2">
                            <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 36, height: 36 }}>
                              {(sub.user_detail?.full_name?.[0] || 'U').toUpperCase()}
                            </div>
                            <div>
                              <div className="fw-semibold">{sub.user_detail?.full_name || `User #${sub.user}`}</div>
                              <small className="text-muted">{sub.user_detail?.role_display}</small>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge bg-primary bg-opacity-10 text-primary">{PLAN_DISPLAY[sub.plan_detail?.name] || sub.plan_name}</span></td>
                        <td className="small">{PERIOD_DISPLAY[sub.period]}</td>
                        <td>
                          <div className="small">{formatDate(sub.end_date)}</div>
                          {isExpired && <span className="badge bg-danger bg-opacity-10 text-danger ms-2">Expiré</span>}
                          {isExpiringSoon && <span className="badge bg-warning bg-opacity-10 text-warning ms-2">{daysRemaining}j restants</span>}
                        </td>
                        <td className="text-center"><span className={`badge ${sub.is_active && !isExpired ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'}`}>{sub.is_active && !isExpired ? 'Actif' : 'Inactif'}</span></td>
                        <td className="text-center">{sub.auto_renew ? <i className="bi bi-check-circle-fill text-success"></i> : <i className="bi bi-x-circle text-secondary"></i>}</td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => openModal(sub)}><i className="bi bi-pencil"></i></button>
                            <button className="btn btn-outline-danger" onClick={() => handleDelete(sub.id)}><i className="bi bi-trash"></i></button>
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
        title={editingSub ? 'Modifier l\'abonnement' : 'Nouvel abonnement'} 
        onClose={() => setShowModal(false)} 
        onSubmit={handleSave}
        submitDisabled={saving}
        submitLabel={saving ? 'Enregistrement...' : (editingSub ? 'Enregistrer' : 'Créer')}
      >
        <div className="row g-3">
          <div className="col-md-6">
            <FormField label="Utilisateur" required error={formErrors.user}>
              {editingSub ? (
                <input type="text" className="form-control bg-light" value={`${editingSub.user_detail?.full_name || ''} (${editingSub.user_detail?.role_display || ''})`} disabled />
              ) : (
                <select className={`form-select ${formErrors.user ? 'is-invalid' : ''}`} value={form.user} onChange={e => setForm({ ...form, user: e.target.value })} required>
                  <option value="">— Choisir —</option>
                  {availableUsers.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role_display})</option>)}
                </select>
              )}
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Plan" required error={formErrors.plan}>
              <select className={`form-select ${formErrors.plan ? 'is-invalid' : ''}`} value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} required>
                <option value="">— Choisir —</option>
                {plans.map(p => <option key={p.id} value={p.id}>{PLAN_DISPLAY[p.name] || p.display_name} - {parseFloat(p.monthly_price).toFixed(3)} TND</option>)}
              </select>
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Période" error={formErrors.period}>
              <select className="form-select" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
                {Object.entries(PERIOD_DISPLAY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Méthode de paiement" error={formErrors.payment_method}>
              <select className="form-select" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                <option value="">— Non spécifié —</option>
                <option value="Stripe">Stripe</option>
                <option value="Virement">Virement</option>
                <option value="Espèces">Espèces</option>
                <option value="Gratuit">Gratuit</option>
              </select>
            </FormField>
          </div>
          <div className="col-12">
            <div className="alert alert-info d-flex align-items-center small mb-0">
              <i className="bi bi-calendar-check me-2 fs-5"></i>
              <div><strong>Date de fin calculée :</strong> {calculateEndDate(form.period).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-check form-switch mt-2">
              <input className="form-check-input" type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              <label className="form-check-label" htmlFor="is_active">Abonnement actif</label>
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-check form-switch mt-2">
              <input className="form-check-input" type="checkbox" id="auto_renew" checked={form.auto_renew} onChange={e => setForm({ ...form, auto_renew: e.target.checked })} />
              <label className="form-check-label" htmlFor="auto_renew">Renouvellement automatique</label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}