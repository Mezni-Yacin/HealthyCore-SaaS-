import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (a) => a != null ? Number(a).toLocaleString('fr-FR', { minimumFractionDigits: 3 }) + ' TND' : '0.000 TND';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getStatusClass = (status) => {
  switch (status) {
    case 'paid': return 'bg-success bg-opacity-10 text-success';
    case 'overdue': return 'bg-danger bg-opacity-10 text-danger';
    case 'pending': return 'bg-warning bg-opacity-10 text-warning';
    case 'cancelled': return 'bg-secondary bg-opacity-10 text-secondary';
    default: return 'bg-info bg-opacity-10 text-info';
  }
};

// ── Pagination Component ───────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + 4);
  if (end - start + 1 < 5) start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav>
      <ul className="pagination justify-content-center mb-0">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>Précédent</button>
        </li>
        {pages.map(p => (
          <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(p)}>{p}</button>
          </li>
        ))}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Suivant</button>
        </li>
      </ul>
    </nav>
  );
}

// ── Composant Principal ────────────────────────────────────────────────────
export default function SuperAdminInvoices() {
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => { setCurrentPage(1); }, [search, filterStatus]);

  // ── Fetch Données ────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/billing/superadmin/stats/');
      setStats(data);
    } catch (err) {
      console.error('Erreur stats factures:', err);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (filterStatus) params.status = filterStatus;

      const { data } = await api.get('/billing/superadmin/invoices/', { params });
      setInvoices(data.results || data || []);
      setTotalCount(data.count || data.length || 0);
      setTotalPages(Math.ceil((data.count || data.length || 0) / pageSize));
    } catch (err) {
      setMessage("Erreur lors du chargement des factures.");
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, filterStatus]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">
            <i className="bi bi-receipt-cutoff me-2 text-primary"></i>
            Gestion de la Facturation
          </h2>
          <p className="text-muted mb-0">Suivez les revenus et les statuts de paiement</p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={() => { fetchStats(); fetchInvoices(); }}>
          <i className="bi bi-arrow-clockwise me-1"></i> Actualiser
        </button>
      </div>

      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      {/* Statistiques */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm h-100 bg-primary bg-opacity-10">
              <div className="card-body d-flex align-items-center justify-content-between">
                <div>
                  <small className="text-muted d-block">Total factures</small>
                  <h4 className="mb-0 text-primary">{stats.total_invoices || 0}</h4>
                </div>
                <i className="bi bi-receipt fs-2 text-primary opacity-25"></i>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm h-100 bg-success bg-opacity-10">
              <div className="card-body d-flex align-items-center justify-content-between">
                <div>
                  <small className="text-muted d-block">Revenus encaissés</small>
                  <h4 className="mb-0 text-success">{fmt(stats.total_revenue)}</h4>
                </div>
                <i className="bi bi-cash-stack fs-2 text-success opacity-25"></i>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm h-100 bg-warning bg-opacity-10">
              <div className="card-body d-flex align-items-center justify-content-between">
                <div>
                  <small className="text-muted d-block">En attente</small>
                  <h4 className="mb-0 text-warning">{fmt(stats.total_pending_amount)}</h4>
                </div>
                <i className="bi bi-hourglass-split fs-2 text-warning opacity-25"></i>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm h-100 bg-danger bg-opacity-10">
              <div className="card-body d-flex align-items-center justify-content-between">
                <div>
                  <small className="text-muted d-block">Factures en retard</small>
                  <h4 className="mb-0 text-danger">{stats.overdue_count || 0}</h4>
                </div>
                <i className="bi bi-exclamation-triangle fs-2 text-danger opacity-25"></i>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-8">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                <input type="text" className="form-control" placeholder="Rechercher par N° facture, patient, cabinet..." value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && <button className="btn btn-outline-secondary" onClick={() => setSearch('')}><i className="bi bi-x-lg"></i></button>}
              </div>
            </div>
            <div className="col-md-4">
              <select className="form-select form-select-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Tous les statuts</option>
                <option value="paid">Payées</option>
                <option value="pending">En attente</option>
                <option value="overdue">En retard</option>
                <option value="cancelled">Annulées</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <p className="mt-2 text-muted">Chargement...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox display-1 text-muted"></i>
              <p className="mt-2 text-muted">Aucune facture trouvée.</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">N° Facture</th>
                      <th>Patient</th>
                      <th>Cabinet</th>
                      <th className="text-end">Montant</th>
                      <th className="text-center">Statut</th>
                      <th className="text-end pe-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id}>
                        <td className="ps-3 fw-bold text-primary">{inv.invoice_number || `#${inv.id}`}</td>
                        <td>{inv.patient_name || '—'}</td>
                        <td className="small text-muted">{inv.cabinet_name || '—'}</td>
                        <td className="text-end fw-bold">{fmt(inv.total_amount)}</td>
                        <td className="text-center">
                          <span className={`badge ${getStatusClass(inv.status)}`}>{inv.status_display || inv.status}</span>
                        </td>
                        <td className="text-end pe-3 small text-muted">{formatDate(inv.issue_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="card-footer bg-white border-top">
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                    <small className="text-muted">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} sur {totalCount}</small>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}