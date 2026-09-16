import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const cardStyle = { borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };

// ── Modal ──────────────────────────────────────────────────────────────
function Modal({ show, title, onClose, children, onSubmit, submitLabel, submitDisabled, submitVariant, size }) {
  if (!show) return null;
  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size || 'modal-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-content" style={{ borderRadius: '16px', border: 'none' }}>
          <div className={`modal-header text-white ${submitVariant === 'btn-warning' ? 'bg-warning' : submitVariant === 'btn-info' ? 'bg-info' : 'bg-primary'}`} style={{ borderRadius: '16px 16px 0 0' }}>
            <h5 className="modal-title fw-bold">{title}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={submitDisabled}></button>
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>{children}</div>
            <div className="modal-footer border-top-0 p-4">
              <button type="button" className="btn btn-light px-4 rounded-3" onClick={onClose} disabled={submitDisabled}>Annuler</button>
              <button type="submit" className={`btn ${submitVariant || 'btn-primary'} px-4 rounded-3`} disabled={submitDisabled}>
                {submitDisabled ? <span className="spinner-border spinner-border-sm me-1"></span> : null}
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
      <label className="form-label fw-semibold">{label} {required && <span className="text-danger">*</span>}</label>
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
        <div className="modal-content" style={{ borderRadius: '16px', border: 'none' }}>
          <div className="modal-header bg-success text-white" style={{ borderRadius: '16px 16px 0 0' }}>
            <h5 className="modal-title fw-bold"><i className="bi bi-key me-2"></i>Compte créé avec succès</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            <div className="alert alert-success bg-success-subtle text-success border-0 mb-4">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>Important :</strong> Transmettez ces identifiants au secrétaire. Ce mot de passe ne sera plus affiché.
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold text-muted small">Nom d'utilisateur</label>
              <div className="input-group">
                <input type="text" className="form-control bg-light" value={data.username || ''} readOnly />
                <button className="btn btn-outline-secondary" type="button" onClick={() => navigator.clipboard.writeText(data.username)} title="Copier">
                  <i className="bi bi-clipboard"></i>
                </button>
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label fw-semibold text-muted small">Mot de passe temporaire</label>
              <div className="input-group">
                <input type="text" className="form-control bg-light font-monospace" value={data.generated_password || ''} readOnly />
                <button className="btn btn-outline-secondary" type="button" onClick={() => navigator.clipboard.writeText(data.generated_password)} title="Copier">
                  <i className="bi bi-clipboard"></i>
                </button>
              </div>
              <div className="form-text mt-1">Le secrétaire devra le changer à la première connexion.</div>
            </div>
            <div className="text-muted small border-top pt-3">
              <p className="mb-1"><strong>Email :</strong> {data.email}</p>
              <p className="mb-0"><strong>Nom :</strong> {data.full_name}</p>
            </div>
          </div>
          <div className="modal-footer border-top-0 p-4">
            <button type="button" className="btn btn-success px-4 rounded-3" onClick={onClose}>
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
  const [secretaries, setSecretaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const [availableSecretaries, setAvailableSecretaries] = useState([]);
  const [myCabinets, setMyCabinets] = useState([]);

  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [createdData, setCreatedData] = useState(null);

  const [createForm, setCreateForm] = useState({ first_name: '', last_name: '', email: '', phone_number: '', cabinet: '' });
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', phone_number: '' });
  const [assignForm, setAssignForm] = useState({ secretary: '', cabinet: '' });
  const [editTarget, setEditTarget] = useState(null);

  const [createErrors, setCreateErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [assignErrors, setAssignErrors] = useState({});
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(t); }, [message]);

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

  const fetchAvailable = useCallback(async () => {
    try { const { data } = await api.get('/cabinets/my-secretaries/available/'); setAvailableSecretaries(Array.isArray(data) ? data : []); } catch {}
  }, []);

  const fetchCabinets = useCallback(async () => {
    try { const { data } = await api.get('/cabinets/my-secretaries/my_cabinets/'); setMyCabinets(Array.isArray(data) ? data : []); } catch {}
  }, []);

  useEffect(() => { fetchSecretaries(); fetchAvailable(); fetchCabinets(); }, [fetchSecretaries, fetchAvailable, fetchCabinets]);

  const openCreateModal = () => {
    setCreateForm({ first_name: '', last_name: '', email: '', phone_number: '', cabinet: '' });
    setCreateErrors({});
    setCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true); setCreateErrors({});
    try {
      const payload = { first_name: createForm.first_name, last_name: createForm.last_name, email: createForm.email, phone_number: createForm.phone_number || null };
      if (createForm.cabinet) payload.cabinet = parseInt(createForm.cabinet);
      const { data } = await api.post('/cabinets/my-secretaries/', payload);
      setCreateModal(false);
      setCreatedData(data);
      setPasswordModal(true);
      setMessage('Secrétaire créé avec succès.');
      setMessageType('success');
      fetchSecretaries(); fetchAvailable();
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object') { setCreateErrors(errors); setMessage(errors.detail || errors.non_field_errors?.join(' | ') || 'Vérifiez les champs.'); }
      else setMessage("Erreur lors de la création.");
      setMessageType('danger');
    } finally { setCreateSubmitting(false); }
  };

  const openEditModal = (sec) => {
    setEditTarget(sec);
    setEditForm({ first_name: sec.first_name || '', last_name: sec.last_name || '', email: sec.email || '', phone_number: sec.phone_number || '' });
    setEditErrors({});
    setEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSubmitting(true); setEditErrors({});
    try {
      await api.patch(`/cabinets/my-secretaries/${editTarget.id}/`, { ...editForm, phone_number: editForm.phone_number || null });
      setEditModal(false);
      setMessage('Informations du secrétaire mises à jour.');
      setMessageType('success');
      fetchSecretaries();
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object') { setEditErrors(errors); setMessage(errors.detail || 'Vérifiez les champs.'); }
      else setMessage("Erreur lors de la modification.");
      setMessageType('danger');
    } finally { setEditSubmitting(false); }
  };

  const openAssignModal = () => {
    setAssignForm({ secretary: '', cabinet: '' });
    setAssignErrors({});
    setAssignModal(true);
    fetchAvailable(); fetchCabinets();
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.secretary || !assignForm.cabinet) { setAssignErrors({ detail: 'Sélectionnez un secrétaire et un cabinet.' }); return; }
    setAssignSubmitting(true); setAssignErrors({});
    try {
      await api.post('/cabinets/my-secretaries/assign/', { secretary: parseInt(assignForm.secretary), cabinet: parseInt(assignForm.cabinet) });
      setAssignModal(false);
      setMessage('Secrétaire assigné au cabinet.');
      setMessageType('success');
      fetchSecretaries(); fetchAvailable();
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object') { setAssignErrors(errors); setMessage(errors.detail || "Erreur lors de l'assignation."); }
      else setMessage("Erreur lors de l'assignation.");
      setMessageType('danger');
    } finally { setAssignSubmitting(false); }
  };

  const handleUnassign = async (sec, cabinetId, cabinetName) => {
    if (!window.confirm(`Retirer ${sec.full_name} du cabinet "${cabinetName}" ?`)) return;
    try {
      await api.post('/cabinets/my-secretaries/unassign/', { secretary: sec.id, cabinet: cabinetId });
      setMessage(`${sec.full_name} retiré(e) du cabinet "${cabinetName}".`);
      setMessageType('success');
      fetchSecretaries(); fetchAvailable();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Erreur lors du retrait.');
      setMessageType('danger');
    }
  };

  const handleRemove = async (sec) => {
    const cabinetNames = (sec.cabinets_assigned || []).map(c => c.name).join(', ');
    if (!window.confirm(`Retirer ${sec.full_name} de TOUS vos cabinets ?\n\nCabinets : ${cabinetNames}\n\nLe compte ne sera pas supprimé.`)) return;
    try {
      await api.delete(`/cabinets/my-secretaries/${sec.id}/`);
      setMessage(`${sec.full_name} retiré(e) de tous vos cabinets.`);
      setMessageType('success');
      fetchSecretaries(); fetchAvailable();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Erreur lors du retrait.');
      setMessageType('danger');
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1"><i className="bi bi-people-fill me-2 text-primary"></i>Mes Secrétaires</h2>
          <p className="text-muted mb-0">Gérez les secrétaires assignés à vos cabinets</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary btn-sm px-3 py-2 rounded-3" onClick={openAssignModal} disabled={availableSecretaries.length === 0}>
            <i className="bi bi-person-plus me-1"></i> Assigner
          </button>
          <button className="btn btn-primary btn-sm px-3 py-2 rounded-3" onClick={openCreateModal}>
            <i className="bi bi-plus-lg me-1"></i> Nouveau
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} style={{ borderRadius: '12px' }} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')}></button>
        </div>
      )}

      <div className="card" style={cardStyle}>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <p className="mt-2 text-muted">Chargement...</p>
            </div>
          ) : secretaries.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-person-workspace text-muted" style={{ fontSize: '3rem' }}></i>
              <p className="mt-3 text-muted fw-semibold">Aucun secrétaire assigné</p>
              <p className="text-muted small mb-3">Créez un nouveau secrétaire ou assignez-en un existant.</p>
              <div className="d-flex gap-2 justify-content-center mt-3">
                <button className="btn btn-outline-primary btn-sm px-3 py-2 rounded-3" onClick={openAssignModal}><i className="bi bi-person-plus me-1"></i> Assigner</button>
                <button className="btn btn-primary btn-sm px-3 py-2 rounded-3" onClick={openCreateModal}><i className="bi bi-plus-lg me-1"></i> Nouveau</button>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="text-uppercase text-muted" style={{ fontSize: '0.75rem' }}>
                    <th className="ps-4" style={{ width: '50px' }}>#</th>
                    <th>Secrétaire</th>
                    <th>Contact</th>
                    <th>Cabinets</th>
                    <th className="text-center">Statut</th>
                    <th className="pe-4 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {secretaries.map((sec, idx) => (
                    <tr key={sec.id}>
                      <td className="ps-4 text-muted">{idx + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center fw-bold text-primary" style={{ width: 38, height: 38, fontSize: '0.85rem' }}>
                            {sec.first_name?.[0] || 'S'}{sec.last_name?.[0] || ''}
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{sec.full_name}</div>
                            {sec.is_verified && <small className="text-success"><i className="bi bi-patch-check-fill me-1"></i>Vérifié</small>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <a href={`mailto:${sec.email}`} className="text-decoration-none text-muted d-block small">{sec.email}</a>
                        {sec.phone_number ? <span className="small text-muted">{sec.phone_number}</span> : <span className="small text-muted fst-italic">Pas de téléphone</span>}
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {(sec.cabinets_assigned || []).map(cab => (
                            <span key={cab.id} className="badge bg-info-subtle text-info d-flex align-items-center gap-1 px-2 py-1" style={{ fontSize: '0.75rem' }}>
                              <i className="bi bi-hospital"></i>
                              {cab.name}
                              <button 
                                type="button" 
                                className="btn btn-sm p-0 border-0 text-danger ms-1" 
                                style={{ lineHeight: 1 }} 
                                onClick={() => handleUnassign(sec, cab.id, cab.name)} 
                                title={`Retirer du cabinet ${cab.name}`}
                              >
                                <i className="bi bi-x-circle-fill" style={{ fontSize: '0.7rem' }}></i>
                              </button>
                            </span>
                          ))}
                          {(sec.cabinets_assigned || []).length === 0 && <span className="text-muted fst-italic small">Aucun cabinet</span>}
                        </div>
                      </td>
                      <td className="text-center">
                        <span className={`badge ${sec.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'} px-3 py-2`}>
                          {sec.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="pe-4 text-end">
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-primary rounded-3 px-2" onClick={() => openEditModal(sec)} title="Modifier"><i className="bi bi-pencil"></i></button>
                          {myCabinets.length > 0 && (sec.cabinets_assigned || []).length < myCabinets.length && (
                            <button className="btn btn-outline-info rounded-3 px-2" onClick={() => { setAssignForm({ secretary: String(sec.id), cabinet: '' }); setAssignErrors({}); setAssignModal(true); fetchCabinets(); }} title="Assigner à un autre cabinet"><i className="bi bi-hospital"></i></button>
                          )}
                          <button className="btn btn-outline-danger rounded-3 px-2" onClick={() => handleRemove(sec)} title="Retirer de tous les cabinets"><i className="bi bi-x-circle"></i></button>
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
          <div className="card-footer bg-white text-muted small py-3 border-top-0">
            <i className="bi bi-info-circle me-1"></i>
            {secretaries.length} secrétaire(s) assigné(s) • Cliquez sur l'icône rouge (<i className="bi bi-x-circle-fill text-danger mx-1"></i>) sur un badge cabinet pour retirer le secrétaire de ce cabinet
          </div>
        )}
      </div>

      {/* MODAL CRÉATION */}
      <Modal show={createModal} title={<><i className="bi bi-person-plus me-2"></i>Créer un nouveau secrétaire</>} onClose={() => setCreateModal(false)} onSubmit={handleCreateSubmit} submitLabel={createSubmitting ? 'Création...' : 'Créer le compte'} submitDisabled={createSubmitting} submitVariant="btn-primary">
        <div className="alert alert-info bg-info-subtle text-info border-0 small mb-4">
          <i className="bi bi-info-circle me-1"></i>
          Un compte sera créé avec un mot de passe temporaire que vous pourrez transmettre au secrétaire.
        </div>
        <div className="row g-3">
          <div className="col-md-6">
            <FormField label="Prénom" required error={createErrors.first_name}>
              <input type="text" className={`form-control ${createErrors.first_name ? 'is-invalid' : ''}`} value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} placeholder="Ex: Fatima" />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Nom" required error={createErrors.last_name}>
              <input type="text" className={`form-control ${createErrors.last_name ? 'is-invalid' : ''}`} value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} placeholder="Ex: Ben Ali" />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Email" required error={createErrors.email} helpText="Sera utilisé comme identifiant de connexion">
              <input type="email" className={`form-control ${createErrors.email ? 'is-invalid' : ''}`} value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="Ex: fatima@example.com" />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Téléphone" error={createErrors.phone_number}>
              <input type="tel" className={`form-control ${createErrors.phone_number ? 'is-invalid' : ''}`} value={createForm.phone_number} onChange={(e) => setCreateForm({ ...createForm, phone_number: e.target.value })} placeholder="Ex: +216 22 333 444" />
            </FormField>
          </div>
          <div className="col-12">
            <FormField label="Assigner à un cabinet" error={createErrors.cabinet} helpText="Optionnel — vous pourrez l'assigner plus tard">
              <select className={`form-select ${createErrors.cabinet ? 'is-invalid' : ''}`} value={createForm.cabinet} onChange={(e) => setCreateForm({ ...createForm, cabinet: e.target.value })}>
                <option value="">— Aucun cabinet —</option>
                {myCabinets.map(c => <option key={c.id} value={c.id}>{c.name} {c.is_active ? '' : '(inactif)'}</option>)}
              </select>
            </FormField>
          </div>
        </div>
        {createErrors.non_field_errors && <div className="alert alert-danger mt-2">{Array.isArray(createErrors.non_field_errors) ? createErrors.non_field_errors.join(' | ') : createErrors.non_field_errors}</div>}
      </Modal>

      {/* MODAL MODIFICATION */}
      <Modal show={editModal} title={<><i className="bi bi-pencil-square me-2"></i>Modifier le secrétaire</>} onClose={() => setEditModal(false)} onSubmit={handleEditSubmit} submitLabel={editSubmitting ? 'Enregistrement...' : 'Mettre à jour'} submitDisabled={editSubmitting} submitVariant="btn-warning" size="modal-md">
        <div className="row g-3">
          <div className="col-12"><FormField label="Prénom" required error={editErrors.first_name}><input type="text" className={`form-control ${editErrors.first_name ? 'is-invalid' : ''}`} value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} /></FormField></div>
          <div className="col-12"><FormField label="Nom" required error={editErrors.last_name}><input type="text" className={`form-control ${editErrors.last_name ? 'is-invalid' : ''}`} value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} /></FormField></div>
          <div className="col-12"><FormField label="Email" required error={editErrors.email}><input type="email" className={`form-control ${editErrors.email ? 'is-invalid' : ''}`} value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></FormField></div>
          <div className="col-12"><FormField label="Téléphone" error={editErrors.phone_number}><input type="tel" className={`form-control ${editErrors.phone_number ? 'is-invalid' : ''}`} value={editForm.phone_number} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} /></FormField></div>
        </div>
        {editErrors.non_field_errors && <div className="alert alert-danger mt-2">{Array.isArray(editErrors.non_field_errors) ? editErrors.non_field_errors.join(' | ') : editErrors.non_field_errors}</div>}
      </Modal>

      {/* MODAL ASSIGNATION */}
      <Modal show={assignModal} title={<><i className="bi bi-hospital me-2"></i>Assigner un secrétaire</>} onClose={() => setAssignModal(false)} onSubmit={handleAssignSubmit} submitLabel={assignSubmitting ? 'Assignation...' : 'Assigner'} submitDisabled={assignSubmitting || !assignForm.secretary || !assignForm.cabinet} submitVariant="btn-info" size="modal-md">
        {availableSecretaries.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-person-check text-muted" style={{ fontSize: '2.5rem' }}></i>
            <p className="mt-2 text-muted">Tous les secrétaires existants sont déjà assignés à vos cabinets.</p>
            <button className="btn btn-primary btn-sm mt-2 rounded-3 px-3" onClick={() => { setAssignModal(false); openCreateModal(); }}><i className="bi bi-plus-lg me-1"></i> Créer un nouveau secrétaire</button>
          </div>
        ) : (
          <div className="row g-3">
            <div className="col-12"><FormField label="Secrétaire" required error={assignErrors.secretary}><select className={`form-select ${assignErrors.secretary ? 'is-invalid' : ''}`} value={assignForm.secretary} onChange={(e) => setAssignForm({ ...assignForm, secretary: e.target.value })}><option value="">— Sélectionner —</option>{availableSecretaries.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)}</select></FormField></div>
            <div className="col-12"><FormField label="Cabinet" required error={assignErrors.cabinet}><select className={`form-select ${assignErrors.cabinet ? 'is-invalid' : ''}`} value={assignForm.cabinet} onChange={(e) => setAssignForm({ ...assignForm, cabinet: e.target.value })}><option value="">— Sélectionner —</option>{myCabinets.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField></div>
          </div>
        )}
        {assignErrors.detail && <div className="alert alert-danger mt-2">{assignErrors.detail}</div>}
      </Modal>

      {/* MODAL MOT DE PASSE */}
      <PasswordModal show={passwordModal} onClose={() => setPasswordModal(false)} data={createdData} />
    </div>
  );
}