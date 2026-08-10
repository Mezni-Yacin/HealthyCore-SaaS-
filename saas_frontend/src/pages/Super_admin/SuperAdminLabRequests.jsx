import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const STATUS_MAP = { requested: 'warning', sample_collected: 'info', in_progress: 'primary', completed: 'success', cancelled: 'danger' };
const STATUS_LABELS = { requested: 'Demandé', sample_collected: 'Prélèvement fait', in_progress: 'En cours', completed: 'Complété', cancelled: 'Annulé' };
const PRIORITY_MAP = { normal: 'secondary', urgent: 'warning text-dark', stat: 'danger' };

const SuperAdminLabRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = filterStatus ? { status: filterStatus } : {};
    api.get('/laboratories/superadmin/requests/', { params }).then(r => setRequests(r.data)).finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer cette demande ?")) {
      await api.delete(`/laboratories/superadmin/requests/${id}/`);
      fetchData();
      setSelected(null);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4><i className="bi bi-list-check me-2"></i>Demandes Globales d'Analyses</h4>
        <div>
          <select className="form-select form-select-sm" style={{ width: '200px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? <div className="text-center py-5"><div className="spinner-border"></div></div> : (
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr><th>Date</th><th>Patient</th><th>Médecin</th><th>Labo</th><th>Analyses</th><th>Priorité</th><th>Statut</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(req)}>
                    <td className="small">{new Date(req.request_date).toLocaleDateString('fr-FR')}</td>
                    <td className="fw-semibold">{req.patient_name}</td>
                    <td>{req.doctor_name}</td>
                    <td>{req.lab_name}</td>
                    <td>
                      {req.test_names.slice(0, 2).map(n => <span key={n} className="badge bg-light text-dark border me-1 mb-1">{n}</span>)}
                      {req.test_names.length > 2 && <span className="badge bg-secondary">+{req.test_names.length - 2}</span>}
                    </td>
                    <td><span className={`badge bg-${PRIORITY_MAP[req.priority]}`}>{req.priority_display}</span></td>
                    <td><span className={`badge bg-${STATUS_MAP[req.status]}`}>{STATUS_LABELS[req.status]}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(req.id)}><i className="bi bi-trash"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Détail */}
      {selected && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }} onClick={() => setSelected(null)}>
          <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Détail de la demande #{selected.id}</h5>
                <button type="button" className="btn-close" onClick={() => setSelected(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <p><strong>Patient :</strong> {selected.patient_name}</p>
                    <p><strong>Médecin :</strong> {selected.doctor_name}</p>
                    <p><strong>Laboratoire :</strong> {selected.lab_name}</p>
                  </div>
                  <div className="col-md-6 text-md-end">
                    <span className={`badge bg-${STATUS_MAP[selected.status]} fs-6`}>{STATUS_LABELS[selected.status]}</span>
                    <p className="mt-2 mb-0"><strong>Prix total :</strong> <span className="text-primary fw-bold">{parseFloat(selected.total_price).toFixed(3)} TND</span></p>
                  </div>
                </div>
                
                <h6 className="border-bottom pb-2">Analyses demandées</h6>
                <ul className="list-group mb-3">
                  {selected.test_names.map(name => <li key={name} className="list-group-item"><i className="bi bi-virus me-2"></i>{name}</li>)}
                </ul>

                {selected.clinical_history && (
                  <>
                    <h6 className="border-bottom pb-2">Historique clinique</h6>
                    <p className="text-muted small bg-light p-2 rounded">{selected.clinical_history}</p>
                  </>
                )}

                <div className="alert alert-info mt-3 mb-0 text-center">
                  <i className="bi bi-info-circle me-2"></i>
                  {selected.has_result ? "Résultats disponibles dans le système." : "Résultats en attente de saisie par le laboratoire."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminLabRequests;