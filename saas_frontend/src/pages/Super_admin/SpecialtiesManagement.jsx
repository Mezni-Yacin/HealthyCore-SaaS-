import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ── Composants UI Réutilisables ────────────────────────────────────────────
function Modal({ show, title, onClose, children, onSubmit, submitLabel, submitDisabled, submitVariant }) {
  if (!show) return null;
  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} />
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body">{children}</div>
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

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + 4);
  if (end - start + 1 < 5) start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav>
      <ul className="pagination justify-content-center mb-0">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>Précédent</button>
        </li>
        {pages.map(p => (
          <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(p)}>{p}</button>
          </li>
        ))}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Suivant</button>
        </li>
      </ul>
    </nav>
  );
}

// ── Composant Principal ────────────────────────────────────────────────────
export default function SpecialtiesManagement() {
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  const [showModal, setShowModal] = useState(false);
  const [editingSpec, setEditingSpec] = useState(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => { setCurrentPage(1); }, [search, ordering]);

  const fetchSpecialties = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (ordering) params.ordering = ordering;

      const { data } = await api.get('/users/specialties/', { params });
      if (data.results) {
        setSpecialties(data.results); setTotalCount(data.count); setTotalPages(Math.ceil(data.count / pageSize));
      } else {
        setSpecialties(data); setTotalCount(data.length); setTotalPages(1);
      }
    } catch (err) {
      setMessage("Erreur lors du chargement des spécialités."); setMessageType('danger');
    } finally { setLoading(false); }
  }, [search, ordering, currentPage, pageSize]);

  useEffect(() => { fetchSpecialties(); }, [fetchSpecialties]);

  const openCreateModal = () => {
    setEditingSpec(null); setFormName(''); setFormCode(''); setFormDescription(''); setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (spec) => {
    setEditingSpec(spec); setFormName(spec.name); setFormCode(spec.code); setFormDescription(spec.description || ''); setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setFormErrors({});
    const payload = { name: formName.trim(), code: formCode.trim().toUpperCase(), description: formDescription.trim() || null };

    try {
      if (editingSpec) {
        await api.patch(`/users/specialties/${editingSpec.id}/`, payload);
        setMessage(`Spécialité "${payload.name}" modifiée avec succès.`);
      } else {
        await api.post('/users/specialties/', payload);
        setMessage(`Spécialité "${payload.name}" créée avec succès.`);
      }
      setMessageType('success'); setShowModal(false); fetchSpecialties();
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object') {
        setFormErrors(errors);
        setMessage(errors.detail || 'Vérifiez les champs en erreur.');
      } else {
        setMessage("Erreur lors de l'enregistrement.");
      }
      setMessageType('danger');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (spec) => {
    if (!window.confirm(`Supprimer la spécialité "${spec.name}" ?`)) return;
    try {
      await api.delete(`/users/specialties/${spec.id}/`);
      setMessage(`Spécialité "${spec.name}" supprimée.`); setMessageType('success'); fetchSpecialties();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Erreur lors de la suppression."); setMessageType('danger');
    }
  };

  const handleOrderToggle = (field) => setOrdering((prev) => (prev === field ? `-${field}` : field));
  const SortIcon = ({ field }) => ordering === field ? ' ▲' : ordering === `-${field}` ? ' ▼' : ' ↕';

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1"><i className="bi bi-heart-pulse me-2 text-danger"></i>Spécialités Médicales</h2>
          <p className="text-muted mb-0">{totalCount} spécialité{totalCount > 1 ? 's' : ''} au total</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}><i className="bi bi-plus-lg me-1"></i> Ajouter</button>
      </div>

      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
            <input type="text" className="form-control" placeholder="Rechercher par nom, code ou description..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button className="btn btn-outline-secondary" onClick={() => setSearch('')}><i className="bi bi-x-lg"></i></button>}
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          ) : specialties.length === 0 ? (
            <div className="text-center py-5"><i className="bi bi-heart-pulse display-1 text-muted"></i><p className="mt-2 text-muted">Aucune spécialité trouvée.</p></div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3" style={{ width: '60px' }}>#</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleOrderToggle('name')}>Nom <SortIcon field="name" /></th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleOrderToggle('code')}>Code CNAM <SortIcon field="code" /></th>
                      <th>Description</th>
                      <th className="text-center">Cabinets</th>
                      <th className="text-center">Médecins</th>
                      <th style={{ width: '150px' }} className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specialties.map((spec, index) => (
                      <tr key={spec.id}>
                        <td className="ps-3 text-muted">{(currentPage - 1) * pageSize + index + 1}</td>
                        <td className="fw-semibold">{spec.name}</td>
                        <td><span className="badge bg-info bg-opacity-10 text-info">{spec.code}</span></td>
                        <td>
                          {spec.description ? (
                            <span className="text-muted text-truncate d-inline-block" style={{ maxWidth: '200px' }} title={spec.description}>{spec.description}</span>
                          ) : (<span className="text-muted fst-italic">—</span>)}
                        </td>
                        <td className="text-center">
                          {spec.cabinets_count > 0 ? <span className="badge bg-primary bg-opacity-10 text-primary">{spec.cabinets_count}</span> : <span className="text-muted">0</span>}
                        </td>
                        <td className="text-center">
                          {spec.doctors_count > 0 ? <span className="badge bg-success bg-opacity-10 text-success">{spec.doctors_count}</span> : <span className="text-muted">0</span>}
                        </td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => openEditModal(spec)} title="Modifier"><i className="bi bi-pencil"></i></button>
                            <button className="btn btn-outline-danger" onClick={() => handleDelete(spec)} title="Supprimer" disabled={spec.cabinets_count > 0 || spec.doctors_count > 0} style={spec.cabinets_count > 0 || spec.doctors_count > 0 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}><i className="bi bi-trash"></i></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="card-footer bg-white border-top">
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} sur {totalCount}</small>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        show={showModal}
        title={editingSpec ? `Modifier : ${editingSpec.name}` : 'Nouvelle Spécialité Médicale'}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        submitLabel={submitting ? 'Enregistrement...' : (editingSpec ? 'Mettre à jour' : 'Créer')}
        submitDisabled={submitting}
        submitVariant={editingSpec ? 'btn-warning' : 'btn-success'}
      >
        <FormField label="Nom de la spécialité" required error={formErrors.name} helpText="Nom de la spécialité (min 2 caractères)">
          <input type="text" className={`form-control ${formErrors.name ? 'is-invalid' : ''}`} value={formName} onChange={(e) => setFormName(e.target.value)} autoFocus />
        </FormField>
        <FormField label="Code CNAM" required error={formErrors.code} helpText="Code unique (2–20 caractères, majuscules auto)">
          <input type="text" className={`form-control ${formErrors.code ? 'is-invalid' : ''}`} value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())} maxLength={20} style={{ textTransform: 'uppercase' }} />
        </FormField>
        <FormField label="Description" error={formErrors.description}>
          <textarea className={`form-control ${formErrors.description ? 'is-invalid' : ''}`} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows="3" />
        </FormField>
        
        {editingSpec && (editingSpec.cabinets_count > 0 || editingSpec.doctors_count > 0) && (
          <div className="alert alert-warning">
            <i className="bi bi-exclamation-triangle me-1"></i>
            Cette spécialité est utilisée par {editingSpec.cabinets_count} cabinet(s) et {editingSpec.doctors_count} médecin(s).
          </div>
        )}
      </Modal>
    </div>
  );
}