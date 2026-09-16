import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../../services/api';

// ══════════════════ CONSTANTES & HELPERS ══════════════════
const API_BASE = '/laboratories/patient';

const STATUS_MAP = {
    requested: 'secondary', 
    sample_collected: 'info', 
    in_progress: 'warning text-dark',
    completed: 'success', 
    cancelled: 'danger'
};

const STATUS_LABELS = {
    requested: 'En attente', 
    sample_collected: 'Prélevé', 
    in_progress: 'En cours',
    completed: 'Terminé', 
    cancelled: 'Annulé'
};

// ══════════════════ COMPOSANT PRINCIPAL ══════════════════
const PatientLab = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [filterStatus, setFilterStatus] = useState('');
    
    const [showResult, setShowResult] = useState(false);
    const [resultData, setResultData] = useState(null);
    const [loadingResult, setLoadingResult] = useState(false);

    // États IA
    const [showAi, setShowAi] = useState(false);
    const [aiExplanation, setAiExplanation] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    // ✅ ÉTATS PAIEMENT
    const [showPayModal, setShowPayModal] = useState(false);
    const [payReq, setPayReq] = useState(null);
    const [paying, setPaying] = useState(false);

    // ===================== DATA FETCHING =====================
    const fetchData = useCallback(() => {
        setLoading(true);
        setError('');
        api.get(`${API_BASE}/requests/`)
            .then(r => setRequests(r.data.results || r.data || []))
            .catch(() => setError("Impossible de charger votre historique d'analyses."))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ===================== ACTIONS =====================
    const openResult = (req) => {
        if (!req.has_result || req.status !== 'completed') return;
        setLoadingResult(true);
        setError('');
        setShowAi(false); setAiExplanation(''); setAiError('');

        api.get(`${API_BASE}/requests/${req.id}/result/`)
            .then(r => { setResultData(r.data); setShowResult(true); })
            .catch(() => setError("Erreur lors du chargement des résultats."))
            .finally(() => setLoadingResult(false));
    };

    const handleAskAI = () => {
        if (!resultData?.request_info?.id) return;
        setAiLoading(true); setAiError(''); setAiExplanation(''); setShowAi(true);

        api.post('/ai/explain-results/', { request_id: resultData.request_info.id })
            .then(r => setAiExplanation(r.data.explanation))
            .catch(err => {
                if (err.response?.status === 429) {
                    setAiError(err.response.data.error || "Le service IA est surchargé. Réessayez dans 1 minute.");
                } else {
                    setAiError(err.response?.data?.error || "Le service IA est temporairement indisponible.");
                }
            })
            .finally(() => setAiLoading(false));
    };

    // ✅ FONCTIONS PAIEMENT
    const openPayModal = (req) => {
        setPayReq(req);
        setShowPayModal(true);
    };

    const handlePaySubmit = (method) => {
        if (!payReq) return;
        setPaying(true);
        api.post(`${API_BASE}/requests/${payReq.id}/pay/`, { payment_method: method })
            .then(() => { 
                setShowPayModal(false); 
                fetchData(); 
            })
            .catch(err => alert(err.response?.data?.detail || "Erreur lors du paiement."))
            .finally(() => setPaying(false));
    };

    // ===================== CALCULS DÉRIVÉS =====================
    const filteredRequests = filterStatus ? requests.filter(r => r.status === filterStatus) : requests;
    const statusCounts = requests.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

    // ===================== RENDU =====================
    return (
        <div className="container-fluid py-4">
            <div className="mb-4">
                <h4 className="mb-1"><i className="bi bi-file-medical me-2 text-primary"></i>Mes Analyses Médicales</h4>
                <p className="text-muted mb-0">Consultez votre historique, vos résultats et payez vos examens</p>
            </div>

            {error && !showResult && (
                <div className="alert alert-danger d-flex justify-content-between align-items-center">
                    <span><i className="bi bi-exclamation-triangle me-2"></i>{error}</span>
                    <button className="btn-close" onClick={() => setError('')}></button>
                </div>
            )}

            {!loading && requests.length > 0 && (
                <div className="d-flex gap-2 mb-3 flex-wrap">
                    <button className={`btn btn-sm ${filterStatus === '' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilterStatus('')}>Toutes ({requests.length})</button>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <button key={key} className={`btn btn-sm ${filterStatus === key ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilterStatus(key)}>
                            {label} {statusCounts[key] ? `(${statusCounts[key]})` : ''}
                        </button>
                    ))}
                </div>
            )}

            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted">Chargement...</p></div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="text-center py-5">
                            <i className="bi bi-clipboard2-pulse fs-1 text-muted opacity-50"></i>
                            <h5 className="mt-3 text-muted">{filterStatus ? 'Aucune analyse avec ce statut.' : 'Aucune analyse médicale'}</h5>
                            {filterStatus && <button className="btn btn-outline-primary btn-sm mt-2" onClick={() => setFilterStatus('')}><i className="bi bi-arrow-counterclockwise me-1"></i>Voir toutes les analyses</button>}
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Date</th>
                                        <th>Laboratoire</th>
                                        <th>Prescrit par</th>
                                        <th>Analyses</th>
                                        <th>Montant</th>
                                        <th>Statut</th>
                                        <th>Paiement</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRequests.map(req => (
                                        <tr key={req.id}>
                                            <td className="small text-nowrap">{new Date(req.request_date).toLocaleDateString('fr-FR')}</td>
                                            <td className="fw-semibold">{req.lab_name}</td>
                                            <td>{req.doctor_name !== '-' ? `Dr. ${req.doctor_name}` : <span className="text-muted">-</span>}</td>
                                            <td>
                                                <div className="d-flex flex-wrap gap-1">
                                                    {req.test_names?.slice(0, 2).map((name, i) => <span key={i} className="badge bg-light text-dark border">{name}</span>)}
                                                    {(req.test_names?.length || 0) > 2 && <span className="badge bg-secondary">+{req.test_names.length - 2}</span>}
                                                </div>
                                            </td>
                                            <td className="fw-bold text-success">{Number(req.total_price).toFixed(3)} TND</td>
                                            <td>
                                                <div className="d-flex flex-column gap-1">
                                                    <span className={`badge bg-${STATUS_MAP[req.status]}`}>{req.status_display}</span>
                                                    {req.priority !== 'normal' && (
                                                        <span className="badge bg-danger">
                                                            <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                                            {req.priority_display}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                {req.payment_status === 'paid' ? (
                                                    <span className="badge bg-success">
                                                        <i className="bi bi-check-circle me-1"></i>
                                                        {req.payment_method_display || 'Payé'}
                                                    </span>
                                                ) : req.status !== 'cancelled' ? (
                                                    // ✅ BOUTON PAIEMENT SI NON PAYÉ ET NON ANNULÉ
                                                    <button className="btn btn-sm btn-outline-success" onClick={() => openPayModal(req)}>
                                                        <i className="bi bi-credit-card me-1"></i>Payer
                                                    </button>
                                                ) : (
                                                    <span className="badge bg-secondary">-</span>
                                                )}
                                            </td>
                                            <td className="text-end">
                                                {req.has_result && req.status === 'completed' ? (
                                                    <button className="btn btn-sm btn-primary" onClick={() => openResult(req)}><i className="bi bi-eye me-1"></i>Voir résultats</button>
                                                ) : req.status === 'cancelled' ? (
                                                    <span className="text-muted small">Annulée</span>
                                                ) : (
                                                    <span className="text-muted small"><i className="bi bi-hourglass-split me-1"></i>En cours...</span>
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

            {/* ═══════ MODAL : PAIEMENT ═══════ */}
            {showPayModal && payReq && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow" style={{ borderRadius: '16px' }}>
                            <div className="modal-header bg-success text-white" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                                <h5 className="modal-title fw-bold"><i className="bi bi-credit-card me-2"></i>Paiement de l'analyse</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPayModal(false)}></button>
                            </div>
                            <div className="modal-body text-center py-4">
                                <p className="text-muted mb-1">Montant à régler</p>
                                <h2 className="fw-bold text-success mb-4">{Number(payReq.total_price).toFixed(3)} TND</h2>
                                
                                <div className="alert alert-light border d-flex align-items-center justify-content-between text-start">
                                    <div>
                                        <small className="text-muted d-block">Laboratoire</small>
                                        <strong>{payReq.lab_name}</strong>
                                    </div>
                                    <div className="text-end">
                                        <small className="text-muted d-block">Examens</small>
                                        <strong>{payReq.test_names?.length || 0} analyse(s)</strong>
                                    </div>
                                </div>

                                <h6 className="mt-4 mb-3 text-dark">Sélectionnez votre moyen de paiement :</h6>
                                <div className="d-grid gap-2">
                                    <button className="btn btn-outline-success btn-lg d-flex align-items-center justify-content-between py-3 px-4" disabled={paying} onClick={() => handlePaySubmit('online')}>
                                        <span><i className="bi bi-globe me-2"></i>Paiement en ligne (Carte Bancaire)</span>
                                        <i className="bi bi-chevron-right"></i>
                                    </button>
                                    <button className="btn btn-outline-primary btn-lg d-flex align-items-center justify-content-between py-3 px-4" disabled={paying} onClick={() => handlePaySubmit('card')}>
                                        <span><i className="bi bi-credit-card-2-front me-2"></i>Carte Bancaire (TPE)</span>
                                        <i className="bi bi-chevron-right"></i>
                                    </button>
                                    <button className="btn btn-outline-info btn-lg d-flex align-items-center justify-content-between py-3 px-4" disabled={paying} onClick={() => handlePaySubmit('cnam')}>
                                        <span><i className="bi bi-shield-check me-2"></i>CNAM</span>
                                        <i className="bi bi-chevron-right"></i>
                                    </button>
                                    <button className="btn btn-outline-warning btn-lg d-flex align-items-center justify-content-between py-3 px-4" disabled={paying} onClick={() => handlePaySubmit('insurance')}>
                                        <span><i className="bi bi-umbrella me-2"></i>Assurance</span>
                                        <i className="bi bi-chevron-right"></i>
                                    </button>
                                </div>
                                {paying && <div className="mt-3"><div className="spinner-border text-success"></div><p className="small mt-2">Traitement du paiement...</p></div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ MODAL : RÉSULTATS & IA ═══════ */}
            {showResult && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white d-flex justify-content-between align-items-center">
                                <h5 className="modal-title mb-0"><i className="bi bi-clipboard2-check me-2"></i>Rapport de Laboratoire</h5>
                                <div className="d-flex align-items-center gap-2">
                                    {resultData?.validation_date ? <span className="badge bg-light text-success"><i className="bi bi-patch-check-fill me-1"></i>Validé</span> : <span className="badge bg-warning text-dark"><i className="bi bi-hourglass-split me-1"></i>En attente</span>}
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowResult(false)}></button>
                                </div>
                            </div>

                            <div className="modal-body">
                                {loadingResult ? (
                                    <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                                ) : resultData ? (
                                    <>
                                        <div className="row g-3 mb-4">
                                            <div className="col-md-6"><div className="p-3 bg-light border rounded h-100"><div className="text-muted small mb-1">Laboratoire</div><strong>{resultData.request_info?.lab_name || '-'}</strong></div></div>
                                            <div className="col-md-6"><div className="p-3 bg-light border rounded h-100"><div className="text-muted small mb-1">Médecin prescripteur</div><strong>{resultData.request_info?.doctor_name !== '-' ? `Dr. ${resultData.request_info.doctor_name}` : '-'}</strong></div></div>
                                        </div>

                                        {resultData.critical_finding && <div className="alert alert-danger border-2 border-danger text-center mb-3 py-3"><i className="bi bi-exclamation-octagon fs-3 me-2"></i><h5 className="alert-heading d-inline">Urgence Médicale</h5><p className="mb-0 mt-2">Contactez votre médecin immédiatement.</p></div>}
                                        {resultData.is_abnormal && !resultData.critical_finding && <div className="alert alert-warning text-center mb-3"><i className="bi bi-exclamation-triangle me-2"></i><strong>Attention :</strong> Valeurs en dehors des normes.</div>}

                                        <div className="table-responsive border rounded">
                                            <table className="table table-hover mb-0">
                                                <thead className="table-light"><tr><th>Examen</th><th>Résultat</th><th>Normes</th><th className="text-center" style={{ width: '50px' }}></th></tr></thead>
                                                <tbody>
                                                    {Object.entries(resultData.results || {}).map(([code, data]) => (
                                                        <tr key={code} className={data.is_abnormal ? 'table-danger' : ''}>
                                                            <td className="fw-bold">{code}</td>
                                                            <td><span className={`fs-5 fw-bold ${data.is_abnormal ? 'text-danger' : ''}`}>{data.value}</span> {data.unit && <span className="text-muted small">({data.unit})</span>}</td>
                                                            <td className="text-muted">{data.normal_range || '-'}</td>
                                                            <td className="text-center">{data.is_abnormal && <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {resultData.conclusion && <div className="mt-4 p-3 bg-light border rounded"><h6 className="mb-2"><i className="bi bi-chat-left-text me-2 text-primary"></i>Conclusion</h6><p className="mb-0 fst-italic">{resultData.conclusion}</p></div>}
                                        {resultData.recommendations && <div className="mt-3 p-3 border border-info rounded bg-info bg-opacity-10"><h6 className="mb-2 text-info"><i className="bi bi-lightbulb me-2"></i>Recommandations</h6><p className="mb-0">{resultData.recommendations}</p></div>}

                                        <div className="mt-4 pt-3 border-top small text-muted row g-2">
                                            <div className="col-md-4"><i className="bi bi-calendar3 me-1"></i>Date : <strong>{resultData.analysis_date ? new Date(resultData.analysis_date).toLocaleDateString('fr-FR') : '-'}</strong></div>
                                            <div className="col-md-4"><i className="bi bi-person-check me-1"></i>Analysé par : <strong>{resultData.analyzed_by_name || '-'}</strong></div>
                                            {resultData.validation_date && <div className="col-md-4"><i className="bi bi-patch-check me-1 text-success"></i>Validé par : <strong>{resultData.validated_by_name || '-'}</strong></div>}
                                        </div>

                                        {/* SECTION IA */}
                                        <div className="mt-4 pt-3 border-top">
                                            {!showAi ? (
                                                <div className="text-center">
                                                    <button className="btn btn-outline-primary btn-lg px-4" onClick={handleAskAI} disabled={aiLoading}><i className="bi bi-stars me-2"></i>Comprendre mes résultats avec l'IA</button>
                                                    <div className="small text-muted mt-2">Explication simple et sécurisée</div>
                                                </div>
                                            ) : (
                                                <div className="card border-primary shadow-sm">
                                                    <div className="card-header bg-primary bg-opacity-10 text-primary d-flex justify-content-between align-items-center py-2">
                                                        <span className="fw-bold"><i className="bi bi-stars me-2"></i>Assistant IA</span>
                                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowAi(false)}>Masquer</button>
                                                    </div>
                                                    <div className="card-body">
                                                        {aiLoading && <div className="text-center py-4"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted small mb-0">Analyse en cours...</p></div>}
                                                        {aiError && <div className="alert alert-danger small py-2 mb-0"><i className="bi bi-exclamation-triangle me-2"></i>{aiError}</div>}
                                                        {aiExplanation && !aiLoading && (
                                                            <>
                                                                <div className="bg-white p-3 rounded border small" style={{ lineHeight: '1.7' }}><ReactMarkdown>{aiExplanation}</ReactMarkdown></div>
                                                                <div className="mt-3 p-2 bg-warning bg-opacity-10 border border-warning rounded small text-muted text-center">
                                                                    <i className="bi bi-shield-exclamation me-1"></i><strong>Attention :</strong> Généré par IA à titre indicatif. Ne remplace pas l'avis d'un médecin.
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : <div className="text-center py-4 text-muted">Aucune donnée.</div>}
                            </div>
                            <div className="modal-footer d-flex justify-content-between">
                                <div className="d-flex align-items-center gap-2">
                                    {resultData?.pdf_report && (
                                        <a href={resultData.pdf_report} target="_blank" rel="noreferrer" className="btn btn-outline-danger btn-sm">
                                            <i className="bi bi-file-pdf me-1"></i> Télécharger PDF
                                        </a>
                                    )}
                                    <div className="small text-muted"><i className="bi bi-info-circle me-1"></i>Ce rapport est informatif.</div>
                                </div>
                                <button className="btn btn-secondary" onClick={() => setShowResult(false)}>Fermer</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientLab;