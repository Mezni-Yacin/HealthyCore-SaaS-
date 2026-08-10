import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function PatientPharmacy() {
  const [activeTab, setActiveTab] = useState('prescriptions');
  
  const [prescriptions, setPrescriptions] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [presRes, purchRes] = await Promise.all([
          api.get('/pharmacy/patient/my-prescriptions/'),
          api.get('/pharmacy/patient/my-purchases/')
        ]);
        setPrescriptions(presRes.data || []);
        setPurchases(purchRes.data || []);
      } catch (err) {
        console.error("Erreur de chargement", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="container-fluid py-4" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div className="mb-4">
        <h2 className="fw-bold mb-1 d-flex align-items-center">
          <i className="bi bi-capsule-pill me-2 text-primary"></i>
          Ma Pharmacie
        </h2>
        <p className="text-muted mb-0">Retrouvez vos ordonnances numériques et votre historique d'achats.</p>
      </div>

      {/* Onglets */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link fw-semibold ${activeTab === 'prescriptions' ? 'active' : ''}`} 
            onClick={() => setActiveTab('prescriptions')}
          >
            <i className="bi bi-file-earmark-medical me-2"></i>
            Mes Ordonnances
            {prescriptions.length > 0 && <span className="badge bg-secondary ms-2">{prescriptions.length}</span>}
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link fw-semibold ${activeTab === 'purchases' ? 'active' : ''}`} 
            onClick={() => setActiveTab('purchases')}
          >
            <i className="bi bi-bag-check me-2"></i>
            Mes Achats
            {purchases.length > 0 && <span className="badge bg-secondary ms-2">{purchases.length}</span>}
          </button>
        </li>
      </ul>

      {loading ? (
        <div className="card border-0 shadow-sm text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : activeTab === 'prescriptions' ? (
        /* ═══════ LISTE DES ORDONNANCES ═══════ */
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {prescriptions.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-file-earmark-text text-muted" style={{ fontSize: '3rem' }}></i>
                <h5 className="mt-3 text-muted">Aucune ordonnance</h5>
                <p className="text-muted small">Lorsque votre médecin vous prescrira des médicaments, ils apparaîtront ici.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Médecin</th>
                      <th>Médicaments</th>
                      <th>Statut</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map(pres => (
                      <tr key={pres.id}>
                        <td className="small text-nowrap">{new Date(pres.prescription_date).toLocaleDateString('fr-FR')}</td>
                        <td className="fw-semibold">Dr. {pres.doctor_name}</td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {pres.items?.slice(0, 2).map((item, i) => (
                              <span key={i} className="badge bg-light text-dark border">{item.medication_name}</span>
                            ))}
                            {pres.items?.length > 2 && <span className="badge bg-secondary">+{pres.items.length - 2}</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`badge bg-${pres.status === 'pending' ? 'warning text-dark' : pres.status === 'dispensed' ? 'success' : 'secondary'}`}>
                            {pres.status_display}
                          </span>
                        </td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedPrescription(pres)}>
                            <i className="bi bi-eye me-1"></i> Voir détail
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
      ) : (
        /* ═══════ LISTE DES ACHATS ═══════ */
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {purchases.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-bag text-muted" style={{ fontSize: '3rem' }}></i>
                <h5 className="mt-3 text-muted">Aucun achat enregistré</h5>
                <p className="text-muted small">Vos achats en pharmacie apparaîtront ici sous forme de tickets de caisse.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Date & Heure</th>
                      <th>Pharmacie</th>
                      <th className="text-end">Montant</th>
                      <th className="text-center">Paiement</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map(purch => (
                      <tr key={purch.id}>
                        <td className="small text-nowrap">{new Date(purch.dispensation_date).toLocaleString('fr-FR')}</td>
                        <td className="fw-semibold">{purch.pharmacy_name || 'Pharmacie'}</td>
                        <td className="text-end fw-bold text-success">{Number(purch.total_amount).toFixed(3)} TND</td>
                        <td className="text-center">
                          <span className="badge bg-light text-dark border">
                            <i className="bi bi-credit-card me-1"></i>{purch.payment_method_display}
                          </span>
                        </td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedPurchase(purch)}>
                            <i className="bi bi-receipt me-1"></i> Ticket
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
                  <div>
                    <small className="text-muted d-block">Date de prescription</small>
                    <strong>{new Date(selectedPrescription.prescription_date).toLocaleDateString('fr-FR')}</strong>
                  </div>
                  <div className="text-end">
                    <small className="text-muted d-block">Prescrit par</small>
                    <strong>Dr. {selectedPrescription.doctor_name}</strong>
                  </div>
                </div>

                {selectedPrescription.notes && (
                  <div className="alert alert-light border">
                    <strong>Notes du médecin :</strong><br />
                    {selectedPrescription.notes}
                  </div>
                )}

                <h6 className="fw-bold mt-4 mb-2">Médicaments prescrits :</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th>Médicament</th>
                        <th>Posologie</th>
                        <th className="text-center">Qté</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPrescription.items.map(item => (
                        <tr key={item.id}>
                          <td className="fw-semibold">{item.medication_name} <small className="text-muted">({item.medication_dosage})</small></td>
                          <td>{item.dosage_instruction}</td>
                          <td className="text-center">{item.quantity_prescribed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedPrescription(null)}>Fermer</button>
              </div>
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
                  <div>
                    <small className="text-muted d-block">Date d'achat</small>
                    <strong>{new Date(selectedPurchase.dispensation_date).toLocaleString('fr-FR')}</strong>
                  </div>
                  <div className="text-end">
                    <small className="text-muted d-block">Pharmacie</small>
                    <strong>{selectedPurchase.pharmacy_name || 'Pharmacie'}</strong>
                  </div>
                </div>

                <div className="table-responsive mb-3">
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
                      {selectedPurchase.items.map(item => (
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
                        <td colSpan="3" className="text-end fw-bold fs-5">TOTAL</td>
                        <td className="text-end fw-bold fs-5 text-success">{Number(selectedPurchase.total_amount).toFixed(3)} TND</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="text-center">
                  <span className="badge bg-success p-2">
                    <i className="bi bi-check-circle me-1"></i>Payé via {selectedPurchase.payment_method_display}
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedPurchase(null)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}