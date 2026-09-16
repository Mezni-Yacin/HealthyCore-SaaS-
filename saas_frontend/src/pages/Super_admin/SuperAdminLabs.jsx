import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ── Modal réutilisable ─────────────────────────────────────────────────────
function Modal({ show, title, onClose, children, onSubmit, submitLabel, submitDisabled, submitVariant }) {
  if (!show) return null;
  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} />
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>{children}</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
              <button type="submit" className={`btn ${submitVariant || 'btn-primary'}`} disabled={submitDisabled}>
                {submitLabel || 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── FormField helper ───────────────────────────────────────────────────────
function FormField({ label, required, error, children, helpText }) {
  return (
    <div className="mb-3">
      <label className="form-label fw-semibold">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <div className="invalid-feedback d-block">{Array.isArray(error) ? error[0] : error}</div>}
      {helpText && <div className="form-text">{helpText}</div>}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export default function SuperAdminLabs() {
  const [labs, setLabs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [governorates, setGovernorates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedGovernorate, setSelectedGovernorate] = useState('');

  const emptyForm = {
    name: '', address: '', city: '', phone_number: '', email: '', 
    cnam_affiliated: false, is_active: true 
  };
  const [form, setForm] = useState({ ...emptyForm });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => {
    api.get('/users/governorates/', { params: { page_size: 1000 } })
      .then(res => setGovernorates(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(err => console.error("Erreur gouvernorats:", err));
  }, []);

  const fetchCities = useCallback(async (govId) => {
    if (!govId) { setCities([]); return; }
    try {
      const { data } = await api.get('/users/cities/', { params: { governorate: govId, page_size: 500 } });
      setCities(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Erreur villes:", err);
      setCities([]);
    }
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/laboratories/superadmin/labs/'),
      api.get('/laboratories/superadmin/stats/')
    ]).then(([labsRes, statsRes]) => {
      setLabs(labsRes.data.results || labsRes.data || []);
      setStats(statsRes.data);
    }).catch(err => {
      setMessage("Erreur lors du chargement des données.");
      setMessageType('danger');
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const openCreateModal = () => {
    setEditingLab(null);
    setForm({ ...emptyForm });
    setFormErrors({});
    setSelectedGovernorate('');
    setCities([]);
    setShowModal(true);
  };

  const openEditModal = async (lab) => {
    try {
      setEditingLab(lab);
      setForm({
        name: lab.name || '',
        address: lab.address || '',
        city: lab.city || '',
        phone_number: lab.phone_number || '',
        email: lab.email || '',
        cnam_affiliated: lab.cnam_affiliated || false,
        is_active: lab.is_active ?? true,
      });
      setFormErrors({});
      
      if (lab.city_detail && lab.city_detail.governorate_id) {
        setSelectedGovernorate(lab.city_detail.governorate_id);
        await fetchCities(lab.city_detail.governorate_id);
      } else {
        setSelectedGovernorate('');
        setCities([]);
      }
      setShowModal(true);
    } catch (err) {
      setMessage("Erreur lors du chargement du laboratoire.");
      setMessageType('danger');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    try {
      if (editingLab) {
        await api.patch(`/laboratories/superadmin/labs/${editingLab.id}/`, form);
        setMessage(`Laboratoire "${form.name}" modifié avec succès.`);
      } else {
        await api.post('/laboratories/superadmin/labs/', form);
        setMessage(`Laboratoire "${form.name}" créé avec succès.`);
      }
      setMessageType('success');
      setShowModal(false);
      fetchData();
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object' && errors !== null) {
        setFormErrors(errors);
        setMessage(errors.detail || 'Vérifiez les champs en erreur.');
      } else {
        setMessage("Erreur lors de l'enregistrement.");
      }
      setMessageType('danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (lab) => {
    if (!window.confirm(`Supprimer le laboratoire "${lab.name}" ?`)) return;
    try {
      await api.delete(`/laboratories/superadmin/labs/${lab.id}/`);
      setMessage(`Laboratoire "${lab.name}" supprimé.`);
      setMessageType('success');
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Erreur lors de la suppression.");
      setMessageType('danger');
    }
  };

  const handleToggleActive = async (lab) => {
    try {
      await api.post(`/laboratories/superadmin/labs/${lab.id}/toggle_active/`);
      fetchData();
    } catch (err) {
      setMessage("Erreur lors du changement d'état.");
      setMessageType('danger');
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">
            <i className="bi bi-hospital me-2 text-primary"></i>
            Gestion des Laboratoires
          </h2>
          <p className="text-muted mb-0">Gérez les structures d'analyses médicales</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <i className="bi bi-plus-lg me-1"></i> Ajouter un laboratoire
        </button>
      </div>

      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-3"><div className="card border-0 shadow-sm p-3 h-100"><h6 className="text-muted small">Total Labs</h6><h3 className="mb-0 text-primary">{stats.total_labs}</h3></div></div>
          <div className="col-md-3"><div className="card border-0 shadow-sm p-3 h-100"><h6 className="text-muted small">Types d'Analyses</h6><h3 className="mb-0 text-info">{stats.total_tests}</h3></div></div>
          <div className="col-md-3"><div className="card border-0 shadow-sm p-3 h-100"><h6 className="text-muted small">Total Demandes</h6><h3 className="mb-0 text-warning">{stats.total_requests}</h3></div></div>
          <div className="col-md-3"><div className="card border-0 shadow-sm p-3 h-100 bg-success bg-opacity-10"><h6 className="text-muted small">Revenus (Mois)</h6><h3 className="mb-0 text-success">{parseFloat(stats.month_revenue || 0).toFixed(3)} TND</h3></div></div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <p className="mt-2 text-muted">Chargement...</p>
            </div>
          ) : labs.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-hospital display-1 text-muted"></i>
              <p className="mt-2 text-muted">Aucun laboratoire enregistré.</p>
              <button className="btn btn-primary mt-2" onClick={openCreateModal}>Créer le premier laboratoire</button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Nom du Laboratoire</th>
                    <th>Ville</th>
                    <th>Téléphone</th>
                    <th>CNAM</th>
                    <th>Statut</th>
                    <th style={{ width: '150px' }} className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {labs.map(lab => (
                    <tr key={lab.id}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-2">
                          <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                            <i className="bi bi-hospital text-primary"></i>
                          </div>
                          <div>
                            <div className="fw-semibold">{lab.name}</div>
                            <small className="text-muted">{lab.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{lab.city_name || lab.city_detail?.name || '—'}</td>
                      <td>{lab.phone_number || '—'}</td>
                      <td>
                        {lab.cnam_affiliated ? <span className="badge bg-success">Oui</span> : <span className="badge bg-light text-dark">Non</span>}
                      </td>
                      <td>
                        <span className={`badge bg-${lab.is_active ? 'success' : 'danger'}`}>{lab.is_active ? 'Actif' : 'Inactif'}</span>
                      </td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-primary" onClick={() => openEditModal(lab)} title="Modifier">
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className={`btn ${lab.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`} onClick={() => handleToggleActive(lab)} title={lab.is_active ? 'Désactiver' : 'Activer'}>
                            <i className={`bi ${lab.is_active ? 'bi-pause-circle' : 'bi-play-circle'}`}></i>
                          </button>
                          <button className="btn btn-outline-danger" onClick={() => handleDelete(lab)} title="Supprimer">
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        show={showModal}
        title={editingLab ? `Modifier : ${editingLab.name}` : 'Nouveau Laboratoire'}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        submitLabel={submitting ? 'Enregistrement...' : (editingLab ? 'Mettre à jour' : 'Créer le laboratoire')}
        submitDisabled={submitting}
        submitVariant={editingLab ? 'btn-warning' : 'btn-success'}
      >
        <h6 className="text-primary border-bottom pb-2 mb-3"><i className="bi bi-info-circle me-1"></i> Informations générales</h6>
        <div className="row g-3">
          <div className="col-md-12">
            <FormField label="Nom du laboratoire" required error={formErrors.name}>
              <input type="text" className={`form-control ${formErrors.name ? 'is-invalid' : ''}`} value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Ex: LabMed Tunis" />
            </FormField>
          </div>
          <div className="col-md-12">
            <FormField label="Adresse" required error={formErrors.address}>
              <textarea className={`form-control ${formErrors.address ? 'is-invalid' : ''}`} value={form.address} onChange={(e) => updateForm('address', e.target.value)} rows="2" placeholder="Adresse complète" />
            </FormField>
          </div>

          <div className="col-md-6">
            <FormField label="Gouvernorat" required>
              <select 
                className="form-select" 
                value={selectedGovernorate} 
                onChange={(e) => {
                  setSelectedGovernorate(e.target.value);
                  fetchCities(e.target.value);
                  updateForm('city', '');
                }}
              >
                <option value="">— Sélectionner —</option>
                {governorates.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Ville" required error={formErrors.city}>
              <select 
                className={`form-select ${formErrors.city ? 'is-invalid' : ''}`} 
                value={form.city} 
                onChange={(e) => updateForm('city', e.target.value)}
                disabled={!selectedGovernorate}
              >
                <option value="">— Sélectionner —</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {!selectedGovernorate && <div className="form-text">Sélectionnez d'abord un gouvernorat</div>}
            </FormField>
          </div>

          <div className="col-md-6">
            <FormField label="Téléphone" required error={formErrors.phone_number}>
              <input type="tel" className={`form-control ${formErrors.phone_number ? 'is-invalid' : ''}`} value={form.phone_number} onChange={(e) => updateForm('phone_number', e.target.value)} placeholder="+216 XX XXX XXX" />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Email" required error={formErrors.email}>
              <input type="email" className={`form-control ${formErrors.email ? 'is-invalid' : ''}`} value={form.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="contact@lab.tn" />
            </FormField>
          </div>
        </div>

        <h6 className="text-info border-bottom pb-2 mt-4 mb-3"><i className="bi bi-heart-pulse me-1"></i> Affiliations & État</h6>
        <div className="row g-3">
          <div className="col-md-6">
            <div className="form-check form-switch mt-2">
              <input className="form-check-input" type="checkbox" id="lab_cnam" checked={form.cnam_affiliated} onChange={(e) => updateForm('cnam_affiliated', e.target.checked)} />
              <label className="form-check-label fw-semibold" htmlFor="lab_cnam">Affilié CNAM</label>
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-check form-switch mt-2">
              <input className="form-check-input" type="checkbox" id="lab_active" checked={form.is_active} onChange={(e) => updateForm('is_active', e.target.checked)} />
              <label className="form-check-label fw-semibold" htmlFor="lab_active">Laboratoire Actif</label>
            </div>
          </div>
        </div>

        {formErrors.detail && <div className="alert alert-danger mt-3">{formErrors.detail}</div>}
      </Modal>
    </div>
  );
}