import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

/**
 * ============================================================================
 *  CitiesManagement.jsx — CRUD COMPLET (Super Admin)
 * ============================================================================
 *
 *  Fonctionnalités :
 *    - Lister toutes les villes (tableau paginé côté serveur)
 *    - Créer une ville (modal avec dropdown gouvernorat)
 *    - Modifier une ville (modal pré-rempli)
 *    - Supprimer une ville (confirmation + protection si utilisateurs liés)
 *    - Rechercher par nom, code postal ou gouvernorat
 *    - Filtrer par gouvernorat (dropdown)
 *    - Tri par nom, code postal, gouvernorat
 *    - Pagination serveur Django (PageNumberPagination)
 *    - Gestion d'erreurs détaillée (par champ + globale)
 *
 *  Endpoints :
 *    GET    /users/cities/?page=1&search=tunis&governorate=1&ordering=name
 *    POST   /users/cities/
 *    PATCH  /users/cities/<id>/
 *    DELETE /users/cities/<id>/
 *    GET    /users/governorates/  (pour dropdown)
 *
 * ============================================================================
 */

// ── Modal réutilisable ─────────────────────────────────────────────────────
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

// ── Pagination intelligente ────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <nav>
      <ul className="pagination justify-content-center mb-0">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            <i className="bi bi-chevron-left"></i>
          </button>
        </li>
        {visiblePages[0] > 1 && (
          <>
            <li className="page-item"><button className="page-link" onClick={() => onPageChange(1)}>1</button></li>
            {visiblePages[0] > 2 && <li className="page-item disabled"><span className="page-link">...</span></li>}
          </>
        )}
        {visiblePages.map((p) => (
          <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(p)}>{p}</button>
          </li>
        ))}
        {visiblePages[visiblePages.length - 1] < totalPages && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
              <li className="page-item disabled"><span className="page-link">...</span></li>
            )}
            <li className="page-item"><button className="page-link" onClick={() => onPageChange(totalPages)}>{totalPages}</button></li>
          </>
        )}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            <i className="bi bi-chevron-right"></i>
          </button>
        </li>
      </ul>
    </nav>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
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

  // Auto-dismiss
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  // Reset page si filtres changent
  useEffect(() => { setCurrentPage(1); }, [search, filterGovernorate, ordering]);

  // ── Fetch governorates (dropdown) ──────────────────────────────
  const fetchGovernorates = useCallback(async () => {
    try {
      const { data } = await api.get('/users/governorates/', { params: { ordering: 'name', page_size: 1000 } });
      setGovernorates(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('[Cities] Erreur fetch governorates:', err);
    }
  }, []);

  useEffect(() => { fetchGovernorates(); }, [fetchGovernorates]);

  // ── Fetch villes (paginé serveur) ─────────────────────────────
  const fetchCities = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (filterGovernorate) params.governorate = filterGovernorate;
      if (ordering) params.ordering = ordering;

      const { data } = await api.get('/users/cities/', { params });

      if (data.results) {
        setCities(data.results);
        setTotalCount(data.count);
        setTotalPages(Math.ceil(data.count / pageSize));
      } else {
        setCities(data);
        setTotalCount(data.length);
        setTotalPages(1);
      }
    } catch (err) {
      setMessage("Erreur lors du chargement des villes.");
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  }, [search, filterGovernorate, ordering, currentPage, pageSize]);

  useEffect(() => { fetchCities(); }, [fetchCities]);

  // ── CRUD Handlers ──────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingCity(null);
    setFormName('');
    setFormGovernorate('');
    setFormPostalCode('');
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (city) => {
    setEditingCity(city);
    setFormName(city.name);
    setFormGovernorate(city.governorate || '');
    setFormPostalCode(city.postal_code || '');
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    const payload = {
      name: formName.trim(),
      governorate: parseInt(formGovernorate) || null,
      postal_code: formPostalCode.trim() || null,
    };

    try {
      if (editingCity) {
        await api.patch(`/users/cities/${editingCity.id}/`, payload);
        setMessage(`Ville "${payload.name}" modifiée avec succès.`);
      } else {
        await api.post('/users/cities/', payload);
        setMessage(`Ville "${payload.name}" créée avec succès.`);
      }
      setMessageType('success');
      setShowModal(false);
      fetchCities();
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object' && errors !== null) {
        setFormErrors(errors);
        if (errors.detail) {
          setMessage(errors.detail);
          setMessageType('danger');
        } else {
          setMessage('Vérifiez les champs en erreur.');
          setMessageType('danger');
        }
      } else {
        setMessage("Erreur lors de l'enregistrement.");
        setMessageType('danger');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (city) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la ville "${city.name}" ?`)) return;
    try {
      await api.delete(`/users/cities/${city.id}/`);
      setMessage(`Ville "${city.name}" supprimée.`);
      setMessageType('success');
      fetchCities();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setMessage(detail || "Erreur lors de la suppression.");
      setMessageType('danger');
    }
  };

  const handleOrderToggle = (field) => {
    setOrdering((prev) => (prev === field ? `-${field}` : field));
  };

  const SortIcon = ({ field }) => {
    if (ordering === field) return ' ▲';
    if (ordering === `-${field}`) return ' ▼';
    return ' ↕';
  };

  const getGovernorateName = (govId) => {
    const gov = governorates.find((g) => g.id === govId);
    return gov ? gov.name : '—';
  };

  const orderLabel = ({
    name: 'Nom A-Z', '-name': 'Nom Z-A',
    postal_code: 'Code postal ↑', '-postal_code': 'Code postal ↓',
    'governorate__name': 'Gouvernorat A-Z', '-governorate__name': 'Gouvernorat Z-A',
  })[ordering] || 'Nom A-Z';

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="container-fluid py-4">
      {/* En-tête */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Gestion des Villes</h2>
          <p className="text-muted mb-0">
            {totalCount} ville{totalCount > 1 ? 's' : ''} au total
            {filterGovernorate && (
              <span className="ms-2">
                — Filtré par : <strong>{getGovernorateName(parseInt(filterGovernorate))}</strong>
                <button className="btn btn-sm btn-link text-danger p-0 ms-1" onClick={() => setFilterGovernorate('')}>
                  <i className="bi bi-x-circle"></i> Réinitialiser
                </button>
              </span>
            )}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <i className="bi bi-plus-lg me-1"></i> Ajouter une ville
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      {/* Recherche + Filtres */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                <input
                  type="text" className="form-control"
                  placeholder="Rechercher par nom, code postal..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-4">
              <select className="form-select" value={filterGovernorate} onChange={(e) => setFilterGovernorate(e.target.value)}>
                <option value="">Tous les gouvernorats</option>
                {governorates.map((gov) => (
                  <option key={gov.id} value={gov.id}>{gov.name} ({gov.code})</option>
                ))}
              </select>
            </div>
            <div className="col-md-3 text-md-end">
              <small className="text-muted">Tri : {orderLabel}</small>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
              <p className="mt-2 text-muted">Chargement des villes...</p>
            </div>
          ) : cities.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-geo-alt display-1 text-muted"></i>
              <p className="mt-2 text-muted">
                {search || filterGovernorate
                  ? 'Aucune ville trouvée pour ces critères.'
                  : 'Aucune ville enregistrée.'}
              </p>
              {!search && !filterGovernorate && (
                <button className="btn btn-primary mt-2" onClick={openCreateModal}>
                  Créer la première ville
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3" style={{ width: '60px' }}>#</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleOrderToggle('name')}>
                        Nom <SortIcon field="name" />
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleOrderToggle('governorate__name')}>
                        Gouvernorat <SortIcon field="governorate__name" />
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleOrderToggle('postal_code')}>
                        Code postal <SortIcon field="postal_code" />
                      </th>
                      <th style={{ width: '200px' }} className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cities.map((city, index) => (
                      <tr key={city.id}>
                        <td className="ps-3 text-muted">{(currentPage - 1) * pageSize + index + 1}</td>
                        <td className="fw-semibold">{city.name}</td>
                        <td>
                          {city.governorate_name ? (
                            <span className="badge bg-info text-dark">
                              {city.governorate_name}
                              {city.governorate_code && (
                                <small className="ms-1 opacity-75">({city.governorate_code})</small>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {city.postal_code
                            ? <span className="badge bg-secondary">{city.postal_code}</span>
                            : <span className="text-muted">—</span>
                          }
                        </td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => openEditModal(city)} title="Modifier">
                              <i className="bi bi-pencil"></i> Modifier
                            </button>
                            <button className="btn btn-outline-danger" onClick={() => handleDelete(city)} title="Supprimer">
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="card-footer bg-white border-top">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                    <small className="text-muted">
                      {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} sur {totalCount}
                    </small>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── MODAL Créer / Modifier ──────────────────────────────── */}
      <Modal
        show={showModal}
        title={editingCity ? 'Modifier la ville' : 'Nouvelle ville'}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        submitLabel={submitting ? 'Enregistrement...' : (editingCity ? 'Mettre à jour' : 'Créer')}
        submitDisabled={submitting || !formName.trim() || !formGovernorate}
        submitVariant={editingCity ? 'btn-warning' : 'btn-success'}
      >
        {/* Nom */}
        <div className="mb-3">
          <label className="form-label fw-semibold">Nom de la ville <span className="text-danger">*</span></label>
          <input
            type="text"
            className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
            placeholder="Ex: Tunis, Sfax, Sousse..."
            value={formName} onChange={(e) => setFormName(e.target.value)}
            autoFocus
          />
          {formErrors.name && (
            <div className="invalid-feedback">
              {Array.isArray(formErrors.name) ? formErrors.name[0] : formErrors.name}
            </div>
          )}
          <div className="form-text">Nom unique par gouvernorat (minimum 2 caractères)</div>
        </div>

        {/* Gouvernorat */}
        <div className="mb-3">
          <label className="form-label fw-semibold">Gouvernorat <span className="text-danger">*</span></label>
          <select
            className={`form-select ${formErrors.governorate ? 'is-invalid' : ''}`}
            value={formGovernorate} onChange={(e) => setFormGovernorate(e.target.value)}
          >
            <option value="">— Sélectionner un gouvernorat —</option>
            {governorates.map((gov) => (
              <option key={gov.id} value={gov.id}>{gov.name} ({gov.code})</option>
            ))}
          </select>
          {formErrors.governorate && (
            <div className="invalid-feedback">
              {Array.isArray(formErrors.governorate) ? formErrors.governorate[0] : formErrors.governorate}
            </div>
          )}
        </div>

        {/* Code postal */}
        <div className="mb-3">
          <label className="form-label fw-semibold">Code postal</label>
          <input
            type="text"
            className={`form-control ${formErrors.postal_code ? 'is-invalid' : ''}`}
            placeholder="Ex: 1000, 3000..."
            value={formPostalCode} onChange={(e) => setFormPostalCode(e.target.value)}
            maxLength={10}
          />
          {formErrors.postal_code && (
            <div className="invalid-feedback">
              {Array.isArray(formErrors.postal_code) ? formErrors.postal_code[0] : formErrors.postal_code}
            </div>
          )}
          <div className="form-text">Chiffres uniquement, optionnel (max 10 caractères)</div>
        </div>

        {/* Erreurs globales */}
        {formErrors.detail && <div className="alert alert-danger">{formErrors.detail}</div>}
        {formErrors.non_field_errors && (
          <div className="alert alert-danger">
            {Array.isArray(formErrors.non_field_errors) ? formErrors.non_field_errors.join(' | ') : formErrors.non_field_errors}
          </div>
        )}
      </Modal>
    </div>
  );
}
