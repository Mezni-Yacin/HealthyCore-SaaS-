import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ── Mappings statuts/priorités (styles modernes Bootstrap 5.3) ───────────
const STATUS_CLASSES = {
  requested: 'bg-warning-subtle text-warning',
  sample_collected: 'bg-info-subtle text-info',
  in_progress: 'bg-primary-subtle text-primary',
  completed: 'bg-success-subtle text-success',
  cancelled: 'bg-danger-subtle text-danger'
};

const STATUS_LABELS = {
  requested: 'Demandé',
  sample_collected: 'Prélèvement fait',
  in_progress: 'En cours',
  completed: 'Complété',
  cancelled: 'Annulé'
};

const PRIORITY_CLASSES = {
  normal: 'bg-secondary-subtle text-secondary',
  urgent: 'bg-warning-subtle text-warning',
  stat: 'bg-danger-subtle text-danger'
};

// ── Composant principal ────────────────────────────────────────────────────
export default function SuperAdminLabRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState(null);
  
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  // ── Fetch Données ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (search.trim()) params.search = search.trim();
      
      const { data } = await api.get('/laboratories/superadmin/requests/', { params });
      setRequests(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setMessage("Erreur lors du chargement des demandes.");
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleDelete = async (req) => {
    if (!window.confirm(`Supprimer la demande #${req.id} ?`)) return;
    try {
      await api.delete(`/laboratories/superadmin/requests/${req.id}/`);
      setMessage(`Demande #${req.id} supprimée.`);
      setMessageType('success');
      fetchData();
      setSelected(null);
    } catch (err) {
      setMessage(err.response?.data?.detail || "Erreur lors de la suppression.");
      setMessageType('danger');
    }
  };

  // ── Helper Date ──────────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">
            <i className="bi bi-list-check me-2 text-primary"></i>
            Demandes Globales d'Analyses
          </h2>
          <p className="text-muted mb-0">Suivez et gérez toutes les demandes de laboratoire</p>
        </div>
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
                <input type="text" className="form-control" placeholder="Rechercher par patient, médecin, labo..." value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && <button className="btn btn-outline-secondary" onClick={() => setSearch('')}><i className="bi bi-x-lg"></i></button>}
              </div>
            </div>
            <div className="col-md-4">
              <select className="form-select form-select-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Tous les statuts</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
          ) : requests.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox display-1 text-muted"></i>
              <p className="mt-2 text-muted">Aucune demande trouvée.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">ID</th>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Médecin</th>
                    <th>Laboratoire</th>
                    <th>Analyses</th>
                    <th className="text-center">Priorité</th>
                    <th className="text-center">Statut</th>
                    <th style={{ width: '100px' }} className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(req)}>
                      <td className="ps-3 text-muted">#{req.id}</td>
                      <td className="small text-muted">{formatDate(req.request_date)}</td>
                      <td className="fw-semibold">{req.patient_name || '—'}</td>
                      <td>{req.doctor_name || '—'}</td>
                      <td>{req.lab_name || '—'}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {req.test_names?.slice(0, 2).map(n => <span key={n} className="badge bg-light text-dark border">{n}</span>)}
                          {req.test_names?.length > 2 && <span className="badge bg-secondary">+{req.test_names.length - 2}</span>}
                        </div>
                      </td>
                      <td className="text-center">
                        <span className={`badge ${PRIORITY_CLASSES[req.priority] || PRIORITY_CLASSES.normal}`}>{req.priority_display || req.priority}</span>
                      </td>
                      <td className="text-center">
                        <span className={`badge ${STATUS_CLASSES[req.status] || STATUS_CLASSES.requested}`}>{STATUS_LABELS[req.status] || req.status}</span>
                      </td>
                      <td className="text-center" onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(req)} title="Supprimer">
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ==================== MODAL DÉTAIL ==================== */}
      {selected && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setSelected(null)}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-file-earmark-medical me-2"></i>
                  Détail de la Demande #{selected.id}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelected(null)} />
              </div>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                
                {/* Cartouche Infos principales */}
                <div className="card border-0 bg-light mb-4">
                  <div className="card-body p-3">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="d-flex align-items-center mb-2">
                          <i className="bi bi-person-fill text-primary me-2 fs-5"></i>
                          <div>
                            <small className="text-muted d-block">Patient</small>
                            <span className="fw-bold">{selected.patient_name || '—'}</span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center">
                          <i className="bi bi-person-badge text-info me-2 fs-5"></i>
                          <div>
                            <small className="text-muted d-block">Médecin prescripteur</small>
                            <span className="fw-bold">{selected.doctor_name || '—'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex align-items-center mb-2">
                          <i className="bi bi-hospital text-warning me-2 fs-5"></i>
                          <div>
                            <small className="text-muted d-block">Laboratoire</small>
                            <span className="fw-bold">{selected.lab_name || '—'}</span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center">
                          <i className="bi bi-calendar-event text-secondary me-2 fs-5"></i>
                          <div>
                            <small className="text-muted d-block">Date de demande</small>
                            <span className="fw-bold">{formatDate(selected.request_date)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statut & Tarification */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold">Statut actuel</label>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge fs-6 ${STATUS_CLASSES[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
                      <span className={`badge fs-6 ${PRIORITY_CLASSES[selected.priority]}`}>{selected.priority_display}</span>
                    </div>
                  </div>
                  <div className="col-md-6 text-md-end">
                    <label className="form-label text-muted small fw-bold">Prix Total</label>
                    <h4 className="text-primary fw-bold mb-0">{parseFloat(selected.total_price || 0).toFixed(3)} TND</h4>
                  </div>
                </div>

                {/* Liste des analyses */}
                <h6 className="text-dark border-bottom pb-2 mb-3"><i className="bi bi-virus me-2"></i>Analyses demandées</h6>
                <div className="mb-4">
                  {selected.test_names?.map((name, idx) => (
                    <div key={idx} className="d-flex align-items-center p-2 mb-1 bg-light rounded border">
                      <i className="bi bi-check2-circle text-success me-2"></i>
                      <span className="fw-semibold">{name}</span>
                    </div>
                  ))}
                </div>

                {/* Historique clinique */}
                {selected.clinical_history && (
                  <>
                    <h6 className="text-dark border-bottom pb-2 mb-3"><i className="bi bi-clipboard2-plus me-2"></i>Historique clinique</h6>
                    <div className="alert alert-secondary bg-light text-dark border-0 p-3 mb-4" style={{ whiteSpace: 'pre-wrap' }}>
                      {selected.clinical_history}
                    </div>
                  </>
                )}

                {/* Alerte Résultats */}
                <div className={`alert ${selected.has_result ? 'alert-success' : 'alert-info'} d-flex align-items-center mt-4 mb-0`}>
                  <i className={`bi ${selected.has_result ? 'bi-check-circle-fill' : 'bi-hourglass-split'} fs-4 me-3`}></i>
                  <div>
                    <strong>{selected.has_result ? "Résultats disponibles" : "Résultats en attente"}</strong>
                    <div className="small">
                      {selected.has_result ? "Les résultats ont été saisies par le laboratoire et sont consultables." : "Le laboratoire n'a pas encore saisie les résultats."}
                    </div>
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Fermer</button>
                <button type="button" className="btn btn-outline-danger" onClick={() => handleDelete(selected)}>
                  <i className="bi bi-trash me-1"></i> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}