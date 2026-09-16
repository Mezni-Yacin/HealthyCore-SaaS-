import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const cardStyle = { borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };

export default function PatientMedicalRecords() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const params = { page: currentPage };
      if (search) params.search = search;
      if (filterDate) params.date_from = filterDate;

      const res = await api.get('/medical-records/patient/', { params });
      setRecords(res.data.results || res.data || []);
    } catch (err) {
      setError('Erreur lors du chargement de vos dossiers médicaux.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, filterDate]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/medical-records/patient/stats/');
      setStats(res.data);
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, [fetchRecords, fetchStats]);

  const getPriorityBadge = (priority) => {
    const map = { 
      low: 'bg-secondary-subtle text-secondary', 
      medium: 'bg-primary-subtle text-primary', 
      high: 'bg-warning-subtle text-warning', 
      emergency: 'bg-danger-subtle text-danger' 
    };
    const labels = { low: 'Basse', medium: 'Moyenne', high: 'Haute', emergency: 'Urgence' };
    return <span className={`badge ${map[priority] || map.medium} px-3 py-2`}>{labels[priority] || priority}</span>;
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1"><i className="bi bi-folder2-open me-2 text-primary"></i>Mes Dossiers Médicaux</h2>
          <p className="text-muted mb-0">Consultez l'historique de vos consultations et dossiers médicaux</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="row g-3 mb-4">
          {[
            { label: 'Total dossiers', val: stats.total_records, color: 'primary', icon: 'bi-folder-fill' },
            { label: 'Ce mois', val: stats.records_this_month, color: 'success', icon: 'bi-calendar-month-fill' },
            { label: 'Suivis en attente', val: stats.upcoming_followups, color: 'warning', icon: 'bi-clock-history' }
          ].map((s, i) => (
            <div key={i} className="col-md-4 col-6">
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
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                <input type="text" className="form-control border-start-0" placeholder="Rechercher un diagnostic, traitement..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
              </div>
            </div>
            <div className="col-md-3">
              <input type="date" className="form-control" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-outline-secondary w-100 rounded-3" onClick={() => { setSearch(''); setFilterDate(''); setCurrentPage(1); }}>
                <i className="bi bi-x-circle me-1"></i> Réinitialiser
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
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Chargement de vos dossiers...</p>
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
                    <th>Médecin</th>
                    <th>Priorité</th>
                    <th>Diagnostic</th>
                    <th>Ordonnances</th>
                    <th>Suivi</th>
                    <th className="pe-4 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/patient-records/${record.id}`)}>
                      <td className="ps-4 text-muted small text-nowrap">{record.date}</td>
                      <td className="fw-bold text-dark">{record.doctor_name || '—'}</td>
                      <td>{getPriorityBadge(record.priority)}</td>
                      <td className="text-truncate" style={{ maxWidth: '200px' }}>{record.diagnosis_summary || record.diagnosis || '—'}</td>
                      <td><span className="badge bg-light text-dark border px-3 py-2">{record.prescriptions_count || 0}</span></td>
                      <td>
                        {record.follow_up_needed ? (
                          <span className="badge bg-info-subtle text-info px-3 py-2"><i className="bi bi-calendar-check me-1"></i>{record.follow_up_date}</span>
                        ) : (<span className="text-muted">—</span>)}
                      </td>
                      <td className="pe-4 text-end">
                        <button className="btn btn-sm btn-outline-primary rounded-3 px-3" onClick={(e) => { e.stopPropagation(); navigate(`/patient-records/${record.id}`); }}>
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
    </div>
  );
}