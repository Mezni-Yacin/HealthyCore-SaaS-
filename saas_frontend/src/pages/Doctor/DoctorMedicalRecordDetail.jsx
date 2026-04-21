import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const DoctorMedicalRecordDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Prescriptions
  const [prescriptions, setPrescriptions] = useState([]);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: '',
    form: 'tablet',
    instructions: ''
  });
  const [editingPrescription, setEditingPrescription] = useState(null);
  const [savingPrescription, setSavingPrescription] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const map = {
      scheduled: 'bg-info text-dark',
      confirmed: 'bg-primary',
      completed: 'bg-success',
      cancelled: 'bg-danger',
      no_show: 'bg-warning text-dark'
    };
    return map[status] || 'bg-secondary';
  };

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/medical-records/doctor/${id}/`);
      setRecord(res.data);
      setPrescriptions(res.data.prescriptions || []);
      setAttachments(res.data.attachments || []);
      // FIX: symptoms et treatment (pas chief_complaint ni treatment_plan)
      setEditData({
        symptoms: res.data.symptoms || '',
        diagnosis: res.data.diagnosis || '',
        treatment: res.data.treatment || '',
        diagnosis_code: res.data.diagnosis_code || '',
        notes: res.data.notes || '',
        follow_up_date: res.data.follow_up_date || '',
        follow_up_needed: res.data.follow_up_needed || false,
        confidentiality_level: res.data.confidentiality_level || 'normal',
        priority: res.data.priority || 'medium',
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement du dossier');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    try {
      setSaving(true);
      // Nettoyer les champs vides
      const payload = { ...editData };
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || payload[key] === null) delete payload[key];
      });
      await api.patch(`/medical-records/doctor/${id}/`, payload);
      setEditing(false);
      await fetchRecord();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  // --- Prescriptions ---
  const cleanPrescriptionData = (data) => {
    const cleaned = { ...data };
    // Garder form même si tablet (valeur par défaut)
    // Supprimer duration vide (optional)
    if (!cleaned.duration) delete cleaned.duration;
    if (!cleaned.instructions) delete cleaned.instructions;
    // quantity est obligatoire
    cleaned.quantity = parseInt(cleaned.quantity) || 1;
    return cleaned;
  };

  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingPrescription(true);
      const payload = cleanPrescriptionData(prescriptionForm);

      if (editingPrescription) {
        await api.patch(
          `/medical-records/doctor/${id}/prescriptions/${editingPrescription.id}/`,
          payload
        );
      } else {
        await api.post(
          `/medical-records/doctor/${id}/prescriptions/`,
          payload
        );
      }
      setShowPrescriptionForm(false);
      setEditingPrescription(null);
      setPrescriptionForm({
        medication_name: '', dosage: '', frequency: '',
        duration: '', quantity: '', form: 'tablet', instructions: ''
      });
      await fetchRecord();
    } catch (err) {
      const msg = err.response?.data;
      if (typeof msg === 'object') {
        setError(Object.values(msg).flat().join(' — '));
      } else {
        setError(msg?.detail || 'Erreur lors de la gestion de l\'ordonnance');
      }
    } finally {
      setSavingPrescription(false);
    }
  };

  const handleEditPrescription = (p) => {
    setEditingPrescription(p);
    setPrescriptionForm({
      medication_name: p.medication_name,
      dosage: p.dosage,
      frequency: p.frequency,
      duration: p.duration || '',
      quantity: p.quantity || '',
      form: p.form || 'tablet',
      instructions: p.instructions || ''
    });
    setShowPrescriptionForm(true);
  };

  const handleDeletePrescription = async (prescriptionId) => {
    if (!window.confirm('Supprimer cette ordonnance ?')) return;
    try {
      await api.delete(`/medical-records/doctor/${id}/prescriptions/${prescriptionId}/`);
      await fetchRecord();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  // --- Attachments ---
  const getFileType = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['dicom', 'tiff', 'tif'].includes(ext)) return 'scan';
    return 'other';
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      // FIX: auto-detect file_type selon l'extension du fichier
      formData.append('file_type', getFileType(file.name));
      formData.append('description', file.name);
      await api.post(`/medical-records/doctor/${id}/attachments/upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchRecord();
    } catch (err) {
      setError('Erreur lors de l\'upload du fichier.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Supprimer ce fichier ?')) return;
    try {
      await api.delete(`/medical-records/doctor/${id}/attachments/${attachmentId}/`);
      await fetchRecord();
    } catch (err) {
      setError('Erreur lors de la suppression du fichier');
    }
  };

  const handleDownloadAttachment = (attachment) => {
    const link = document.createElement('a');
    link.href = attachment.file || attachment.file_url || '';
    link.download = attachment.file_name || 'fichier';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confidentialityLabel = (level) => {
    const map = {
      normal: { text: 'Normal', class: 'bg-success' },
      sensitive: { text: 'Sensible', class: 'bg-warning text-dark' },
      highly_sensitive: { text: 'Très sensible', class: 'bg-danger' }
    };
    return map[level] || map.normal;
  };

  const priorityBadge = (priority) => {
    const map = {
      low: { text: 'Basse', class: 'bg-secondary' },
      medium: { text: 'Moyenne', class: 'bg-primary' },
      high: { text: 'Haute', class: 'bg-warning text-dark' },
      emergency: { text: 'Urgence', class: 'bg-danger' }
    };
    return map[priority] || map.medium;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    );
  }

  if (error && !record) {
    return (
      <div className="alert alert-danger m-4">
        <i className="bi bi-exclamation-triangle me-2"></i>{error}
        <button className="btn btn-outline-danger btn-sm ms-3" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left me-1"></i>Retour
        </button>
      </div>
    );
  }

  if (!record) return null;

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button className="btn btn-outline-secondary btn-sm me-2" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-1"></i>Retour
          </button>
          <h4 className="d-inline mb-0">
            <i className="bi bi-file-medical me-2"></i>Dossier Médical
          </h4>
          <span className={`badge ${confidentialityLabel(record.confidentiality_level).class} ms-2`}>
            {confidentialityLabel(record.confidentiality_level).text}
          </span>
          {record.priority && (
            <span className={`badge ${priorityBadge(record.priority).class} ms-1`}>
              {priorityBadge(record.priority).text}
            </span>
          )}
        </div>
        {!editing && (
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            <i className="bi bi-pencil me-1"></i>Modifier
          </button>
        )}
      </div>

      {/* Patient + Doctor + Appointment Info */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted mb-1"><i className="bi bi-person me-1"></i>Patient</h6>
              <h5>{record.patient_info?.full_name || '—'}</h5>
              {/* FIX: phone_number pas phone */}
              {record.patient_info?.phone_number && (
                <p className="mb-1 text-muted"><i className="bi bi-telephone me-1"></i>{record.patient_info.phone_number}</p>
              )}
              {record.patient_info?.date_of_birth && (
                <p className="mb-0 text-muted"><i className="bi bi-calendar me-1"></i>{record.patient_info.date_of_birth}</p>
              )}
              {record.patient_info?.gender && (
                <p className="mb-0 text-muted"><i className="bi bi-gender-ambiguous me-1"></i>{record.patient_info.gender}</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted mb-1"><i className="bi bi-person-badge me-1"></i>Médecin</h6>
              <h5>{record.doctor_info?.full_name || '—'}</h5>
              {record.doctor_info?.specialty && (
                <p className="mb-0 text-muted"><i className="bi bi-star me-1"></i>{record.doctor_info.specialty}</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted mb-1"><i className="bi bi-calendar-check me-1"></i>Rendez-vous</h6>
              {record.appointment_info ? (
                <>
                  <h5>{formatDateTime(record.appointment_info.date_time)}</h5>
                  <span className={`badge ${getStatusBadge(record.appointment_info.status)}`}>
                    {record.appointment_info.status_display || record.appointment_info.status}
                  </span>
                </>
              ) : (
                <p className="text-muted mb-0">Non lié à un rendez-vous</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          <i className="bi bi-exclamation-triangle me-2"></i>{error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>
            <i className="bi bi-info-circle me-1"></i>Détails
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'prescriptions' ? 'active' : ''}`} onClick={() => setActiveTab('prescriptions')}>
            <i className="bi bi-capsule me-1"></i>Ordonnances ({prescriptions.length})
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'attachments' ? 'active' : ''}`} onClick={() => setActiveTab('attachments')}>
            <i className="bi bi-paperclip me-1"></i>Pièces jointes ({attachments.length})
          </button>
        </li>
      </ul>

      {/* ========== TAB: Details ========== */}
      {activeTab === 'details' && (
        <div className="card shadow-sm">
          <div className="card-body">
            {editing ? (
              <div>
                {/* FIX: symptoms (pas chief_complaint) */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Symptômes</label>
                    <textarea className="form-control" rows="3" value={editData.symptoms || ''}
                      onChange={(e) => setEditData({ ...editData, symptoms: e.target.value })}
                      placeholder="Décrivez les symptômes du patient..." />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Diagnostic</label>
                    <textarea className="form-control" rows="3" value={editData.diagnosis || ''}
                      onChange={(e) => setEditData({ ...editData, diagnosis: e.target.value })}
                      placeholder="Diagnostic du médecin..." />
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  {/* FIX: treatment (pas treatment_plan) */}
                  <div className="col-md-6">
                    <label className="form-label">Traitement</label>
                    <textarea className="form-control" rows="3" value={editData.treatment || ''}
                      onChange={(e) => setEditData({ ...editData, treatment: e.target.value })}
                      placeholder="Plan de traitement..." />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Code CIM-10</label>
                    <input type="text" className="form-control" value={editData.diagnosis_code || ''}
                      onChange={(e) => setEditData({ ...editData, diagnosis_code: e.target.value })}
                      placeholder="ex: J06.9" />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Priorité</label>
                    <select className="form-select" value={editData.priority || 'medium'}
                      onChange={(e) => setEditData({ ...editData, priority: e.target.value })}>
                      <option value="low">Basse</option>
                      <option value="medium">Moyenne</option>
                      <option value="high">Haute</option>
                      <option value="emergency">Urgence</option>
                    </select>
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" rows="2" value={editData.notes || ''}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      placeholder="Notes supplémentaires..." />
                  </div>
                  <div className="col-md-3">
                    <div className="form-check mt-3">
                      <input className="form-check-input" type="checkbox" id="editFollowUp"
                        checked={editData.follow_up_needed || false}
                        onChange={(e) => setEditData({ ...editData, follow_up_needed: e.target.checked })} />
                      <label className="form-check-label" htmlFor="editFollowUp">Suivi nécessaire</label>
                    </div>
                    {editData.follow_up_needed && (
                      <input type="date" className="form-control mt-2" value={editData.follow_up_date || ''}
                        onChange={(e) => setEditData({ ...editData, follow_up_date: e.target.value })} />
                    )}
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Confidentialité</label>
                    <select className="form-select" value={editData.confidentiality_level || 'normal'}
                      onChange={(e) => setEditData({ ...editData, confidentiality_level: e.target.value })}>
                      <option value="normal">Normal</option>
                      <option value="sensitive">Sensible</option>
                      <option value="highly_sensitive">Très sensible</option>
                    </select>
                  </div>
                </div>
                <div className="d-flex gap-2 pt-2">
                  <button className="btn btn-primary" onClick={handleEditSave} disabled={saving}>
                    {saving ? (
                      <><span className="spinner-border spinner-border-sm me-1"></span>Enregistrement...</>
                    ) : (
                      <><i className="bi bi-check-lg me-1"></i>Enregistrer</>
                    )}
                  </button>
                  <button className="btn btn-outline-secondary" onClick={() => setEditing(false)}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Vitals */}
                {record.vitals && (record.vitals.blood_pressure || record.vitals.heart_rate || record.vitals.temperature || record.vitals.respiratory_rate || record.vitals.oxygen_saturation) && (
                  <div className="row g-3 mb-4 pb-3 border-bottom">
                    <h6 className="col-12"><i className="bi bi-heart-pulse me-2"></i>Constantes vitales</h6>
                    {record.vitals.blood_pressure && (
                      <div className="col-md-3">
                        <small className="text-muted">Tension artérielle</small>
                        <p className="mb-0 fw-semibold">{record.vitals.blood_pressure.label || '—'}</p>
                      </div>
                    )}
                    {record.vitals.heart_rate && (
                      <div className="col-md-3">
                        <small className="text-muted">Fréquence cardiaque</small>
                        <p className="mb-0 fw-semibold">{record.vitals.heart_rate.label || '—'}</p>
                      </div>
                    )}
                    {record.vitals.temperature && (
                      <div className="col-md-3">
                        <small className="text-muted">Température</small>
                        <p className="mb-0 fw-semibold">{record.vitals.temperature.label || '—'}</p>
                      </div>
                    )}
                    {record.vitals.respiratory_rate && (
                      <div className="col-md-3">
                        <small className="text-muted">Fréquence respiratoire</small>
                        <p className="mb-0 fw-semibold">{record.vitals.respiratory_rate.label || '—'}</p>
                      </div>
                    )}
                    {record.vitals.oxygen_saturation && (
                      <div className="col-md-3">
                        <small className="text-muted">Saturation O₂</small>
                        <p className="mb-0 fw-semibold">{record.vitals.oxygen_saturation.label || '—'}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <h6 className="text-muted"><i className="bi bi-thermometer me-1"></i>Symptômes</h6>
                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                      {record.symptoms || <span className="text-muted">Non renseigné</span>}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted"><i className="bi bi-clipboard2-pulse me-1"></i>Diagnostic</h6>
                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                      {record.diagnosis || <span className="text-muted">Non renseigné</span>}
                    </p>
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <h6 className="text-muted"><i className="bi bi-bandaid me-1"></i>Traitement</h6>
                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                      {record.treatment || <span className="text-muted">Non renseigné</span>}
                    </p>
                  </div>
                  <div className="col-md-3">
                    <h6 className="text-muted"><i className="bi bi-calendar-plus me-1"></i>Date de suivi</h6>
                    <p className="mb-0">
                      {record.follow_up_needed ? (record.follow_up_date || <span className="text-danger">Non définie</span>) : <span className="text-muted">—</span>}
                    </p>
                  </div>
                  <div className="col-md-3">
                    <h6 className="text-muted"><i className="bi bi-shield-check me-1"></i>Confidentialité</h6>
                    <span className={`badge ${confidentialityLabel(record.confidentiality_level).class}`}>
                      {confidentialityLabel(record.confidentiality_level).text}
                    </span>
                  </div>
                </div>
                {record.diagnosis_code && (
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <h6 className="text-muted"><i className="bi bi-upc-scan me-1"></i>Code CIM-10</h6>
                      <p className="mb-0"><code>{record.diagnosis_code}</code></p>
                    </div>
                  </div>
                )}
                {record.notes && (
                  <div className="row g-3 mb-3">
                    <div className="col-md-12">
                      <h6 className="text-muted"><i className="bi bi-journal-text me-1"></i>Notes</h6>
                      <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{record.notes}</p>
                    </div>
                  </div>
                )}
                <div className="text-muted mt-3" style={{ fontSize: '0.85rem' }}>
                  <i className="bi bi-clock me-1"></i>Créé le {formatDateTime(record.created_at)}
                  {record.updated_at && record.updated_at !== record.created_at && (
                    <> · Modifié le {formatDateTime(record.updated_at)}</>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== TAB: Prescriptions ========== */}
      {activeTab === 'prescriptions' && (
        <div className="card shadow-sm">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0"><i className="bi bi-capsule me-2"></i>Ordonnances</h6>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setEditingPrescription(null);
              setPrescriptionForm({
                medication_name: '', dosage: '', frequency: '',
                duration: '', quantity: '', form: 'tablet', instructions: ''
              });
              setShowPrescriptionForm(true);
            }}>
              <i className="bi bi-plus-lg me-1"></i>Ajouter
            </button>
          </div>
          <div className="card-body">
            {showPrescriptionForm && (
              <form onSubmit={handlePrescriptionSubmit} className="border rounded p-3 mb-3 bg-light">
                <h6 className="mb-3">{editingPrescription ? 'Modifier l\'ordonnance' : 'Nouvelle ordonnance'}</h6>
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label">Médicament *</label>
                    <input type="text" className="form-control" required
                      value={prescriptionForm.medication_name}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medication_name: e.target.value })}
                      placeholder="Nom du médicament" />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Posologie *</label>
                    <input type="text" className="form-control" required
                      value={prescriptionForm.dosage}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })}
                      placeholder="ex: 500mg" />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Fréquence *</label>
                    <input type="text" className="form-control" required
                      value={prescriptionForm.frequency}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })}
                      placeholder="ex: 3x/jour" />
                  </div>
                  {/* FIX: ajout champ quantity (obligatoire) */}
                  <div className="col-md-1">
                    <label className="form-label">Qté *</label>
                    <input type="number" className="form-control" required min="1"
                      value={prescriptionForm.quantity}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, quantity: e.target.value })} />
                  </div>
                  {/* FIX: ajout champ form (forme du médicament) */}
                  <div className="col-md-2">
                    <label className="form-label">Forme</label>
                    <select className="form-select"
                      value={prescriptionForm.form}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, form: e.target.value })}>
                      <option value="tablet">Comprimé</option>
                      <option value="capsule">Capsule</option>
                      <option value="liquid">Liquide</option>
                      <option value="injection">Injection</option>
                      <option value="cream">Crème</option>
                      <option value="ointment">Pommade</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Durée</label>
                    <input type="text" className="form-control"
                      value={prescriptionForm.duration}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration: e.target.value })}
                      placeholder="ex: 7 jours" />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Instructions</label>
                    <input type="text" className="form-control"
                      value={prescriptionForm.instructions}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
                      placeholder="Instructions particulières..." />
                  </div>
                  <div className="col-12 d-flex gap-2">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={savingPrescription}>
                      {savingPrescription ? (
                        <><span className="spinner-border spinner-border-sm me-1"></span>Enregistrement...</>
                      ) : (
                        <><i className="bi bi-check-lg me-1"></i>{editingPrescription ? 'Mettre à jour' : 'Ajouter'}</>
                      )}
                    </button>
                    <button type="button" className="btn btn-outline-secondary btn-sm"
                      onClick={() => { setShowPrescriptionForm(false); setEditingPrescription(null); }}>
                      Annuler
                    </button>
                  </div>
                </div>
              </form>
            )}

            {prescriptions.length === 0 ? (
              <p className="text-muted text-center py-3">Aucune ordonnance</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Médicament</th>
                      <th>Posologie</th>
                      <th>Forme</th>
                      <th>Fréquence</th>
                      <th>Durée</th>
                      <th>Qté</th>
                      <th>Instructions</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((p) => (
                      <tr key={p.id}>
                        <td className="fw-semibold">{p.medication_name}</td>
                        <td>{p.dosage}</td>
                        <td>{p.form_display || p.form || '—'}</td>
                        <td>{p.frequency}</td>
                        <td>{p.duration || '—'}</td>
                        <td>{p.quantity || '—'}</td>
                        <td>{p.instructions || '—'}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleEditPrescription(p)}>
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeletePrescription(p.id)}>
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
      )}

      {/* ========== TAB: Attachments ========== */}
      {activeTab === 'attachments' && (
        <div className="card shadow-sm">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0"><i className="bi bi-paperclip me-2"></i>Pièces jointes</h6>
            <div>
              <input type="file" ref={fileInputRef} className="d-none" onChange={handleFileUpload}
                accept=".pdf,.jpg,.jpeg,.png" />
              <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? (
                  <><span className="spinner-border spinner-border-sm me-1"></span>Upload...</>
                ) : (
                  <><i className="bi bi-upload me-1"></i>Uploader</>
                )}
              </button>
            </div>
          </div>
          <div className="card-body">
            {attachments.length === 0 ? (
              <p className="text-muted text-center py-3">Aucune pièce jointe</p>
            ) : (
              <div className="list-group">
                {attachments.map((att) => (
                  <div key={att.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <i className="bi bi-file-earmark me-2"></i>
                      <strong>{att.file_name || 'Fichier'}</strong>
                      {att.description && <span className="text-muted ms-2">— {att.description}</span>}
                      <span className="badge bg-light text-dark ms-2">{att.file_type_display || att.file_type || '—'}</span>
                      {att.uploaded_at && (
                        <small className="text-muted d-block mt-1">{formatDateTime(att.uploaded_at)}</small>
                      )}
                    </div>
                    <div>
                      <button className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => handleDownloadAttachment(att)}>
                        <i className="bi bi-download"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteAttachment(att.id)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorMedicalRecordDetail;