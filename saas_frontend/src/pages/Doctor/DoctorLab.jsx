import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const API_BASE = '/laboratories/doctor';
const cardStyle = { borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };

const fmt = (a) => a != null ? Number(a).toLocaleString('fr-FR', { minimumFractionDigits: 3 }) + ' TND' : '0.000 TND';

const STATUS_MAP = {
  requested: 'bg-secondary-subtle text-secondary',
  sample_collected: 'bg-info-subtle text-info',
  in_progress: 'bg-warning-subtle text-warning',
  completed: 'bg-success-subtle text-success',
  cancelled: 'bg-danger-subtle text-danger'
};
const PRIORITY_MAP = {
  normal: 'bg-secondary-subtle text-secondary',
  urgent: 'bg-warning-subtle text-warning',
  stat: 'bg-danger-subtle text-danger'
};
const STATUS_LABELS = { requested: 'Attente', sample_collected: 'Prélevé', in_progress: 'En cours', completed: 'Terminé', cancelled: 'Annulé' };

const CATEGORIES = [
    { value: '', label: 'Toutes les catégories' }, { value: 'hematology', label: 'Hématologie' },
    { value: 'biochemistry', label: 'Biochimie' }, { value: 'microbiology', label: 'Microbiologie' },
    { value: 'immunology', label: 'Immunologie' }, { value: 'hormones', label: 'Hormones' },
    { value: 'urinalysis', label: "Analyse d'urine" }, { value: 'other', label: 'Autre' }
];

const INITIAL_FORM = { patient: '', laboratory: '', tests: [], priority: 'normal', clinical_history: '', diagnosis_suspected: '', notes: '' };

