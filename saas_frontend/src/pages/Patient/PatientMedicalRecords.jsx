import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function PatientMedicalRecords() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, [currentPage, search, filterDate]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page: currentPage };
      if (search) params.search = search;
      if (filterDate) params.date_from = filterDate;

      const res = await api.get('/medical-records/patient/', { params });
      setRecords(res.data.results || res.data);
    } catch (err) {
      setError('Erreur lors du chargement de vos dossiers médicaux.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/medical-records/patient/stats/');
      setStats(res.data);
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  };

  const getPriorityBadge = (priority) => {
    const map = { 'low': 'secondary', 'medium': 'primary', 'high': 'warning', 'emergency': 'danger' };
    const labels = { 'low': 'Basse', 'medium': 'Moyenne', 'high': 'Haute', 'emergency': 'Urgence' };
    return <span className={`badge bg-${map[priority] || 'secondary'}`}>{labels[priority] || priority}</span>;
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1"><i className="bi bi-folder2-open me-2"></i>Mes Dossiers Médicaux</h3>
          <p className="text-muted mb-0">Consultez l'historique de vos consultations et dossiers médicaux</p>
        </div>
      </div>

      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <h5 className="text-primary mb-1">{stats.total_records}</h5>
                <small className="text-muted">Total dossiers</small>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <h5 className="text-success mb-1">{stats.records_this_month}</h5>
                <small className="text-muted">Ce mois</small>
              </div>
            </div>
          </div>
          <div className="col-md-4">
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
            <div className="col-md-6">
              <input type="text" className="form-control" placeholder="Rechercher un diagnostic, traitement..."
                value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="col-md-4">
              <input type="date" className="form-control" value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100"
                onClick={() => { setSearch(''); setFilterDate(''); setCurrentPage(1); }}>
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
              <p className="mt-2 text-muted">Chargement de vos dossiers...</p>
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
                    <th>Médecin</th>
                    <th>Priorité</th>
                    <th>Diagnostic</th>
                    <th>Ordonnances</th>
                    <th>Suivi</th>
                    <th className="pe-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/patient-records/${record.id}`)}>
                      <td className="ps-3">{record.date}</td>
                      <td><strong>{record.doctor_name || '—'}</strong></td>
                      <td>{getPriorityBadge(record.priority)}</td>
                      <td className="text-truncate" style={{ maxWidth: '200px' }}>{record.diagnosis_summary || record.diagnosis || '—'}</td>
                      <td><span className="badge bg-light text-dark">{record.prescriptions_count || 0}</span></td>
                      <td>
                        {record.follow_up_needed ? (
                          <span className="badge bg-info">{record.follow_up_date}</span>
                        ) : (<span className="text-muted">—</span>)}
                      </td>
                      <td className="pe-3">
                        <button className="btn btn-sm btn-outline-primary"
                          onClick={(e) => { e.stopPropagation(); navigate(`/patient-records/${record.id}`); }}>
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
    </div>
  );
}