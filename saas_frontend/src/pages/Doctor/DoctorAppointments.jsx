import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const cardStyle = { borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };
const iconBox = (color) => ({ width: '48px', height: '48px', borderRadius: '12px', background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' });

const STATUS_MAP = {
  scheduled:       { label: 'Programmé',      badge: 'bg-primary-subtle text-primary' },
  confirmed:       { label: 'Confirmé',       badge: 'bg-info-subtle text-info' },
  in_progress:     { label: 'En cours',       badge: 'bg-warning-subtle text-warning' },
  completed:       { label: 'Terminé',        badge: 'bg-success-subtle text-success' },
  cancelled:       { label: 'Annulé',         badge: 'bg-secondary-subtle text-secondary' },
  no_show:         { label: 'Absent',         badge: 'bg-dark-subtle text-dark' },
};

const CONSULTATION_TYPE_MAP = {
  first:     'Première consultation',
  followup:  'Suivi',
  emergency: 'Urgence',
  routine:   'Routine',
};

const EMPTY_FORM = {
  patient: '', cabinet: '', date_time: '', duration: 30,
  consultation_type: 'first', is_teleconsultation: false, symptoms: '', notes: '',
};

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DoctorAppointments() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [cabinets, setCabinets] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const [filters, setFilters] = useState({ search: '', status: '', date_from: '', date_to: '', consultation_type: '' });
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page: currentPage, ...filters };
      const res = await api.get('/appointments/doctor/', { params });
      setAppointments(res.data.results || []);
      setTotalCount(res.data.count || 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement des rendez-vous.');
    } finally { setLoading(false); }
  }, [currentPage, filters]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try { const res = await api.get('/appointments/doctor/stats/'); setStats(res.data); } catch {} finally { setStatsLoading(false); }
  }, []);

  const fetchDropdowns = useCallback(async () => {
    try {
      const [patientsRes, cabinetsRes] = await Promise.all([
        api.get('/appointments/doctor/patients-dropdown/'),
        api.get('/appointments/doctor/cabinets-dropdown/'),
      ]);
      setPatients(patientsRes.data || []);
      setCabinets(cabinetsRes.data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);
  useEffect(() => { fetchStats(); fetchDropdowns(); }, [fetchStats, fetchDropdowns]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({ search: '', status: '', date_from: '', date_to: '', consultation_type: '' });
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const openCreateModal = () => { setCreateForm({ ...EMPTY_FORM }); setCreateErrors({}); setShowCreateModal(true); };
  const closeCreateModal = () => { setShowCreateModal(false); setCreateForm({ ...EMPTY_FORM }); setCreateErrors({}); setCreating(false); };

  const handleCreateChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCreateForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (createErrors[name]) setCreateErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreating(true); setCreateErrors({});
    try {
      const payload = {
        ...createForm,
        patient: Number(createForm.patient),
        cabinet: Number(createForm.cabinet),
        duration: Number(createForm.duration),
      };
      await api.post('/appointments/doctor/', payload);
      closeCreateModal();
      fetchAppointments();
      fetchStats();
    } catch (err) {
      if (err.response?.data && typeof err.response.data === 'object') {
        setCreateErrors(err.response.data);
      } else {
        setCreateErrors({ _general: 'Erreur lors de la création du rendez-vous.' });
      }
    } finally { setCreating(false); }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const getPaginationRange = () => {
    const delta = 2, range = [], left = Math.max(1, currentPage - delta), right = Math.min(totalPages, currentPage + delta);
    for (let i = left; i <= right; i++) range.push(i);
    return range;
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1"><i className="bi bi-calendar-check me-2 text-primary"></i>Gestion des Rendez-vous</h2>
          <p className="text-muted mb-0">Consultez et gérez vos rendez-vous</p>
        </div>
        <button className="btn btn-primary px-4 py-2 rounded-3" onClick={openCreateModal}>
          <i className="bi bi-plus-lg me-2"></i>Nouveau rendez-vous
        </button>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {statsLoading ? (
          <div className="col-12 text-center"><div className="spinner-border text-primary"></div></div>
        ) : stats ? (
          <>
            <div className="col-md-3 col-6">
              <div className="card h-100 p-3" style={cardStyle}>
                <div className="d-flex align-items-center gap-3">
                  <div style={iconBox('#2563eb')}><i className="bi bi-calendar-day fs-4"></i></div>
                  <div><h5 className="mb-0 fw-bold">{stats.today}</h5><small className="text-muted">Aujourd'hui</small></div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card h-100 p-3" style={cardStyle}>
                <div className="d-flex align-items-center gap-3">
                  <div style={iconBox('#0dcaf0')}><i className="bi bi-calendar-check fs-4"></i></div>
                  <div><h5 className="mb-0 fw-bold">{stats.upcoming}</h5><small className="text-muted">À venir</small></div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card h-100 p-3" style={cardStyle}>
                <div className="d-flex align-items-center gap-3">
                  <div style={iconBox('#fd7e14')}><i className="bi bi-calendar-week fs-4"></i></div>
                  <div><h5 className="mb-0 fw-bold">{stats.this_week}</h5><small className="text-muted">Cette semaine</small></div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card h-100 p-3" style={cardStyle}>
                <div className="d-flex align-items-center gap-3">
                  <div style={iconBox('#198754')}><i className="bi bi-check-circle fs-4"></i></div>
                  <div><h5 className="mb-0 fw-bold">{stats.completed}</h5><small className="text-muted">Terminés</small></div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Filters */}
      <div className="card mb-4" style={cardStyle}>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0"><i className="bi bi-search"></i></span>
                <input type="text" className="form-control border-start-0" placeholder="Rechercher patient, symptômes..." name="search" value={filters.search} onChange={handleFilterChange} />
              </div>
            </div>
            <div className="col-md-2">
              <select className="form-select" name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="">Tous statuts</option>
                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="col-md-2"><input type="date" className="form-control" name="date_from" value={filters.date_from} onChange={handleFilterChange} /></div>
            <div className="col-md-2"><input type="date" className="form-control" name="date_to" value={filters.date_to} onChange={handleFilterChange} /></div>
            <div className="col-md-1">
              <button className="btn btn-outline-secondary w-100 rounded-3" onClick={handleResetFilters} title="Réinitialiser"><i className="bi bi-x-circle"></i></button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{borderRadius: '12px'}}><i className="bi bi-exclamation-triangle me-2"></i>{error}</div>}

      {/* Table */}
      <div className="card" style={cardStyle}>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted">Chargement...</p></div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-5"><i className="bi bi-calendar-x text-muted" style={{fontSize: '3rem'}}></i><p className="mt-3 text-muted">Aucun rendez-vous trouvé.</p></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="text-uppercase text-muted" style={{fontSize: '0.75rem'}}>
                    <th className="ps-4">Patient</th>
                    <th>Date / Heure</th>
                    <th>Cabinet</th>
                    <th>Statut</th>
                    <th>Type</th>
                    <th className="text-center">Téléconsult.</th>
                    <th className="pe-4 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => {
                    const statusInfo = STATUS_MAP[apt.status] || { label: apt.status, badge: 'bg-secondary-subtle text-secondary' };
                    return (
                      <tr key={apt.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/appointments/doctor/${apt.id}/`)}>
                        <td className="ps-4">
                          <div className="fw-bold text-dark">{apt.patient_name || '—'}</div>
                          {apt.patient_info?.phone_number && <small className="text-muted">{apt.patient_info.phone_number}</small>}
                        </td>
                        <td>
                          <div className="fw-semibold">{formatDateTime(apt.date_time)}</div>
                          {apt.symptoms_summary && <small className="text-muted text-truncate d-block" style={{maxWidth: '150px'}}>{apt.symptoms_summary}</small>}
                        </td>
                        <td className="text-truncate" style={{maxWidth: '150px'}}>{apt.cabinet_name || '—'}</td>
                        <td><span className={`badge ${statusInfo.badge} px-3 py-2`}>{statusInfo.label}</span></td>
                        <td>{CONSULTATION_TYPE_MAP[apt.consultation_type] || apt.consultation_type_display || '—'}</td>
                        <td className="text-center">
                          {apt.is_teleconsultation ? <i className="bi bi-camera-video text-primary fs-5"></i> : <i className="bi bi-dash text-muted"></i>}
                        </td>
                        <td className="pe-4 text-end">
                          <button className="btn btn-sm btn-outline-primary rounded-3 px-3" onClick={(e) => { e.stopPropagation(); navigate(`/appointments/doctor/${apt.id}/`); }}>
                            <i className="bi bi-eye me-1"></i> Voir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="card-footer bg-white border-0 d-flex justify-content-between align-items-center py-3">
            <small className="text-muted">{totalCount > 0 ? `Affichage ${startItem}-${endItem} sur ${totalCount}` : 'Aucun résultat'}</small>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}><button className="page-link rounded-3 mx-1" onClick={() => handlePageChange(currentPage - 1)}><i className="bi bi-chevron-left"></i></button></li>
                {getPaginationRange().map(p => <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}><button className="page-link rounded-3 mx-1" onClick={() => handlePageChange(p)}>{p}</button></li>)}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}><button className="page-link rounded-3 mx-1" onClick={() => handlePageChange(currentPage + 1)}><i className="bi bi-chevron-right"></i></button></li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={(e) => e.target === e.currentTarget && closeCreateModal()}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{borderRadius: '16px', border: 'none'}}>
              <div className="modal-header bg-primary text-white" style={{borderRadius: '16px 16px 0 0'}}>
                <h5 className="modal-title fw-bold"><i className="bi bi-calendar-plus me-2"></i>Nouveau Rendez-vous</h5>
                <button type="button" className="btn-close btn-close-white" onClick={closeCreateModal} disabled={creating}></button>
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body p-4">
                  {createErrors._general && <div className="alert alert-danger">{createErrors._general}</div>}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Patient <span className="text-danger">*</span></label>
                      <select name="patient" className={`form-select ${createErrors.patient ? 'is-invalid' : ''}`} value={createForm.patient} onChange={handleCreateChange} required>
                        <option value="">-- Sélectionner --</option>
                        {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} {p.phone_number ? `(${p.phone_number})` : ''}</option>)}
                      </select>
                      {createErrors.patient && <div className="invalid-feedback">{createErrors.patient}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Cabinet <span className="text-danger">*</span></label>
                      <select name="cabinet" className={`form-select ${createErrors.cabinet ? 'is-invalid' : ''}`} value={createForm.cabinet} onChange={handleCreateChange} required>
                        <option value="">-- Sélectionner --</option>
                        {cabinets.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {createErrors.cabinet && <div className="invalid-feedback">{createErrors.cabinet}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Date et heure <span className="text-danger">*</span></label>
                      <input type="datetime-local" name="date_time" className={`form-control ${createErrors.date_time ? 'is-invalid' : ''}`} value={createForm.date_time} onChange={handleCreateChange} required />
                      {createErrors.date_time && <div className="invalid-feedback">{createErrors.date_time}</div>}
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Durée (min) <span className="text-danger">*</span></label>
                      <input type="number" name="duration" className={`form-control ${createErrors.duration ? 'is-invalid' : ''}`} value={createForm.duration} onChange={handleCreateChange} min="5" max="480" required />
                      {createErrors.duration && <div className="invalid-feedback">{createErrors.duration}</div>}
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Type <span className="text-danger">*</span></label>
                      <select name="consultation_type" className={`form-select ${createErrors.consultation_type ? 'is-invalid' : ''}`} value={createForm.consultation_type} onChange={handleCreateChange} required>
                        {Object.entries(CONSULTATION_TYPE_MAP).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <div className="form-check mt-2">
                        <input className="form-check-input" type="checkbox" name="is_teleconsultation" id="teleconsult" checked={createForm.is_teleconsultation} onChange={handleCreateChange} />
                        <label className="form-check-label fw-semibold" htmlFor="teleconsult">Téléconsultation</label>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Symptômes</label>
                      <textarea name="symptoms" rows="2" className="form-control" value={createForm.symptoms} onChange={handleCreateChange} placeholder="Symptômes du patient..."></textarea>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Notes</label>
                      <textarea name="notes" rows="2" className="form-control" value={createForm.notes} onChange={handleCreateChange} placeholder="Notes supplémentaires..."></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top-0 p-4">
                  <button type="button" className="btn btn-light px-4 rounded-3" onClick={closeCreateModal} disabled={creating}>Annuler</button>
                  <button type="submit" className="btn btn-primary px-4 rounded-3" disabled={creating}>
                    {creating ? <><span className="spinner-border spinner-border-sm me-1"></span>Création...</> : <><i className="bi bi-check-lg me-1"></i>Créer le rendez-vous</>}
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