export default function DoctorLab() {
    const [requests, setRequests] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [labs, setLabs] = useState([]);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    
    const [showCreate, setShowCreate] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedResult, setSelectedResult] = useState(null);
    const [form, setForm] = useState(INITIAL_FORM);
    const [searchCatalog, setSearchCatalog] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    
    const [submitting, setSubmitting] = useState(false);
    const [loadingResult, setLoadingResult] = useState(false);
    const [error, setError] = useState('');

    const fetchData = useCallback(() => {
        setLoading(true); setError('');
        Promise.all([
            api.get(`${API_BASE}/requests/`),
            api.get(`${API_BASE}/catalog/`),
            api.get(`${API_BASE}/labs/`)
        ]).then(([reqRes, catRes, labRes]) => {
            setRequests(reqRes.data.results || reqRes.data || []);
            setCatalog(catRes.data || []);
            setLabs(labRes.data || []);
        }).catch(() => setError("Impossible de charger les données.")).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const fetchPatients = useCallback(() => {
        setPatients([]);
        api.get('/appointments/doctor/', { params: { page_size: 200, ordering: '-start_time' } })
            .then(res => {
                const unique = []; const seen = new Set();
                (res.data.results || []).forEach(a => {
                    if (a.patient && !seen.has(a.patient)) { seen.add(a.patient); unique.push({ id: a.patient, name: a.patient_name }); }
                });
                setPatients(unique);
            }).catch(() => setPatients([]));
    }, []);

    const openCreateModal = () => { setForm(INITIAL_FORM); setSearchCatalog(''); setFilterCategory(''); setError(''); fetchPatients(); setShowCreate(true); };
    const openDetailModal = (req) => { setSelectedRequest(req); setShowDetail(true); };
    
    const openResultModal = (req) => {
        if (!req.has_result) return;
        setLoadingResult(true); setError(''); setShowDetail(false); 
        api.get(`${API_BASE}/requests/${req.id}/result/`)
            .then(res => { setSelectedResult(res.data); setShowResult(true); })
            .catch(() => setError("Impossible de charger les résultats."))
            .finally(() => setLoadingResult(false));
    };

    const toggleTest = (id) => {
        setForm(prev => ({ ...prev, tests: prev.tests.includes(id) ? prev.tests.filter(i => i !== id) : [...prev.tests, id] }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.tests.length) return alert("Sélectionnez au moins une analyse.");
        setSubmitting(true); setError('');
        api.post(`${API_BASE}/requests/`, form)
            .then(() => { setShowCreate(false); fetchData(); })
            .catch(err => { setError(Object.values(err.response?.data || {}).flat().join(' | ') || "Erreur lors de l'envoi."); })
            .finally(() => setSubmitting(false));
    };

    const filteredRequests = filterStatus ? requests.filter(r => r.status === filterStatus) : requests;
    const filteredCatalog = catalog.filter(t => {
        const matchSearch = !searchCatalog || t.name.toLowerCase().includes(searchCatalog.toLowerCase()) || t.code.toLowerCase().includes(searchCatalog.toLowerCase());
        const matchCat = !filterCategory || t.category === filterCategory;
        return matchSearch && matchCat;
    });
    const selectedTestsData = catalog.filter(t => form.tests.includes(t.id));
    const totalPrice = selectedTestsData.reduce((sum, t) => sum + Number(t.price || 0), 0);
    const statusCounts = requests.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

    return (
        <div className="container-fluid py-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold mb-1"><i className="bi bi-clipboard2-pulse me-2 text-primary"></i>Analyses de Laboratoire</h2>
                    <p className="text-muted mb-0">Prescrire et suivre les demandes d'analyses</p>
                </div>
                <button className="btn btn-primary px-4 py-2 rounded-3" onClick={openCreateModal}>
                    <i className="bi bi-plus-lg me-2"></i>Nouvelle Demande
                </button>
            </div>

            {error && !showCreate && <div className="alert alert-danger" style={{borderRadius: '12px'}}><i className="bi bi-exclamation-triangle me-2"></i>{error}<button className="btn-close float-end" onClick={() => setError('')}></button></div>}

            <div className="d-flex gap-2 mb-4 flex-wrap">
                <button className={`btn btn-sm rounded-3 px-3 ${filterStatus === '' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilterStatus('')}>Toutes ({requests.length})</button>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <button key={key} className={`btn btn-sm rounded-3 px-3 ${filterStatus === key ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilterStatus(key)}>
                        {label} {statusCounts[key] ? `(${statusCounts[key]})` : ''}
                    </button>
                ))}
            </div>

            <div className="card" style={cardStyle}>
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="text-center py-5 text-muted"><i className="bi bi-inbox fs-1 opacity-50 d-block mb-2"></i>Aucune demande trouvée.</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr className="text-uppercase text-muted" style={{fontSize: '0.75rem'}}>
                                        <th className="ps-4">Date</th><th>Patient</th><th>Laboratoire</th><th>Analyses</th><th>Montant</th><th>Priorité</th><th>Statut</th><th className="pe-4 text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRequests.map(req => (
                                        <tr key={req.id} style={{ cursor: 'pointer' }} onClick={() => openDetailModal(req)}>
                                            <td className="ps-4 small text-nowrap text-muted">{new Date(req.request_date).toLocaleDateString('fr-FR')}</td>
                                            <td className="fw-bold text-dark">{req.patient_name}</td>
                                            <td>{req.lab_name}</td>
                                            <td><span className="badge bg-light text-dark border px-2 py-1">{req.test_names?.length || 0} analyse{(req.test_names?.length || 0) > 1 ? 's' : ''}</span></td>
                                            <td className="text-nowrap fw-semibold">{fmt(req.total_price)}</td>
                                            <td><span className={`badge ${PRIORITY_MAP[req.priority]} px-3 py-2`}>{req.priority_display}</span></td>
                                            <td><span className={`badge ${STATUS_MAP[req.status]} px-3 py-2`}>{req.status_display}</span></td>
                                            <td className="pe-4 text-end" onClick={e => e.stopPropagation()}>
                                                <button className="btn btn-sm btn-outline-primary rounded-3 px-3" onClick={() => openResultModal(req)} disabled={!req.has_result} title={!req.has_result ? 'Non disponible' : 'Voir résultats'}>
                                                    <i className="bi bi-eye me-1"></i> Résultats
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

            {/* ═══════ MODAL : NOUVELLE DEMANDE ═══════ */}
            {showCreate && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
                        <div className="modal-content" style={{borderRadius: '16px', border: 'none'}}>
                            <div className="modal-header bg-primary text-white" style={{borderRadius: '16px 16px 0 0'}}>
                                <h5 className="modal-title fw-bold"><i className="bi bi-plus-circle me-2"></i>Nouvelle Demande d'Analyse</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreate(false)} disabled={submitting}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body p-4">
                                    {error && <div className="alert alert-danger" style={{borderRadius: '12px'}}><i className="bi bi-exclamation-triangle me-2"></i>{error}</div>}
                                    
                                    <div className="row g-3 mb-4">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Patient <span className="text-danger">*</span></label>
                                            {patients.length > 0 ? (
                                                <select className="form-select" required value={form.patient} onChange={e => setForm({ ...form, patient: e.target.value })}>
                                                    <option value="">-- Sélectionner --</option>
                                                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            ) : (
                                                <div><input type="number" className="form-control" required placeholder="ID du patient" value={form.patient} onChange={e => setForm({ ...form, patient: e.target.value })} /><small className="text-muted">Saisissez l'ID manuellement.</small></div>
                                            )}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Laboratoire <span className="text-danger">*</span></label>
                                            <select className="form-select" required value={form.laboratory} onChange={e => setForm({ ...form, laboratory: e.target.value })}>
                                                <option value="">-- Sélectionner --</option>
                                                {labs.map(l => <option key={l.id} value={l.id}>{l.name} {l.city_name ? `- ${l.city_name}` : ''}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <label className="form-label mb-0 fw-bold text-primary"><i className="bi bi-grid-3x3-gap me-1"></i>Analyses ({form.tests.length})</label>
                                            {form.tests.length > 0 && <span className="badge bg-primary-subtle text-primary px-3 py-2 fs-6">Total : {fmt(totalPrice)}</span>}
                                        </div>
                                        
                                        <div className="row g-2 mb-2">
                                            <div className="col-md-8"><div className="input-group input-group-sm"><span className="input-group-text bg-light border-end-0"><i className="bi bi-search"></i></span><input type="text" className="form-control border-start-0" placeholder="Rechercher..." value={searchCatalog} onChange={e => setSearchCatalog(e.target.value)} /></div></div>
                                            <div className="col-md-4"><select className="form-select form-select-sm" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                                        </div>

                                        <div className="border rounded-3" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                            {filteredCatalog.length === 0 ? <div className="text-center py-4 text-muted">Aucune analyse trouvée</div> : (
                                                filteredCatalog.map(t => {
                                                    const isSelected = form.tests.includes(t.id);
                                                    return (
                                                        <div key={t.id} className={`d-flex justify-content-between align-items-center p-2 border-bottom ${isSelected ? 'bg-primary bg-opacity-10' : ''}`} style={{ cursor: 'pointer' }} onClick={() => toggleTest(t.id)}>
                                                            <div className="d-flex align-items-center">
                                                                <input type="checkbox" className="form-check-input me-2" checked={isSelected} onChange={() => toggleTest(t.id)} onClick={e => e.stopPropagation()} />
                                                                <div><span className="fw-bold">{t.name}</span> <small className="text-muted">({t.code})</small><div className="small text-muted">{t.category_display} • {t.turnaround_time}h {t.cnam_coverage && <span className="text-success">• CNAM</span>}</div></div>
                                                            </div>
                                                            <div className="text-end d-flex align-items-center gap-2">
                                                                <span className="fw-bold text-nowrap">{fmt(t.price)}</span>
                                                                {isSelected && <i className="bi bi-check-circle-fill text-primary fs-5"></i>}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>

                                        {form.tests.length > 0 && (
                                            <div className="mt-2 p-2 bg-light border rounded-3 small">
                                                <strong>Sélection :</strong>{' '}
                                                {selectedTestsData.map(t => <span key={t.id} className="badge bg-white text-dark border me-1 mb-1">{t.code} <i className="bi bi-x text-danger ms-1" style={{cursor:'pointer'}} onClick={(e) => { e.stopPropagation(); toggleTest(t.id); }}></i></span>)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="row g-3 mt-1">
                                        <div className="col-md-4"><label className="form-label fw-semibold">Priorité</label><select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="stat">Stat (Immédiat)</option></select></div>
                                        <div className="col-md-8"><label className="form-label fw-semibold">Diagnostic suspecté</label><input type="text" className="form-control" placeholder="Ex: Diabète..." value={form.diagnosis_suspected} onChange={e => setForm({ ...form, diagnosis_suspected: e.target.value })} /></div>
                                        <div className="col-12"><label className="form-label fw-semibold">Historique clinique / Notes</label><textarea className="form-control" rows="2" placeholder="Antécédents, symptômes..." value={form.clinical_history} onChange={e => setForm({ ...form, clinical_history: e.target.value })}></textarea></div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top-0 p-4 d-flex justify-content-between">
                                    <span className="text-muted small"><i className="bi bi-calculator me-1"></i>{form.tests.length} analyse{form.tests.length > 1 ? 's' : ''} • {fmt(totalPrice)}</span>
                                    <div>
                                        <button type="button" className="btn btn-light px-4 rounded-3 me-2" onClick={() => setShowCreate(false)}>Annuler</button>
                                        <button type="submit" className="btn btn-primary px-4 rounded-3" disabled={submitting || !form.patient || !form.laboratory || !form.tests.length}>
                                            {submitting ? <><span className="spinner-border spinner-border-sm me-1"></span>Envoi...</> : <><i className="bi bi-send me-1"></i>Envoyer</>}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ MODAL : DÉTAIL ═══════ */}
            {showDetail && selectedRequest && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={(e) => e.target === e.currentTarget && setShowDetail(false)}>
                    <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                        <div className="modal-content" style={{borderRadius: '16px', border: 'none'}}>
                            <div className="modal-header bg-white border-0" style={{borderRadius: '16px 16px 0 0'}}>
                                <h5 className="modal-title fw-bold"><i className="bi bi-list-ul me-2 text-primary"></i>Détail de la demande</h5>
                                <button type="button" className="btn-close" onClick={() => setShowDetail(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="row g-3 mb-3">
                                    <div className="col-6"><small className="text-muted d-block">Patient</small><strong className="fs-5">{selectedRequest.patient_name}</strong></div>
                                    <div className="col-6"><small className="text-muted d-block">Date</small><strong>{new Date(selectedRequest.request_date).toLocaleDateString('fr-FR')}</strong></div>
                                    <div className="col-6"><small className="text-muted d-block">Laboratoire</small><strong>{selectedRequest.lab_name}</strong></div>
                                    <div className="col-6"><small className="text-muted d-block">Montant</small><strong className="text-primary fs-5">{fmt(selectedRequest.total_price)}</strong></div>
                                    <div className="col-6"><small className="text-muted d-block">Priorité</small><span className={`badge ${PRIORITY_MAP[selectedRequest.priority]} px-3 py-2`}>{selectedRequest.priority_display}</span></div>
                                    <div className="col-6"><small className="text-muted d-block">Statut</small><span className={`badge ${STATUS_MAP[selectedRequest.status]} px-3 py-2`}>{selectedRequest.status_display}</span></div>
                                </div>
                                <hr />
                                <div className="mb-4">
                                    <small className="text-muted d-block mb-2">Analyses demandées</small>
                                    <div>{selectedRequest.test_names?.map((name, i) => <span key={i} className="badge bg-light text-dark border me-1 mb-1 px-2 py-1">{name}</span>)}</div>
                                </div>
                                <button className="btn btn-primary w-100 py-2 rounded-3" onClick={() => openResultModal(selectedRequest)} disabled={!selectedRequest.has_result}>
                                    <i className="bi bi-eye me-2"></i>{selectedRequest.has_result ? 'Voir les résultats' : 'Résultats non disponibles'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ MODAL : RÉSULTATS ═══════ */}
            {showResult && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={(e) => e.target === e.currentTarget && setShowResult(false)}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
                        <div className="modal-content" style={{borderRadius: '16px', border: 'none'}}>
                            <div className="modal-header bg-success text-white" style={{borderRadius: '16px 16px 0 0'}}>
                                <h5 className="modal-title fw-bold"><i className="bi bi-clipboard2-check me-2"></i>Résultats d'Analyse</h5>
                                <div className="d-flex align-items-center gap-2">
                                    {selectedResult?.validation_date ? <span className="badge bg-light text-success"><i className="bi bi-patch-check me-1"></i>Validé</span> : <span className="badge bg-warning text-dark">En attente</span>}
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowResult(false)}></button>
                                </div>
                            </div>
                            <div className="modal-body p-4">
                                {loadingResult ? <div className="text-center py-5"><div className="spinner-border text-success"></div></div> : selectedResult ? (
                                    <>
                                        <div className="row g-3 mb-4">
                                            <div className="col-md-6"><div className="p-3 bg-light rounded-3"><small className="text-muted d-block">Patient</small><strong>{selectedResult.request_info?.patient_name || '-'}</strong></div></div>
                                            <div className="col-md-6"><div className="p-3 bg-light rounded-3"><small className="text-muted d-block">Laboratoire</small><strong>{selectedResult.request_info?.lab_name || '-'}</strong></div></div>
                                        </div>
                                        {selectedResult.critical_finding && <div className="alert alert-danger border-2 border-danger text-center mb-3" style={{borderRadius: '12px'}}><i className="bi bi-exclamation-octagon me-2"></i><strong>RÉSULTAT CRITIQUE</strong></div>}
                                        {selectedResult.is_abnormal && !selectedResult.critical_finding && <div className="alert alert-warning text-center mb-3" style={{borderRadius: '12px'}}><i className="bi bi-exclamation-triangle me-2"></i>Valeurs anormales détectées</div>}

                                        <div className="table-responsive">
                                            <table className="table table-bordered table-hover mb-0">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th>Code</th><th>Valeur</th><th>Unité</th><th>Normes</th><th className="text-center" style={{ width: '50px' }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(selectedResult.results || {}).map(([code, data]) => (
                                                        <tr key={code} className={data.is_abnormal ? 'table-danger' : ''}>
                                                            <td className="fw-bold">{code}</td><td className="fw-bold fs-5">{data.value}</td><td className="text-muted">{data.unit}</td><td className="text-muted small">{data.normal_range}</td>
                                                            <td className="text-center">{data.is_abnormal && <i className="bi bi-exclamation-triangle-fill text-danger"></i>}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {selectedResult.conclusion && <div className="mt-4 p-3 bg-light rounded-3"><h6 className="mb-1 fw-bold"><i className="bi bi-chat-left-text me-1"></i>Conclusion</h6><p className="mb-0 text-muted">{selectedResult.conclusion}</p></div>}
                                        {selectedResult.recommendations && <div className="mt-3 p-3 border border-info rounded-3 bg-info bg-opacity-10"><h6 className="mb-1 text-info fw-bold"><i className="bi bi-lightbulb me-1"></i>Recommandations</h6><p className="mb-0">{selectedResult.recommendations}</p></div>}
                                        
                                        <div className="row g-3 mt-4 small text-muted">
                                            <div className="col-md-4"><i className="bi bi-person me-1"></i>Analysé par : <strong>{selectedResult.analyzed_by_name || '-'}</strong></div>
                                            <div className="col-md-4"><i className="bi bi-calendar me-1"></i>Date : <strong>{selectedResult.analysis_date ? new Date(selectedResult.analysis_date).toLocaleDateString('fr-FR') : '-'}</strong></div>
                                            {selectedResult.validation_date && <div className="col-md-4"><i className="bi bi-patch-check me-1 text-success"></i>Validé par : <strong>{selectedResult.validated_by_name || '-'}</strong></div>}
                                        </div>
                                    </>
                                ) : <div className="text-center py-4 text-muted">Aucune donnée.</div>}
                            </div>
                            <div className="modal-footer border-top-0 p-4"><button className="btn btn-light px-4 rounded-3" onClick={() => setShowResult(false)}>Fermer</button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}