import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ── Modal ──────────────────────────────────────────────────────────────
function Modal({ show, title, onClose, children, onSubmit, submitLabel, submitDisabled, submitVariant, size }) {
  if (!show) return null;
  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className={`modal-dialog modal-dialog-centered ${size || 'modal-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-content shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title"><i className="bi bi-person-badge me-2"></i>{title}</h5>
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

// ── FormField ───────────────────────────────────────────────────────────
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

// ── Password Display Modal ─────────────────────────────────────────────
function PasswordModal({ show, onClose, data }) {
  if (!show || !data) return null;
  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content shadow-lg border-warning">
          <div className="modal-header bg-warning text-dark">
            <h5 className="modal-title"><i className="bi bi-key me-2"></i>Compte créé avec succès</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>Important :</strong> Transmettez ces identifiants au secrétaire. Ce mot de passe ne sera plus affiché.
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Nom d'utilisateur</label>
              <div className="input-group">
                <input type="text" className="form-control" value={data.username || ''} readOnly />
                <button className="btn btn-outline-secondary" type="button" onClick={() => navigator.clipboard.writeText(data.username)}>
                  <i className="bi bi-clipboard"></i>
                </button>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Mot de passe temporaire</label>
              <div className="input-group">
                <input type="text" className="form-control font-monospace" value={data.generated_password || ''} readOnly id="generated_pwd" />
                <button className="btn btn-outline-secondary" type="button" onClick={() => {
                  navigator.clipboard.writeText(data.generated_password);
                }}>
                  <i className="bi bi-clipboard"></i>
                </button>
              </div>
              <div className="form-text">Le secrétaire devra le changer à la première connexion.</div>
            </div>
            <div className="text-muted small">
              <strong>Email :</strong> {data.email}<br />
              <strong>Nom :</strong> {data.full_name}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-warning" onClick={onClose}>
              <i className="bi bi-check-lg me-1"></i> J'ai noté les identifiants
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ─────────────────────────────────────────────────
export default function DoctorSecretaries() {
  // ── State ──────────────────────────────────────────────────────
  const [secretaries, setSecretaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Dropdowns
  const [availableSecretaries, setAvailableSecretaries] = useState([]);
  const [myCabinets, setMyCabinets] = useState([]);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [createdData, setCreatedData] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({ first_name: '', last_name: '', email: '', phone_number: '', cabinet: '' });
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', phone_number: '' });
  const [assignForm, setAssignForm] = useState({ secretary: '', cabinet: '' });
  const [editTarget, setEditTarget] = useState(null);

  // Errors / submitting
  const [createErrors, setCreateErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [assignErrors, setAssignErrors] = useState({});
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Auto-dismiss messages
  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(t); }, [message]);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchSecretaries = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/cabinets/my-secretaries/');
      setSecretaries(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage("Erreur lors du chargement des secrétaires.");
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch dropdowns — INDEPENDENT (not Promise.all)
  const fetchAvailable = useCallback(async () => {
    try {
      const { data } = await api.get('/cabinets/my-secretaries/available/');
      setAvailableSecretaries(Array.isArray(data) ? data : []);
    } catch (err) {
      // Silently fail — dropdown just stays empty
    }
  }, []);

  const fetchCabinets = useCallback(async () => {
    try {
      const { data } = await api.get('/cabinets/my-secretaries/my_cabinets/');
      setMyCabinets(Array.isArray(data) ? data : []);
    } catch (err) {
      // Silently fail
    }
  }, []);

  useEffect(() => { fetchSecretaries(); fetchAvailable(); fetchCabinets(); }, [fetchSecretaries, fetchAvailable, fetchCabinets]);

  // ── Handlers: CREATE ──────────────────────────────────────────
  const openCreateModal = () => {
    setCreateForm({ first_name: '', last_name: '', email: '', phone_number: '', cabinet: '' });
    setCreateErrors({});
    setCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateErrors({});
    try {
      const payload = {
        first_name: createForm.first_name,
        last_name: createForm.last_name,
        email: createForm.email,
        phone_number: createForm.phone_number || null,
      };
      if (createForm.cabinet) {
        payload.cabinet = parseInt(createForm.cabinet);
      }
      const { data } = await api.post('/cabinets/my-secretaries/', payload);
      setCreateModal(false);
      setCreatedData(data);
      setPasswordModal(true);
      setMessage('Secrétaire créé avec succès.');
      setMessageType('success');
      fetchSecretaries();
      fetchAvailable(); // Refresh available list
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object' && errors !== null) {
        setCreateErrors(errors);
        setMessage(errors.detail || errors.non_field_errors?.join(' | ') || 'Vérifiez les champs.');
      } else {
        setMessage("Erreur lors de la création.");
      }
      setMessageType('danger');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ── Handlers: EDIT ────────────────────────────────────────────
  const openEditModal = (sec) => {
    setEditTarget(sec);
    setEditForm({
      first_name: sec.first_name || '',
      last_name: sec.last_name || '',
      email: sec.email || '',
      phone_number: sec.phone_number || '',
    });
    setEditErrors({});
    setEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSubmitting(true);
    setEditErrors({});
    try {
      await api.patch(`/cabinets/my-secretaries/${editTarget.id}/`, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone_number: editForm.phone_number || null,
      });
      setEditModal(false);
      setMessage('Informations du secrétaire mises à jour.');
      setMessageType('success');
      fetchSecretaries();
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object' && errors !== null) {
        setEditErrors(errors);
        setMessage(errors.detail || 'Vérifiez les champs.');
      } else {
        setMessage("Erreur lors de la modification.");
      }
      setMessageType('danger');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Handlers: ASSIGN ──────────────────────────────────────────
  const openAssignModal = () => {
    setAssignForm({ secretary: '', cabinet: '' });
    setAssignErrors({});
    setAssignModal(true);
    // Refresh available list
    fetchAvailable();
    fetchCabinets();
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.secretary || !assignForm.cabinet) {
      setAssignErrors({ detail: 'Sélectionnez un secrétaire et un cabinet.' });
      return;
    }
    setAssignSubmitting(true);
    setAssignErrors({});
    try {
      await api.post('/cabinets/my-secretaries/assign/', {
        secretary: parseInt(assignForm.secretary),
        cabinet: parseInt(assignForm.cabinet),
      });
      setAssignModal(false);
      setMessage('Secrétaire assigné au cabinet.');
      setMessageType('success');
      fetchSecretaries();
      fetchAvailable();
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object' && errors !== null) {
        setAssignErrors(errors);
        setMessage(errors.detail || 'Erreur lors de l\'assignation.');
      } else {
        setMessage("Erreur lors de l'assignation.");
      }
      setMessageType('danger');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // ── Handlers: UNASSIGN ────────────────────────────────────────
  const handleUnassign = async (sec, cabinetId, cabinetName) => {
    if (!window.confirm(`Retirer ${sec.full_name} du cabinet "${cabinetName}" ?`)) return;
    try {
      await api.post('/cabinets/my-secretaries/unassign/', {
        secretary: sec.id,
        cabinet: cabinetId,
      });
      setMessage(`${sec.full_name} retiré(e) du cabinet "${cabinetName}".`);
      setMessageType('success');
      fetchSecretaries();
      fetchAvailable();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Erreur lors du retrait.');
      setMessageType('danger');
    }
  };

  // ── Handlers: REMOVE (from ALL cabinets) ──────────────────────
  const handleRemove = async (sec) => {
    const cabinetNames = (sec.cabinets_assigned || []).map(c => c.name).join(', ');
    if (!window.confirm(`Retirer ${sec.full_name} de TOUS vos cabinets ?\n\nCabinets : ${cabinetNames}\n\nLe compte ne sera pas supprimé.`)) return;
    try {
      await api.delete(`/cabinets/my-secretaries/${sec.id}/`);
      setMessage(`${sec.full_name} retiré(e) de tous vos cabinets.`);
      setMessageType('success');
      fetchSecretaries();
      fetchAvailable();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Erreur lors du retrait.');
      setMessageType('danger');
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="container-fluid py-4">
      {/* En-tête */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">
            <i className="bi bi-people-fill me-2 text-primary"></i>
            Mes Secrétaires
          </h2>
          <p className="text-muted mb-0">Gérez les secrétaires assignés à vos cabinets</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info btn-sm" onClick={openAssignModal} disabled={availableSecretaries.length === 0}>
            <i className="bi bi-person-plus me-1"></i> Assigner un secrétaire
          </button>
          <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
            <i className="bi bi-plus-lg me-1"></i> Nouveau secrétaire
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      {/* Tableau principal */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <p className="mt-2 text-muted">Chargement...</p>
            </div>
          ) : secretaries.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-person-workspace display-1 text-muted"></i>
              <p className="mt-3 text-muted fw-semibold">Aucun secrétaire assigné</p>
              <p className="text-muted small">Créez un nouveau secrétaire ou assignez-en un existant à vos cabinets.</p>
              <div className="d-flex gap-2 justify-content-center mt-3">
                <button className="btn btn-outline-info btn-sm" onClick={openAssignModal}>
                  <i className="bi bi-person-plus me-1"></i> Assigner un secrétaire
                </button>
                <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
                  <i className="bi bi-plus-lg me-1"></i> Nouveau secrétaire
                </button>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3" style={{ width: '50px' }}>#</th>
                    <th>Secrétaire</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Cabinets</th>
                    <th className="text-center">Statut</th>
                    <th style={{ width: '180px' }} className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {secretaries.map((sec, idx) => (
                    <tr key={sec.id}>
                      <td className="ps-3 text-muted">{idx + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                            <i className="bi bi-person-fill text-primary"></i>
                          </div>
                          <div>
                            <div className="fw-semibold">{sec.full_name}</div>
                            {sec.is_verified && (
                              <small className="text-success"><i className="bi bi-patch-check-fill me-1"></i>Vérifié</small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <a href={`mailto:${sec.email}`} className="text-decoration-none">{sec.email}</a>
                      </td>
                      <td>
                        {sec.phone_number ? (
                          <span>{sec.phone_number}</span>
                        ) : (
                          <span className="text-muted fst-italic">Non renseigné</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {(sec.cabinets_assigned || []).map(cab => (
                            <span key={cab.id} className="badge bg-info text-dark d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                              <i className="bi bi-hospital"></i>
                              {cab.name}
                              <button
                                type="button"
                                className="btn-close btn-close-white p-0 ms-1"
                                style={{ fontSize: '0.55rem', lineHeight: 1 }}
                                onClick={() => handleUnassign(sec, cab.id, cab.name)}
                                title={`Retirer du cabinet ${cab.name}`}
                              />
                            </span>
                          ))}
                          {(sec.cabinets_assigned || []).length === 0 && (
                            <span className="text-muted fst-italic small">Aucun cabinet</span>
                          )}
                        </div>
                      </td>
                      <td className="text-center">
                        <span className={`badge ${sec.is_active ? 'bg-success' : 'bg-secondary'}`}>
                          {sec.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-primary" onClick={() => openEditModal(sec)} title="Modifier">
                            <i className="bi bi-pencil"></i>
                          </button>
                          {myCabinets.length > 0 && (sec.cabinets_assigned || []).length < myCabinets.length && (
                            <button className="btn btn-outline-info" onClick={() => {
                              // Open assign modal pre-filled with this secretary
                              setAssignForm({ secretary: String(sec.id), cabinet: '' });
                              setAssignErrors({});
                              setAssignModal(true);
                              fetchCabinets();
                            }} title="Assigner à un autre cabinet">
                              <i className="bi bi-hospital"></i>
                            </button>
                          )}
                          <button className="btn btn-outline-danger" onClick={() => handleRemove(sec)} title="Retirer de tous les cabinets">
                            <i className="bi bi-x-circle"></i>
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
        {secretaries.length > 0 && (
          <div className="card-footer bg-white text-muted small">
            <i className="bi bi-info-circle me-1"></i>
            {secretaries.length} secrétaire(s) assigné(s) • Cliquez sur <strong>&times;</strong> sur un badge cabinet pour retirer le secrétaire de ce cabinet
          </div>
        )}
      </div>

      {/* ==================== MODAL CRÉATION ==================== */}
      <Modal
        show={createModal}
        title="Créer un nouveau secrétaire"
        onClose={() => setCreateModal(false)}
        onSubmit={handleCreateSubmit}
        submitLabel={createSubmitting ? 'Création...' : 'Créer le compte'}
        submitDisabled={createSubmitting}
        submitVariant="btn-primary"
      >
        <div className="alert alert-info small">
          <i className="bi bi-info-circle me-1"></i>
          Un compte sera créé avec un mot de passe temporaire que vous pourrez transmettre au secrétaire.
        </div>
        <div className="row g-3">
          <div className="col-md-6">
            <FormField label="Prénom" required error={createErrors.first_name}>
              <input type="text" className={`form-control ${createErrors.first_name ? 'is-invalid' : ''}`}
                value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                placeholder="Ex: Fatima" />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Nom" required error={createErrors.last_name}>
              <input type="text" className={`form-control ${createErrors.last_name ? 'is-invalid' : ''}`}
                value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                placeholder="Ex: Ben Ali" />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Email" required error={createErrors.email}
              helpText="Sera utilisé comme identifiant de connexion">
              <input type="email" className={`form-control ${createErrors.email ? 'is-invalid' : ''}`}
                value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="Ex: fatima@example.com" />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Téléphone" error={createErrors.phone_number}>
              <input type="tel" className={`form-control ${createErrors.phone_number ? 'is-invalid' : ''}`}
                value={createForm.phone_number} onChange={(e) => setCreateForm({ ...createForm, phone_number: e.target.value })}
                placeholder="Ex: +216 22 333 444" />
            </FormField>
          </div>
          <div className="col-12">
            <FormField label="Assigner à un cabinet" error={createErrors.cabinet}
              helpText="Optionnel — vous pourrez l'assigner plus tard">
              <select className={`form-select ${createErrors.cabinet ? 'is-invalid' : ''}`}
                value={createForm.cabinet} onChange={(e) => setCreateForm({ ...createForm, cabinet: e.target.value })}>
                <option value="">— Aucun cabinet —</option>
                {myCabinets.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.is_active ? '' : '(inactif)'}</option>
                ))}
              </select>
            </FormField>
          </div>
        </div>
        {createErrors.non_field_errors && (
          <div className="alert alert-danger mt-2">
            {Array.isArray(createErrors.non_field_errors) ? createErrors.non_field_errors.join(' | ') : createErrors.non_field_errors}
          </div>
        )}
      </Modal>

      {/* ==================== MODAL MODIFICATION ==================== */}
      <Modal
        show={editModal}
        title="Modifier le secrétaire"
        onClose={() => setEditModal(false)}
        onSubmit={handleEditSubmit}
        submitLabel={editSubmitting ? 'Enregistrement...' : 'Mettre à jour'}
        submitDisabled={editSubmitting}
        submitVariant="btn-warning"
        size="modal-md"
      >
        <div className="row g-3">
          <div className="col-12">
            <FormField label="Prénom" required error={editErrors.first_name}>
              <input type="text" className={`form-control ${editErrors.first_name ? 'is-invalid' : ''}`}
                value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
            </FormField>
          </div>
          <div className="col-12">
            <FormField label="Nom" required error={editErrors.last_name}>
              <input type="text" className={`form-control ${editErrors.last_name ? 'is-invalid' : ''}`}
                value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
            </FormField>
          </div>
          <div className="col-12">
            <FormField label="Email" required error={editErrors.email}>
              <input type="email" className={`form-control ${editErrors.email ? 'is-invalid' : ''}`}
                value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </FormField>
          </div>
          <div className="col-12">
            <FormField label="Téléphone" error={editErrors.phone_number}>
              <input type="tel" className={`form-control ${editErrors.phone_number ? 'is-invalid' : ''}`}
                value={editForm.phone_number} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} />
            </FormField>
          </div>
        </div>
        {editErrors.non_field_errors && (
          <div className="alert alert-danger mt-2">
            {Array.isArray(editErrors.non_field_errors) ? editErrors.non_field_errors.join(' | ') : editErrors.non_field_errors}
          </div>
        )}
      </Modal>

      {/* ==================== MODAL ASSIGNATION ==================== */}
      <Modal
        show={assignModal}
        title="Assigner un secrétaire à un cabinet"
        onClose={() => setAssignModal(false)}
        onSubmit={handleAssignSubmit}
        submitLabel={assignSubmitting ? 'Assignation...' : 'Assigner'}
        submitDisabled={assignSubmitting || !assignForm.secretary || !assignForm.cabinet}
        submitVariant="btn-info"
        size="modal-md"
      >
        {availableSecretaries.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-person-check display-4 text-muted"></i>
            <p className="mt-2 text-muted">Tous les secrétaires existants sont déjà assignés à vos cabinets.</p>
            <button className="btn btn-primary btn-sm" onClick={() => { setAssignModal(false); openCreateModal(); }}>
              <i className="bi bi-plus-lg me-1"></i> Créer un nouveau secrétaire
            </button>
          </div>
        ) : (
          <div className="row g-3">
            <div className="col-12">
              <FormField label="Secrétaire" required error={assignErrors.secretary}>
                <select className={`form-select ${assignErrors.secretary ? 'is-invalid' : ''}`}
                  value={assignForm.secretary} onChange={(e) => setAssignForm({ ...assignForm, secretary: e.target.value })}>
                  <option value="">— Sélectionner un secrétaire —</option>
                  {availableSecretaries.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                  ))}
                </select>
              </FormField>
            </div>
            <div className="col-12">
              <FormField label="Cabinet" required error={assignErrors.cabinet}>
                <select className={`form-select ${assignErrors.cabinet ? 'is-invalid' : ''}`}
                  value={assignForm.cabinet} onChange={(e) => setAssignForm({ ...assignForm, cabinet: e.target.value })}>
                  <option value="">— Sélectionner un cabinet —</option>
                  {myCabinets.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>
        )}
        {assignErrors.detail && (
          <div className="alert alert-danger mt-2">{assignErrors.detail}</div>
        )}
      </Modal>

      {/* ==================== MODAL MOT DE PASSE ==================== */}
      <PasswordModal show={passwordModal} onClose={() => setPasswordModal(false)} data={createdData} />
    </div>
  );
}
