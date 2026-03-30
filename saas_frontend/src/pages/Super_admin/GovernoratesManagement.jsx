import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

/**
 * ============================================================================
 *  GovernoratesManagement.jsx — CRUD COMPLET (Super Admin)
 * ============================================================================
 *
 *  Fonctionnalités :
 *    ✅ Lister tous les gouvernorats (tableau + recherche)
 *    ✅ Créer un gouvernorat (modal)
 *    ✅ Modifier un gouvernorat (modal pré-rempli)
 *    ✅ Supprimer un gouvernorat (confirmation)
 *    ✅ Rechercher par nom ou code
 *    ✅ Tri par nom/code
 *    ✅ Pagination côté frontend
 *    ✅ Gestion d'erreurs détaillée
 *    ✅ Protection suppression si villes liées
 *
 *  Endpoint backend :
 *    GET    /users/governorates/           → Liste
 *    POST   /users/governorates/           → Créer
 *    GET    /users/governorates/<id>/      → Détail
 *    PATCH  /users/governorates/<id>/      → Modifier
 *    DELETE /users/governorates/<id>/      → Supprimer
 *    Query : ?search=tunis&ordering=name
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

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <nav>
      <ul className="pagination justify-content-center">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Précédent
          </button>
        </li>
        {pages.map((p) => (
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
export default function GovernoratesManagement() {
  // ── États données ──────────────────────────────────────────────
  const [governorates, setGovernorates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── Modal ──────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingGov, setEditingGov] = useState(null); // null = créer, objet = modifier
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── Message global ─────────────────────────────────────────────
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // ── Auto-dismiss message ───────────────────────────────────────
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  // ── Reset page quand la recherche change ───────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [search, ordering]);

  // =================================================================
  //  FETCH : Liste des gouvernorats
  // =================================================================
  const fetchGovernorates = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (ordering) params.ordering = ordering;

      const { data } = await api.get('/users/governorates/', { params });
      setGovernorates(data);
    } catch (err) {
      setMessage("Erreur lors du chargement des gouvernorats.");
      setMessageType('danger');
      console.error('[Governorates] Erreur fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [search, ordering]);

  useEffect(() => {
    fetchGovernorates();
  }, [fetchGovernorates]);

  // ── Données paginées ───────────────────────────────────────────
  const totalPages = Math.ceil(governorates.length / itemsPerPage);
  const paginatedData = governorates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // =================================================================
  //  CRUD HANDLERS
  // =================================================================

  // ── Ouvrir modal pour CRÉER ────────────────────────────────────
  const openCreateModal = () => {
    setEditingGov(null);
    setFormName('');
    setFormCode('');
    setFormErrors({});
    setShowModal(true);
  };

  // ── Ouvrir modal pour MODIFIER ─────────────────────────────────
  const openEditModal = (gov) => {
    setEditingGov(gov);
    setFormName(gov.name);
    setFormCode(gov.code);
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
    };

    try {
      if (editingGov) {
        // ── PATCH : Modifier ─────────────────────────────────────
        await api.patch(`/users/governorates/${editingGov.id}/`, payload);
        setMessage(`Gouvernorat "${payload.name}" modifié avec succès.`);
      } else {
        // ── POST : Créer ─────────────────────────────────────────
        await api.post('/users/governorates/', payload);
        setMessage(`Gouvernorat "${payload.name}" créé avec succès.`);
      }
      setMessageType('success');
      setShowModal(false);
      fetchGovernorates();
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object' && errors !== null) {
        setFormErrors(errors);
        // Message global si détail présent
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
      console.error('[Governorates] Erreur submit:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── SUPPRIMER ──────────────────────────────────────────────────
  const handleDelete = async (gov) => {
    if (!window.confirm(
      `Êtes-vous sûr de vouloir supprimer le gouvernorat "${gov.name}" (${gov.code}) ?`
    )) return;

    try {
      await api.delete(`/users/governorates/${gov.id}/`);
      setMessage(`Gouvernorat "${gov.name}" supprimé.`);
      setMessageType('success');
      fetchGovernorates();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail) {
        setMessage(detail); // Ex: "Impossible de supprimer : 5 villes rattachées"
      } else {
        setMessage("Erreur lors de la suppression.");
      }
      setMessageType('danger');
      console.error('[Governorates] Erreur delete:', err);
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

  // =================================================================
  //  RENDER
  // =================================================================
  return (
    <div className="container-fluid py-4">
      {/* ── EN-TÊTE ─────────────────────────────────────────────── */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Gestion des Gouvernorats</h2>
          <p className="text-muted mb-0">
            {governorates.length} gouvernorat{governorates.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <i className="bi bi-plus-lg me-1"></i>
          Ajouter un gouvernorat
        </button>
      </div>

      {/* ── MESSAGE ──────────────────────────────────────────────── */}
      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      {/* ── BARRE DE RECHERCHE ───────────────────────────────────── */}
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
                  placeholder="Rechercher par nom ou code..."
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
              <small className="text-muted">
                Tri : {ordering === 'name' ? 'Nom A-Z' : ordering === '-name' ? 'Nom Z-A' : ordering === 'code' ? 'Code A-Z' : ordering === '-code' ? 'Code Z-A' : 'ID'}
              </small>
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
              <p className="mt-2 text-muted">Chargement des gouvernorats...</p>
            </div>
          ) : governorates.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox display-1 text-muted"></i>
              <p className="mt-2 text-muted">
                {search
                  ? `Aucun gouvernorat trouvé pour "${search}"`
                  : 'Aucun gouvernorat enregistré.'}
              </p>
              {!search && (
                <button className="btn btn-primary mt-2" onClick={openCreateModal}>
                  Créer le premier gouvernorat
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
                        className="cursor-pointer user-select-none"
                        onClick={() => handleOrderToggle('name')}
                        style={{ cursor: 'pointer' }}
                      >
                        Nom <SortIcon field="name" />
                      </th>
                      <th
                        className="cursor-pointer user-select-none"
                        onClick={() => handleOrderToggle('code')}
                        style={{ cursor: 'pointer' }}
                      >
                        Code <SortIcon field="code" />
                      </th>
                      <th style={{ width: '180px' }} className="text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((gov, index) => (
                      <tr key={gov.id}>
                        <td className="ps-3 text-muted">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="fw-semibold">{gov.name}</td>
                        <td>
                          <span className="badge bg-secondary">{gov.code}</span>
                        </td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => openEditModal(gov)}
                              title="Modifier"
                            >
                              <i className="bi bi-pencil"></i> Modifier
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDelete(gov)}
                              title="Supprimer"
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
              <div className="card-footer bg-white border-top">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                  <small className="text-muted">
                    Affichage {(currentPage - 1) * itemsPerPage + 1}
                    –{Math.min(currentPage * itemsPerPage, governorates.length)}
                    sur {governorates.length}
                  </small>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============================================================
          MODAL : Créer / Modifier un gouvernorat
          ============================================================ */}
      <Modal
        show={showModal}
        title={editingGov ? 'Modifier le gouvernorat' : 'Nouveau gouvernorat'}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        submitLabel={submitting ? 'Enregistrement...' : (editingGov ? 'Mettre à jour' : 'Créer')}
        submitDisabled={submitting}
        submitVariant={editingGov ? 'btn-warning' : 'btn-success'}
      >
        {/* Nom */}
        <div className="mb-3">
          <label className="form-label fw-semibold">
            Nom du gouvernorat <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
            placeholder="Ex: Tunis, Sfax, Sousse..."
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
            Nom unique du gouvernorat (minimum 2 caractères)
          </div>
        </div>

        {/* Code */}
        <div className="mb-3">
          <label className="form-label fw-semibold">
            Code <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${formErrors.code ? 'is-invalid' : ''}`}
            placeholder="Ex: TN-01, SF, SO..."
            value={formCode}
            onChange={(e) => setFormCode(e.target.value.toUpperCase())}
            maxLength={10}
            style={{ textTransform: 'uppercase' }}
          />
          {formErrors.code && (
            <div className="invalid-feedback">
              {Array.isArray(formErrors.code) ? formErrors.code[0] : formErrors.code}
            </div>
          )}
          <div className="form-text">
            Code unique, max 10 caractères (converti automatiquement en majuscules)
          </div>
        </div>

        {/* Erreur globale (ex: détail du serveur) */}
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
