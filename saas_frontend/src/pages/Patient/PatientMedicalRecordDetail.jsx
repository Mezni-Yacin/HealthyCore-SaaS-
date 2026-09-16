import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const cardStyle = { borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };

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
    const map = { low: 'bg-secondary-subtle text-secondary', medium: 'bg-primary-subtle text-primary', high: 'bg-warning-subtle text-warning', emergency: 'bg-danger-subtle text-danger' };
    const labels = { low: 'Basse', medium: 'Moyenne', high: 'Haute', emergency: 'Urgence' };
    return <span className={`badge ${map[p] || map.medium} px-3 py-2`}>{labels[p] || p}</span>;
  };

  const getConfidentialityBadge = (c) => {
    const map = { normal: 'bg-success-subtle text-success', sensitive: 'bg-warning-subtle text-warning', highly_sensitive: 'bg-danger-subtle text-danger' };
    const labels = { normal: 'Normal', sensitive: 'Sensible', highly_sensitive: 'Très sensible' };
    return <span className={`badge ${map[c] || map.normal} px-3 py-2`}>{labels[c] || c}</span>;
  };

  const getFormLabel = (v) => ({ tablet: 'Comprimé', capsule: 'Capsule', liquid: 'Liquide', injection: 'Injection', cream: 'Crème', ointment: 'Pommade', other: 'Autre' })[v] || v;
  const formatDate = (d) => { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>;
  if (error) return <div className="container py-4"><div className="alert alert-danger" style={{borderRadius: '12px'}}>{error}</div><button className="btn btn-outline-primary rounded-3" onClick={() => navigate('/patient-records')}><i className="bi bi-arrow-left me-2"></i>Retour</button></div>;
  if (!record) return null;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-light btn-sm rounded-3 p-2" onClick={() => navigate('/patient-records')}><i className="bi bi-arrow-left fs-6"></i></button>
          <div>
            <h2 className="fw-bold mb-1 h4">Dossier Médical</h2>
            <p className="text-muted mb-0">Consultation du {formatDate(record.date)}</p>
          </div>
        </div>
        <div className="d-flex gap-2">
          {getPriorityBadge(record.priority)}
          {getConfidentialityBadge(record.confidentiality_level)}
        </div>
      </div>

      {/* Infos Principales */}
      <div className="card mb-4" style={cardStyle}>
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-md-6">
              <small className="text-muted d-block text-uppercase fw-bold mb-1" style={{fontSize: '0.7rem'}}>Médecin</small>
              <h5 className="mb-0 fw-bold">Dr. {record.doctor_info?.full_name || '—'}</h5>
              {record.doctor_info?.specialty && <small className="text-muted"><i className="bi bi-briefcase me-1"></i>{record.doctor_info.specialty}</small>}
            </div>
            <div className="col-md-6">
              <small className="text-muted d-block text-uppercase fw-bold mb-1" style={{fontSize: '0.7rem'}}>Cabinet</small>
              <h6 className="mb-0 fw-bold">{record.cabinet_info?.name || 'Non renseigné'}</h6>
              {record.cabinet_info?.address && <small className="text-muted">{record.cabinet_info.address}</small>}
            </div>
          </div>
        </div>
      </div>

      {/* Constantes Vitales */}
      {record.vitals && (
        <div className="card mb-4" style={cardStyle}>
          <div className="card-header bg-white border-0 py-3">
            <h6 className="mb-0 fw-bold"><i className="bi bi-heart-pulse me-2 text-danger"></i>Constantes Vitales</h6>
          </div>
          <div className="card-body">
            <div className="row text-center g-3">
              {record.vitals.blood_pressure && (
                <div className="col-md-2 col-6">
                  <div className="bg-light p-3 rounded-3 h-100">
                    <i className="bi bi-activity text-primary fs-4"></i>
                    <h5 className="mt-2 mb-0 text-primary">{record.vitals.blood_pressure.label}</h5>
                    <small className="text-muted">Tension</small>
                  </div>
                </div>
              )}
              {record.vitals.heart_rate && (
                <div className="col-md-2 col-6">
                  <div className="bg-light p-3 rounded-3 h-100">
                    <i className="bi bi-heart-fill text-danger fs-4"></i>
                    <h5 className="mt-2 mb-0 text-danger">{record.vitals.heart_rate.label}</h5>
                    <small className="text-muted">Fréq. Cardiaque</small>
                  </div>
                </div>
              )}
              {record.vitals.temperature && (
                <div className="col-md-2 col-6">
                  <div className="bg-light p-3 rounded-3 h-100">
                    <i className="bi bi-thermometer-half text-warning fs-4"></i>
                    <h5 className="mt-2 mb-0 text-warning">{record.vitals.temperature.label}</h5>
                    <small className="text-muted">Température</small>
                  </div>
                </div>
              )}
              {record.vitals.respiratory_rate && (
                <div className="col-md-2 col-6">
                  <div className="bg-light p-3 rounded-3 h-100">
                    <i className="bi bi-wind text-info fs-4"></i>
                    <h5 className="mt-2 mb-0 text-info">{record.vitals.respiratory_rate.label}</h5>
                    <small className="text-muted">Rythme Resp.</small>
                  </div>
                </div>
              )}
              {record.vitals.oxygen_saturation && (
                <div className="col-md-2 col-6">
                  <div className="bg-light p-3 rounded-3 h-100">
                    <i className="bi bi-droplet-half text-success fs-4"></i>
                    <h5 className="mt-2 mb-0 text-success">{record.vitals.oxygen_saturation.label}</h5>
                    <small className="text-muted">Saturation O₂</small>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Symptômes & Diagnostic */}
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="card h-100" style={cardStyle}>
            <div className="card-header bg-white border-0 py-3">
              <h6 className="mb-0 fw-bold"><i className="bi bi-clipboard2-pulse me-2 text-primary"></i>Symptômes</h6>
            </div>
            <div className="card-body">
              <p className="mb-0 text-muted" style={{ whiteSpace: 'pre-wrap' }}>{record.symptoms || 'Aucun symptôme renseigné.'}</p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100" style={cardStyle}>
            <div className="card-header bg-white border-0 py-3">
              <h6 className="mb-0 fw-bold"><i className="bi bi-clipboard2-check me-2 text-success"></i>Diagnostic {record.diagnosis_code && <small className="text-muted">({record.diagnosis_code})</small>}</h6>
            </div>
            <div className="card-body">
              <p className="mb-0 text-muted" style={{ whiteSpace: 'pre-wrap' }}>{record.diagnosis || 'Aucun diagnostic renseigné.'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Traitement & Notes */}
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="card h-100" style={cardStyle}>
            <div className="card-header bg-white border-0 py-3">
              <h6 className="mb-0 fw-bold"><i className="bi bi-bandaid me-2 text-info"></i>Traitement</h6>
            </div>
            <div className="card-body">
              <p className="mb-0 text-muted" style={{ whiteSpace: 'pre-wrap' }}>{record.treatment || 'Aucun traitement renseigné.'}</p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100" style={cardStyle}>
            <div className="card-header bg-white border-0 py-3">
              <h6 className="mb-0 fw-bold"><i className="bi bi-journal-text me-2 text-secondary"></i>Notes</h6>
            </div>
            <div className="card-body">
              <p className="mb-0 text-muted" style={{ whiteSpace: 'pre-wrap' }}>{record.notes || 'Aucune note.'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Suivi */}
      {record.follow_up_needed && record.follow_up_date && (
        <div className="alert alert-info d-flex align-items-center mb-4" style={{borderRadius: '12px', border: 'none', backgroundColor: '#eff6ff'}}>
          <i className="bi bi-calendar-check fs-4 me-3 text-primary"></i>
          <div>
            <strong>Un suivi est requis :</strong> Vous avez un rendez-vous de suivi prévu le <strong>{formatDate(record.follow_up_date)}</strong>.
          </div>
        </div>
      )}

      {/* Prescriptions */}
      <div className="card mb-4" style={cardStyle}>
        <div className="card-header bg-white border-0 py-3">
          <h6 className="mb-0 fw-bold"><i className="bi bi-capsule me-2 text-warning"></i>Prescriptions ({record.prescriptions ? record.prescriptions.length : 0})</h6>
        </div>
        <div className="card-body p-0">
          {!record.prescriptions || record.prescriptions.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-capsule" style={{fontSize: '2.5rem'}}></i>
              <p className="mt-2">Aucune prescription</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="text-uppercase text-muted" style={{fontSize: '0.75rem'}}>
                    <th className="ps-4">Médicament</th><th>Posologie</th><th>Forme</th><th>Fréquence</th><th>Durée</th><th>Qté</th><th className="pe-4">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {record.prescriptions.map((p) => (
                    <tr key={p.id}>
                      <td className="ps-4 fw-bold text-dark">{p.medication_name}</td>
                      <td>{p.dosage || '—'}</td>
                      <td><span className="badge bg-light text-dark border">{getFormLabel(p.form)}</span></td>
                      <td className="text-muted">{p.frequency || '—'}</td>
                      <td className="text-muted">{p.duration || '—'}</td>
                      <td className="text-muted">{p.quantity || '—'}</td>
                      <td className="pe-4">
                        <div className="d-flex gap-1">
                          {p.before_meals && <span className="badge bg-info-subtle text-info">Avant</span>}
                          {p.after_meals && <span className="badge bg-warning-subtle text-warning">Après</span>}
                          {p.with_meals && <span className="badge bg-success-subtle text-success">Pendant</span>}
                          {!p.before_meals && !p.after_meals && !p.with_meals && <span className="text-muted">—</span>}
                        </div>
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
      <div className="card" style={cardStyle}>
        <div className="card-header bg-white border-0 py-3">
          <h6 className="mb-0 fw-bold"><i className="bi bi-paperclip me-2 text-primary"></i>Pièces jointes ({record.attachments ? record.attachments.length : 0})</h6>
        </div>
        <div className="card-body p-0">
          {!record.attachments || record.attachments.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-folder2-open" style={{fontSize: '2.5rem'}}></i>
              <p className="mt-2">Aucune pièce jointe</p>
            </div>
          ) : (
            <ul className="list-group list-group-flush">
              {record.attachments.map((att) => (
                <li key={att.id} className="list-group-item d-flex justify-content-between align-items-center p-3">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-primary bg-opacity-10 text-primary rounded-3 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                      <i className={`bi ${att.file_type === 'image' ? 'bi-image' : att.file_type === 'pdf' ? 'bi-file-earmark-pdf' : 'bi-file-earmark'} fs-5`}></i>
                    </div>
                    <div>
                      <strong>{att.description || 'Fichier'}</strong><br />
                      <small className="text-muted">{att.file_type_display || att.file_type} — {formatDate(att.uploaded_at)}</small>
                    </div>
                  </div>
                  <div>
                    {att.file_url && (
                      <a href={att.file_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary rounded-3 px-3">
                        <i className="bi bi-download me-1"></i> Télécharger
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