import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';

// ✅ Formatage sécurisé pour éviter les erreurs NaN
const fmt = (a) => {
  const n = Number(a || 0);
  return isNaN(n) ? '0.000 TND' : n.toLocaleString('fr-FR', { minimumFractionDigits: 3 }) + ' TND';
};

const STATUS_MAP = { 
  paid: 'success', 
  overdue: 'danger', 
  pending: 'warning', 
  cancelled: 'secondary', 
  draft: 'info', 
  partially_paid: 'warning text-dark',
  completed: 'success',
  failed: 'danger'
};

const PatientInvoices = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // États principaux
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États du modal
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  
  // États de paiement
  const [payingLoading, setPayingLoading] = useState(false);
  const [verifyingLoading, setVerifyingLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState(null);
  const [partialAmount, setPartialAmount] = useState(''); // ✅ Déplacé en haut avec les autres états

  // ===================== DATA FETCHING =====================
  const fetchAll = useCallback(() => {
    api.get('/billing/patient/stats/').then(r => setStats(r.data)).catch(() => {});
    setLoading(true);
    api.get('/billing/patient/invoices/', { params: { page: 1, page_size: 50 } })
      .then(r => { 
        const d = r.data; 
        setInvoices(Array.isArray(d) ? d : d.results || []); 
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { 
    fetchAll(); 
  }, [fetchAll]);

  // ✅ VÉRIFIER LE STATUT APRÈS RETOUR DE STRIPE
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const invoiceId = searchParams.get('invoice');
    
    if (sessionId && invoiceId) {
      setPaymentMessage({ type: 'info', text: 'Vérification du paiement en cours...' });
      
      api.get(`/billing/patient/invoices/${invoiceId}/stripe-status/?session_id=${sessionId}`)
        .then(r => {
          if (r.data.is_completed) {
            setPaymentMessage({ 
              type: 'success', 
              text: '🎉 Paiement réussi ! Votre facture a été mise à jour.' 
            });
            fetchAll(); 
          } else {
            setPaymentMessage({ 
              type: 'warning', 
              text: 'Le paiement est en cours de traitement. Cliquez sur "Vérifier mon paiement" ci-dessous.' 
            });
          }
        })
        .catch(() => {
          setPaymentMessage({ 
            type: 'danger', 
            text: 'Impossible de vérifier le statut automatiquement. Cliquez sur "Vérifier mon paiement" ci-dessous.' 
          });
        })
        .finally(() => {
          // Nettoyer l'URL proprement sans casser la route
          const params = new URLSearchParams(searchParams);
          params.delete('session_id');
          params.delete('invoice');
          setSearchParams(params, { replace: true });
        });
    }
  }, [searchParams, fetchAll, setSearchParams]);

  // ===================== ACTIONS PAIEMENT =====================
  const handlePayWithStripe = () => {
    if (!selected) return;
    setPayingLoading(true);
    setPaymentMessage(null);

    api.post(`/billing/patient/invoices/${selected.id}/pay-stripe/`)
      .then(r => {
        if (r.data.checkout_url) {
          window.location.href = r.data.checkout_url;
        } else {
          setPaymentMessage({ 
            type: 'danger', 
            text: r.data.error || "Erreur lors de la préparation du paiement." 
          });
          setPayingLoading(false);
        }
      })
      .catch(err => {
        const errorMsg = err.response?.data?.error || err.response?.data?.detail || "Erreur réseau.";
        setPaymentMessage({ type: 'danger', text: errorMsg });
        setPayingLoading(false);
      });
  };

  const handlePartialPay = () => {
    if (!selected || !partialAmount) return;
    
    const amount = parseFloat(partialAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentMessage({ type: 'danger', text: 'Veuillez entrer un montant valide.' });
      return;
    }
    if (amount > selected.remaining_amount) {
      setPaymentMessage({ type: 'danger', text: 'Le montant ne peut pas dépasser le reste à payer.' });
      return;
    }

    setPayingLoading(true);
    setPaymentMessage(null);

    api.post(`/billing/patient/invoices/${selected.id}/pay-stripe/`, {
      amount: amount
    })
      .then(r => {
        if (r.data.checkout_url) {
          window.location.href = r.data.checkout_url;
        } else {
          setPaymentMessage({ 
            type: 'danger', 
            text: r.data.error || "Erreur lors de la préparation du paiement." 
          });
          setPayingLoading(false);
        }
      })
      .catch(err => {
        const errorMsg = err.response?.data?.error || "Erreur réseau.";
        setPaymentMessage({ type: 'danger', text: errorMsg });
        setPayingLoading(false);
      });
  };

  const handleVerifyPayment = () => {
    if (!selected) return;
    setVerifyingLoading(true);
    setPaymentMessage({ type: 'info', text: 'Vérification auprès de Stripe en cours...' });

    api.post(`/billing/patient/invoices/${selected.id}/verify-payments/`)
      .then(r => {
        if (r.data.updated) {
          setPaymentMessage({ 
            type: 'success', 
            text: '🎉 Paiement confirmé ! Votre facture a été mise à jour.' 
          });
          setSelected(r.data.invoice); // Met à jour la facture dans le modal
          fetchAll(); // Rafraîchit la liste globale
        } else {
          setPaymentMessage({ 
            type: 'warning', 
            text: 'Stripe indique que le paiement est encore en attente ou a échoué.' 
          });
        }
      })
      .catch(() => {
        setPaymentMessage({ 
          type: 'danger', 
          text: 'Erreur lors de la vérification du paiement.' 
        });
      })
      .finally(() => setVerifyingLoading(false));
  };

  // ===================== RENDU =====================
  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1"><i className="bi bi-receipt me-2"></i>Mes Factures</h4>
          <p className="text-muted mb-0">Historique de vos factures et paiements</p>
        </div>
        <button className="btn btn-outline-primary btn-sm mt-2 mt-md-0" onClick={fetchAll}>
          <i className="bi bi-arrow-clockwise me-1"></i>Actualiser
        </button>
      </div>

      {paymentMessage && !showDetail && (
        <div className={`alert alert-${paymentMessage.type} alert-dismissible fade show`} role="alert">
          {paymentMessage.text}
          <button type="button" className="btn-close" onClick={() => setPaymentMessage(null)}></button>
        </div>
      )}

      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Total factures</div>
                <div className="fw-bold fs-4">{stats.total_invoices || 0}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Montant total</div>
                <div className="fw-bold fs-4 text-primary">{fmt(stats.my_total_billed)}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Payé</div>
                <div className="fw-bold fs-4 text-success">{fmt(stats.my_total_paid)}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small">Reste à payer</div>
                <div className="fw-bold fs-4 text-danger">{fmt(stats.total_remaining)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3">
          <h6 className="mb-0">Mes factures</h6>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              <p>Aucune facture</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>N° Facture</th>
                    <th>Cabinet</th>
                    <th>Montant</th>
                    <th>Payé</th>
                    <th>Reste</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="fw-semibold">{inv.invoice_number || '#' + inv.id}</td>
                      <td>{inv.cabinet_name || '-'}</td>
                      <td className="fw-bold">{fmt(inv.total_amount)}</td>
                      <td className="text-success">{fmt(inv.total_paid)}</td>
                      <td className="text-danger">{fmt(inv.remaining_amount)}</td>
                      <td>
                        <span className={'badge bg-' + (STATUS_MAP[inv.status] || 'secondary')}>
                          {inv.status_display || inv.status}
                        </span>
                      </td>
                      <td className="text-muted small">{inv.issue_date || '-'}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline-primary" 
                          onClick={() => { 
                            setSelected(inv); 
                            setShowDetail(true); 
                            setPartialAmount('');
                            setPaymentMessage(null);
                          }}
                        >
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

      {/* ═══════ MODAL DE DÉTAIL DE LA FACTURE + BOUTON STRIPE ═══════ */}
      {showDetail && selected && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {selected.invoice_number} 
                  <span className={'badge bg-' + (STATUS_MAP[selected.status] || 'secondary') + ' ms-2'}>
                    {selected.status_display || selected.status}
                  </span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDetail(false)}></button>
              </div>
              <div className="modal-body">
                {paymentMessage && (
                  <div className={`alert alert-${paymentMessage.type} py-2 mb-3`}>
                    {paymentMessage.text}
                  </div>
                )}

                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="card h-100">
                      <div className="card-body">
                        <h6 className="text-muted small">Cabinet</h6>
                        <p className="fw-bold mb-0">{selected.cabinet_name || '-'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card h-100">
                      <div className="card-body">
                        <h6 className="text-muted small">Total</h6>
                        <p className="fw-bold mb-0 text-primary">{fmt(selected.total_amount)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card h-100">
                      <div className="card-body">
                        <h6 className="text-muted small">Reste à payer</h6>
                        <p className="fw-bold mb-0 text-danger">{fmt(selected.remaining_amount)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mt-1">
                  <div className="col-3">
                    <div className="card text-center h-100">
                      <div className="card-body">
                        <div className="text-muted small">Sous-total</div>
                        <div className="fw-bold">{fmt(selected.subtotal)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="card text-center h-100">
                      <div className="card-body">
                        <div className="text-muted small">Taxe</div>
                        <div className="fw-bold">{fmt(selected.tax_amount)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="card text-center h-100">
                      <div className="card-body">
                        <div className="text-muted small">CNAM</div>
                        <div className="fw-bold">{fmt(selected.cnam_contribution)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-3">
                    <div className="card text-center h-100">
                      <div className="card-body">
                        <div className="text-muted small">Assurance</div>
                        <div className="fw-bold">{fmt(selected.insurance_contribution)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {selected.notes && (
                  <div className="alert alert-light mt-3 mb-0">
                    <strong>Notes :</strong> {selected.notes}
                  </div>
                )}

                {selected.status !== 'paid' && selected.status !== 'cancelled' && selected.remaining_amount > 0 && (
                  <div className="alert alert-success mt-4 mb-0">
                    <div className="text-center">
                      <i className="bi bi-credit-card-2 fs-3 d-block mb-2"></i>
                      <h5 className="mt-2">Prêt à payer ?</h5>
                      <p className="small text-muted mb-3">
                        Payez en toute sécurité via notre partenaire Stripe.
                      </p>
                      
                      <button 
                        className="btn btn-success btn-lg px-5 me-md-2"
                        onClick={handlePayWithStripe}
                        disabled={payingLoading}
                      >
                        {payingLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Connexion à Stripe...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-lock-fill me-2"></i>
                            Payer {fmt(selected.remaining_amount)} avec Stripe
                          </>
                        )}
                      </button>

                      <button 
                        className="btn btn-info text-white btn-lg px-4 mt-3 mt-md-0"
                        onClick={handleVerifyPayment}
                        disabled={verifyingLoading}
                      >
                        {verifyingLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Vérification...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-arrow-repeat me-2"></i>
                            J'ai payé, vérifier
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="mt-3 pt-3 border-top">
                      <p className="small text-muted mb-2">
                        <i className="bi bi-info-circle me-1"></i>
                        Ou saisissez un montant partiel :
                      </p>
                      <div className="d-flex gap-2 flex-wrap justify-content-center">
                        <div className="input-group" style={{ maxWidth: '250px' }}>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="Montant"
                            step="0.001"
                            min="0.001"
                            max={selected.remaining_amount}
                            value={partialAmount}
                            onChange={(e) => setPartialAmount(e.target.value)}
                            disabled={payingLoading}
                          />
                          <span className="input-group-text">TND</span>
                        </div>
                        <button 
                          className="btn btn-outline-success"
                          onClick={handlePartialPay}
                          disabled={payingLoading || !partialAmount || parseFloat(partialAmount) <= 0}
                        >
                          <i className="bi bi-credit-card me-1"></i>
                          Payer ce montant
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selected.status === 'paid' && (
                  <div className="alert alert-success text-center mt-4 mb-0">
                    <i className="bi bi-check-circle-fill fs-3 d-block mb-2 text-success"></i>
                    <h5 className="mb-0">Facture payée avec succès</h5>
                    <p className="small text-muted mb-0 mt-1">Merci pour votre règlement.</p>
                  </div>
                )}

                {selected.status === 'cancelled' && (
                  <div className="alert alert-secondary text-center mt-4 mb-0">
                    <i className="bi bi-x-circle-fill fs-3 d-block mb-2"></i>
                    <h5 className="mb-0">Facture annulée</h5>
                    <p className="small text-muted mb-0 mt-1">Cette facture n'est plus payable.</p>
                  </div>
                )}

                {selected.payments && selected.payments.length > 0 && (
                  <div className="mt-4">
                    <h6>
                      <i className="bi bi-clock-history me-1"></i>
                      Historique des paiements
                    </h6>
                    <table className="table table-sm table-bordered">
                      <thead>
                        <tr>
                          <th>Montant</th>
                          <th>Méthode</th>
                          <th>N° Transaction</th>
                          <th>Date</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.payments.map(p => (
                          <tr key={p.id}>
                            <td className="fw-bold">{fmt(p.amount)}</td>
                            <td>
                              {p.payment_method === 'online' && (
                                <i className="bi bi-stripe me-1 text-primary"></i>
                              )}
                              {p.payment_method_display || p.payment_method}
                            </td>
                            <td className="small text-muted">
                              {p.transaction_id ? (
                                <span title={p.transaction_id}>
                                  {p.transaction_id.substring(0, 20)}...
                                </span>
                              ) : '-'}
                            </td>
                            <td className="small">{p.payment_date || '-'}</td>
                            <td>
                              <span className={'badge bg-' + (STATUS_MAP[p.status] || 'secondary')}>
                                {p.status_display || p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDetail(false)}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientInvoices;