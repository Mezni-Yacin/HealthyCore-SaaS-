import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export default function PharmacistDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data states
  const [stats, setStats] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [sales, setSales] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals states
  const [showStockModal, setShowStockModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  
  // Form states
  const [medications, setMedications] = useState([]);
  const [stockForm, setStockForm] = useState({ medication: '', quantity: 0, buying_price: 0, selling_price: 0, expiry_date: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, stockRes, ordRes, salesRes] = await Promise.all([
        api.get('/pharmacy/pharmacist/stats/'),
        api.get('/pharmacy/pharmacist/stock/'),
        api.get('/pharmacy/pharmacist/orders/'),
        api.get('/pharmacy/pharmacist/sales/')
      ]);
      setStats(statsRes.data);
      setStockItems(stockRes.data || []);
      setOrders(ordRes.data || []);
      setSales(salesRes.data || []);
    } catch (err) {
      console.error("Erreur de chargement pharmacie", err);
      setError("Impossible de charger les données. Avez-vous créé votre pharmacie ?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const fetchPrescriptions = async () => {
    try {
      const res = await api.get('/pharmacy/pharmacist/prescriptions/');
      setPrescriptions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openStockModal = async () => {
    try {
      const medRes = await api.get('/pharmacy/pharmacist/medications/');
      setMedications(medRes.data || []);
      setStockForm({ medication: '', quantity: 0, buying_price: 0, selling_price: 0, expiry_date: '' });
      setShowStockModal(true);
    } catch (err) {
      alert("Erreur lors du chargement des médicaments.");
    }
  };

  const submitStock = async () => {
    if (!stockForm.medication || !stockForm.expiry_date || stockForm.quantity <= 0) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/pharmacy/pharmacist/stock/', stockForm);
      setShowStockModal(false);
      fetchDashboardData();
    } catch (err) {
      alert("Erreur lors de l'ajout au stock.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    if (!window.confirm("Confirmer l'acceptation de cette commande ? Le patient sera notifié.")) return;
    try {
      await api.post(`/pharmacy/pharmacist/orders/${orderId}/accept/`);
      fetchDashboardData();
    } catch (err) {
      alert("Erreur lors de l'acceptation.");
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectReason) {
      alert("Veuillez indiquer une raison de refus.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/pharmacy/pharmacist/orders/${selectedOrder.id}/reject/`, { reason: rejectReason });
      setShowOrderModal(false);
      setRejectReason('');
      fetchDashboardData();
    } catch (err) {
      alert("Erreur lors du refus.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderOrderStatus = (status, statusDisplay) => {
    const map = { pending: 'warning text-dark', accepted: 'primary', rejected: 'danger', completed: 'success' };
    return <span className={`badge bg-${map[status] || 'secondary'}`}>{statusDisplay || status}</span>;
  };

  const renderPrescriptionStatus = (status, statusDisplay) => {
    const map = { pending: 'warning text-dark', dispensed: 'success', partially_dispensed: 'info text-dark', expired: 'danger' };
    return <span className={`badge bg-${map[status] || 'secondary'}`}>{statusDisplay || status}</span>;
  };

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3 text-muted">Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center">
            <i className="bi bi-shop me-2 text-primary"></i>
            Espace Pharmacien
          </h2>
          <p className="text-muted mb-0">Gérez votre stock, vos commandes et vos ventes.</p>
        </div>
        <button className="btn btn-primary" onClick={openStockModal}>
          <i className="bi bi-plus-lg me-2"></i> Ajouter au stock
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Onglets */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link fw-semibold ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <i className="bi bi-speedometer2 me-2"></i>Tableau de bord
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link fw-semibold ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <i className="bi bi-box-seam me-2"></i>Commandes
            {orders.filter(o => o.status === 'pending').length > 0 && (
              <span className="badge bg-danger ms-2">{orders.filter(o => o.status === 'pending').length}</span>
            )}
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link fw-semibold ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>
            <i className="bi bi-boxes me-2"></i>Stock
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link fw-semibold ${activeTab === 'prescriptions' ? 'active' : ''}`} onClick={() => { setActiveTab('prescriptions'); fetchPrescriptions(); }}>
            <i className="bi bi-file-earmark-medical me-2"></i>Ordonnances
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link fw-semibold ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
            <i className="bi bi-bag-check me-2"></i>Ventes
          </button>
        </li>
      </ul>

      {/* Contenu des onglets */}
      {activeTab === 'dashboard' && stats && (
        <div className="row g-4">
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div><p className="text-muted mb-1 small">Ventes du jour</p><h3 className="fw-bold mb-0">{stats.today_sales_count}</h3></div>
                  <i className="bi bi-cash-coin text-success fs-2"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div><p className="text-muted mb-1 small">Revenu du jour</p><h3 className="fw-bold mb-0">{Number(stats.today_revenue).toFixed(3)} TND</h3></div>
                  <i className="bi bi-graph-up-arrow text-primary fs-2"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div><p className="text-muted mb-1 small">Stock faible</p><h3 className="fw-bold mb-0">{stats.low_stock_items}</h3></div>
                  <i className="bi bi-exclamation-triangle text-warning fs-2"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div><p className="text-muted mb-1 small">Commandes en attente</p><h3 className="fw-bold mb-0">{orders.filter(o => o.status === 'pending').length}</h3></div>
                  <i className="bi bi-hourglass-split text-info fs-2"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {orders.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                <h5 className="mt-3 text-muted">Aucune commande en cours</h5>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Patient</th>
                      <th>Articles</th>
                      <th>Statut</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(ord => (
                      <tr key={ord.id}>
                        <td className="small">{new Date(ord.created_at).toLocaleString('fr-FR')}</td>
                        <td className="fw-semibold">{ord.patient_name}</td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {ord.items?.slice(0, 2).map((item, i) => (
                              <span key={i} className="badge bg-light text-dark border">{item.medication_name} (x{item.quantity})</span>
                            ))}
                            {ord.items?.length > 2 && <span className="badge bg-secondary">+{ord.items.length - 2}</span>}
                          </div>
                        </td>
                        <td>{renderOrderStatus(ord.status, ord.status_display)}</td>
                        <td className="text-end">
                          {ord.status === 'pending' ? (
                            <button className="btn btn-sm btn-primary me-2" onClick={() => handleAcceptOrder(ord.id)}>
                              <i className="bi bi-check-lg"></i> Accepter
                            </button>
                          ) : null}
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSelectedOrder(ord); setShowOrderModal(true); }}>
                            <i className="bi bi-eye"></i> Détails
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
      )}

      {activeTab === 'stock' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {stockItems.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-box text-muted" style={{ fontSize: '3rem' }}></i>
                <h5 className="mt-3 text-muted">Stock vide</h5>
                <p className="text-muted small">Cliquez sur "Ajouter au stock" pour commencer.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Médicament</th>
                      <th>Qté Stock</th>
                      <th>Prix Vente</th>
                      <th>Péremption</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockItems.map(item => (
                      <tr key={item.id}>
                        <td className="fw-semibold">{item.medication_name} <small className="text-muted">({item.medication_dosage})</small></td>
                        <td>
                          <span className={`badge ${item.quantity <= 10 ? 'bg-danger' : 'bg-success'}`}>{item.quantity}</span>
                        </td>
                        <td>{Number(item.selling_price).toFixed(3)} TND</td>
                        <td className={item.is_expired ? 'text-danger fw-bold' : ''}>{item.expiry_date}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => alert('Fonction modification à implémenter')}><i className="bi bi-pencil"></i></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'prescriptions' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {prescriptions.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-file-earmark-text text-muted" style={{ fontSize: '3rem' }}></i>
                <h5 className="mt-3 text-muted">Aucune ordonnance en attente</h5>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Patient</th>
                      <th>Médecin</th>
                      <th>Statut</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map(pres => (
                      <tr key={pres.id}>
                        <td className="small">{new Date(pres.prescription_date).toLocaleDateString('fr-FR')}</td>
                        <td className="fw-semibold">{pres.patient_name}</td>
                        <td>Dr. {pres.doctor_name}</td>
                        <td>{renderPrescriptionStatus(pres.status, pres.status_display)}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => { setSelectedPrescription(pres); setShowPrescriptionModal(true); }}>
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
      )}

      {activeTab === 'sales' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {sales.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-bag-x text-muted" style={{ fontSize: '3rem' }}></i>
                <h5 className="mt-3 text-muted">Aucune vente enregistrée</h5>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Patient</th>
                      <th className="text-end">Montant</th>
                      <th className="text-center">Paiement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id}>
                        <td className="small">{new Date(sale.dispensation_date).toLocaleString('fr-FR')}</td>
                        <td className="fw-semibold">{sale.patient_name || 'Client de passage'}</td>
                        <td className="text-end fw-bold text-success">{Number(sale.total_amount).toFixed(3)} TND</td>
                        <td className="text-center"><span className="badge bg-light text-dark border">{sale.payment_method_display}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ MODAL : AJOUT STOCK ═══════ */}
      {showStockModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-plus-lg me-2"></i>Ajouter / Mettre à jour au stock</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowStockModal(false)} disabled={submitting}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-bold">Médicament</label>
                  <select className="form-select" value={stockForm.medication} onChange={(e) => setStockForm({...stockForm, medication: e.target.value})} disabled={submitting}>
                    <option value="">-- Choisir --</option>
                    {medications.map(m => <option key={m.id} value={m.id}>{m.name} ({m.dosage})</option>)}
                  </select>
                </div>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-bold">Quantité</label>
                    <input type="number" min="0" className="form-control" value={stockForm.quantity} onChange={(e) => setStockForm({...stockForm, quantity: e.target.value})} disabled={submitting} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold">Prix Achat (TND)</label>
                    <input type="number" step="0.001" min="0" className="form-control" value={stockForm.buying_price} onChange={(e) => setStockForm({...stockForm, buying_price: e.target.value})} disabled={submitting} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold">Prix Vente (TND)</label>
                    <input type="number" step="0.001" min="0" className="form-control" value={stockForm.selling_price} onChange={(e) => setStockForm({...stockForm, selling_price: e.target.value})} disabled={submitting} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="form-label fw-bold">Date de péremption</label>
                  <input type="date" className="form-control" value={stockForm.expiry_date} onChange={(e) => setStockForm({...stockForm, expiry_date: e.target.value})} disabled={submitting} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowStockModal(false)} disabled={submitting}>Annuler</button>
                <button className="btn btn-primary" onClick={submitStock} disabled={submitting}>
                  {submitting ? <span className="spinner-border spinner-border-sm"></span> : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL : DÉTAIL COMMANDE ═══════ */}
      {showOrderModal && selectedOrder && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-info text-dark">
                <h5 className="modal-title"><i className="bi bi-box-seam me-2"></i>Détails de la Commande</h5>
                <button type="button" className="btn-close" onClick={() => setShowOrderModal(false)} disabled={submitting}></button>
              </div>
              <div className="modal-body">
                <div className="d-flex justify-content-between mb-3">
                  <div><small className="text-muted d-block">Patient</small><strong>{selectedOrder.patient_name}</strong></div>
                  <div className="text-end"><small className="text-muted d-block">Statut</small>{renderOrderStatus(selectedOrder.status, selectedOrder.status_display)}</div>
                </div>
                
                {selectedOrder.notes && <div className="alert alert-light border"><strong>Notes du patient :</strong><br />{selectedOrder.notes}</div>}
                {selectedOrder.pharmacist_response && <div className="alert alert-warning"><strong>Votre réponse :</strong><br />{selectedOrder.pharmacist_response}</div>}
                
                <h6 className="fw-bold mt-4 mb-2">Articles demandés :</h6>
                <table className="table table-sm table-bordered">
                  <thead className="table-light"><tr><th>Médicament</th><th className="text-center">Qté</th></tr></thead>
                  <tbody>
                    {selectedOrder.items.map(item => (
                      <tr key={item.id}><td className="fw-semibold">{item.medication_name} <small className="text-muted">({item.medication_dosage})</small></td><td className="text-center">{item.quantity}</td></tr>
                    ))}
                  </tbody>
                </table>

                {selectedOrder.status === 'pending' && (
                  <div className="mt-4">
                    <label className="form-label fw-bold">Raison du refus (si applicable)</label>
                    <textarea className="form-control" rows="2" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Ex: Rupture de stock..." disabled={submitting}></textarea>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {selectedOrder.status === 'pending' && (
                  <>
                    <button className="btn btn-danger" onClick={handleRejectOrder} disabled={submitting}>
                      {submitting ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-x-lg me-1"></i> Refuser</>}
                    </button>
                    <button className="btn btn-success" onClick={() => { handleAcceptOrder(selectedOrder.id); setShowOrderModal(false); }} disabled={submitting}>
                      <i className="bi bi-check-lg me-1"></i> Accepter
                    </button>
                  </>
                )}
                <button className="btn btn-secondary" onClick={() => setShowOrderModal(false)} disabled={submitting}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL : DÉTAIL ORDONNANCE ═══════ */}
      {showPrescriptionModal && selectedPrescription && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-file-earmark-medical me-2"></i>Ordonnance</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPrescriptionModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="d-flex justify-content-between mb-3">
                  <div><small className="text-muted d-block">Patient</small><strong>{selectedPrescription.patient_name}</strong></div>
                  <div className="text-end"><small className="text-muted d-block">Prescrit par</small><strong>Dr. {selectedPrescription.doctor_name}</strong></div>
                </div>
                {selectedPrescription.notes && <div className="alert alert-light border"><strong>Notes :</strong><br />{selectedPrescription.notes}</div>}
                <h6 className="fw-bold mt-4 mb-2">Médicaments prescrits :</h6>
                <table className="table table-sm table-bordered">
                  <thead className="table-light"><tr><th>Médicament</th><th>Posologie</th><th className="text-center">Qté</th></tr></thead>
                  <tbody>
                    {selectedPrescription.items.map(item => (
                      <tr key={item.id}><td className="fw-semibold">{item.medication_name} <small className="text-muted">({item.medication_dosage})</small></td><td>{item.dosage_instruction}</td><td className="text-center">{item.quantity_prescribed}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowPrescriptionModal(false)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}