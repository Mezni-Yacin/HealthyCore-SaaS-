import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

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
    patient: '',
    appointment: '',
    symptoms: '',
    diagnosis: '',
    diagnosis_code: '',
    treatment: '',
    priority: 'medium',
    confidentiality_level: 'normal',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    temperature: '',
    notes: '',
    follow_up_needed: false,
    follow_up_date: '',
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
      setLoading(true);
      setError('');
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
    try {
      const res = await api.get('/medical-records/doctor/stats/');
      setStats(res.data);
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await api.get('/medical-records/doctor/patients-dropdown/');
      setPatients(res.data);
    } catch (err) {
      console.error('Erreur patients:', err);
    }
  };

  const fetchDoctorProfile = async () => {
    try {
      const res = await api.get('/users/profile/');
      const profile = res.data;
      setDoctorName(profile.first_name && profile.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile.username || 'Médecin');
    } catch (err) {
      console.error('Erreur profil médecin:', err);
    }
  };

  const fetchPatientAppointments = async (patientId) => {
    if (!patientId) {
      setAppointments([]);
      return;
    }
    try {
      const res = await api.get('/appointments/doctor/', { params: { patient: patientId } });
      setAppointments(res.data.results || res.data || []);
    } catch (err) {
      console.error('Erreur rendez-vous patient:', err);
      setAppointments([]);
    }
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
    if (patientId) {
      fetchPatientAppointments(patientId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || payload[key] === null) delete payload[key];
      });
      await api.post('/medical-records/doctor/', payload);
      setShowModal(false);
      setForm({
        patient: '', appointment: '', symptoms: '', diagnosis: '', diagnosis_code: '',
        treatment: '', priority: 'medium', confidentiality_level: 'normal',
        blood_pressure_systolic: '', blood_pressure_diastolic: '',
        heart_rate: '', respiratory_rate: '', oxygen_saturation: '',
        temperature: '', notes: '', follow_up_needed: false, follow_up_date: '',
      });
      setAppointments([]);
      fetchRecords();
      fetchStats();
    } catch (err) {
      if (err.response && err.response.data) {
        setFormErrors(err.response.data);
      } else {
        setFormErrors({ detail: 'Erreur lors de la création du dossier.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority) => {
    const map = { 'low': 'secondary', 'medium': 'primary', 'high': 'warning', 'emergency': 'danger' };
    const labels = { 'low': 'Basse', 'medium': 'Moyenne', 'high': 'Haute', 'emergency': 'Urgence' };
    return <span className={`badge bg-${map[priority] || 'secondary'}`}>{labels[priority] || priority}</span>;
  };

  const formatAppointmentLabel = (apt) => {
    if (!apt) return '';
    const dateStr = apt.date_time || apt.date || '';
    if (!dateStr) return `RDV #${apt.id}`;
    const d = new Date(dateStr);
    const formatted = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const statusMap = {
      'scheduled': 'Planifié', 'confirmed': 'Confirmé', 'completed': 'Terminé',
      'cancelled': 'Annulé', 'no_show': 'Absent',
    };
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1"><i className="bi bi-folder2-open me-2"></i>Dossiers Médicaux</h3>
          <p className="text-muted mb-0">Gérez les dossiers médicaux de vos patients</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg me-2"></i>Nouveau dossier
        </button>
      </div>

      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <h5 className="text-primary mb-1">{stats.total_records}</h5>
                <small className="text-muted">Total dossiers</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <h5 className="text-success mb-1">{stats.total_patients}</h5>
                <small className="text-muted">Patients</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <h5 className="text-info mb-1">{stats.records_this_month}</h5>
                <small className="text-muted">Ce mois</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <h5 className="text-warning mb-1">{stats.upcoming_followups}</h5>
                <small className="text-muted">Suivis en attente</small>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <input type="text" className="form-control" placeholder="Rechercher un patient, diagnostic..."
                value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="col-md-3">
              <input type="date" className="form-control" value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filterPriority}
                onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}>
                <option value="">Toutes les priorités</option>
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="emergency">Urgence</option>
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100"
                onClick={() => { setSearch(''); setFilterDate(''); setFilterPriority(''); setCurrentPage(1); }}>
                <i className="bi bi-x-circle me-1"></i> Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger"><i className="bi bi-exclamation-triangle me-2"></i>{error}</div>}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Chargement...</span></div>
              <p className="mt-2 text-muted">Chargement des dossiers...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-folder-x display-4 text-muted"></i>
              <p className="mt-2 text-muted">Aucun dossier médical trouvé.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Date</th>
                    <th>Patient</th>
                    <th>Priorité</th>
                    <th>Confidentialité</th>
                    <th>Diagnostic</th>
                    <th>Ordonnances</th>
                    <th>Suivi</th>
                    <th className="pe-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/medical-records/${record.id}`)}>
                      <td className="ps-3">{record.date}</td>
                      <td><strong>{record.patient_name || '—'}</strong></td>
                      <td>{getPriorityBadge(record.priority)}</td>
                      <td><span className="badge bg-light text-dark">{record.confidentiality_display || record.confidentiality_level}</span></td>
                      <td className="text-truncate" style={{ maxWidth: '150px' }}>{record.diagnosis_summary || record.diagnosis || '—'}</td>
                      <td><span className="badge bg-light text-dark">{record.prescriptions_count || 0}</span></td>
                      <td>
                        {record.follow_up_needed ? (
                          <span className="badge bg-info">{record.follow_up_date}</span>
                        ) : (<span className="text-muted">—</span>)}
                      </td>
                      <td className="pe-3">
                        <button className="btn btn-sm btn-outline-primary"
                          onClick={(e) => { e.stopPropagation(); navigate(`/medical-records/${record.id}`); }}>
                          <i className="bi bi-eye"></i>
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
        <nav className="mt-3">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setCurrentPage(p => p - 1)}>Précédent</button>
            </li>
            <li className="page-item active"><span className="page-link">{currentPage}</span></li>
            <li className="page-item">
              <button className="page-link" onClick={() => setCurrentPage(p => p + 1)}>Suivant</button>
            </li>
          </ul>
        </nav>
      )}

      {/* ═══ MODAL CRÉATION DOSSIER ═══ */}
      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="bi bi-file-medical me-2"></i>Nouveau Dossier Médical</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {formErrors.detail && <div className="alert alert-danger">{formErrors.detail}</div>}

                  {doctorName && (
                    <div className="alert alert-info py-2 mb-3">
                      <i className="bi bi-person-badge me-1"></i>
                      <strong>Médecin :</strong> {doctorName}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Patient <span className="text-danger">*</span></label>
                      <select name="patient" className={`form-select ${formErrors.patient ? 'is-invalid' : ''}`}
                        value={form.patient} onChange={handlePatientChange} required>
                        <option value="">-- Sélectionner un patient --</option>
                        {patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name}
                            {p.date_of_birth ? ` (${p.date_of_birth})` : ''}
                          </option>
                        ))}
                      </select>
                      {formErrors.patient && <div className="invalid-feedback">{formErrors.patient}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">
                        <i className="bi bi-calendar-event me-1"></i>Rendez-vous lié
                        <small className="text-muted ms-1">(optionnel)</small>
                      </label>
                      <select name="appointment" className={`form-select ${formErrors.appointment ? 'is-invalid' : ''}`}
                        value={form.appointment} onChange={handleChange} disabled={!form.patient}>
                        <option value="">-- Aucun rendez-vous --</option>
                        {availableAppointments.map((apt) => (
                          <option key={apt.id} value={apt.id}>
                            {formatAppointmentLabel(apt)}
                          </option>
                        ))}
                      </select>
                      {formErrors.appointment && <div className="invalid-feedback">{Array.isArray(formErrors.appointment) ? formErrors.appointment[0] : formErrors.appointment}</div>}
                      {form.patient && availableAppointments.length === 0 && appointments.length > 0 && (
                        <small className="text-muted">Tous les rendez-vous sont déjà liés ou annulés.</small>
                      )}
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Priorité</label>
                      <select name="priority" className="form-select" value={form.priority} onChange={handleChange}>
                        <option value="low">Basse</option>
                        <option value="medium">Moyenne</option>
                        <option value="high">Haute</option>
                        <option value="emergency">Urgence</option>
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Confidentialité</label>
                      <select name="confidentiality_level" className="form-select" value={form.confidentiality_level} onChange={handleChange}>
                        <option value="normal">Normale</option>
                        <option value="sensitive">Sensible</option>
                        <option value="highly_sensitive">Très sensible</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Symptômes</label>
                      <textarea name="symptoms" className="form-control" rows="3" value={form.symptoms} onChange={handleChange}
                        placeholder="Décrivez les symptômes du patient..." />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Diagnostic</label>
                      <textarea name="diagnosis" className="form-control" rows="3" value={form.diagnosis} onChange={handleChange}
                        placeholder="Diagnostic du médecin..." />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Code CIM-10</label>
                      <input type="text" name="diagnosis_code" className="form-control" value={form.diagnosis_code} onChange={handleChange} placeholder="ex: J06.9" />
                    </div>

                    <div className="col-md-9">
                      <label className="form-label">Traitement</label>
                      <textarea name="treatment" className="form-control" rows="2" value={form.treatment} onChange={handleChange} placeholder="Plan de traitement..." />
                    </div>

                    <div className="col-12"><h6 className="text-secondary border-bottom pb-2 mt-2"><i className="bi bi-heart-pulse me-1"></i> Constantes Vitales</h6></div>
                    <div className="col-md-2">
                      <label className="form-label">Pression (sys.)</label>
                      <input type="number" name="blood_pressure_systolic" className="form-control" value={form.blood_pressure_systolic} onChange={handleChange} placeholder="120" />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Pression (dias.)</label>
                      <input type="number" name="blood_pressure_diastolic" className="form-control" value={form.blood_pressure_diastolic} onChange={handleChange} placeholder="80" />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">FC (bpm)</label>
                      <input type="number" name="heart_rate" className="form-control" value={form.heart_rate} onChange={handleChange} placeholder="72" />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">FR (cpm)</label>
                      <input type="number" name="respiratory_rate" className="form-control" value={form.respiratory_rate} onChange={handleChange} placeholder="16" />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Temp. (°C)</label>
                      <input type="number" step="0.1" name="temperature" className="form-control" value={form.temperature} onChange={handleChange} placeholder="37.0" />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">SpO2 (%)</label>
                      <input type="number" name="oxygen_saturation" className="form-control" value={form.oxygen_saturation} onChange={handleChange} placeholder="98" />
                    </div>

                    <div className="col-md-12">
                      <label className="form-label">Notes</label>
                      <textarea name="notes" className="form-control" rows="3" value={form.notes} onChange={handleChange} placeholder="Notes supplémentaires..." />
                    </div>

                    <div className="col-12"><h6 className="text-secondary border-bottom pb-2 mt-2"><i className="bi bi-calendar-check me-1"></i> Suivi</h6></div>
                    <div className="col-md-4">
                      <div className="form-check mt-2">
                        <input className="form-check-input" type="checkbox" name="follow_up_needed" id="followUpNeeded"
                          checked={form.follow_up_needed} onChange={handleChange} />
                        <label className="form-check-label" htmlFor="followUpNeeded">Suivi nécessaire</label>
                      </div>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label">Date de suivi</label>
                      <input type="date" name="follow_up_date" className={`form-control ${formErrors.follow_up_date ? 'is-invalid' : ''}`}
                        value={form.follow_up_date} onChange={handleChange} />
                      {formErrors.follow_up_date && <div className="invalid-feedback">{formErrors.follow_up_date}</div>}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (<><span className="spinner-border spinner-border-sm me-1"></span>Enregistrement...</>)
                      : (<><i className="bi bi-check-lg me-1"></i>Créer le dossier</>)}
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