import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const API_BASE = '/laboratories/staff';
const STATUS_MAP = { 
    requested: 'secondary', 
    sample_collected: 'info', 
    in_progress: 'warning text-dark', 
    completed: 'success', 
    cancelled: 'danger' 
};
const PRIORITY_MAP = { 
    normal: 'secondary', 
    urgent: 'warning text-dark', 
    stat: 'danger' 
};

export default function LabWorkflowTab() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [requests, setRequests] = useState([]);
    const [filterStatus, setFilterStatus] = useState('');
    
    // Modals
    const [showResult, setShowResult] = useState(false);
    const [showViewResult, setShowViewResult] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    
    const [currentReq, setCurrentReq] = useState(null);
    const [viewData, setViewData] = useState(null);
    const [payReq, setPayReq] = useState(null);
    
    // Formulaire de saisie
    const [resultForm, setResultForm] = useState({});
    const [resultMeta, setResultMeta] = useState({ 
        conclusion: '', 
        recommendations: '', 
        is_abnormal: false, 
        critical_finding: false 
    });
    
    const [saving, setSaving] = useState(false);
    const [aiLoading, setAiLoading] = useState(false); // ← État pour l'IA

    // ===================== DATA =====================
    const fetchWorkflowData = useCallback(() => {
        setLoading(true);
        Promise.all([
            api.get(`${API_BASE}/stats/`).catch(() => null),
            api.get(`${API_BASE}/requests/`).catch(() => ({ data: [] }))
        ]).then(([statsRes, reqRes]) => {
            if (statsRes) setStats(statsRes.data);
            setRequests(reqRes.data.results || reqRes.data || []);
        }).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchWorkflowData();
    }, [fetchWorkflowData]);

    const filteredRequests = filterStatus 
        ? requests.filter(r => r.status === filterStatus) 
        : requests;

    // ===================== ACTIONS =====================
    const updateStatus = (req, newStatus) => {
        api.patch(`${API_BASE}/requests/${req.id}/status/`, { status: newStatus })
            .then(() => fetchWorkflowData())
            .catch(err => alert(err.response?.data?.detail || "Transition invalide."));
    };

    const openPayModal = (req) => {
        setPayReq(req);
        setShowPayModal(true);
    };

    const handleMarkPaid = (method) => {
        api.post(`${API_BASE}/requests/${payReq.id}/mark-paid/`, { payment_method: method })
            .then(() => { 
                setShowPayModal(false); 
                fetchWorkflowData(); 
            })
            .catch(err => alert(err.response?.data?.detail || "Erreur lors de l'enregistrement du paiement."));
    };

    const openResultModal = (req) => {
        setCurrentReq(req);
        api.get(`${API_BASE}/requests/${req.id}/`)
            .then(res => {
                const emptyForm = {};
                (res.data.tests_detail || []).forEach(t => {
                    emptyForm[t.code] = { value: '', unit: '', normal_range: '' };
                });
                setResultForm(emptyForm);
                setResultMeta({ 
                    conclusion: '', 
                    recommendations: '', 
                    is_abnormal: false, 
                    critical_finding: false 
                });
                setShowResult(true);
            })
            .catch(() => alert("Erreur lors du chargement des détails."));
    };

    // ========== AGENT IA ==========
    const handleGenerateWithAI = async () => {
        // Vérifier qu'au moins une valeur a été saisie
        const hasValues = Object.values(resultForm).some(item => item.value?.trim());
        if (!hasValues) {
            alert("Veuillez d'abord saisir au moins une valeur de résultat.");
            return;
        }

        setAiLoading(true);
        try {
            const res = await api.post('/ai/generate-lab-conclusion/', {
                results: resultForm,
                clinical_history: currentReq?.clinical_history || '',
                diagnosis_suspected: currentReq?.diagnosis_suspected || ''
            });

            setResultMeta({
                conclusion: res.data.conclusion || '',
                recommendations: res.data.recommendations || '',
                is_abnormal: res.data.is_abnormal || false,
                critical_finding: res.data.critical_finding || false
            });
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Erreur lors de la génération IA. Réessayez.");
        } finally {
            setAiLoading(false);
        }
    };

    const submitResults = (e) => {
        e.preventDefault();
        setSaving(true);
        api.post(`${API_BASE}/requests/${currentReq.id}/results/`, { 
            results: resultForm, 
            ...resultMeta 
        })
            .then(() => { 
                setShowResult(false); 
                fetchWorkflowData(); 
            })
            .catch(err => alert(err.response?.data?.results?.non_field_errors?.[0] || "Erreur de saisie."))
            .finally(() => setSaving(false));
    };

    const validateResult = (id) => {
        if (window.confirm('Confirmer la validation définitive de ces résultats ?')) {
            api.post(`${API_BASE}/requests/${id}/results/validate/`)
                .then(() => fetchWorkflowData())
                .catch(err => alert(err.response?.data?.detail));
        }
    };

    const viewResultDetails = (id) => {
        api.get(`${API_BASE}/requests/${id}/result/`)
            .then(res => { 
                setViewData(res.data); 
                setShowViewResult(true); 
            })
            .catch(() => alert("Aucun résultat disponible."));
    };

    // ===================== RENDER =====================
    return (
        <>
            {/* Stats */}
            {stats && (
                <div className="row g-3 mb-4">
                    {[
                        { l: 'Urgentes / Stat', v: stats.urgent || 0, c: 'text-danger', i: 'bi-exclamation-triangle' },
                        { l: 'Attente prélèvement', v: stats.pending_sample || 0, c: 'text-secondary', i: 'bi-droplet' },
                        { l: "En cours d'analyse", v: stats.in_progress || 0, c: 'text-warning', i: 'bi-hourglass-split' }
                    ].map((s, i) => (
                        <div key={i} className="col-md-4">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body d-flex align-items-center">
                                    <i className={`bi ${s.i} fs-4 me-3 opacity-50 ${s.c}`}></i>
                                    <div>
                                        <div className="text-muted small">{s.l}</div>
                                        <div className={`fw-bold fs-4 ${s.c}`}>{s.v}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tableau des demandes */}
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 d-flex gap-2 flex-wrap">
                    {['', 'requested', 'in_progress', 'completed'].map(st => (
                        <button 
                            key={st} 
                            className={`btn btn-sm ${filterStatus === st ? 'btn-primary' : 'btn-outline-primary'}`} 
                            onClick={() => setFilterStatus(st)}
                        >
                            {st === '' ? 'Toutes' : st === 'requested' ? 'Attente' : st === 'in_progress' ? 'En cours' : 'Complétées'}
                        </button>
                    ))}
                </div>
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary"></div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Date</th>
                                        <th>Patient</th>
                                        <th>Analyses</th>
                                        <th>Priorité</th>
                                        <th>Statut</th>
                                        <th>Paiement</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRequests.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-4 text-muted">
                                                Aucune demande trouvée
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRequests.map(req => (
                                            <tr key={req.id}>
                                                <td className="small">{new Date(req.request_date).toLocaleDateString('fr-FR')}</td>
                                                <td className="fw-semibold">{req.patient_name}</td>
                                                <td><small>{req.test_names?.join(', ')}</small></td>
                                                <td>
                                                    <span className={`badge bg-${PRIORITY_MAP[req.priority]}`}>
                                                        {req.priority_display}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge bg-${STATUS_MAP[req.status]}`}>
                                                        {req.status_display}
                                                    </span>
                                                </td>
                                                <td>
                                                    {req.payment_status === 'paid' ? (
                                                        <span className="badge bg-success">
                                                            <i className="bi bi-check-circle me-1"></i>
                                                            {req.payment_method_display || 'Payé'}
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-danger">Non Payé</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="d-flex gap-1">
                                                        {req.status === 'requested' && (
                                                            <button 
                                                                className="btn btn-sm btn-outline-info" 
                                                                onClick={() => updateStatus(req, 'sample_collected')} 
                                                                title="Marquer comme prélevé"
                                                            >
                                                                <i className="bi bi-droplet"></i>
                                                            </button>
                                                        )}
                                                        {req.status === 'sample_collected' && (
                                                            <button 
                                                                className="btn btn-sm btn-outline-warning" 
                                                                onClick={() => updateStatus(req, 'in_progress')} 
                                                                title="Démarrer l'analyse"
                                                            >
                                                                <i className="bi bi-play-fill"></i>
                                                            </button>
                                                        )}
                                                        {req.status === 'in_progress' && (
                                                            <button 
                                                                className="btn btn-sm btn-primary" 
                                                                onClick={() => openResultModal(req)}
                                                            >
                                                                <i className="bi bi-pencil-square me-1"></i>Saisir
                                                            </button>
                                                        )}
                                                        {req.payment_status === 'unpaid' && (
                                                            <button 
                                                                className="btn btn-sm btn-outline-success" 
                                                                onClick={() => openPayModal(req)} 
                                                                title="Enregistrer le paiement"
                                                            >
                                                                <i className="bi bi-cash-coin"></i>
                                                            </button>
                                                        )}
                                                        {req.has_result && req.status === 'completed' && (
                                                            <button 
                                                                className="btn btn-sm btn-success" 
                                                                onClick={() => validateResult(req.id)} 
                                                                title="Valider définitivement"
                                                            >
                                                                <i className="bi bi-patch-check"></i>
                                                            </button>
                                                        )}
                                                        {req.has_result && (
                                                            <button 
                                                                className="btn btn-sm btn-outline-secondary" 
                                                                onClick={() => viewResultDetails(req.id)} 
                                                                title="Voir les résultats"
                                                            >
                                                                <i className="bi bi-eye"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ========== MODAL PAIEMENT ========== */}
            {showPayModal && payReq && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow" style={{ borderRadius: '16px' }}>
                            <div className="modal-header bg-success text-white" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-cash-coin me-2"></i>Paiement de la demande
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPayModal(false)}></button>
                            </div>
                            <div className="modal-body text-center py-4">
                                <p className="mb-1">Patient : <strong>{payReq.patient_name}</strong></p>
                                <p className="mb-4">
                                    Montant à payer : 
                                    <strong className="text-success fs-4 ms-2">
                                        {Number(payReq.total_price).toFixed(3)} TND
                                    </strong>
                                </p>
                                <h6 className="mb-3 text-muted">Sélectionnez la méthode de paiement :</h6>
                                <div className="d-grid gap-2">
                                    <button className="btn btn-outline-success btn-lg" onClick={() => handleMarkPaid('cash')}>
                                        <i className="bi bi-cash me-2"></i>Espèces
                                    </button>
                                    <button className="btn btn-outline-primary btn-lg" onClick={() => handleMarkPaid('card')}>
                                        <i className="bi bi-credit-card me-2"></i>Carte Bancaire (TPE)
                                    </button>
                                    <button className="btn btn-outline-info btn-lg" onClick={() => handleMarkPaid('cnam')}>
                                        <i className="bi bi-shield-check me-2"></i>CNAM
                                    </button>
                                    <button className="btn btn-outline-warning btn-lg" onClick={() => handleMarkPaid('insurance')}>
                                        <i className="bi bi-umbrella me-2"></i>Assurance
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== MODAL SAISIE RÉSULTATS + IA ========== */}
            {showResult && currentReq && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content border-0 shadow" style={{ borderRadius: '16px' }}>
                            <div className="modal-header bg-primary text-white" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-clipboard2-pulse me-2"></i>
                                    Saisie des Résultats
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowResult(false)}></button>
                            </div>
                            
                            <form onSubmit={submitResults}>
                                <div className="modal-body">
                                    <div className="alert alert-light border mb-4">
                                        <strong>Patient :</strong> {currentReq.patient_name}
                                    </div>

                                    {/* Tableau de saisie des valeurs */}
                                    <div className="table-responsive mb-4">
                                        <table className="table table-sm align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: '20%' }}>Code</th>
                                                    <th style={{ width: '25%' }}>Valeur *</th>
                                                    <th style={{ width: '25%' }}>Unité</th>
                                                    <th style={{ width: '30%' }}>Normes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(resultForm).map(([code, data]) => (
                                                    <tr key={code}>
                                                        <td className="fw-bold">{code}</td>
                                                        <td>
                                                            <input 
                                                                type="text" 
                                                                className="form-control form-control-sm" 
                                                                placeholder="Valeur" 
                                                                required 
                                                                value={data.value} 
                                                                onChange={e => setResultForm({ 
                                                                    ...resultForm, 
                                                                    [code]: { ...data, value: e.target.value } 
                                                                })} 
                                                            />
                                                        </td>
                                                        <td>
                                                            <input 
                                                                type="text" 
                                                                className="form-control form-control-sm" 
                                                                placeholder="Unité" 
                                                                value={data.unit} 
                                                                onChange={e => setResultForm({ 
                                                                    ...resultForm, 
                                                                    [code]: { ...data, unit: e.target.value } 
                                                                })} 
                                                            />
                                                        </td>
                                                        <td>
                                                            <input 
                                                                type="text" 
                                                                className="form-control form-control-sm" 
                                                                placeholder="Normes" 
                                                                value={data.normal_range} 
                                                                onChange={e => setResultForm({ 
                                                                    ...resultForm, 
                                                                    [code]: { ...data, normal_range: e.target.value } 
                                                                })} 
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* ========== BOUTON AGENT IA ========== */}
                                    <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded border">
                                        <div>
                                            <h6 className="mb-1 fw-bold">
                                                <i className="bi bi-stars text-primary me-2"></i>
                                                Assistant IA Biologiste
                                            </h6>
                                            <small className="text-muted">
                                                Génère automatiquement la conclusion, les recommandations et les alertes.
                                            </small>
                                        </div>
                                        <button 
                                            type="button"
                                            className="btn btn-outline-primary"
                                            onClick={handleGenerateWithAI}
                                            disabled={aiLoading}
                                        >
                                            {aiLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Génération...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-magic me-2"></i>
                                                    Générer avec l'IA
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Flags */}
                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <div className="form-check form-switch">
                                                <input 
                                                    className="form-check-input" 
                                                    type="checkbox" 
                                                    checked={resultMeta.is_abnormal} 
                                                    onChange={e => setResultMeta({ ...resultMeta, is_abnormal: e.target.checked })} 
                                                    id="resAbn" 
                                                />
                                                <label className="form-check-label text-danger fw-semibold" htmlFor="resAbn">
                                                    Valeurs Anormales
                                                </label>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="form-check form-switch">
                                                <input 
                                                    className="form-check-input" 
                                                    type="checkbox" 
                                                    checked={resultMeta.critical_finding} 
                                                    onChange={e => setResultMeta({ ...resultMeta, critical_finding: e.target.checked })} 
                                                    id="resCrit" 
                                                />
                                                <label className="form-check-label text-danger fw-semibold" htmlFor="resCrit">
                                                    Finding Critique
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Conclusion & Recommandations */}
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Conclusion</label>
                                        <textarea 
                                            className="form-control" 
                                            rows="3" 
                                            value={resultMeta.conclusion} 
                                            onChange={e => setResultMeta({ ...resultMeta, conclusion: e.target.value })}
                                            placeholder="La conclusion sera générée par l'IA ou saisie manuellement..."
                                        ></textarea>
                                    </div>

                                    <div className="mb-2">
                                        <label className="form-label fw-semibold">Recommandations</label>
                                        <textarea 
                                            className="form-control" 
                                            rows="3" 
                                            value={resultMeta.recommendations} 
                                            onChange={e => setResultMeta({ ...resultMeta, recommendations: e.target.value })}
                                            placeholder="Les recommandations seront générées par l'IA ou saisies manuellement..."
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="modal-footer bg-light" style={{ borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                                    <button type="button" className="btn btn-light" onClick={() => setShowResult(false)}>
                                        Annuler
                                    </button>
                                    <button type="submit" className="btn btn-success px-4" disabled={saving || aiLoading}>
                                        {saving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Enregistrement...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-check-lg me-2"></i>
                                                Enregistrer les Résultats
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== MODAL VOIR RÉSULTATS ========== */}
            {showViewResult && viewData && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow" style={{ borderRadius: '16px' }}>
                            <div className="modal-header bg-success text-white" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-file-earmark-medical me-2"></i>
                                    Résultats d'Analyses
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowViewResult(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <p className="mb-1"><strong>Patient :</strong> {viewData.request_info?.patient_name || '-'}</p>
                                        <p className="mb-0"><strong>Médecin :</strong> {viewData.request_info?.doctor_name || '-'}</p>
                                    </div>
                                    <div className="col-md-6 text-md-end">
                                        <p className="mb-1">
                                            <strong>Date d'analyse :</strong> {new Date(viewData.analysis_date).toLocaleDateString('fr-FR')}
                                        </p>
                                        {viewData.validation_date && (
                                            <p className="mb-0 text-success fw-bold">
                                                <i className="bi bi-patch-check me-1"></i>
                                                Validé le {new Date(viewData.validation_date).toLocaleDateString('fr-FR')}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {viewData.is_abnormal && (
                                    <div className="alert alert-warning">
                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                        <strong>Attention :</strong> Valeurs anormales détectées.
                                    </div>
                                )}
                                {viewData.critical_finding && (
                                    <div className="alert alert-danger">
                                        <i className="bi bi-exclamation-octagon me-2"></i>
                                        <strong>Finding Critique :</strong> Résultat nécessitant une attention médicale immédiate.
                                    </div>
                                )}

                                <div className="table-responsive">
                                    <table className="table table-bordered">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Code</th>
                                                <th>Valeur</th>
                                                <th>Unité</th>
                                                <th>Normes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewData.results && Object.entries(viewData.results).map(([code, data]) => (
                                                <tr key={code}>
                                                    <td className="fw-bold">{code}</td>
                                                    <td>{data.value}</td>
                                                    <td>{data.unit}</td>
                                                    <td className="text-muted">{data.normal_range || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {viewData.conclusion && (
                                    <div className="mt-3 p-3 bg-light rounded">
                                        <h6 className="text-secondary">Conclusion</h6>
                                        <p className="mb-0">{viewData.conclusion}</p>
                                    </div>
                                )}
                                {viewData.recommendations && (
                                    <div className="mt-2 p-3 bg-light rounded">
                                        <h6 className="text-secondary">Recommandations</h6>
                                        <p className="mb-0">{viewData.recommendations}</p>
                                    </div>
                                )}

                                <div className="mt-3 text-end">
                                    <small className="text-muted">
                                        Analysé par : {viewData.analyzed_by_name || '-'}
                                        {viewData.validated_by_name && ` | Validé par : ${viewData.validated_by_name}`}
                                    </small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowViewResult(false)}>
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}