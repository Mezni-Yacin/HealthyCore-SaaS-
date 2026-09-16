import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const cardStyle = { borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };

export default function DoctorMedicalRecords() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctorName, setDoctorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [form, setForm] = useState({
    patient: '', appointment: '', symptoms: '', diagnosis: '', diagnosis_code: '',
    treatment: '', priority: 'medium', confidentiality_level: 'normal',
    blood_pressure_systolic: '', blood_pressure_diastolic: '', heart_rate: '',
    respiratory_rate: '', oxygen_saturation: '', temperature: '', notes: '',
    follow_up_needed: false, follow_up_date: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRecords();
    fetchStats();
    fetchPatients();
    fetchDoctorProfile();
  }, [currentPage, search, filterDate, filterPriority]);

  const fetchRecords = async () => {
    try {
      setLoading(true); setError('');
      const params = { page: currentPage };
      if (search) params.search = search;
      if (filterDate) params.date_from = filterDate;
      if (filterPriority) params.priority = filterPriority;
      const res = await api.get('/medical-records/doctor/', { params });
      setRecords(res.data.results || res.data);
    } catch (err) {
      setError('Erreur lors du chargement des dossiers médicaux.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try { const res = await api.get('/medical-records/doctor/stats/'); setStats(res.data); } catch (err) {}
  };

  const fetchPatients = async () => {
    try { const res = await api.get('/medical-records/doctor/patients-dropdown/'); setPatients(res.data); } catch (err) {}
  };

  const fetchDoctorProfile = async () => {
    try {
      const res = await api.get('/users/profile/');
      const profile = res.data;
      setDoctorName(profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : profile.username || 'Médecin');
    } catch (err) {}
  };

  const fetchPatientAppointments = async (patientId) => {
    if (!patientId) { setAppointments([]); return; }
    try {
      const res = await api.get('/appointments/doctor/', { params: { patient: patientId } });
      setAppointments(res.data.results || res.data || []);
    } catch (err) { setAppointments([]); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: '' });
  };

  const handlePatientChange = (e) => {
    const patientId = e.target.value;
    setForm({ ...form, patient: patientId, appointment: '' });
    if (formErrors.patient) setFormErrors({ ...formErrors, patient: '' });
    setAppointments([]);
    if (patientId) fetchPatientAppointments(patientId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setFormErrors({});
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(key => { if (payload[key] === '' || payload[key] === null) delete payload[key]; });
      await api.post('/medical-records/doctor/', payload);
      setShowModal(false);
      setForm({ patient: '', appointment: '', symptoms: '', diagnosis: '', diagnosis_code: '', treatment: '', priority: 'medium', confidentiality_level: 'normal', blood_pressure_systolic: '', blood_pressure_diastolic: '', heart_rate: '', respiratory_rate: '', oxygen_saturation: '', temperature: '', notes: '', follow_up_needed: false, follow_up_date: '' });
      setAppointments([]);
      fetchRecords(); fetchStats();
    } catch (err) {
      if (err.response && err.response.data) setFormErrors(err.response.data);
      else setFormErrors({ detail: 'Erreur lors de la création du dossier.' });
    } finally { setSubmitting(false); }
  };

  const getPriorityBadge = (priority) => {
    const map = { low: 'bg-secondary-subtle text-secondary', medium: 'bg-primary-subtle text-primary', high: 'bg-warning-subtle text-warning', emergency: 'bg-danger-subtle text-danger' };
    const labels = { low: 'Basse', medium: 'Moyenne', high: 'Haute', emergency: 'Urgence' };
    return <span className={`badge ${map[priority] || map.medium} px-3 py-2`}>{labels[priority] || priority}</span>;
  };

  const getConfidentialityBadge = (level) => {
    const map = { normal: 'bg-success-subtle text-success', sensitive: 'bg-warning-subtle text-warning', highly_sensitive: 'bg-danger-subtle text-danger' };
    return <span className={`badge ${map[level] || map.normal} px-3 py-2`}>{level}</span>;
  };

  const formatAppointmentLabel = (apt) => {
    if (!apt) return '';
    const dateStr = apt.date_time || apt.date || '';
    if (!dateStr) return `RDV #${apt.id}`;
    const d = new Date(dateStr);
    const formatted = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const statusMap = { scheduled: 'Planifié', confirmed: 'Confirmé', completed: 'Terminé', cancelled: 'Annulé', no_show: 'Absent' };
    const status = statusMap[apt.status] || apt.status || '';
    return `${formatted} — ${status}`;
  };

  const availableAppointments = appointments.filter(apt => {
    if (apt.medical_record) return false;
    if (apt.status === 'cancelled') return false;
    return true;
  });

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1"><i className="bi bi-folder2-open me-2 text-primary"></i>Dossiers Médicaux</h2>
          <p className="text-muted mb-0">Gérez les dossiers et consultations de vos patients</p>
        </div>
        <button className="btn btn-primary px-4 py-2 rounded-3" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg me-2"></i>Nouveau dossier
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="row g-3 mb-4">
          {[
            { label: 'Total dossiers', val: stats.total_records, color: 'primary', icon: 'bi-folder-fill' },
            { label: 'Patients', val: stats.total_patients, color: 'success', icon: 'bi-people-fill' },
            { label: 'Ce mois', val: stats.records_this_month, color: 'info', icon: 'bi-calendar-month-fill' },
            { label: 'Suivis en attente', val: stats.upcoming_followups, color: 'warning', icon: 'bi-clock-history' }
          ].map((s, i) => (
            <div key={i} className="col-md-3 col-6">
              <div className="card h-100 p-3" style={cardStyle}>
                <div className="d-flex align-items-center gap-3">
                  <div className={`bg-${s.color} bg-opacity-10 text-${s.color} rounded-3 d-flex align-items-center justify-content-center`} style={{ width: '48px', height: '48px' }}>
                    <i className={`bi ${s.icon} fs-4`}></i>
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold">{s.val}</h5>
                    <small className="text-muted">{s.label}</small>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4" style={cardStyle}>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0"><i className="bi bi-search"></i></span>
                <input type="text" className="form-control border-start-0" placeholder="Rechercher un patient, diagnostic..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
              </div>
            </div>
            <div className="col-md-3">
              <input type="date" className="form-control" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}>
                <option value="">Toutes les priorités</option>
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="emergency">Urgence</option>
              </select>
            </div>
            <div className="col-md-1">
              <button className="btn btn-outline-secondary w-100 rounded-3" onClick={() => { setSearch(''); setFilterDate(''); setFilterPriority(''); setCurrentPage(1); }} title="Réinitialiser">
                <i className="bi bi-x-circle"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{borderRadius: '12px'}}><i className="bi bi-exclamation-triangle me-2"></i>{error}</div>}

      {/* Table */}
      <div className="card" style={cardStyle}>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="mt-2 text-muted">Chargement des dossiers...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-folder-x text-muted" style={{fontSize: '3rem'}}></i>
              <p className="mt-3 text-muted">Aucun dossier médical trouvé.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="text-uppercase text-muted" style={{fontSize: '0.75rem'}}>
                    <th className="ps-4">Date</th>
                    <th>Patient</th>
                    <th>Diagnostic</th>
                    <th>Priorité</th>
                    <th>Confidentialité</th>
                    <th>Ordonnances</th>
                    <th>Suivi</th>
                    <th className="pe-4 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/medical-records/${record.id}`)}>
                      <td className="ps-4 text-muted small">{record.date}</td>
                      <td className="fw-bold text-dark">{record.patient_name || '—'}</td>
                      <td className="text-truncate" style={{ maxWidth: '200px' }}>{record.diagnosis_summary || record.diagnosis || <span className="text-muted fst-italic">Non renseigné</span>}</td>
                      <td>{getPriorityBadge(record.priority)}</td>
                      <td><span className="badge bg-light text-dark px-3 py-2">{record.confidentiality_display || record.confidentiality_level}</span></td>
                      <td><span className="badge bg-light text-dark px-3 py-2">{record.prescriptions_count || 0}</span></td>
                      <td>
                        {record.follow_up_needed ? (
                          <span className="badge bg-info-subtle text-info px-3 py-2"><i className="bi bi-calendar-check me-1"></i>{record.follow_up_date}</span>
                        ) : (<span className="text-muted">—</span>)}
                      </td>
                      <td className="pe-4 text-end">
                        <button className="btn btn-sm btn-outline-primary rounded-3 px-3" onClick={(e) => { e.stopPropagation(); navigate(`/medical-records/${record.id}`); }}>
                          <i className="bi bi-eye me-1"></i> Voir
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

      {!loading && records.length > 0 && (
        <nav className="mt-4 d-flex justify-content-center">
          <ul className="pagination">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button className="page-link rounded-3 mx-1" onClick={() => setCurrentPage(p => p - 1)}><i className="bi bi-chevron-left"></i></button>
            </li>
            <li className="page-item active"><span className="page-link rounded-3 mx-1">{currentPage}</span></li>
            <li className="page-item">
              <button className="page-link rounded-3 mx-1" onClick={() => setCurrentPage(p => p + 1)}>Suivant <i className="bi bi-chevron-right"></i></button>
            </li>
          </ul>
        </nav>
      )}

      {/* ═══ MODAL CRÉATION DOSSIER ═══ */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{borderRadius: '16px', border: 'none'}}>
              <div className="modal-header bg-primary text-white" style={{borderRadius: '16px 16px 0 0'}}>
                <h5 className="modal-title fw-bold"><i className="bi bi-file-medical me-2"></i>Nouveau Dossier Médical</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  {formErrors.detail && <div className="alert alert-danger">{formErrors.detail}</div>}

                  {doctorName && (
                    <div className="alert alert-light border d-flex align-items-center py-2 mb-4">
                      <i className="bi bi-person-badge-fill text-primary me-2 fs-5"></i>
                      <div><small className="text-muted d-block" style={{fontSize: '0.7rem'}}>Médecin responsable</small><strong>{doctorName}</strong></div>
                    </div>
                  )}

                  <h6 className="text-uppercase text-muted fw-bold mb-3" style={{fontSize: '0.8rem'}}><i className="bi bi-info-circle me-2"></i>Contexte</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Patient <span className="text-danger">*</span></label>
                      <select name="patient" className={`form-select ${formErrors.patient ? 'is-invalid' : ''}`} value={form.patient} onChange={handlePatientChange} required>
                        <option value="">-- Sélectionner --</option>
                                                {patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {/* ✅ FIX: On s'assure d'afficher un nom même si full_name est vide */}
                            {p.full_name || `Patient #${p.id}`} {p.date_of_birth ? `(${p.date_of_birth})` : ''}
                          </option>
                        ))}
                      </select>
                      {formErrors.patient && <div className="invalid-feedback">{formErrors.patient}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Rendez-vous lié <small className="text-muted">(optionnel)</small></label>
                      <select name="appointment" className={`form-select ${formErrors.appointment ? 'is-invalid' : ''}`} value={form.appointment} onChange={handleChange} disabled={!form.patient}>
                        <option value="">-- Aucun --</option>
                        {availableAppointments.map((apt) => (<option key={apt.id} value={apt.id}>{formatAppointmentLabel(apt)}</option>))}
                      </select>
                      {formErrors.appointment && <div className="invalid-feedback">{Array.isArray(formErrors.appointment) ? formErrors.appointment[0] : formErrors.appointment}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Priorité</label>
                      <select name="priority" className="form-select" value={form.priority} onChange={handleChange}>
                        <option value="low">Basse</option><option value="medium">Moyenne</option><option value="high">Haute</option><option value="emergency">Urgence</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Confidentialité</label>
                      <select name="confidentiality_level" className="form-select" value={form.confidentiality_level} onChange={handleChange}>
                        <option value="normal">Normale</option><option value="sensitive">Sensible</option><option value="highly_sensitive">Très sensible</option>
                      </select>
                    </div>
                  </div>

                  <h6 className="text-uppercase text-muted fw-bold mb-3" style={{fontSize: '0.8rem'}}><i className="bi bi-clipboard2-pulse me-2"></i>Clinique</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Symptômes</label>
                      <textarea name="symptoms" className="form-control" rows="2" value={form.symptoms} onChange={handleChange} placeholder="Décrivez les symptômes..."></textarea>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Diagnostic</label>
                      <textarea name="diagnosis" className="form-control" rows="2" value={form.diagnosis} onChange={handleChange} placeholder="Diagnostic..."></textarea>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Code CIM-10</label>
                      <input type="text" name="diagnosis_code" className="form-control" value={form.diagnosis_code} onChange={handleChange} placeholder="ex: J06.9" />
                    </div>
                    <div className="col-md-9">
                      <label className="form-label fw-semibold">Traitement</label>
                      <input type="text" name="treatment" className="form-control" value={form.treatment} onChange={handleChange} placeholder="Plan de traitement..." />
                    </div>
                  </div>

                  <h6 className="text-uppercase text-muted fw-bold mb-3" style={{fontSize: '0.8rem'}}><i className="bi bi-heart-pulse me-2"></i>Constantes Vitales</h6>
                  <div className="row g-3 mb-4 bg-light p-3 rounded-3">
                    <div className="col-md-2"><label className="form-label small">Tension Sys.</label><input type="number" name="blood_pressure_systolic" className="form-control" value={form.blood_pressure_systolic} onChange={handleChange} placeholder="120" /></div>
                    <div className="col-md-2"><label className="form-label small">Tension Dia.</label><input type="number" name="blood_pressure_diastolic" className="form-control" value={form.blood_pressure_diastolic} onChange={handleChange} placeholder="80" /></div>
                    <div className="col-md-2"><label className="form-label small">FC (bpm)</label><input type="number" name="heart_rate" className="form-control" value={form.heart_rate} onChange={handleChange} placeholder="72" /></div>
                    <div className="col-md-2"><label className="form-label small">FR (cpm)</label><input type="number" name="respiratory_rate" className="form-control" value={form.respiratory_rate} onChange={handleChange} placeholder="16" /></div>
                    <div className="col-md-2"><label className="form-label small">Temp. (°C)</label><input type="number" step="0.1" name="temperature" className="form-control" value={form.temperature} onChange={handleChange} placeholder="37.0" /></div>
                    <div className="col-md-2"><label className="form-label small">SpO2 (%)</label><input type="number" name="oxygen_saturation" className="form-control" value={form.oxygen_saturation} onChange={handleChange} placeholder="98" /></div>
                  </div>

                  <h6 className="text-uppercase text-muted fw-bold mb-3" style={{fontSize: '0.8rem'}}><i className="bi bi-calendar-check me-2"></i>Suivi & Notes</h6>
                  <div className="row g-3">
                    <div className="col-md-12">
                      <label className="form-label fw-semibold">Notes</label>
                      <textarea name="notes" className="form-control" rows="2" value={form.notes} onChange={handleChange} placeholder="Notes supplémentaires..."></textarea>
                    </div>
                    <div className="col-md-4 d-flex align-items-center">
                      <div className="form-check mt-2">
                        <input className="form-check-input" type="checkbox" name="follow_up_needed" id="followUpNeeded" checked={form.follow_up_needed} onChange={handleChange} />
                        <label className="form-check-label fw-semibold" htmlFor="followUpNeeded">Suivi nécessaire</label>
                      </div>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label fw-semibold">Date de suivi</label>
                      <input type="date" name="follow_up_date" className={`form-control ${formErrors.follow_up_date ? 'is-invalid' : ''}`} value={form.follow_up_date} onChange={handleChange} />
                      {formErrors.follow_up_date && <div className="invalid-feedback">{formErrors.follow_up_date}</div>}
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top-0 p-4">
                  <button type="button" className="btn btn-light px-4 rounded-3" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary px-4 rounded-3" disabled={submitting}>
                    {submitting ? (<><span className="spinner-border spinner-border-sm me-1"></span>Enregistrement...</>) : (<><i className="bi bi-check-lg me-1"></i>Créer le dossier</>)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}