import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function PatientMedicalRecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchRecord(); }, [id]);

  const fetchRecord = async () => {
    try {
      setLoading(true); setError('');
      const res = await api.get(`/medical-records/patient/${id}/`);
      setRecord(res.data);
    } catch (err) {
      setError(err.response?.status === 404 ? 'Dossier médical introuvable.' : 'Erreur lors du chargement du dossier.');
    } finally { setLoading(false); }
  };

  const getPriorityBadge = (p) => {
    const map = { low: 'secondary', medium: 'primary', high: 'warning', emergency: 'danger' };
    const labels = { low: 'Basse', medium: 'Moyenne', high: 'Haute', emergency: 'Urgence' };
    return <span className={`badge bg-${map[p] || 'secondary'}`}>{labels[p] || p}</span>;
  };

  const getFormLabel = (v) => ({ tablet: 'Comprimé', capsule: 'Capsule', liquid: 'Liquide', injection: 'Injection', cream: 'Crème', ointment: 'Pommade', other: 'Autre' })[v] || v;
  const formatDate = (d) => { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Chargement...</span></div></div>;
  if (error) return <div className="container py-4"><div className="alert alert-danger">{error}</div><button className="btn btn-outline-primary" onClick={() => navigate('/patient-records')}><i className="bi bi-arrow-left me-2"></i>Retour</button></div>;
  if (!record) return null;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button className="btn btn-outline-secondary btn-sm me-2" onClick={() => navigate('/patient-records')}><i className="bi bi-arrow-left"></i></button>
          <h4 className="d-inline"><i className="bi bi-file-medical me-2"></i>Dossier #{record.id}</h4>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <h6 className="text-muted mb-1">Médecin</h6>
              <h5>Dr. {record.doctor_info?.full_name || '—'}</h5>
              {record.doctor_info?.specialty && <small className="text-muted"><i className="bi bi-briefcase me-1"></i>{record.doctor_info.specialty}</small>}
            </div>
            <div className="col-md-3"><h6 className="text-muted mb-1">Date de consultation</h6><p className="mb-0">{formatDate(record.date)}</p></div>
            <div className="col-md-2"><h6 className="text-muted mb-1">Priorité</h6><p className="mb-0">{getPriorityBadge(record.priority)}</p></div>
            <div className="col-md-3"><h6 className="text-muted mb-1">Confidentialité</h6><p className="mb-0"><span className="badge bg-light text-dark">{record.confidentiality_display || record.confidentiality_level}</span></p></div>
          </div>
        </div>
      </div>

      {record.vitals && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-light"><h6 className="mb-0"><i className="bi bi-heart-pulse me-2"></i>Constantes Vitales</h6></div>
          <div className="card-body">
            <div className="row text-center g-2">
              {record.vitals.blood_pressure && <div className="col-md-2"><h5 className="text-primary mb-0">{record.vitals.blood_pressure.label}</h5><small className="text-muted">Pression artérielle</small></div>}
              {record.vitals.heart_rate && <div className="col-md-2"><h5 className="text-danger mb-0">{record.vitals.heart_rate.label}</h5><small className="text-muted">Fréquence cardiaque</small></div>}
              {record.vitals.respiratory_rate && <div className="col-md-2"><h5 className="text-info mb-0">{record.vitals.respiratory_rate.label}</h5><small className="text-muted">Rythme respiratoire</small></div>}
              {record.vitals.temperature && <div className="col-md-2"><h5 className="text-warning mb-0">{record.vitals.temperature.label}</h5><small className="text-muted">Température</small></div>}
              {record.vitals.oxygen_saturation && <div className="col-md-2"><h5 className="text-success mb-0">{record.vitals.oxygen_saturation.label}</h5><small className="text-muted">Saturation O2</small></div>}
            </div>
          </div>
        </div>
      )}

      <div className="row g-3 mb-4">
        {record.symptoms && (
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-light"><h6 className="mb-0"><i className="bi bi-clipboard2-pulse me-2"></i>Symptômes</h6></div>
              <div className="card-body"><p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{record.symptoms}</p></div>
            </div>
          </div>
        )}
        {record.diagnosis && (
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-clipboard2-check me-2"></i>Diagnostic
                  {record.diagnosis_code && <small className="text-muted"> ({record.diagnosis_code})</small>}
                </h6>
              </div>
              <div className="card-body"><p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{record.diagnosis}</p></div>
            </div>
          </div>
        )}
      </div>

      {record.treatment && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-light"><h6 className="mb-0"><i className="bi bi-bandaid me-2"></i>Traitement</h6></div>
          <div className="card-body"><p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{record.treatment}</p></div>
        </div>
      )}

      {record.notes && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-light"><h6 className="mb-0"><i className="bi bi-journal-text me-2"></i>Notes</h6></div>
          <div className="card-body"><p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{record.notes}</p></div>
        </div>
      )}

      {record.follow_up_needed && record.follow_up_date && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-info text-white"><h6 className="mb-0"><i className="bi bi-calendar-check me-2"></i>Suivi requis</h6></div>
          <div className="card-body"><strong>Date de suivi :</strong> {formatDate(record.follow_up_date)}</div>
        </div>
      )}

      {/* Prescriptions */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-light">
          <h6 className="mb-0">
            <i className="bi bi-capsule me-2"></i>Prescriptions ({record.prescriptions ? record.prescriptions.length : 0})
          </h6>
        </div>
        <div className="card-body p-0">
          {!record.prescriptions || record.prescriptions.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-capsule display-6"></i>
              <p className="mt-2">Aucune prescription</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr><th>Médicament</th><th>Dosage</th><th>Forme</th><th>Fréquence</th><th>Durée</th><th>Qté</th><th>Repas</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  {record.prescriptions.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.medication_name}</strong></td>
                      <td>{p.dosage || '—'}</td>
                      <td>{getFormLabel(p.form)}</td>
                      <td>{p.frequency || '—'}</td>
                      <td>{p.duration || '—'}</td>
                      <td>{p.quantity || '—'}</td>
                      <td>
                        {p.before_meals && <span className="badge bg-info me-1">Avant repas</span>}
                        {p.after_meals && <span className="badge bg-warning me-1">Après repas</span>}
                        {p.with_meals && <span className="badge bg-success">Pendant repas</span>}
                        {!p.before_meals && !p.after_meals && !p.with_meals && <span>—</span>}
                      </td>
                      <td>
                        {p.is_active ? <span className="badge bg-success">Active</span> : <span className="badge bg-secondary">Inactive</span>}
                        {p.is_electronic && <span className="badge bg-primary ms-1">Électronique</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pièces jointes */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-light">
          <h6 className="mb-0">
            <i className="bi bi-paperclip me-2"></i>Pièces jointes ({record.attachments ? record.attachments.length : 0})
          </h6>
        </div>
        <div className="card-body p-0">
          {!record.attachments || record.attachments.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-paperclip display-6"></i>
              <p className="mt-2">Aucune pièce jointe</p>
            </div>
          ) : (
            <ul className="list-group list-group-flush">
              {record.attachments.map((att) => (
                <li key={att.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <i className={`bi ${att.file_type === 'image' ? 'bi-image' : att.file_type === 'pdf' ? 'bi-file-earmark-pdf' : 'bi-file-earmark'} me-2 text-muted`}></i>
                    <strong>{att.description || 'Fichier'}</strong><br />
                    <small className="text-muted">{att.file_type_display || att.file_type} — {att.uploaded_at}</small>
                  </div>
                  <div>
                    {att.file_url && (
                      <a href={att.file_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">
                        <i className="bi bi-download"></i>
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}