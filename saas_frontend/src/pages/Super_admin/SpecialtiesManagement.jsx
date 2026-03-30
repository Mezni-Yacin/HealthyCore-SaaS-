import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

/**
 * ============================================================================
 *  SpecialtiesManagement.jsx — CRUD COMPLET (Super Admin)
 * ============================================================================
 *
 *  Fonctionnalités :
 *    ✅ Lister toutes les spécialités médicales (tableau + recherche + tri + pagination)
 *    ✅ Créer une spécialité (modal)
 *    ✅ Modifier une spécialité (modal pré-rempli)
 *    ✅ Supprimer une spécialité (confirmation + protection si liée)
 *    ✅ Rechercher par nom ou code
 *    ✅ Tri par nom/code
 *    ✅ Pagination côté serveur
 *    ✅ Gestion d'erreurs détaillée
 *    ✅ Messages auto-dismiss (5s)
 *    ✅ Compteurs cabinets / médecins par spécialité
 *
 *  Endpoint backend (baseURL api.js = /api/) :
 *    GET    /users/specialties/           → Liste (paginée, recherche, tri)
 *    POST   /users/specialties/           → Créer
 *    GET    /users/specialties/<id>/      → Détail
 *    PATCH  /users/specialties/<id>/      → Modifier
 *    DELETE /users/specialties/<id>/      → Supprimer
 *    GET    /users/specialties/stats/     → Statistiques
 *
 *  Query params :
 *    ?search=cardio&ordering=name&page=1&page_size=15
 *
 * ============================================================================
 */

