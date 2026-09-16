import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function PatientPharmacy() {
  const [activeTab, setActiveTab] = useState('prescriptions');
  
  const [prescriptions, setPrescriptions] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // State pour la modale de création de commande
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [pharmacies, setPharmacies] = useState([]);
  const [medications, setMedications] = useState([]);
  const [orderForm, setOrderForm] = useState({
    pharmacy_id: '',
    notes: '',
    items: [{ medication_id: '', quantity: 1 }]
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [presRes, purchRes, ordRes] = await Promise.all([
        api.get('/pharmacy/patient/my-prescriptions/'),
        api.get('/pharmacy/patient/my-purchases/'),
        api.get('/pharmacy/patient/my-orders/')
      ]);
      setPrescriptions(presRes.data || []);
      setPurchases(purchRes.data || []);
      setOrders(ordRes.data || []);
    } catch (err) {
      console.error("Erreur de chargement pharmacie", err);
      setError("Impossible de charger vos données de pharmacie.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openOrderModal = async () => {
    try {
      const [pharmRes, medRes] = await Promise.all([
        api.get('/pharmacy/patient/pharmacies/'),
        api.get('/pharmacy/patient/medications/')
      ]);
      setPharmacies(pharmRes.data || []);
      setMedications(medRes.data || []);
      setOrderForm({ pharmacy_id: '', notes: '', items: [{ medication_id: '', quantity: 1 }] });
      setShowOrderModal(true);
    } catch (err) {
      alert("Erreur lors du chargement des pharmacies et médicaments.");
    }
  };

  const handleOrderItemChange = (index, field, value) => {
    const newItems = [...orderForm.items];
    newItems[index][field] = value;
    setOrderForm({ ...orderForm, items: newItems });
  };

  const addOrderItem = () => {
    setOrderForm({
      ...orderForm,
      items: [...orderForm.items, { medication_id: '', quantity: 1 }]
    });
  };

  const removeOrderItem = (index) => {
    const newItems = orderForm.items.filter((_, i) => i !== index);
    setOrderForm({ ...orderForm, items: newItems.length ? newItems : [{ medication_id: '', quantity: 1 }] });
  };

  const submitOrder = async () => {
    if (!orderForm.pharmacy_id) {
      alert("Veuillez sélectionner une pharmacie.");
      return;
    }
    const validItems = orderForm.items.filter(i => i.medication_id && i.quantity > 0);
    if (validItems.length === 0) {
      alert("Veuillez ajouter au moins un médicament.");
      return;
    }

    setSubmittingOrder(true);
    try {
      await api.post('/pharmacy/patient/create-order/', {
        pharmacy_id: orderForm.pharmacy_id,
        notes: orderForm.notes,
        items: validItems
      });
      setShowOrderModal(false);
      fetchData(); // Rafraîchir la liste
    } catch (err) {
      alert("Erreur lors de la création de la commande.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const renderPrescriptionStatus = (status, statusDisplay) => {
    const map = { pending: 'warning text-dark', dispensed: 'success', partially_dispensed: 'info text-dark', expired: 'danger' };
    return <span className={`badge bg-${map[status] || 'secondary'}`}>{statusDisplay || status}</span>;
  };

  const renderOrderStatus = (status, statusDisplay) => {
    const map = { pending: 'warning text-dark', accepted: 'primary', rejected: 'danger', completed: 'success' };
    return <span className={`badge bg-${map[status] || 'secondary'}`}>{statusDisplay || status}</span>;
  };

  return (
    <div className="container-fluid py-4" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center">
            <i className="bi bi-capsule-pill me-2 text-primary"></i>
            Ma Pharmacie
          </h2>
          <p className="text-muted mb-0">Retrouvez vos ordonnances, commandes et historique d'achats.</p>
        </div>
        <button className="btn btn-primary" onClick={openOrderModal}>
          <i className="bi bi-bag-plus me-2"></i> Passer une commande
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Onglets */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link fw-semibold ${activeTab === 'prescriptions' ? 'active' : ''}`} onClick={() => setActiveTab('prescriptions')}>
            <i className="bi bi-file-earmark-medical me-2"></i>Ordonnances
            {prescriptions.length > 0 && <span className="badge bg-secondary ms-2">{prescriptions.length}</span>}
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link fw-semibold ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <i className="bi bi-box-seam me-2"></i>Mes Commandes
            {orders.length > 0 && <span className="badge bg-secondary ms-2">{orders.length}</span>}
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link fw-semibold ${activeTab === 'purchases' ? 'active' : ''}`} onClick={() => setActiveTab('purchases')}>
            <i className="bi bi-bag-check me-2"></i>Mes Achats
            {purchases.length > 0 && <span className="badge bg-secondary ms-2">{purchases.length}</span>}
          </button>
        </li>
      </ul>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : activeTab === 'prescriptions' ? (
        /* ═══════ LISTE DES ORDONNANCES ═══════ */
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {prescriptions.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-file-earmark-text text-muted" style={{ fontSize: '3rem' }}></i>
                <h5 className="mt-3 text-muted">Aucune ordonnance</h5>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light"><tr><th>Date</th><th>Médecin</th><th>Médicaments</th><th>Statut</th><th className="text-end">Action</th></tr></thead>
                  <tbody>
                    {prescriptions.map(pres => (
                      <tr key={pres.id}>
                        <td className="small">{new Date(pres.prescription_date).toLocaleDateString('fr-FR')}</td>
                        <td className="fw-semibold">Dr. {pres.doctor_name}</td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {pres.items?.slice(0, 2).map((item, i) => (
                              <span key={i} className="badge bg-light text-dark border">{item.medication_name}</span>
                            ))}
                            {pres.items?.length > 2 && <span className="badge bg-secondary">+{pres.items.length - 2}</span>}
                          </div>
                        </td>
                        <td>{renderPrescriptionStatus(pres.status, pres.status_display)}</td>
                        <td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedPrescription(pres)}><i className="bi bi-eye me-1"></i> Détail</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'orders' ? (
        /* ═══════ LISTE DES COMMANDES ═══════ */
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {orders.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-bag-x text-muted" style={{ fontSize: '3rem' }}></i>
                <h5 className="mt-3 text-muted">Aucune commande en cours</h5>
                <p className="text-muted small">Cliquez sur "Passer une commande" pour réserver vos médicaments.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light"><tr><th>Date</th><th>Pharmacie</th><th>Articles</th><th>Statut</th><th className="text-end">Action</th></tr></thead>
                  <tbody>
                    {orders.map(ord => (
                      <tr key={ord.id}>
                        <td className="small">{new Date(ord.created_at).toLocaleDateString('fr-FR')}</td>
                        <td className="fw-semibold">{ord.pharmacy_name}</td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {ord.items?.slice(0, 2).map((item, i) => (
                              <span key={i} className="badge bg-light text-dark border">{item.medication_name} (x{item.quantity})</span>
                            ))}
                            {ord.items?.length > 2 && <span className="badge bg-secondary">+{ord.items.length - 2}</span>}
                          </div>
                        </td>
                        <td>{renderOrderStatus(ord.status, ord.status_display)}</td>
                        <td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedOrder(ord)}><i className="bi bi-eye me-1"></i> Détail</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ═══════ LISTE DES ACHATS ═══════ */
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {purchases.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-bag text-muted" style={{ fontSize: '3rem' }}></i>
                <h5 className="mt-3 text-muted">Aucun achat enregistré</h5>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light"><tr><th>Date & Heure</th><th>Pharmacie</th><th className="text-end">Montant</th><th className="text-center">Paiement</th><th className="text-end">Action</th></tr></thead>
                  <tbody>
                    {purchases.map(purch => (
                      <tr key={purch.id}>
                        <td className="small">{new Date(purch.dispensation_date).toLocaleString('fr-FR')}</td>
                        <td className="fw-semibold">{purch.pharmacy_name || 'Pharmacie'}</td>
                        <td className="text-end fw-bold text-success">{Number(purch.total_amount).toFixed(3)} TND</td>
                        <td className="text-center"><span className="badge bg-light text-dark border"><i className="bi bi-credit-card me-1"></i>{purch.payment_method_display}</span></td>
                        <td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedPurchase(purch)}><i className="bi bi-receipt me-1"></i> Ticket</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ MODAL : DÉTAIL ORDONNANCE ═══════ */}
      {selectedPrescription && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-file-earmark-medical me-2"></i>Mon Ordonnance</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedPrescription(null)}></button>
              </div>
              <div className="modal-body">
                <div className="d-flex justify-content-between mb-3">
                  <div><small className="text-muted d-block">Date</small><strong>{new Date(selectedPrescription.prescription_date).toLocaleDateString('fr-FR')}</strong></div>
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
              <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setSelectedPrescription(null)}>Fermer</button></div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL : DÉTAIL COMMANDE ═══════ */}
      {selectedOrder && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-info text-dark">
                <h5 className="modal-title"><i className="bi bi-box-seam me-2"></i>Détail de la Commande</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)}></button>
              </div>
              <div className="modal-body">
                <div className="d-flex justify-content-between mb-3">
                  <div><small className="text-muted d-block">Pharmacie</small><strong>{selectedOrder.pharmacy_name}</strong></div>
                  <div className="text-end"><small className="text-muted d-block">Statut</small>{renderOrderStatus(selectedOrder.status, selectedOrder.status_display)}</div>
                </div>
                {selectedOrder.notes && <div className="alert alert-light border"><strong>Vos notes :</strong><br />{selectedOrder.notes}</div>}
                {selectedOrder.pharmacist_response && <div className="alert alert-warning"><strong>Réponse du pharmacien :</strong><br />{selectedOrder.pharmacist_response}</div>}
                
                <h6 className="fw-bold mt-4 mb-2">Articles demandés :</h6>
                <table className="table table-sm table-bordered">
                  <thead className="table-light"><tr><th>Médicament</th><th className="text-center">Qté</th></tr></thead>
                  <tbody>
                    {selectedOrder.items.map(item => (
                      <tr key={item.id}><td className="fw-semibold">{item.medication_name} <small className="text-muted">({item.medication_dosage})</small></td><td className="text-center">{item.quantity}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>Fermer</button></div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL : TICKET DE CAISSE ═══════ */}
      {selectedPurchase && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title"><i className="bi bi-receipt me-2"></i>Ticket de Caisse</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedPurchase(null)}></button>
              </div>
              <div className="modal-body">
                <div className="d-flex justify-content-between mb-4">
                  <div><small className="text-muted d-block">Date d'achat</small><strong>{new Date(selectedPurchase.dispensation_date).toLocaleString('fr-FR')}</strong></div>
                  <div className="text-end"><small className="text-muted d-block">Pharmacie</small><strong>{selectedPurchase.pharmacy_name || 'Pharmacie'}</strong></div>
                </div>
                <table className="table table-sm table-bordered">
                  <thead className="table-light"><tr><th>Article</th><th className="text-center">Qté</th><th className="text-end">P.U.</th><th className="text-end">Total</th></tr></thead>
                  <tbody>
                    {selectedPurchase.items.map(item => (
                      <tr key={item.id}><td className="fw-semibold">{item.medication_name} <small className="text-muted">({item.medication_dosage})</small></td><td className="text-center">{item.quantity}</td><td className="text-end">{Number(item.unit_price).toFixed(3)}</td><td className="text-end fw-bold">{Number(item.total_price).toFixed(3)}</td></tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="table-light"><td colSpan="3" className="text-end fw-bold fs-5">TOTAL</td><td className="text-end fw-bold fs-5 text-success">{Number(selectedPurchase.total_amount).toFixed(3)} TND</td></tr></tfoot>
                </table>
                <div className="text-center"><span className="badge bg-success p-2"><i className="bi bi-check-circle me-1"></i>Payé via {selectedPurchase.payment_method_display}</span></div>
              </div>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setSelectedPurchase(null)}>Fermer</button></div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL : CRÉATION DE COMMANDE ═══════ */}
      {showOrderModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-bag-plus me-2"></i>Passer une commande</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowOrderModal(false)} disabled={submittingOrder}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-bold">Pharmacie destinataire</label>
                  <select className="form-select" value={orderForm.pharmacy_id} onChange={(e) => setOrderForm({...orderForm, pharmacy_id: e.target.value})} disabled={submittingOrder}>
                    <option value="">-- Choisir une pharmacie --</option>
                    {pharmacies.map(p => <option key={p.id} value={p.id}>{p.name} ({p.city_name})</option>)}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">Médicaments souhaités</label>
                  {orderForm.items.map((item, index) => (
                    <div className="d-flex gap-2 mb-2" key={index}>
                      <select className="form-select" value={item.medication_id} onChange={(e) => handleOrderItemChange(index, 'medication_id', e.target.value)} disabled={submittingOrder}>
                        <option value="">-- Médicament --</option>
                        {medications.map(m => <option key={m.id} value={m.id}>{m.name} ({m.dosage})</option>)}
                      </select>
                      <input type="number" min="1" className="form-control" style={{ width: '100px' }} value={item.quantity} onChange={(e) => handleOrderItemChange(index, 'quantity', e.target.value)} disabled={submittingOrder} />
                      <button className="btn btn-outline-danger" onClick={() => removeOrderItem(index)} disabled={submittingOrder}><i className="bi bi-trash"></i></button>
                    </div>
                  ))}
                  <button className="btn btn-sm btn-outline-primary" onClick={addOrderItem} disabled={submittingOrder}><i className="bi bi-plus-lg me-1"></i> Ajouter un médicament</button>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">Notes (Optionnel)</label>
                  <textarea className="form-control" rows="2" value={orderForm.notes} onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})} placeholder="Ex: J'ai besoin de ce médicament urgemment." disabled={submittingOrder}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowOrderModal(false)} disabled={submittingOrder}>Annuler</button>
                <button className="btn btn-primary" onClick={submitOrder} disabled={submittingOrder}>
                  {submittingOrder ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-check-lg me-1"></i> Confirmer la commande</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}