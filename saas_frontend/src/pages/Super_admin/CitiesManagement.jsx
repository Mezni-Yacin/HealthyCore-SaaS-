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
export default function CitiesManagement() {
  const [cities, setCities] = useState([]);
  const [governorates, setGovernorates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGovernorate, setFilterGovernorate] = useState('');
  const [ordering, setOrdering] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const [showModal, setShowModal] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [formName, setFormName] = useState('');
  const [formGovernorate, setFormGovernorate] = useState('');
  const [formPostalCode, setFormPostalCode] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => { setCurrentPage(1); }, [search, filterGovernorate, ordering]);

  const fetchGovernorates = useCallback(async () => {
    try {
      const { data } = await api.get('/users/governorates/', { params: { ordering: 'name', page_size: 1000 } });
      setGovernorates(Array.isArray(data) ? data : data.results || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchGovernorates(); }, [fetchGovernorates]);

  const fetchCities = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (filterGovernorate) params.governorate = filterGovernorate;
      if (ordering) params.ordering = ordering;

      const { data } = await api.get('/users/cities/', { params });
      if (data.results) {
        setCities(data.results); setTotalCount(data.count); setTotalPages(Math.ceil(data.count / pageSize));
      } else {
        setCities(data); setTotalCount(data.length); setTotalPages(1);
      }
    } catch (err) {
      setMessage("Erreur lors du chargement des villes."); setMessageType('danger');
    } finally { setLoading(false); }
  }, [search, filterGovernorate, ordering, currentPage, pageSize]);

  useEffect(() => { fetchCities(); }, [fetchCities]);

  const openCreateModal = () => {
    setEditingCity(null); setFormName(''); setFormGovernorate(''); setFormPostalCode(''); setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (city) => {
    setEditingCity(city); setFormName(city.name); setFormGovernorate(city.governorate || ''); setFormPostalCode(city.postal_code || ''); setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setFormErrors({});
    const payload = { name: formName.trim(), governorate: parseInt(formGovernorate) || null, postal_code: formPostalCode.trim() || null };

    try {
      if (editingCity) {
        await api.patch(`/users/cities/${editingCity.id}/`, payload);
        setMessage(`Ville "${payload.name}" modifiée avec succès.`);
      } else {
        await api.post('/users/cities/', payload);
        setMessage(`Ville "${payload.name}" créée avec succès.`);
      }
      setMessageType('success'); setShowModal(false); fetchCities();
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

  const handleDelete = async (city) => {
    if (!window.confirm(`Supprimer la ville "${city.name}" ?`)) return;
    try {
      await api.delete(`/users/cities/${city.id}/`);
      setMessage(`Ville "${city.name}" supprimée.`); setMessageType('success'); fetchCities();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Erreur lors de la suppression."); setMessageType('danger');
    }
  };

  const handleOrderToggle = (field) => setOrdering((prev) => (prev === field ? `-${field}` : field));
  const SortIcon = ({ field }) => ordering === field ? ' ▲' : ordering === `-${field}` ? ' ▼' : ' ↕';
  const getGovernorateName = (govId) => governorates.find((g) => g.id === govId)?.name || '—';

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1"><i className="bi bi-geo-alt me-2 text-primary"></i>Gestion des Villes</h2>
          <p className="text-muted mb-0">
            {totalCount} ville{totalCount > 1 ? 's' : ''} au total
            {filterGovernorate && (
              <span className="ms-2">— Filtré par : <strong>{getGovernorateName(parseInt(filterGovernorate))}</strong>
                <button className="btn btn-sm btn-link text-danger p-0 ms-1" onClick={() => setFilterGovernorate('')}><i className="bi bi-x-circle"></i></button>
              </span>
            )}
          </p>
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
          <div className="row g-2 align-items-center">
            <div className="col-md-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                <input type="text" className="form-control" placeholder="Rechercher par nom, code postal..." value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && <button className="btn btn-outline-secondary" onClick={() => setSearch('')}><i className="bi bi-x-lg"></i></button>}
              </div>
            </div>
            <div className="col-md-5">
              <select className="form-select form-select-sm" value={filterGovernorate} onChange={(e) => setFilterGovernorate(e.target.value)}>
                <option value="">Tous les gouvernorats</option>
                {governorates.map((gov) => <option key={gov.id} value={gov.id}>{gov.name} ({gov.code})</option>)}
              </select>
            </div>
            <div className="col-md-2 text-md-end">
              <small className="text-muted">Tri actif</small>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          ) : cities.length === 0 ? (
            <div className="text-center py-5"><i className="bi bi-geo-alt display-1 text-muted"></i><p className="mt-2 text-muted">Aucune ville trouvée.</p></div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3" style={{ width: '60px' }}>#</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleOrderToggle('name')}>Nom <SortIcon field="name" /></th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleOrderToggle('governorate__name')}>Gouvernorat <SortIcon field="governorate__name" /></th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleOrderToggle('postal_code')}>Code postal <SortIcon field="postal_code" /></th>
                      <th style={{ width: '150px' }} className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cities.map((city, index) => (
                      <tr key={city.id}>
                        <td className="ps-3 text-muted">{(currentPage - 1) * pageSize + index + 1}</td>
                        <td className="fw-semibold">{city.name}</td>
                        <td>{city.governorate_name ? <span className="badge bg-info bg-opacity-10 text-info">{city.governorate_name}</span> : <span className="text-muted">—</span>}</td>
                        <td>{city.postal_code ? <span className="badge bg-secondary bg-opacity-10 text-secondary">{city.postal_code}</span> : <span className="text-muted">—</span>}</td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => openEditModal(city)} title="Modifier"><i className="bi bi-pencil"></i></button>
                            <button className="btn btn-outline-danger" onClick={() => handleDelete(city)} title="Supprimer"><i className="bi bi-trash"></i></button>
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
        title={editingCity ? 'Modifier la ville' : 'Nouvelle ville'}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        submitLabel={submitting ? 'Enregistrement...' : (editingCity ? 'Mettre à jour' : 'Créer')}
        submitDisabled={submitting || !formName.trim() || !formGovernorate}
        submitVariant={editingCity ? 'btn-warning' : 'btn-success'}
      >
        <FormField label="Nom de la ville" required error={formErrors.name} helpText="Nom unique par gouvernorat (min 2 caractères)">
          <input type="text" className={`form-control ${formErrors.name ? 'is-invalid' : ''}`} value={formName} onChange={(e) => setFormName(e.target.value)} autoFocus />
        </FormField>
        <FormField label="Gouvernorat" required error={formErrors.governorate}>
          <select className={`form-select ${formErrors.governorate ? 'is-invalid' : ''}`} value={formGovernorate} onChange={(e) => setFormGovernorate(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {governorates.map((gov) => <option key={gov.id} value={gov.id}>{gov.name} ({gov.code})</option>)}
          </select>
        </FormField>
        <FormField label="Code postal" error={formErrors.postal_code} helpText="Chiffres uniquement, optionnel (max 10 caractères)">
          <input type="text" className={`form-control ${formErrors.postal_code ? 'is-invalid' : ''}`} value={formPostalCode} onChange={(e) => setFormPostalCode(e.target.value)} maxLength={10} />
        </FormField>
      </Modal>
    </div>
  );
}