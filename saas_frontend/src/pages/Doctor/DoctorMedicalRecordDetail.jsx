import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const cardStyle = { borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };
const iconBox = (color) => ({ width: '48px', height: '48px', borderRadius: '12px', background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' });

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

  const [prescriptions, setPrescriptions] = useState([]);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({ medication_name: '', dosage: '', frequency: '', duration: '', quantity: '', form: 'tablet', instructions: '' });
  const [editingPrescription, setEditingPrescription] = useState(null);
  const [savingPrescription, setSavingPrescription] = useState(false);

  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => {
    const map = {
      scheduled: 'bg-info-subtle text-info', confirmed: 'bg-primary-subtle text-primary',
      completed: 'bg-success-subtle text-success', cancelled: 'bg-danger-subtle text-danger',
      no_show: 'bg-warning-subtle text-warning'
    };
    return map[status] || 'bg-secondary-subtle text-secondary';
  };

  const confidentialityLabel = (level) => {
    const map = { normal: { text: 'Normal', class: 'bg-success-subtle text-success' }, sensitive: { text: 'Sensible', class: 'bg-warning-subtle text-warning' }, highly_sensitive: { text: 'Très sensible', class: 'bg-danger-subtle text-danger' } };
    return map[level] || map.normal;
  };

  const priorityBadge = (priority) => {
    const map = { low: { text: 'Basse', class: 'bg-secondary-subtle text-secondary' }, medium: { text: 'Moyenne', class: 'bg-primary-subtle text-primary' }, high: { text: 'Haute', class: 'bg-warning-subtle text-warning' }, emergency: { text: 'Urgence', class: 'bg-danger-subtle text-danger' } };
    return map[priority] || map.medium;
  };

  useEffect(() => { fetchRecord(); }, [id]);

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/medical-records/doctor/${id}/`);
      setRecord(res.data);
      setPrescriptions(res.data.prescriptions || []);
      setAttachments(res.data.attachments || []);
      setEditData({
        symptoms: res.data.symptoms || '', diagnosis: res.data.diagnosis || '', treatment: res.data.treatment || '',
        diagnosis_code: res.data.diagnosis_code || '', notes: res.data.notes || '', follow_up_date: res.data.follow_up_date || '',
        follow_up_needed: res.data.follow_up_needed || false, confidentiality_level: res.data.confidentiality_level || 'normal',
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
      const payload = { ...editData };
      Object.keys(payload).forEach(key => { if (payload[key] === '' || payload[key] === null) delete payload[key]; });
      await api.patch(`/medical-records/doctor/${id}/`, payload);
      setEditing(false);
      await fetchRecord();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const cleanPrescriptionData = (data) => {
    const cleaned = { ...data };
    if (!cleaned.duration) delete cleaned.duration;
    if (!cleaned.instructions) delete cleaned.instructions;
    cleaned.quantity = parseInt(cleaned.quantity) || 1;
    return cleaned;
  };

  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingPrescription(true);
      const payload = cleanPrescriptionData(prescriptionForm);
      if (editingPrescription) {
        await api.patch(`/medical-records/doctor/${id}/prescriptions/${editingPrescription.id}/`, payload);
      } else {
        await api.post(`/medical-records/doctor/${id}/prescriptions/`, payload);
      }
      setShowPrescriptionForm(false);
      setEditingPrescription(null);
      setPrescriptionForm({ medication_name: '', dosage: '', frequency: '', duration: '', quantity: '', form: 'tablet', instructions: '' });
      await fetchRecord();
    } catch (err) {
      const msg = err.response?.data;
      setError(typeof msg === 'object' ? Object.values(msg).flat().join(' — ') : (msg?.detail || 'Erreur ordonnance'));
    } finally {
      setSavingPrescription(false);
    }
  };

  const handleEditPrescription = (p) => {
    setEditingPrescription(p);
    setPrescriptionForm({ medication_name: p.medication_name, dosage: p.dosage, frequency: p.frequency, duration: p.duration || '', quantity: p.quantity || '', form: p.form || 'tablet', instructions: p.instructions || '' });
    setShowPrescriptionForm(true);
  };

  const handleDeletePrescription = async (prescriptionId) => {
    if (!window.confirm('Supprimer cette ordonnance ?')) return;
    try {
      await api.delete(`/medical-records/doctor/${id}/prescriptions/${prescriptionId}/`);
      await fetchRecord();
    } catch (err) { setError('Erreur lors de la suppression'); }
  };

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
      formData.append('file_type', getFileType(file.name));
      formData.append('description', file.name);
      await api.post(`/medical-records/doctor/${id}/attachments/upload/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchRecord();
    } catch (err) { setError('Erreur lors de l\'upload du fichier.'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Supprimer ce fichier ?')) return;
    try { await api.delete(`/medical-records/doctor/${id}/attachments/${attachmentId}/`); await fetchRecord(); }
    catch (err) { setError('Erreur lors de la suppression du fichier'); }
  };

  const handleDownloadAttachment = (attachment) => {
    const link = document.createElement('a');
    link.href = attachment.file || attachment.file_url || '';
    link.download = attachment.file_name || 'fichier';
    link.target = '_blank';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}><div className="spinner-border text-primary" role="status"></div></div>;

  if (error && !record) {
    return (
      <div className="alert alert-danger m-4 p-4" style={{ borderRadius: '16px' }}>
        <i className="bi bi-exclamation-triangle me-2"></i>{error}
        <button className="btn btn-outline-danger btn-sm ms-3" onClick={() => navigate(-1)}>Retour</button>
      </div>
    );
  }

  if (!record) return null;

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-light btn-sm rounded-3 p-2" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left fs-6"></i>
          </button>
          <div>
            <h4 className="mb-1 fw-bold"><i className="bi bi-file-medical me-2 text-primary"></i>Dossier Médical</h4>
            <div className="d-flex gap-2">
              <span className={`badge ${confidentialityLabel(record.confidentiality_level).class} px-3 py-2`}>
                <i className="bi bi-shield-check me-1"></i>{confidentialityLabel(record.confidentiality_level).text}
              </span>
              {record.priority && (
                <span className={`badge ${priorityBadge(record.priority).class} px-3 py-2`}>
                  <i className="bi bi-flag me-1"></i>{priorityBadge(record.priority).text}
                </span>
              )}
            </div>
          </div>
        </div>
        {!editing ? (
          <button className="btn btn-primary px-4 py-2 rounded-3" onClick={() => setEditing(true)}>
            <i className="bi bi-pencil me-2"></i>Modifier le dossier
          </button>
        ) : (
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary px-4 rounded-3" onClick={() => setEditing(false)}>Annuler</button>
            <button className="btn btn-success px-4 rounded-3" onClick={handleEditSave} disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Sauvegarde...</> : <><i className="bi bi-check-lg me-2"></i>Enregistrer</>}
            </button>
          </div>
        )}
      </div>

      {/* Patient + Doctor Info Cards */}
      <div className="row mb-4 g-3">
        <div className="col-md-4">
          <div className="card h-100 p-3" style={cardStyle}>
            <div className="d-flex align-items-center gap-3">
              <div style={iconBox('#2563eb')}><i className="bi bi-person-fill"></i></div>
              <div>
                <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Patient</small>
                <h6 className="mb-0">{record.patient_info?.full_name || '—'}</h6>
                <small className="text-muted">{record.patient_info?.phone_number || ''}</small>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100 p-3" style={cardStyle}>
            <div className="d-flex align-items-center gap-3">
              <div style={iconBox('#7c3aed')}><i className="bi bi-person-badge-fill"></i></div>
              <div>
                <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Médecin</small>
                <h6 className="mb-0">{record.doctor_info?.full_name || '—'}</h6>
                <small className="text-muted">{record.doctor_info?.specialty || ''}</small>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100 p-3" style={cardStyle}>
            <div className="d-flex align-items-center gap-3">
              <div style={iconBox('#059669')}><i className="bi bi-calendar-check-fill"></i></div>
              <div>
                <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Consultation</small>
                <h6 className="mb-0">{record.appointment_info ? formatDateTime(record.appointment_info.date_time) : 'Hors RDV'}</h6>
                {record.appointment_info && <span className={`badge ${getStatusBadge(record.appointment_info.status)}`}>{record.appointment_info.status_display || record.appointment_info.status}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger alert-dismissible fade show" style={{borderRadius: '12px'}}><i className="bi bi-exclamation-triangle me-2"></i>{error}<button type="button" className="btn-close" onClick={() => setError('')}></button></div>}

      {/* Tabs */}
      <ul className="nav nav-pills mb-3 gap-2">
        <li className="nav-item"><button className={`nav-link rounded-3 ${activeTab === 'details' ? 'active' : 'text-muted'}`} onClick={() => setActiveTab('details')}><i className="bi bi-info-circle me-2"></i>Détails</button></li>
        <li className="nav-item"><button className={`nav-link rounded-3 ${activeTab === 'prescriptions' ? 'active' : 'text-muted'}`} onClick={() => setActiveTab('prescriptions')}><i className="bi bi-capsule me-2"></i>Ordonnances <span className="badge bg-light text-dark ms-1">{prescriptions.length}</span></button></li>
        <li className="nav-item"><button className={`nav-link rounded-3 ${activeTab === 'attachments' ? 'active' : 'text-muted'}`} onClick={() => setActiveTab('attachments')}><i className="bi bi-paperclip me-2"></i>Pièces jointes <span className="badge bg-light text-dark ms-1">{attachments.length}</span></button></li>
      </ul>

      {/* TAB: Details */}
      {activeTab === 'details' && (
        <div className="card" style={cardStyle}>
          <div className="card-body p-4">
            {editing ? (
              <div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Symptômes</label>
                    <textarea className="form-control" rows="3" value={editData.symptoms || ''} onChange={(e) => setEditData({ ...editData, symptoms: e.target.value })} placeholder="Décrivez les symptômes..."></textarea>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Diagnostic</label>
                    <textarea className="form-control" rows="3" value={editData.diagnosis || ''} onChange={(e) => setEditData({ ...editData, diagnosis: e.target.value })} placeholder="Diagnostic..."></textarea>
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Traitement</label>
                    <textarea className="form-control" rows="3" value={editData.treatment || ''} onChange={(e) => setEditData({ ...editData, treatment: e.target.value })} placeholder="Plan de traitement..."></textarea>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Code CIM-10</label>
                    <input type="text" className="form-control" value={editData.diagnosis_code || ''} onChange={(e) => setEditData({ ...editData, diagnosis_code: e.target.value })} placeholder="ex: J06.9" />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Priorité</label>
                    <select className="form-select" value={editData.priority || 'medium'} onChange={(e) => setEditData({ ...editData, priority: e.target.value })}>
                      <option value="low">Basse</option><option value="medium">Moyenne</option><option value="high">Haute</option><option value="emergency">Urgence</option>
                    </select>
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Notes</label>
                    <textarea className="form-control" rows="2" value={editData.notes || ''} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} placeholder="Notes supplémentaires..."></textarea>
                  </div>
                  <div className="col-md-3">
                    <div className="form-check mt-4">
                      <input className="form-check-input" type="checkbox" id="editFollowUp" checked={editData.follow_up_needed || false} onChange={(e) => setEditData({ ...editData, follow_up_needed: e.target.checked })} />
                      <label className="form-check-label" htmlFor="editFollowUp">Suivi nécessaire</label>
                    </div>
                    {editData.follow_up_needed && <input type="date" className="form-control mt-2" value={editData.follow_up_date || ''} onChange={(e) => setEditData({ ...editData, follow_up_date: e.target.value })} />}
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Confidentialité</label>
                    <select className="form-select" value={editData.confidentiality_level || 'normal'} onChange={(e) => setEditData({ ...editData, confidentiality_level: e.target.value })}>
                      <option value="normal">Normal</option><option value="sensitive">Sensible</option><option value="highly_sensitive">Très sensible</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {record.vitals && (record.vitals.blood_pressure || record.vitals.heart_rate || record.vitals.temperature || record.vitals.respiratory_rate || record.vitals.oxygen_saturation) && (
                  <div className="bg-light p-3 rounded-3 mb-4">
                    <h6 className="text-primary mb-3"><i className="bi bi-heart-pulse me-2"></i>Constantes vitales</h6>
                    <div className="row g-3 text-center">
                      {record.vitals.blood_pressure && <div className="col"><small className="text-muted d-block">Tension</small><span className="fw-bold">{record.vitals.blood_pressure.label || '—'}</span></div>}
                      {record.vitals.heart_rate && <div className="col"><small className="text-muted d-block">FC</small><span className="fw-bold">{record.vitals.heart_rate.label || '—'}</span></div>}
                      {record.vitals.temperature && <div className="col"><small className="text-muted d-block">Temp</small><span className="fw-bold">{record.vitals.temperature.label || '—'}</span></div>}
                      {record.vitals.oxygen_saturation && <div className="col"><small className="text-muted d-block">O₂</small><span className="fw-bold">{record.vitals.oxygen_saturation.label || '—'}</span></div>}
                    </div>
                  </div>
                )}

                <div className="row g-4 mb-4">
                  <div className="col-md-6">
                    <h6 className="text-muted text-uppercase fw-bold mb-2" style={{fontSize: '0.75rem'}}><i className="bi bi-thermometer me-1"></i>Symptômes</h6>
                    <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>{record.symptoms || <span className="text-muted fst-italic">Non renseigné</span>}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted text-uppercase fw-bold mb-2" style={{fontSize: '0.75rem'}}><i className="bi bi-clipboard2-pulse me-1"></i>Diagnostic</h6>
                    <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>{record.diagnosis || <span className="text-muted fst-italic">Non renseigné</span>}</p>
                  </div>
                </div>

                <div className="row g-4 mb-4">
                  <div className="col-md-6">
                    <h6 className="text-muted text-uppercase fw-bold mb-2" style={{fontSize: '0.75rem'}}><i className="bi bi-bandaid me-1"></i>Traitement</h6>
                    <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>{record.treatment || <span className="text-muted fst-italic">Non renseigné</span>}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted text-uppercase fw-bold mb-2" style={{fontSize: '0.75rem'}}><i className="bi bi-journal-text me-1"></i>Notes & Suivi</h6>
                    <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>{record.notes || <span className="text-muted fst-italic">Aucune note</span>}</p>
                    {record.follow_up_needed && <span className="badge bg-warning-subtle text-warning mt-2"><i className="bi bi-calendar-plus me-1"></i>Suivi: {record.follow_up_date || 'Non défini'}</span>}
                  </div>
                </div>

                <div className="text-muted mt-4 pt-3 border-top" style={{ fontSize: '0.8rem' }}>
                  <i className="bi bi-clock me-1"></i>Créé le {formatDateTime(record.created_at)}
                  {record.updated_at && record.updated_at !== record.created_at && <> · Modifié le {formatDateTime(record.updated_at)}</>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Prescriptions */}
      {activeTab === 'prescriptions' && (
        <div className="card" style={cardStyle}>
          <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-bold"><i className="bi bi-capsule me-2 text-primary"></i>Ordonnances Médicales</h6>
            <button className="btn btn-primary btn-sm rounded-3 px-3" onClick={() => { setEditingPrescription(null); setPrescriptionForm({ medication_name: '', dosage: '', frequency: '', duration: '', quantity: '', form: 'tablet', instructions: '' }); setShowPrescriptionForm(true); }}>
              <i className="bi bi-plus-lg me-1"></i>Ajouter
            </button>
          </div>
          <div className="card-body">
            {showPrescriptionForm && (
              <form onSubmit={handlePrescriptionSubmit} className="bg-light p-3 rounded-3 mb-4 border">
                <h6 className="mb-3 fw-bold">{editingPrescription ? 'Modifier l\'ordonnance' : 'Nouvelle ordonnance'}</h6>
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Médicament *</label>
                    <input type="text" className="form-control" required value={prescriptionForm.medication_name} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medication_name: e.target.value })} placeholder="Ex: Doliprane" />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small fw-semibold">Posologie *</label>
                    <input type="text" className="form-control" required value={prescriptionForm.dosage} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })} placeholder="500mg" />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small fw-semibold">Fréquence *</label>
                    <input type="text" className="form-control" required value={prescriptionForm.frequency} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })} placeholder="3x/jour" />
                  </div>
                  <div className="col-md-1">
                    <label className="form-label small fw-semibold">Qté *</label>
                    <input type="number" className="form-control" required min="1" value={prescriptionForm.quantity} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, quantity: e.target.value })} />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small fw-semibold">Forme</label>
                    <select className="form-select" value={prescriptionForm.form} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, form: e.target.value })}>
                      <option value="tablet">Comprimé</option><option value="capsule">Capsule</option><option value="liquid">Liquide</option><option value="injection">Injection</option><option value="cream">Crème</option><option value="other">Autre</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small fw-semibold">Durée</label>
                    <input type="text" className="form-control" value={prescriptionForm.duration} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration: e.target.value })} placeholder="7 jours" />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Instructions</label>
                    <input type="text" className="form-control" value={prescriptionForm.instructions} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })} placeholder="Avant les repas..." />
                  </div>
                  <div className="col-12 d-flex gap-2 mt-2">
                    <button type="submit" className="btn btn-primary btn-sm px-4" disabled={savingPrescription}>
                      {savingPrescription ? <><span className="spinner-border spinner-border-sm me-1"></span>Sauvegarde...</> : <><i className="bi bi-check-lg me-1"></i>{editingPrescription ? 'Mettre à jour' : 'Ajouter'}</>}
                    </button>
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { setShowPrescriptionForm(false); setEditingPrescription(null); }}>Annuler</button>
                  </div>
                </div>
              </form>
            )}

            {prescriptions.length === 0 ? (
              <div className="text-center py-5 text-muted"><i className="bi bi-capsule fs-1 d-block mb-2 opacity-50"></i><p>Aucune ordonnance prescrite.</p></div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="text-muted text-uppercase" style={{fontSize: '0.75rem'}}>
                    <tr><th>Médicament</th><th>Posologie</th><th>Fréquence</th><th>Durée</th><th className="text-end">Actions</th></tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((p) => (
                      <tr key={p.id} className="border-top">
                        <td className="fw-bold text-primary">{p.medication_name} <small className="text-muted d-block">{p.form_display || p.form}</small></td>
                        <td>{p.dosage}</td>
                        <td>{p.frequency} <small className="text-muted d-block">Qté: {p.quantity}</small></td>
                        <td>{p.duration || '—'}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-primary me-1 rounded-3" onClick={() => handleEditPrescription(p)}><i className="bi bi-pencil"></i></button>
                          <button className="btn btn-sm btn-outline-danger rounded-3" onClick={() => handleDeletePrescription(p.id)}><i className="bi bi-trash"></i></button>
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

      {/* TAB: Attachments */}
      {activeTab === 'attachments' && (
        <div className="card" style={cardStyle}>
          <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-bold"><i className="bi bi-paperclip me-2 text-primary"></i>Pièces jointes</h6>
            <div>
              <input type="file" ref={fileInputRef} className="d-none" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png" />
              <button className="btn btn-primary btn-sm rounded-3 px-3" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <><span className="spinner-border spinner-border-sm me-1"></span>Upload...</> : <><i className="bi bi-upload me-1"></i>Uploader</>}
              </button>
            </div>
          </div>
          <div className="card-body">
            {attachments.length === 0 ? (
              <div className="text-center py-5 text-muted"><i className="bi bi-folder2-open fs-1 d-block mb-2 opacity-50"></i><p>Aucune pièce jointe.</p></div>
            ) : (
              <div className="list-group">
                {attachments.map((att) => (
                  <div key={att.id} className="list-group-item list-group-item-action border-0 bg-light rounded-3 mb-2 p-3 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                      <div style={iconBox('#6c757d')}><i className="bi bi-file-earmark-text"></i></div>
                      <div>
                        <h6 className="mb-0">{att.file_name || 'Fichier'}</h6>
                        <small className="text-muted">{att.description} · {formatDateTime(att.uploaded_at)}</small>
                      </div>
                    </div>
                    <div>
                      <button className="btn btn-sm btn-outline-primary me-1 rounded-3" onClick={() => handleDownloadAttachment(att)} title="Télécharger"><i className="bi bi-download"></i></button>
                      <button className="btn btn-sm btn-outline-danger rounded-3" onClick={() => handleDeleteAttachment(att.id)} title="Supprimer"><i className="bi bi-trash"></i></button>
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