// ── Composant Modal réutilisable ───────────────────────────────────────────
function Modal({ show, title, onClose, children, onSubmit, submitLabel, submitDisabled, submitVariant }) {
  if (!show) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} />
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body">{children}</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Annuler
              </button>
              <button
                type="submit"
                className={`btn ${submitVariant || 'btn-primary'}`}
                disabled={submitDisabled}
              >
                {submitLabel || 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Pagination component ──────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start + 1 < 5) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <nav>
      <ul className="pagination justify-content-center mb-0">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Précédent
          </button>
        </li>
        {getVisiblePages().map((p) => (
          <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(p)}>
              {p}
            </button>
          </li>
        ))}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Suivant
          </button>
        </li>
      </ul>
    </nav>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export default function SpecialtiesManagement() {
  // ── États données ──────────────────────────────────────────────
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  // ── Modal ──────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingSpec, setEditingSpec] = useState(null); // null = créer, objet = modifier
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── Message global ─────────────────────────────────────────────
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // ── Auto-dismiss message (5s) ──────────────────────────────────
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  // ── Reset page quand la recherche ou le tri change ─────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [search, ordering]);

  // =================================================================
  //  FETCH : Liste des spécialités (paginée)
  // =================================================================
  const fetchSpecialties = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (ordering) params.ordering = ordering;

      const { data } = await api.get('/users/specialties/', { params });

      if (data.results) {
        setSpecialties(data.results);
        setTotalCount(data.count);
        setTotalPages(Math.ceil(data.count / pageSize));
      } else {
        // Pas de pagination côté serveur
        setSpecialties(data);
        setTotalCount(data.length);
        setTotalPages(1);
      }
    } catch (err) {
      setMessage("Erreur lors du chargement des spécialités.");
      setMessageType('danger');
      console.error('[Specialties] Erreur fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [search, ordering, currentPage, pageSize]);

  useEffect(() => {
    fetchSpecialties();
  }, [fetchSpecialties]);

  // =================================================================
  //  CRUD HANDLERS
  // =================================================================

  // ── Ouvrir modal pour CRÉER ────────────────────────────────────
  const openCreateModal = () => {
    setEditingSpec(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormErrors({});
    setShowModal(true);
  };

  // ── Ouvrir modal pour MODIFIER ─────────────────────────────────
  const openEditModal = (spec) => {
    setEditingSpec(spec);
    setFormName(spec.name);
    setFormCode(spec.code);
    setFormDescription(spec.description || '');
    setFormErrors({});
    setShowModal(true);
  };

  // ── SOUMETTRE (Créer ou Modifier) ─────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    const payload = {
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      description: formDescription.trim() || null,
    };

    try {
      if (editingSpec) {
        // ── PATCH : Modifier ─────────────────────────────────────
        await api.patch(`/users/specialties/${editingSpec.id}/`, payload);
        setMessage(`Spécialité "${payload.name}" modifiée avec succès.`);
      } else {
        // ── POST : Créer ─────────────────────────────────────────
        await api.post('/users/specialties/', payload);
        setMessage(`Spécialité "${payload.name}" créée avec succès.`);
      }
      setMessageType('success');
      setShowModal(false);
      fetchSpecialties();
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
      console.error('[Specialties] Erreur submit:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── SUPPRIMER ──────────────────────────────────────────────────
  const handleDelete = async (spec) => {
    if (!window.confirm(
      `Êtes-vous sûr de vouloir supprimer la spécialité "${spec.name}" (${spec.code}) ?`
    )) return;

    try {
      await api.delete(`/users/specialties/${spec.id}/`);
      setMessage(`Spécialité "${spec.name}" supprimée.`);
      setMessageType('success');
      fetchSpecialties();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail) {
        setMessage(detail); // Ex: "Impossible de supprimer : 3 cabinets liés"
      } else {
        setMessage("Erreur lors de la suppression.");
      }
      setMessageType('danger');
      console.error('[Specialties] Erreur delete:', err);
    }
  };

  // ── Toggle tri ─────────────────────────────────────────────────
  const handleOrderToggle = (field) => {
    setOrdering((prev) => (prev === field ? `-${field}` : field));
  };

  // ── Indicateur de tri ──────────────────────────────────────────
  const SortIcon = ({ field }) => {
    if (ordering === field) return ' ▲';
    if (ordering === `-${field}`) return ' ▼';
    return ' ↕';
  };

  // ── Label de tri ───────────────────────────────────────────────
  const getOrderLabel = () => ({
    'name': 'Nom A-Z', '-name': 'Nom Z-A',
    'code': 'Code A-Z', '-code': 'Code Z-A',
  })[ordering] || 'Nom A-Z';

  // =================================================================
  //  RENDER
  // =================================================================
  return (
    <div className="container-fluid py-4">
      {/* ── EN-TÊTE ─────────────────────────────────────────────── */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">
            <i className="bi bi-heart-pulse me-2 text-danger"></i>
            Gestion des Spécialités Médicales
          </h2>
          <p className="text-muted mb-0">
            {totalCount} spécialité{totalCount > 1 ? 's' : ''} au total
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <i className="bi bi-plus-lg me-1"></i>
          Ajouter une spécialité
        </button>
      </div>

      {/* ── MESSAGE ──────────────────────────────────────────────── */}
      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      {/* ── BARRE DE RECHERCHE + TRI ────────────────────────────── */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-8">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Rechercher par nom, code ou description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setSearch('')}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-4 text-md-end">
              <small className="text-muted">Tri : {getOrderLabel()}</small>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABLEAU ──────────────────────────────────────────────── */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
              <p className="mt-2 text-muted">Chargement des spécialités...</p>
            </div>
          ) : specialties.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-heart-pulse display-1 text-muted"></i>
              <p className="mt-2 text-muted">
                {search
                  ? `Aucune spécialité trouvée pour "${search}"`
                  : 'Aucune spécialité enregistrée.'}
              </p>
              {!search && (
                <button className="btn btn-primary mt-2" onClick={openCreateModal}>
                  Créer la première spécialité
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
                      <th
                        onClick={() => handleOrderToggle('name')}
                        style={{ cursor: 'pointer' }}
                      >
                        Nom <SortIcon field="name" />
                      </th>
                      <th
                        onClick={() => handleOrderToggle('code')}
                        style={{ cursor: 'pointer' }}
                      >
                        Code CNAM <SortIcon field="code" />
                      </th>
                      <th>Description</th>
                      <th className="text-center">Cabinets</th>
                      <th className="text-center">Médecins</th>
                      <th style={{ width: '180px' }} className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specialties.map((spec, index) => (
                      <tr key={spec.id}>
                        <td className="ps-3 text-muted">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="fw-semibold">{spec.name}</td>
                        <td>
                          <span className="badge bg-info text-dark">{spec.code}</span>
                        </td>
                        <td>
                          {spec.description ? (
                            <span
                              className="text-muted"
                              style={{
                                display: 'inline-block',
                                maxWidth: '200px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={spec.description}
                            >
                              {spec.description}
                            </span>
                          ) : (
                            <span className="text-muted fst-italic">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          {spec.cabinets_count > 0 ? (
                            <span className="badge bg-primary">{spec.cabinets_count}</span>
                          ) : (
                            <span className="text-muted">0</span>
                          )}
                        </td>
                        <td className="text-center">
                          {spec.doctors_count > 0 ? (
                            <span className="badge bg-success">{spec.doctors_count}</span>
                          ) : (
                            <span className="text-muted">0</span>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => openEditModal(spec)}
                              title="Modifier"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDelete(spec)}
                              title="Supprimer"
                              disabled={spec.cabinets_count > 0 || spec.doctors_count > 0}
                              style={
                                spec.cabinets_count > 0 || spec.doctors_count > 0
                                  ? { opacity: 0.4, cursor: 'not-allowed' }
                                  : {}
                              }
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ──────────────────────────────────────── */}
              {totalPages > 1 && (
                <div className="card-footer bg-white border-top">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                    <small className="text-muted">
                      Affichage {(currentPage - 1) * pageSize + 1}
                      –{Math.min(currentPage * pageSize, totalCount)}
                      sur {totalCount}
                    </small>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ============================================================
          MODAL : Créer / Modifier une spécialité
          ============================================================ */}
      <Modal
        show={showModal}
        title={editingSpec ? `Modifier : ${editingSpec.name}` : 'Nouvelle Spécialité Médicale'}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        submitLabel={submitting ? 'Enregistrement...' : (editingSpec ? 'Mettre à jour' : 'Créer la spécialité')}
        submitDisabled={submitting}
        submitVariant={editingSpec ? 'btn-warning' : 'btn-success'}
      >
        {/* Nom */}
        <div className="mb-3">
          <label className="form-label fw-semibold">
            Nom de la spécialité <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
            placeholder="Ex: Cardiologie, Dermatologie, Pédiatrie..."
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            autoFocus
          />
          {formErrors.name && (
            <div className="invalid-feedback">
              {Array.isArray(formErrors.name) ? formErrors.name[0] : formErrors.name}
            </div>
          )}
          <div className="form-text">
            Nom de la spécialité (minimum 2 caractères)
          </div>
        </div>

        {/* Code CNAM */}
        <div className="mb-3">
          <label className="form-label fw-semibold">
            Code CNAM <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${formErrors.code ? 'is-invalid' : ''}`}
            placeholder="Ex: CARDIO, DERMA, PEDIA..."
            value={formCode}
            onChange={(e) => setFormCode(e.target.value.toUpperCase())}
            maxLength={20}
            style={{ textTransform: 'uppercase' }}
          />
          {formErrors.code && (
            <div className="invalid-feedback">
              {Array.isArray(formErrors.code) ? formErrors.code[0] : formErrors.code}
            </div>
          )}
          <div className="form-text">
            Code CNAM unique (2–20 caractères, automatiquement en majuscules)
          </div>
        </div>

        {/* Description */}
        <div className="mb-3">
          <label className="form-label fw-semibold">
            Description
          </label>
          <textarea
            className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
            placeholder="Description de la spécialité (optionnel)..."
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            rows="3"
          />
          {formErrors.description && (
            <div className="invalid-feedback">
              {Array.isArray(formErrors.description) ? formErrors.description[0] : formErrors.description}
            </div>
          )}
          <div className="form-text">
            Description optionnelle de la spécialité
          </div>
        </div>

        {/* Avertissement si modification avec liens */}
        {editingSpec && (editingSpec.cabinets_count > 0 || editingSpec.doctors_count > 0) && (
          <div className="alert alert-warning">
            <i className="bi bi-exclamation-triangle me-1"></i>
            Cette spécialité est utilisée par {editingSpec.cabinets_count} cabinet(s)
            et {editingSpec.doctors_count} médecin(s).
          </div>
        )}

        {/* Erreur globale */}
        {formErrors.detail && (
          <div className="alert alert-danger">
            {formErrors.detail}
          </div>
        )}

        {/* Non-field errors */}
        {formErrors.non_field_errors && (
          <div className="alert alert-danger">
            {Array.isArray(formErrors.non_field_errors)
              ? formErrors.non_field_errors.join(' | ')
              : formErrors.non_field_errors}
          </div>
        )}
      </Modal>
    </div>
  );
}
