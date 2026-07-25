import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const fmt = (a) => a != null ? Number(a).toLocaleString('fr-FR', { minimumFractionDigits: 3 }) + ' TND' : '0.000 TND';
const STATUS_MAP = { paid: 'success', overdue: 'danger', pending: 'warning', cancelled: 'secondary', draft: 'info', partially_paid: 'warning text-dark' };

const PatientInvoices = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchAll = useCallback(() => {
    api.get('/billing/patient/stats/').then(r => setStats(r.data)).catch(() => {});
    setLoading(true);
    api.get('/billing/patient/invoices/', { params: { page: 1, page_size: 50 } })
      .then(r => { const d = r.data; setInvoices(Array.isArray(d) ? d : d.results || []); })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1"><i className="bi bi-receipt me-2"></i>Mes Factures</h4>
          <p className="text-muted mb-0">Historique de vos factures et paiements</p>
        </div>
        <button className="btn btn-outline-primary btn-sm mt-2 mt-md-0" onClick={fetchAll}><i className="bi bi-arrow-clockwise me-1"></i>Actualiser</button>
      </div>

      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm"><div className="card-body">
              <div className="text-muted small">Total</div>
              <div className="fw-bold fs-4">{stats.total_invoices || 0}</div>
            </div></div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm"><div className="card-body">
              <div className="text-muted small">Montant total</div>
              <div className="fw-bold fs-4 text-primary">{fmt(stats.total_amount)}</div>
            </div></div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm"><div className="card-body">
              <div className="text-muted small">Paye</div>
              <div className="fw-bold fs-4 text-success">{fmt(stats.total_paid)}</div>
            </div></div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm"><div className="card-body">
              <div className="text-muted small">Reste a payer</div>
              <div className="fw-bold fs-4 text-danger">{fmt(stats.total_remaining)}</div>
            </div></div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white"><h6 className="mb-0">Mes factures</h6></div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-5 text-muted"><i className="bi bi-inbox fs-1 d-block mb-2"></i><p>Aucune facture</p></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr><th>N Facture</th><th>Cabinet</th><th>Montant</th><th>Paye</th><th>Reste</th><th>Statut</th><th>Date</th><th></th></tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="fw-semibold">{inv.invoice_number || '#' + inv.id}</td>
                      <td>{inv.cabinet_name || '-'}</td>
                      <td className="fw-bold">{fmt(inv.total_amount)}</td>
                      <td className="text-success">{fmt(inv.total_paid)}</td>
                      <td className="text-danger">{fmt(inv.remaining_amount)}</td>
                      <td><span className={'badge bg-' + (STATUS_MAP[inv.status] || 'secondary')}>{inv.status_display || inv.status}</span></td>
                      <td className="text-muted small">{inv.issue_date || '-'}</td>
                      <td><button className="btn btn-sm btn-outline-primary" onClick={() => { setSelected(inv); setShowDetail(true); }}><i className="bi bi-eye"></i></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* DETAIL MODAL */}
      {showDetail && selected && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selected.invoice_number} <span className={'badge bg-' + (STATUS_MAP[selected.status] || 'secondary') + ' ms-2'}>{selected.status_display || selected.status}</span></h5>
                <button type="button" className="btn-close" onClick={() => setShowDetail(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-4"><div className="card"><div className="card-body"><h6 className="text-muted small">Cabinet</h6><p className="fw-bold mb-0">{selected.cabinet_name || '-'}</p></div></div></div>
                  <div className="col-md-4"><div className="card"><div className="card-body"><h6 className="text-muted small">Total</h6><p className="fw-bold mb-0 text-primary">{fmt(selected.total_amount)}</p></div></div></div>
                  <div className="col-md-4"><div className="card"><div className="card-body"><h6 className="text-muted small">Reste a payer</h6><p className="fw-bold mb-0 text-danger">{fmt(selected.remaining_amount)}</p></div></div></div>
                </div>
                <div className="row g-3 mt-1">
                  <div className="col-3"><div className="card"><div className="card-body text-center"><div className="text-muted small">Sous-total</div><div className="fw-bold">{fmt(selected.subtotal)}</div></div></div></div>
                  <div className="col-3"><div className="card"><div className="card-body text-center"><div className="text-muted small">Taxe</div><div className="fw-bold">{fmt(selected.tax_amount)}</div></div></div></div>
                  <div className="col-3"><div className="card"><div className="card-body text-center"><div className="text-muted small">CNAM</div><div className="fw-bold">{fmt(selected.cnam_contribution)}</div></div></div></div>
                  <div className="col-3"><div className="card"><div className="card-body text-center"><div className="text-muted small">Assurance</div><div className="fw-bold">{fmt(selected.insurance_contribution)}</div></div></div></div>
                </div>
                {selected.notes && <div className="alert alert-light mt-3 mb-0"><strong>Notes :</strong> {selected.notes}</div>}
                {selected.payments && selected.payments.length > 0 && (
                  <div className="mt-3"><h6>Historique des paiements</h6>
                    <table className="table table-sm"><thead><tr><th>Montant</th><th>Methode</th><th>N Transaction</th><th>Date</th><th>Statut</th></tr></thead>
                    <tbody>{selected.payments.map(p => <tr key={p.id}><td>{fmt(p.amount)}</td><td>{p.payment_method_display || p.payment_method}</td><td>{p.transaction_id || '-'}</td><td>{p.payment_date || '-'}</td><td><span className={'badge bg-' + (STATUS_MAP[p.status] || 'secondary')}>{p.status_display || p.status}</span></td></tr>)}</tbody></table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDetail(false)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientInvoices;