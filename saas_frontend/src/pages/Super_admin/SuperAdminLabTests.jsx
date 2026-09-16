import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const CATEGORIES = {
  hematology: 'Hématologie', 
  biochemistry: 'Biochimie', 
  microbiology: 'Microbiologie',
  immunology: 'Immunologie', 
  hormones: 'Hormones', 
  urinalysis: "Analyse d'urine", 
  other: 'Autre'
};

const emptyForm = { 
  name: '', code: '', category: 'biochemistry', description: '', 
  turnaround_time: 24, price: '0.000', cnam_coverage: false, cnam_price: '0.000' 
};

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
export default function SuperAdminLabTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  // ── Fetch Données ────────────────────────────────────────────────────────
  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (filterCategory) params.category = filterCategory;
      
      const { data } = await api.get('/laboratories/superadmin/tests/', { params });
      setTests(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setMessage("Erreur lors du chargement des analyses.");
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  // ── Form Helpers ─────────────────────────────────────────────────────────
  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const openCreateModal = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (test) => {
    setEditing(test);
    setForm({
      name: test.name || '',
      code: test.code || '',
      category: test.category || 'biochemistry',
      description: test.description || '',
      turnaround_time: test.turnaround_time ?? 24,
      price: test.price ?? '0.000',
      cnam_coverage: test.cnam_coverage || false,
      cnam_price: test.cnam_price ?? '0.000',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    try {
      if (editing) {
        await api.patch(`/laboratories/superadmin/tests/${editing.id}/`, form);
        setMessage(`Analyse "${form.name}" modifiée avec succès.`);
      } else {
        await api.post('/laboratories/superadmin/tests/', form);
        setMessage(`Analyse "${form.name}" créée avec succès.`);
      }
      setMessageType('success');
      setShowModal(false);
      fetchTests();
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

  const handleDelete = async (test) => {
    if (!window.confirm(`Supprimer l'analyse "${test.name}" ?`)) return;
    try {
      await api.delete(`/laboratories/superadmin/tests/${test.id}/`);
      setMessage(`Analyse "${test.name}" supprimée.`);
      setMessageType('success');
      fetchTests();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Erreur lors de la suppression.");
      setMessageType('danger');
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">
            <i className="bi bi-clipboard2-pulse me-2 text-primary"></i>
            Catalogue d'Analyses
          </h2>
          <p className="text-muted mb-0">Gérez les types d'examens de laboratoire</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <i className="bi bi-plus-lg me-1"></i> Nouvelle Analyse
        </button>
      </div>

      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      {/* Filtres */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-8">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                <input type="text" className="form-control" placeholder="Rechercher par nom ou code..." value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && <button className="btn btn-outline-secondary" onClick={() => setSearch('')}><i className="bi bi-x-lg"></i></button>}
              </div>
            </div>
            <div className="col-md-4">
              <select className="form-select form-select-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="">Toutes les catégories</option>
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <p className="mt-2 text-muted">Chargement...</p>
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-clipboard2-pulse display-1 text-muted"></i>
              <p className="mt-2 text-muted">Aucune analyse trouvée.</p>
              <button className="btn btn-primary mt-2" onClick={openCreateModal}>Créer la première analyse</button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Code</th>
                    <th>Nom de l'analyse</th>
                    <th>Catégorie</th>
                    <th className="text-center">Délai</th>
                    <th className="text-center">Prix</th>
                    <th className="text-center">CNAM</th>
                    <th style={{ width: '150px' }} className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map(t => (
                    <tr key={t.id}>
                      <td className="ps-3"><span className="badge bg-light text-dark border">{t.code}</span></td>
                      <td className="fw-semibold">{t.name}</td>
                      <td><span className="badge bg-info bg-opacity-10 text-info">{CATEGORIES[t.category] || t.category}</span></td>
                      <td className="text-center">{t.turnaround_time}h</td>
                      <td className="text-center fw-bold">{parseFloat(t.price).toFixed(3)} TND</td>
                      <td className="text-center">
                        {t.cnam_coverage ? (
                          <span className="badge bg-success-subtle text-success">
                            <i className="bi bi-check-circle-fill me-1"></i>{parseFloat(t.cnam_price).toFixed(3)}
                          </span>
                        ) : (
                          <span className="badge bg-light text-secondary">Non</span>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-primary" onClick={() => openEditModal(t)} title="Modifier"><i className="bi bi-pencil"></i></button>
                          <button className="btn btn-outline-danger" onClick={() => handleDelete(t)} title="Supprimer"><i className="bi bi-trash"></i></button>
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

      {/* ==================== MODAL CRÉER / MODIFIER ==================== */}
      <Modal
        show={showModal}
        title={editing ? `Modifier : ${editing.name}` : 'Nouvelle Analyse'}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        submitLabel={submitting ? 'Enregistrement...' : (editing ? 'Mettre à jour' : 'Créer l\'analyse')}
        submitDisabled={submitting}
        submitVariant={editing ? 'btn-warning' : 'btn-success'}
      >
        <h6 className="text-primary border-bottom pb-2 mb-3"><i className="bi bi-info-circle me-1"></i> Informations de l'analyse</h6>
        <div className="row g-3">
          <div className="col-md-4">
            <FormField label="Code" required error={formErrors.code} helpText="Unique (ex: NFS)">
              <input type="text" className={`form-control ${formErrors.code ? 'is-invalid' : ''}`} value={form.code} onChange={(e) => updateForm('code', e.target.value.toUpperCase())} placeholder="NFS" />
            </FormField>
          </div>
          <div className="col-md-8">
            <FormField label="Nom de l'analyse" required error={formErrors.name}>
              <input type="text" className={`form-control ${formErrors.name ? 'is-invalid' : ''}`} value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Numération Formule Sanguine" />
            </FormField>
          </div>
          
          <div className="col-md-6">
            <FormField label="Catégorie" required error={formErrors.category}>
              <select className={`form-select ${formErrors.category ? 'is-invalid' : ''}`} value={form.category} onChange={(e) => updateForm('category', e.target.value)}>
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Délai de rendu (Heures)" required error={formErrors.turnaround_time}>
              <input type="number" min="1" className={`form-control ${formErrors.turnaround_time ? 'is-invalid' : ''}`} value={form.turnaround_time} onChange={(e) => updateForm('turnaround_time', e.target.value)} />
            </FormField>
          </div>

          <div className="col-md-12">
            <FormField label="Instructions de préparation" error={formErrors.description} helpText="Ex: À jeun, pas de médicaments...">
              <textarea className={`form-control ${formErrors.description ? 'is-invalid' : ''}`} rows="2" value={form.description} onChange={(e) => updateForm('description', e.target.value)}></textarea>
            </FormField>
          </div>
        </div>

        <h6 className="text-success border-bottom pb-2 mt-4 mb-3"><i className="bi bi-cash-stack me-1"></i> Tarification</h6>
        <div className="row g-3">
          <div className="col-md-6">
            <FormField label="Prix Patient (TND)" required error={formErrors.price}>
              <input type="number" step="0.001" min="0" className={`form-control ${formErrors.price ? 'is-invalid' : ''}`} value={form.price} onChange={(e) => updateForm('price', e.target.value)} />
            </FormField>
          </div>
          
          <div className="col-md-6">
            <div className="form-check form-switch mt-4 mb-2">
              <input className="form-check-input" type="checkbox" id="cnam_coverage" checked={form.cnam_coverage} onChange={(e) => updateForm('cnam_coverage', e.target.checked)} />
              <label className="form-check-label fw-semibold" htmlFor="cnam_coverage">Prise en charge CNAM</label>
            </div>
            <FormField label="Prix CNAM (TND)" error={formErrors.cnam_price}>
              <input type="number" step="0.001" min="0" className={`form-control ${formErrors.cnam_price ? 'is-invalid' : ''}`} value={form.cnam_price} onChange={(e) => updateForm('cnam_price', e.target.value)} disabled={!form.cnam_coverage} />
            </FormField>
          </div>
        </div>

        {formErrors.detail && <div className="alert alert-danger mt-3">{formErrors.detail}</div>}
      </Modal>
    </div>
  );
}