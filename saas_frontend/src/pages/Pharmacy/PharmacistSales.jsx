import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function PharmacistSales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    api.get('/pharmacy/pharmacist/sales/')
      .then(r => setSales(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <h2 className="fw-bold mb-1"><i className="bi bi-clock-history me-2 text-primary"></i>Historique des Ventes</h2>
        <p className="text-muted mb-0">Toutes les transactions de la pharmacie.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Date & Heure</th>
                    <th>Patient</th>
                    <th>Pharmacien</th>
                    <th className="text-end">Montant</th>
                    <th className="text-center">Paiement</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-4 text-muted">Aucune vente enregistrée.</td></tr>
                  ) : sales.map(sale => (
                    <tr key={sale.id}>
                      <td className="small">{new Date(sale.dispensation_date).toLocaleString('fr-FR')}</td>
                      <td className="fw-semibold">{sale.patient_name || 'Client de passage'}</td>
                      <td>{sale.pharmacist_name}</td>
                      <td className="text-end fw-bold text-success">{Number(sale.total_amount).toFixed(3)} TND</td>
                      <td className="text-center">
                        <span className={`badge bg-${sale.payment_status === 'paid' ? 'success' : 'danger'}`}>
                          {sale.payment_method_display || sale.payment_status_display}
                        </span>
                      </td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedSale(sale)}>
                          <i className="bi bi-eye"></i> Ticket
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

      {selectedSale && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-receipt me-2"></i>Ticket de Caisse</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedSale(null)}></button>
              </div>
              <div className="modal-body">
                <div className="d-flex justify-content-between mb-3">
                  <div>
                    <small className="text-muted d-block">Date</small>
                    <strong>{new Date(selectedSale.dispensation_date).toLocaleString('fr-FR')}</strong>
                  </div>
                  <div className="text-end">
                    <small className="text-muted d-block">Client</small>
                    <strong>{selectedSale.patient_name || 'De passage'}</strong>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th>Article</th>
                        <th className="text-center">Qté</th>
                        <th className="text-end">P.U.</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items.map(item => (
                        <tr key={item.id}>
                          <td className="fw-semibold">{item.medication_name} <small className="text-muted">({item.medication_dosage})</small></td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-end">{Number(item.unit_price).toFixed(3)}</td>
                          <td className="text-end fw-bold">{Number(item.total_price).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-light">
                        <td colSpan="3" className="text-end fw-bold">TOTAL</td>
                        <td className="text-end fw-bold text-success">{Number(selectedSale.total_amount).toFixed(3)} TND</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="text-center mt-3">
                  <span className="badge bg-success p-2">
                    <i className="bi bi-check-circle me-1"></i>Payé via {selectedSale.payment_method_display}
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedSale(null)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}