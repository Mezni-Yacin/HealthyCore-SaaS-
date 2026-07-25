import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const fmt = (a) => a != null ? Number(a).toLocaleString('fr-FR', { minimumFractionDigits: 3 }) + ' TND' : '0.000 TND';

const SuperAdminInvoices = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(() => {
    api.get('/billing/superadmin/stats/').then(r => setStats(r.data)).catch(() => {});
    setLoading(true);
    api.get('/billing/superadmin/invoices/', { params: { page: 1, page_size: 20 } })
      .then(r => { const d = r.data; setInvoices(Array.isArray(d) ? d : d.results || []); })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="container-fluid py-4">
      <h4 className="mb-3"><i className="bi bi-receipt-cutoff me-2"></i>Gestion de la Facturation</h4>

      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="text-muted small">Total factures</div>
                <div className="fw-bold fs-4">{stats.total_invoices || 0}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="text-muted small">Revenus</div>
                <div className="fw-bold fs-4 text-success">{fmt(stats.total_revenue)}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="text-muted small">En attente</div>
                <div className="fw-bold fs-4 text-warning">{fmt(stats.total_pending_amount)}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="text-muted small">En retard</div>
                <div className="fw-bold fs-4 text-danger">{stats.overdue_count || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Liste des factures</h6>
          <button className="btn btn-primary btn-sm" onClick={fetchAll}><i className="bi bi-arrow-clockwise me-1"></i>Actualiser</button>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              <p>Aucune facture trouvee</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>N Facture</th>
                    <th>Patient</th>
                    <th>Cabinet</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="fw-semibold">{inv.invoice_number || '#' + inv.id}</td>
                      <td>{inv.patient_name || '-'}</td>
                      <td>{inv.cabinet_name || '-'}</td>
                      <td className="fw-bold">{fmt(inv.total_amount)}</td>
                      <td>
                        <span className={'badge bg-' + (
                          inv.status === 'paid' ? 'success' :
                          inv.status === 'overdue' ? 'danger' :
                          inv.status === 'pending' ? 'warning' :
                          inv.status === 'cancelled' ? 'secondary' : 'info'
                        )}>{inv.status_display || inv.status}</span>
                      </td>
                      <td className="text-muted">{inv.issue_date || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminInvoices;