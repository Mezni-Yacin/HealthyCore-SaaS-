import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown'; // <-- AJOUT IMPORT MARKDOWN
import api from '../services/api';

// ══════════════════ CONSTANTES & HELPERS ══════════════════
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
    // --- États principales ---
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // --- Filtres ---
    const [filterStatus, setFilterStatus] = useState('');

    // --- Modal Résultats ---
    const [showResult, setShowResult] = useState(false);
    const [resultData, setResultData] = useState(null);
    const [loadingResult, setLoadingResult] = useState(false);

    // --- États IA (NOUVEAU) ---
    const [showAi, setShowAi] = useState(false);
    const [aiExplanation, setAiExplanation] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    // ===================== DATA FETCHING =====================
    const fetchData = useCallback(() => {
        setLoading(true);
        setError('');
        api.get('/laboratory/patient/requests/')
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
        
        // Réinitialiser l'IA à chaque ouverture de nouveau résultat
        setShowAi(false);
        setAiExplanation('');
        setAiError('');

        api.get(`/laboratory/patient/requests/${req.id}/result/`)
            .then(r => {
                setResultData(r.data);
                setShowResult(true);
            })
            .catch(() => setError("Une erreur est survenue lors du chargement des résultats."))
            .finally(() => setLoadingResult(false));
    };

    // --- Fonction Appel IA (NOUVEAU) ---
    const handleAskAI = () => {
        if (!resultData || !resultData.request_info?.id) return;
        
        setAiLoading(true);
        setAiError('');
        setAiExplanation('');
        setShowAi(true);

        api.post('/ai/explain-results/', { request_id: resultData.request_info.id })
            .then(r => {
                setAiExplanation(r.data.explanation);
            })
            .catch(err => {
                setAiError(err.response?.data?.error || "Erreur lors de la communication avec l'assistant IA.");
            })
            .finally(() => setAiLoading(false));
    };

    // ===================== CALCULS DÉRIVÉS =====================
    const filteredRequests = filterStatus
        ? requests.filter(r => r.status === filterStatus)
        : requests;

    const statusCounts = requests.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {});

    // ===================== RENDU =====================
    return (
        <div className="container-fluid py-4">
            
            {/* ===== EN-TÊTE ===== */}
            <div className="mb-4">
                <h4 className="mb-1"><i className="bi bi-file-medical me-2 text-primary"></i>Mes Analyses Médicales</h4>
                <p className="text-muted mb-0">Consultez votre historique et vos résultats de laboratoire</p>
            </div>

            {error && !showResult && (
                <div className="alert alert-danger d-flex justify-content-between align-items-center">
                    <span><i className="bi bi-exclamation-triangle me-2"></i>{error}</span>
                    <button className="btn-close" onClick={() => setError('')}></button>
                </div>
            )}

            {/* ===== FILTRES PAR STATUT ===== */}
            {!loading && requests.length > 0 && (
                <div className="d-flex gap-2 mb-3 flex-wrap">
                    <button className={`btn btn-sm ${filterStatus === '' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilterStatus('')}>Toutes ({requests.length})</button>
                    {['requested', 'sample_collected', 'in_progress', 'completed', 'cancelled'].map(st => (
                        <button key={st} className={`btn btn-sm ${filterStatus === st ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilterStatus(st)}>
                            {STATUS_LABELS[st]} {statusCounts[st] ? `(${statusCounts[st]})` : ''}
                        </button>
                    ))}
                </div>
            )}

            {/* ===== TABLEAU DES DEMANDES ===== */}
            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted">Chargement de votre historique...</p></div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="text-center py-5">
                            <i className="bi bi-clipboard2-pulse fs-1 text-muted opacity-50"></i>
                            <h5 className="mt-3 text-muted">{filterStatus ? 'Aucune analyse avec ce statut.' : 'Aucune analyse médicale'}</h5>
                            <p className="text-muted">{filterStatus ? 'Essayez de changer le filtre.' : 'Vos résultats apparaîtront ici une fois prescrits.'}</p>
                            {filterStatus && <button className="btn btn-outline-primary btn-sm mt-2" onClick={() => setFilterStatus('')}><i className="bi bi-arrow-counterclockwise me-1"></i>Voir toutes les analyses</button>}
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="table-light">
                                    <tr><th>Date</th><th>Laboratoire</th><th>Prescrit par</th><th>Analyses</th><th>Statut</th><th className="text-end">Actions</th></tr>
                                </thead>
                                <tbody>
                                    {filteredRequests.map(req => (
                                        <tr key={req.id}>
                                            <td className="small text-nowrap">{new Date(req.request_date).toLocaleDateString('fr-FR')}</td>
                                            <td className="fw-semibold">{req.lab_name}</td>
                                            <td>{req.doctor_name !== '-' ? <span>Dr. {req.doctor_name}</span> : <span className="text-muted">-</span>}</td>
                                            <td>
                                                <div className="d-flex flex-wrap gap-1">
                                                    {req.test_names?.slice(0, 2).map((name, i) => (<span key={i} className="badge bg-light text-dark border">{name}</span>))}
                                                    {(req.test_names?.length || 0) > 2 && <span className="badge bg-secondary text-white">+{req.test_names.length - 2}</span>}
                                                </div>
                                            </td>
                                            <td><span className={`badge bg-${STATUS_MAP[req.status]}`}>{req.status_display}</span></td>
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

            {/* ══════════════════════════════════════════════════════
                MODAL : RÉSULTATS + ASSISTANT IA
            ══════════════════════════════════════════════════════ */}
            {showResult && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content">
                            
                            <div className="modal-header bg-primary text-white d-flex justify-content-between align-items-center">
                                <h5 className="modal-title mb-0"><i className="bi bi-clipboard2-check me-2"></i>Rapport de Laboratoire</h5>
                                <div className="d-flex align-items-center gap-2">
                                    {resultData?.validation_date ? (
                                        <span className="badge bg-light text-success"><i className="bi bi-patch-check-fill me-1"></i>Validé</span>
                                    ) : (
                                        <span className="badge bg-warning text-dark"><i className="bi bi-hourglass-split me-1"></i>En attente</span>
                                    )}
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowResult(false)}></button>
                                </div>
                            </div>

                            <div className="modal-body">
                                {loadingResult ? (
                                    <div className="text-center py-5"><div className="spinner-border text-primary"></div><p className="mt-2 text-muted">Chargement du rapport...</p></div>
                                ) : resultData ? (
                                    <>
                                        {/* Contexte */}
                                        <div className="row g-3 mb-4">
                                            <div className="col-md-6">
                                                <div className="p-3 bg-light border rounded h-100">
                                                    <div className="text-muted small mb-1"><i className="bi bi-building me-1"></i>Laboratoire</div>
                                                    <strong className="fs-6">{resultData.request_info?.lab_name || '-'}</strong>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="p-3 bg-light border rounded h-100">
                                                    <div className="text-muted small mb-1"><i className="bi bi-person-badge me-1"></i>Médecin prescripteur</div>
                                                    <strong className="fs-6">{resultData.request_info?.doctor_name && resultData.request_info.doctor_name !== '-' ? `Dr. ${resultData.request_info.doctor_name}` : '-'}</strong>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Alertes Médicales */}
                                        {resultData.critical_finding && (
                                            <div className="alert alert-danger border-2 border-danger text-center mb-3 py-3">
                                                <i className="bi bi-exclamation-octagon fs-3 me-2"></i>
                                                <h5 className="alert-heading d-inline">Urgence Médicale</h5>
                                                <p className="mb-0 mt-2">Des résultats critiques ont été identifiés. Contactez votre médecin immédiatement.</p>
                                            </div>
                                        )}
                                        {resultData.is_abnormal && !resultData.critical_finding && (
                                            <div className="alert alert-warning text-center mb-3">
                                                <i className="bi bi-exclamation-triangle me-2"></i><strong>Attention :</strong> Une ou plusieurs valeurs sont en dehors des normes.
                                            </div>
                                        )}

                                        {/* Tableau Résultats */}
                                        <div className="table-responsive border rounded">
                                            <table className="table table-hover mb-0">
                                                <thead className="table-light">
                                                    <tr><th>Examen</th><th>Résultat</th><th>Normes</th><th className="text-center" style={{ width: '50px' }}></th></tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(resultData.results || {}).map(([code, data]) => (
                                                        <tr key={code} className={data.is_abnormal ? 'table-danger' : ''}>
                                                            <td className="fw-bold">{code}</td>
                                                            <td>
                                                                <span className={`fs-5 fw-bold ${data.is_abnormal ? 'text-danger' : 'text-dark'}`}>{data.value}</span>
                                                                {data.unit && <span className="text-muted ms-1 small">({data.unit})</span>}
                                                            </td>
                                                            <td className="text-muted">{data.normal_range || '-'}</td>
                                                            <td className="text-center">
                                                                {data.is_abnormal && <i className="bi bi-exclamation-triangle-fill text-danger fs-5" title="Valeur anormale"></i>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Conclusion & Recommandations */}
                                        {resultData.conclusion && (
                                            <div className="mt-4 p-3 bg-light border rounded">
                                                <h6 className="mb-2"><i className="bi bi-chat-left-text me-2 text-primary"></i>Conclusion du Biologiste</h6>
                                                <p className="mb-0 fst-italic">{resultData.conclusion}</p>
                                            </div>
                                        )}
                                        {resultData.recommendations && (
                                            <div className="mt-3 p-3 border border-info rounded bg-info bg-opacity-10">
                                                <h6 className="mb-2 text-info"><i className="bi bi-lightbulb me-2"></i>Recommandations</h6>
                                                <p className="mb-0">{resultData.recommendations}</p>
                                            </div>
                                        )}

                                        {/* Méta-données */}
                                        <div className="mt-4 pt-3 border-top small text-muted">
                                            <div className="row g-2">
                                                <div className="col-md-4"><i className="bi bi-calendar3 me-1"></i>Date : <strong>{resultData.analysis_date ? new Date(resultData.analysis_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</strong></div>
                                                <div className="col-md-4"><i className="bi bi-person-check me-1"></i>Analysé par : <strong>{resultData.analyzed_by_name || '-'}</strong></div>
                                                {resultData.validation_date && (
                                                    <div className="col-md-4"><i className="bi bi-patch-check me-1 text-success"></i>Validé par : <strong>{resultData.validated_by_name || '-'}</strong></div>
                                                )}
                                            </div>
                                        </div>


                                        {/* ══════════════════════════════════════════ 
                                             SECTION : ASSISTANT IA (NOUVEAU)
                                        ══════════════════════════════════════════ */}
                                        <div className="mt-4 pt-3 border-top">
                                            
                                            {/* Bouton déclencheur ou Indicateur de chargement */}
                                            {!showAi ? (
                                                <div className="text-center">
                                                    <button 
                                                        className="btn btn-outline-primary btn-lg px-4" 
                                                        onClick={handleAskAI}
                                                        disabled={aiLoading}
                                                    >
                                                        <i className="bi bi-stars me-2"></i>Comprendre mes résultats avec l'IA
                                                    </button>
                                                    <div className="small text-muted mt-2">Explication simple et sécurisée de vos analyses</div>
                                                </div>
                                            ) : (
                                                <div className="card border-primary shadow-sm">
                                                    <div className="card-header bg-primary bg-opacity-10 text-primary d-flex justify-content-between align-items-center py-2">
                                                        <span className="fw-bold">
                                                            <i className="bi bi-stars me-2"></i>Assistant IA
                                                        </span>
                                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowAi(false)}>
                                                            Masquer
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="card-body">
                                                        
                                                        {aiLoading && (
                                                            <div className="text-center py-4">
                                                                <div className="spinner-border text-primary"></div>
                                                                <p className="mt-2 text-muted small mb-0">L'IA analyse vos résultats en toute sécurité...</p>
                                                            </div>
                                                        )}

                                                        {aiError && (
                                                            <div className="alert alert-danger small py-2 mb-0">
                                                                <i className="bi bi-exclamation-triangle me-2"></i>{aiError}
                                                            </div>
                                                        )}

                                                        {aiExplanation && !aiLoading && (
                                                            <>
                                                                <div className="bg-white p-3 rounded border small" style={{ lineHeight: '1.7' }}>
                                                                    {/* ReactMarkdown convertit le texte de l'IA en vrai HTML */}
                                                                    <ReactMarkdown>{aiExplanation}</ReactMarkdown>
                                                                </div>
                                                                
                                                                {/* Disclaimer Légal Obligatoire */}
                                                                <div className="mt-3 p-2 bg-warning bg-opacity-10 border border-warning rounded small text-muted text-center">
                                                                    <i className="bi bi-shield-exclamation me-1"></i>
                                                                    <strong>Attention :</strong> Ces informations sont générées par une intelligence artificielle à titre indicatif. Elles ne remplacent en aucun cas l'avis d'un professionnel de santé.
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                    </>
                                ) : (
                                    <div className="text-center py-4 text-muted">Aucune donnée disponible.</div>
                                )}
                            </div>

                            <div className="modal-footer d-flex justify-content-between">
                                <div className="small text-muted"><i className="bi bi-info-circle me-1"></i>Ce rapport est informatif.</div>
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