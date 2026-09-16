import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';

const API_BASE = '/laboratories/patient';

export default function PatientPayments() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Gestion de la modale et du paiement
    const [showPayModal, setShowPayModal] = useState(false);
    const [payReq, setPayReq] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState(null); // 'online', 'card', 'cash'
    
    // Pour lire les paramètres d'URL (retour Stripe)
    const [searchParams] = useSearchParams();

    const fetchData = useCallback(() => {
        setLoading(true);
        api.get(`${API_BASE}/requests/`)
            .then(r => setRequests(r.data.results || r.data || []))
            .catch(() => setError("Impossible de charger vos factures."))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchData();
        
        if (searchParams.get('success')) {
            alert("Paiement réussi ! Votre facture a été mise à jour.");
        }
        if (searchParams.get('canceled')) {
            alert("Le paiement a été annulé.");
        }
    }, [fetchData, searchParams]);

    const openPayModal = (req) => {
        setPayReq(req);
        setSelectedMethod(null); // Réinitialiser le choix à chaque ouverture
        setShowPayModal(true);
    };

    // ✅ ACTION LORS DU CLIC SUR "CONFIRMER LE PAIEMENT"
    const handleConfirmPayment = () => {
        if (!payReq || !selectedMethod) return;
        setProcessing(true);

        if (selectedMethod === 'online') {
            // Paiement en ligne via Stripe
            api.post(`${API_BASE}/requests/${payReq.id}/pay-stripe/`)
                .then(res => {
                    window.location.href = res.data.url; // Redirection Stripe
                })
                .catch(err => {
                    alert(err.response?.data?.detail || "Erreur lors de la redirection Stripe.");
                    setProcessing(false);
                });
        } else {
            // Paiement sur place (Espèces ou Carte TPE)
            api.post(`${API_BASE}/requests/${payReq.id}/pay-onsite/`, { method: selectedMethod })
                .then(() => { 
                    setShowPayModal(false); 
                    fetchData(); 
                })
                .catch(err => alert(err.response?.data?.detail || "Erreur."))
                .finally(() => setProcessing(false));
        }
    };

    const validRequests = requests.filter(r => r.status !== 'cancelled');
    const unpaidRequests = validRequests.filter(r => r.payment_status !== 'paid');

    // Options de paiement
    const paymentOptions = [
        { id: 'online', icon: 'bi-globe', title: 'Paiement en ligne', desc: 'Carte bancaire via Stripe', color: 'primary' },
        { id: 'card', icon: 'bi-credit-card-2-front', title: 'Carte Bancaire (TPE)', desc: 'Paiement au comptoir du laboratoire', color: 'info' },
        { id: 'cash', icon: 'bi-cash-coin', title: 'Espèces', desc: 'Paiement au comptoir du laboratoire', color: 'success' },
    ];

    return (
        <div className="container-fluid py-4" style={{ backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 56px)' }}>
            
            <div className="mb-4">
                <h3 className="fw-bold mb-1"><i className="bi bi-credit-card-fill me-2 text-success"></i>Mes Paiements</h3>
                <p className="text-muted mb-0">Réglez vos factures d'analyses médicales en ligne ou sur place.</p>
            </div>

            {/* Résumé */}
            <div className="row g-3 mb-4">
                <div className="col-md-6">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <div className="card-body d-flex align-items-center">
                            <div className="rounded-3 d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px', backgroundColor: '#fee2e2' }}>
                                <i className="bi bi-receipt fs-4 text-danger"></i>
                            </div>
                            <div>
                                <div className="text-muted small text-uppercase fw-semibold">Factures Impayées</div>
                                <h4 className="mb-0 fw-bold text-dark">{unpaidRequests.length}</h4>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <div className="card-body d-flex align-items-center">
                            <div className="rounded-3 d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px', backgroundColor: '#dcfce7' }}>
                                <i className="bi bi-check-circle fs-4 text-success"></i>
                            </div>
                            <div>
                                <div className="text-muted small text-uppercase fw-semibold">Factures Réglées</div>
                                <h4 className="mb-0 fw-bold text-dark">{validRequests.length - unpaidRequests.length}</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <div className="card-header bg-white border-0 py-3">
                    <h5 className="mb-0 fw-bold">Historique des transactions</h5>
                </div>
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                    ) : validRequests.length === 0 ? (
                        <div className="text-center py-5">
                            <i className="bi bi-inbox fs-1 text-muted opacity-50"></i>
                            <p className="mt-2 text-muted">Aucune facture disponible.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Date</th>
                                        <th>Laboratoire</th>
                                        <th>Montant</th>
                                        <th className="text-center">Statut</th>
                                        <th className="text-end">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {validRequests.map(req => (
                                        <tr key={req.id}>
                                            <td className="small text-nowrap">{new Date(req.request_date).toLocaleDateString('fr-FR')}</td>
                                            <td className="fw-semibold">{req.lab_name}</td>
                                            <td className="fw-bold text-success">{Number(req.total_price).toFixed(3)} TND</td>
                                            <td className="text-center">
                                                {req.payment_status === 'paid' ? (
                                                    <span className="badge bg-success-subtle text-success">
                                                        <i className="bi bi-check-circle me-1"></i>{req.payment_method_display || 'Payé'}
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-danger-subtle text-danger">Non Payé</span>
                                                )}
                                            </td>
                                            <td className="text-end">
                                                {req.payment_status !== 'paid' ? (
                                                    <button className="btn btn-sm btn-success" onClick={() => openPayModal(req)}>
                                                        <i className="bi bi-credit-card me-1"></i>Payer
                                                    </button>
                                                ) : (
                                                    <span className="text-muted small">Réglé</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ✅ MODALE DE PAIEMENT AVEC SÉLECTION PAR CARTES */}
            {showPayModal && payReq && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow" style={{ borderRadius: '16px' }}>
                            <div className="modal-header bg-primary text-white" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                                <h5 className="modal-title fw-bold"><i className="bi bi-credit-card me-2"></i>Régler la facture</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => !processing && setShowPayModal(false)} disabled={processing}></button>
                            </div>
                            <div className="modal-body py-4">
                                <div className="text-center mb-4">
                                    <p className="text-muted mb-1">Montant à régler</p>
                                    <h2 className="fw-bold text-dark mb-0">{Number(payReq.total_price).toFixed(3)} TND</h2>
                                </div>

                                <h6 className="mt-3 mb-3 text-dark text-center">Choisissez votre mode de paiement :</h6>
                                
                                <div className="d-flex flex-column gap-3">
                                    {paymentOptions.map(opt => (
                                        <div 
                                            key={opt.id}
                                            onClick={() => !processing && setSelectedMethod(opt.id)}
                                            className={`p-3 border rounded-3 d-flex align-items-center gap-3 ${selectedMethod === opt.id ? `border-${opt.color} bg-${opt.color} bg-opacity-10` : 'border-light bg-white'}`}
                                            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            <div className={`rounded-3 d-flex align-items-center justify-content-center bg-${opt.color} bg-opacity-10 text-${opt.color}`} style={{ width: '48px', height: '48px' }}>
                                                <i className={`bi ${opt.icon} fs-4`}></i>
                                            </div>
                                            <div className="flex-grow-1">
                                                <strong className="d-block text-dark">{opt.title}</strong>
                                                <small className="text-muted">{opt.desc}</small>
                                            </div>
                                            <div className={`form-check m-0 ${selectedMethod === opt.id ? `text-${opt.color}` : 'text-muted'}`}>
                                                <i className={`bi ${selectedMethod === opt.id ? 'bi-check-circle-fill fs-4' : 'bi-circle fs-4'}`}></i>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {processing && (
                                    <div className="mt-4 text-center">
                                        <div className="spinner-border text-primary"></div>
                                        <p className="small mt-2 mb-0 text-muted">{selectedMethod === 'online' ? 'Redirection vers Stripe...' : 'Traitement en cours...'}</p>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer border-top-0 bg-light p-3" style={{ borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                                <button 
                                    className="btn btn-light px-4" 
                                    onClick={() => setShowPayModal(false)} 
                                    disabled={processing}
                                >
                                    Annuler
                                </button>
                                <button 
                                    className="btn btn-primary px-4" 
                                    disabled={!selectedMethod || processing} 
                                    onClick={handleConfirmPayment}
                                >
                                    <i className="bi bi-shield-check me-2"></i>
                                    Confirmer le paiement
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}