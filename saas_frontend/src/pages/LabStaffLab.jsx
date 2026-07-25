import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const STATUS_MAP = { requested: 'secondary', sample_collected: 'info', in_progress: 'warning text-dark', completed: 'success', cancelled: 'danger' };
const PRIORITY_MAP = { normal: 'secondary', urgent: 'warning text-dark', stat: 'danger' };

const DAYS = [
    { key: 'lundi', label: 'Lundi' },
    { key: 'mardi', label: 'Mardi' },
    { key: 'mercredi', label: 'Mercredi' },
    { key: 'jeudi', label: 'Jeudi' },
    { key: 'vendredi', label: 'Vendredi' },
    { key: 'samedi', label: 'Samedi' },
    { key: 'dimanche', label: 'Dimanche' },
];

// Helper sûr pour parser le JSON
const safeJsonParse = (str, fallback = {}) => {
    try {
        return JSON.parse(str || '{}');
    } catch (e) {
        return fallback;
    }
};

// ══════════════════ COMPOSANT SÉLECTEUR D'HORAIRES ══════════════════
// Convertit automatiquement : JSON backend ↔ Interface visuelle
const WeeklyHoursPicker = ({ value, onChange, label }) => {
    // Parse le JSON en objet { lundi: {enabled: true, start: "08:00", end: "17:00"}, ... }
    const parsed = safeJsonParse(typeof value === 'string' ? value : null, {});

    const daysState = DAYS.map(day => {
        const raw = parsed[day.key];
        if (raw && typeof raw === 'string' && raw.includes('-')) {
            const [start, end] = raw.split('-').map(s => s.trim());
            return { ...day, enabled: true, start, end };
        }
        if (raw && typeof raw === 'object') {
            return { ...day, enabled: true, start: raw.start || '08:00', end: raw.end || '17:00' };
        }
        return { ...day, enabled: false, start: '08:00', end: '17:00' };
    });

    const toggleDay = (index) => {
        const updated = [...daysState];
        updated[index] = { ...updated[index], enabled: !updated[index].enabled };
        convertAndSend(updated);
    };

    const changeTime = (index, field, val) => {
        const updated = [...daysState];
        updated[index] = { ...updated[index], [field]: val };
        convertAndSend(updated);
    };

    const convertAndSend = (days) => {
        const json = {};
        days.forEach(d => {
            if (d.enabled) {
                json[d.key] = `${d.start}-${d.end}`;
            }
        });
        onChange(JSON.stringify(json));
    };

    const enabledCount = daysState.filter(d => d.enabled).length;

    return (
        <div>
            <label className="form-label">{label}</label>
            <div className="card border">
                <div className="card-body p-0">
                    <table className="table table-sm mb-0 align-middle">
                        <thead className="table-light">
                            <tr>
                                <th style={{ width: '40px' }}></th>
                                <th>Jour</th>
                                <th style={{ width: '140px' }}>Début</th>
                                <th style={{ width: '140px' }}>Fin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {daysState.map((day, idx) => (
                                <tr key={day.key} className={!day.enabled ? 'table-secondary opacity-50' : ''}>
                                    <td className="text-center">
                                        <div className="form-check form-switch m-0">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={day.enabled}
                                                onChange={() => toggleDay(idx)}
                                                id={`${label}-${day.key}`}
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        <label className="form-check-label fw-semibold mb-0" htmlFor={`${label}-${day.key}`}>
                                            {day.label}
                                        </label>
                                    </td>
                                    <td>
                                        <input
                                            type="time"
                                            className="form-control form-control-sm"
                                            value={day.start}
                                            onChange={e => changeTime(idx, 'start', e.target.value)}
                                            disabled={!day.enabled}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="time"
                                            className="form-control form-control-sm"
                                            value={day.end}
                                            onChange={e => changeTime(idx, 'end', e.target.value)}
                                            disabled={!day.enabled}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {enabledCount === 0 && (
                    <div className="card-footer text-muted small py-2">
                        <i className="bi bi-info-circle me-1"></i>Aucun jour sélectionné
                    </div>
                )}
                {enabledCount > 0 && (
                    <div className="card-footer text-success small py-2">
                        <i className="bi bi-check-circle me-1"></i>{enabledCount} jour{enabledCount > 1 ? 's' : ''} configuré{enabledCount > 1 ? 's' : ''}
                    </div>
                )}
            </div>
        </div>
    );
};


// ══════════════════ COMPOSANT PRINCIPAL ══════════════════
const LabStaffLab = () => {
    const [activeTab, setActiveTab] = useState('workflow');
    const [isLabConfigured, setIsLabConfigured] = useState(null);
    const [loading, setLoading] = useState(false);

    // --- STATES WORKFLOW ---
    const [stats, setStats] = useState(null);
    const [requests, setRequests] = useState([]);
    const [filterStatus, setFilterStatus] = useState('');
    const [showResult, setShowResult] = useState(false);
    const [showViewResult, setShowViewResult] = useState(false);
    const [currentReq, setCurrentReq] = useState(null);
    const [viewData, setViewData] = useState(null);
    const [resultForm, setResultForm] = useState({});
    const [resultMeta, setResultMeta] = useState({ conclusion: '', recommendations: '', is_abnormal: false, critical_finding: false });
    const [saving, setSaving] = useState(false);

    // --- STATES LAB CRUD ---
    const [labData, setLabData] = useState(null);
    const [labForm, setLabForm] = useState({
        name: '', address: '', city: '', phone_number: '', email: '', website: '',
        cnam_affiliated: false, cnam_code: '',
        opening_hours: '{}',
        sample_collection_hours: '{}'
    });
    const [cities, setCities] = useState([]);
    const [citiesError, setCitiesError] = useState(false);
    const [savingLab, setSavingLab] = useState(false);
    const [labError, setLabError] = useState('');

    // --- STATES CATALOG CRUD ---
    const [tests, setTests] = useState([]);
    const [showTestModal, setShowTestModal] = useState(false);
    const [testForm, setTestForm] = useState({
        name: '', code: '', category: 'biochemistry', description: '',
        preparation_instructions: '', turnaround_time: '24', price: '',
        cnam_coverage: false, cnam_price: '0.000'
    });
    const [editingTestId, setEditingTestId] = useState(null);
    const [savingTest, setSavingTest] = useState(false);

    // --- STATE MODAL SETUP ---
    const [showSetupModal, setShowSetupModal] = useState(false);

    // ===================== DATA FETCHING =====================
    const fetchLabData = useCallback(() => {
        api.get('/laboratory/staff/my-lab/')
            .then(r => { setLabData(r.data); setIsLabConfigured(true); })
            .catch(() => setIsLabConfigured(false));
    }, []);

    const fetchWorkflowData = useCallback(() => {
        setLoading(true);
        Promise.all([
            api.get('/laboratory/staff/stats/').catch(() => null),
            api.get('/laboratory/staff/requests/').catch(() => ({ data: [] }))
        ]).then(([statsRes, reqRes]) => {
            if (statsRes) setStats(statsRes.data);
            setRequests(reqRes.data.results || reqRes.data || []);
        }).finally(() => setLoading(false));
    }, []);

    const fetchCatalogData = useCallback(() => {
        api.get('/laboratory/staff/tests/').then(r => setTests(r.data || [])).catch(() => {});
    }, []);

    useEffect(() => {
        fetchLabData();
        api.get('/laboratory/staff/cities/')
            .then(r => setCities(r.data || []))
            .catch(() => setCitiesError(true));
    }, [fetchLabData]);

    useEffect(() => {
        if (isLabConfigured === true) {
            fetchWorkflowData();
            fetchCatalogData();
        }
    }, [isLabConfigured, fetchWorkflowData, fetchCatalogData]);

    // ===================== LAB CRUD =====================
    const handleLabSubmit = (e) => {
        e.preventDefault();
        setLabError('');
        setSavingLab(true);

        const payload = {
            ...labForm,
            opening_hours: safeJsonParse(labForm.opening_hours),
            sample_collection_hours: safeJsonParse(labForm.sample_collection_hours)
        };

        api.patch('/laboratory/staff/my-lab/', payload)
            .then(r => {
                setLabData(r.data);
                alert('Laboratoire mis à jour avec succès !');
            })
            .catch(err => {
                const errorMsg = err.response?.data ? Object.values(err.response.data).flat().join(' | ') : 'Erreur lors de la mise à jour.';
                setLabError(errorMsg);
            })
            .finally(() => setSavingLab(false));
    };

    const loadLabToForm = () => {
        if (!labData) return;
        setLabError('');
        setLabForm({
            name: labData.name || '',
            address: labData.address || '',
            city: labData.city || '',
            phone_number: labData.phone_number || '',
            email: labData.email || '',
            website: labData.website || '',
            cnam_affiliated: labData.cnam_affiliated || false,
            cnam_code: labData.cnam_code || '',
            opening_hours: JSON.stringify(labData.opening_hours || {}),
            sample_collection_hours: JSON.stringify(labData.sample_collection_hours || {})
        });
    };

    const handleCreateLab = (e) => {
        e.preventDefault();
        setSavingLab(true);

        const payload = {
            ...labForm,
            opening_hours: safeJsonParse(labForm.opening_hours),
            sample_collection_hours: safeJsonParse(labForm.sample_collection_hours)
        };

        api.post('/laboratory/staff/create-lab/', payload)
            .then(() => {
                setShowSetupModal(false);
                setIsLabConfigured(true);
                fetchLabData();
            })
            .catch(err => {
                const errorMsg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(' | ') || "Erreur lors de la création.";
                alert(errorMsg);
            })
            .finally(() => setSavingLab(false));
    };

    // ===================== CATALOG CRUD =====================
    const openTestModal = (test = null) => {
        if (test) {
            setEditingTestId(test.id);
            setTestForm({
                name: test.name, code: test.code, category: test.category,
                description: test.description || '', preparation_instructions: test.preparation_instructions || '',
                turnaround_time: String(test.turnaround_time), price: test.price,
                cnam_coverage: test.cnam_coverage, cnam_price: test.cnam_price
            });
        } else {
            setEditingTestId(null);
            setTestForm({ name: '', code: '', category: 'biochemistry', description: '', preparation_instructions: '', turnaround_time: '24', price: '', cnam_coverage: false, cnam_price: '0.000' });
        }
        setShowTestModal(true);
    };

    const handleTestSubmit = (e) => {
        e.preventDefault();
        setSavingTest(true);
        const payload = { ...testForm, turnaround_time: parseInt(testForm.turnaround_time) || 24 };
        const req = editingTestId ? api.patch(`/laboratory/staff/tests/${editingTestId}/`, payload) : api.post('/laboratory/staff/tests/', payload);
        req.then(() => { setShowTestModal(false); fetchCatalogData(); })
            .catch(err => alert(err.response?.data?.code?.[0] || err.response?.data?.non_field_errors?.[0] || "Erreur lors de l'enregistrement."))
            .finally(() => setSavingTest(false));
    };

    const deleteTest = (id) => {
        if (window.confirm('Supprimer cette analyse ?')) {
            api.delete(`/laboratory/staff/tests/${id}/`).then(() => fetchCatalogData()).catch(() => alert("Impossible de supprimer (peut-être utilisé dans une demande)."));
        }
    };

    // ===================== WORKFLOW =====================
    const filteredRequests = filterStatus ? requests.filter(r => r.status === filterStatus) : requests;

    const updateStatus = (req, newStatus) => {
        api.patch(`/laboratory/staff/requests/${req.id}/status/`, { status: newStatus })
            .then(() => fetchWorkflowData())
            .catch(err => alert(err.response?.data?.detail || "Transition invalide."));
    };

    const openResultModal = (req) => {
        setCurrentReq(req);
        api.get(`/laboratory/staff/requests/${req.id}/`).then(res => {
            let emptyForm = {};
            (res.data.tests_detail || []).forEach(t => { emptyForm[t.code] = { value: '', unit: '', normal_range: '' }; });
            setResultForm(emptyForm);
            setResultMeta({ conclusion: '', recommendations: '', is_abnormal: false, critical_finding: false });
            setShowResult(true);
        }).catch(() => alert("Erreur lors du chargement des détails."));
    };

    const submitResults = (e) => {
        e.preventDefault();
        setSaving(true);
        api.post(`/laboratory/staff/requests/${currentReq.id}/results/`, { results: resultForm, ...resultMeta })
            .then(() => { setShowResult(false); fetchWorkflowData(); })
            .catch(err => alert(err.response?.data?.results?.non_field_errors?.[0] || "Erreur de saisie."))
            .finally(() => setSaving(false));
    };

    const validateResult = (id) => {
        if (window.confirm('Confirmer la validation définitive de ces résultats ?')) {
            api.post(`/laboratory/staff/requests/${id}/results/validate/`).then(() => fetchWorkflowData()).catch(err => alert(err.response?.data?.detail));
        }
    };

    const viewResultDetails = (id) => {
        api.get(`/laboratory/staff/requests/${id}/result/`)
            .then(res => { setViewData(res.data); setShowViewResult(true); })
            .catch(() => alert("Aucun résultat disponible."));
    };

    // ===================== COMPOSANT SÉLECTEUR DE VILLE =====================
    const CitySelector = ({ value, onChange, required }) => {
        if (citiesError) {
            return (
                <div>
                    <input type="number" className="form-control" required={required} placeholder="Saisir l'ID de la ville (ex: 1)" value={value} onChange={e => onChange(e.target.value)} />
                    <small className="text-muted"><i className="bi bi-info-circle me-1"></i>La liste des villes n'est pas accessible. Trouvez l'ID dans le Panel Admin.</small>
                </div>
            );
        }
        return (
            <select className="form-select" required={required} value={value} onChange={e => onChange(e.target.value)}>
                <option value="">-- Sélectionner --</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
        );
    };

    // ===================== RENDU ECRAN CHARGEMENT =====================
    if (isLabConfigured === null) {
        return (
            <div className="container-fluid py-5 text-center">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-3 text-muted">Vérification de votre profil laboratoire...</p>
            </div>
        );
    }

    // ===================== RENDU SI PAS DE LABO =====================
    if (!isLabConfigured) {
        return (
            <div className="container-fluid py-5">
                <div className="row justify-content-center">
                    <div className="col-md-6 col-lg-5">
                        <div className="card border-0 shadow-sm text-center p-5">
                            <i className="bi bi-building text-primary" style={{ fontSize: '4rem' }}></i>
                            <h4 className="mt-3">Bienvenue dans votre espace</h4>
                            <p className="text-muted mb-4">Pour commencer à gérer vos analyses, vous devez d'abord enregistrer votre laboratoire.</p>
                            <button className="btn btn-primary btn-lg" onClick={() => setShowSetupModal(true)}>
                                <i className="bi bi-plus-circle me-2"></i>Créer mon laboratoire
                            </button>
                        </div>
                    </div>
                </div>

                {showSetupModal && (
                    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header bg-primary text-white">
                                    <h5 className="modal-title"><i className="bi bi-building-add me-2"></i>Créer mon Laboratoire</h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowSetupModal(false)}></button>
                                </div>
                                <form onSubmit={handleCreateLab}>
                                    <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                        <div className="mb-3">
                                            <label className="form-label">Nom du laboratoire <span className="text-danger">*</span></label>
                                            <input type="text" className="form-control" required value={labForm.name} onChange={e => setLabForm({ ...labForm, name: e.target.value })} placeholder="Ex: Labo BioMed Tunis" />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Adresse <span className="text-danger">*</span></label>
                                            <textarea className="form-control" required rows="2" value={labForm.address} onChange={e => setLabForm({ ...labForm, address: e.target.value })} placeholder="10 Rue de la Santé, Tunis" />
                                        </div>
                                        <div className="row g-3 mb-3">
                                            <div className="col-md-6">
                                                <label className="form-label">Ville <span className="text-danger">*</span></label>
                                                <CitySelector value={labForm.city} onChange={val => setLabForm({ ...labForm, city: val })} required={true} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Téléphone <span className="text-danger">*</span></label>
                                                <input type="tel" className="form-control" required value={labForm.phone_number} onChange={e => setLabForm({ ...labForm, phone_number: e.target.value })} placeholder="+216 XX XXX XXX" />
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Email <span className="text-danger">*</span></label>
                                            <input type="email" className="form-control" required value={labForm.email} onChange={e => setLabForm({ ...labForm, email: e.target.value })} placeholder="contact@labo.tn" />
                                        </div>

                                        {/* ✅ NOUVEAU : Horaires visuels dans le modal de création */}
                                        <div className="mb-3">
                                            <WeeklyHoursPicker
                                                label="Horaires d'ouverture"
                                                value={labForm.opening_hours}
                                                onChange={val => setLabForm({ ...labForm, opening_hours: val })}
                                            />
                                        </div>
                                        <div className="mb-0">
                                            <WeeklyHoursPicker
                                                label="Horaires de prélèvement"
                                                value={labForm.sample_collection_hours}
                                                onChange={val => setLabForm({ ...labForm, sample_collection_hours: val })}
                                            />
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowSetupModal(false)}>Annuler</button>
                                        <button type="submit" className="btn btn-primary" disabled={savingLab}>
                                            {savingLab ? <><span className="spinner-border spinner-border-sm me-1"></span>Création...</> : 'Créer et Démarrer'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ===================== RENDU PRINCIPAL =====================
    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between mb-4">
                <div>
                    <h4 className="mb-1"><i className="bi bi-clipboard2-data me-2 text-primary"></i>Espace Laboratoire</h4>
                    <p className="text-muted mb-0">{labData?.name}</p>
                </div>
            </div>

            {/* ONGLETS */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item"><button className={`nav-link ${activeTab === 'workflow' ? 'active' : ''}`} onClick={() => setActiveTab('workflow')}><i className="bi bi-list-task me-1"></i>Demandes & Résultats</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')}><i className="bi bi-grid-3x3-gap me-1"></i>Catalogue Analyses</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'lab' ? 'active' : ''}`} onClick={() => { setActiveTab('lab'); loadLabToForm(); }}><i className="bi bi-building me-1"></i>Mon Laboratoire</button></li>
            </ul>

            {/* ===================== TAB: WORKFLOW ===================== */}
            {activeTab === 'workflow' && (
                <>
                    {stats && (
                        <div className="row g-3 mb-4">
                            {[
                                { l: 'Urgentes/Stat', v: stats.urgent || 0, c: 'text-danger', i: 'bi-exclamation-triangle' },
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

                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white py-3 d-flex gap-2">
                            <button className={`btn btn-sm ${filterStatus === '' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilterStatus('')}>Toutes</button>
                            <button className={`btn btn-sm ${filterStatus === 'requested' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilterStatus('requested')}>Attente</button>
                            <button className={`btn btn-sm ${filterStatus === 'in_progress' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilterStatus('in_progress')}>En cours</button>
                        </div>
                        <div className="card-body p-0">
                            {loading ? (
                                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0 align-middle">
                                        <thead className="table-light">
                                            <tr><th>Date</th><th>Patient</th><th>Analyses</th><th>Priorité</th><th>Statut</th><th>Actions</th></tr>
                                        </thead>
                                        <tbody>
                                            {filteredRequests.length === 0 ? <tr><td colSpan="6" className="text-center py-4 text-muted">Aucune demande trouvée</td></tr> :
                                                filteredRequests.map(req => (
                                                    <tr key={req.id}>
                                                        <td className="small">{new Date(req.request_date).toLocaleDateString('fr-FR')}</td>
                                                        <td className="fw-semibold">{req.patient_name}</td>
                                                        <td><small>{req.test_names?.join(', ')}</small></td>
                                                        <td><span className={`badge bg-${PRIORITY_MAP[req.priority]}`}>{req.priority_display}</span></td>
                                                        <td><span className={`badge bg-${STATUS_MAP[req.status]}`}>{req.status_display}</span></td>
                                                        <td>
                                                            <div className="d-flex gap-1">
                                                                {req.status === 'requested' && <button className="btn btn-sm btn-outline-info" onClick={() => updateStatus(req, 'sample_collected')} title="Marquer comme prélevé"><i className="bi bi-droplet"></i></button>}
                                                                {req.status === 'sample_collected' && <button className="btn btn-sm btn-outline-warning" onClick={() => updateStatus(req, 'in_progress')} title="Démarrer l'analyse"><i className="bi bi-play-fill"></i></button>}
                                                                {req.status === 'in_progress' && <button className="btn btn-sm btn-primary" onClick={() => openResultModal(req)}><i className="bi bi-pencil-square me-1"></i>Saisir</button>}
                                                                {req.has_result && req.status === 'completed' && !viewData?.validation_date && <button className="btn btn-sm btn-success" onClick={() => validateResult(req.id)} title="Valider définitivement"><i className="bi bi-patch-check"></i></button>}
                                                                {req.has_result && <button className="btn btn-sm btn-outline-secondary" onClick={() => viewResultDetails(req.id)} title="Voir les résultats"><i className="bi bi-eye"></i></button>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ===================== TAB: CATALOGUE ===================== */}
            {activeTab === 'catalog' && (
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white d-flex justify-content-between">
                        <h6 className="mb-0">Catalogue des Analyses</h6>
                        <button className="btn btn-primary btn-sm" onClick={() => openTestModal()}><i className="bi bi-plus-lg me-1"></i>Ajouter une analyse</button>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr><th>Code</th><th>Nom</th><th>Catégorie</th><th>Délai</th><th>Prix</th><th>CNAM</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {tests.length === 0 ? <tr><td colSpan="7" className="text-center py-4 text-muted">Aucune analyse enregistrée. Ajoutez-en une !</td></tr> :
                                        tests.map(t => (
                                            <tr key={t.id}>
                                                <td className="fw-bold text-primary">{t.code}</td>
                                                <td>{t.name}</td>
                                                <td><span className="badge bg-light text-dark">{t.category_display}</span></td>
                                                <td>{t.turnaround_time}h</td>
                                                <td>{Number(t.price).toFixed(3)} TND</td>
                                                <td>{t.cnam_coverage ? <span className="text-success fw-bold">Oui</span> : <span className="text-muted">Non</span>}</td>
                                                <td>
                                                    <div className="d-flex gap-1">
                                                        <button className="btn btn-sm btn-outline-primary" onClick={() => openTestModal(t)} title="Modifier"><i className="bi bi-pencil"></i></button>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => deleteTest(t.id)} title="Supprimer"><i className="bi bi-trash"></i></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== TAB: MON LABO ===================== */}
            {activeTab === 'lab' && labData && (
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white"><h6 className="mb-0">Configuration du Laboratoire</h6></div>
                    <div className="card-body">
                        {labError && <div className="alert alert-danger"><i className="bi bi-exclamation-triangle me-2"></i>{labError}</div>}
                        <form onSubmit={handleLabSubmit}>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label">Nom du laboratoire</label>
                                    <input type="text" className="form-control" value={labForm.name} onChange={e => setLabForm({ ...labForm, name: e.target.value })} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Ville <span className="text-danger">*</span></label>
                                    <CitySelector value={labForm.city} onChange={val => setLabForm({ ...labForm, city: val })} required={true} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Adresse</label>
                                    <textarea className="form-control" rows="2" value={labForm.address} onChange={e => setLabForm({ ...labForm, address: e.target.value })} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Téléphone</label>
                                    <input type="tel" className="form-control" value={labForm.phone_number} onChange={e => setLabForm({ ...labForm, phone_number: e.target.value })} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-control" value={labForm.email} onChange={e => setLabForm({ ...labForm, email: e.target.value })} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">Site Web</label>
                                    <input type="text" className="form-control" value={labForm.website} onChange={e => setLabForm({ ...labForm, website: e.target.value })} placeholder="https://" />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Code CNAM</label>
                                    <input type="text" className="form-control" value={labForm.cnam_code} onChange={e => setLabForm({ ...labForm, cnam_code: e.target.value })} />
                                </div>
                                <div className="col-md-6 d-flex align-items-end">
                                    <div className="form-check form-switch mt-2">
                                        <input className="form-check-input" type="checkbox" checked={labForm.cnam_affiliated} onChange={e => setLabForm({ ...labForm, cnam_affiliated: e.target.checked })} id="cnamSwitch" />
                                        <label className="form-check-label" htmlFor="cnamSwitch">Affilié CNAM</label>
                                    </div>
                                </div>

                                {/* ✅ NOUVEAU : Horaires visuels au lieu du JSON brut */}
                                <div className="col-md-6">
                                    <WeeklyHoursPicker
                                        label="Horaires d'ouverture"
                                        value={labForm.opening_hours}
                                        onChange={val => setLabForm({ ...labForm, opening_hours: val })}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <WeeklyHoursPicker
                                        label="Horaires de prélèvement"
                                        value={labForm.sample_collection_hours}
                                        onChange={val => setLabForm({ ...labForm, sample_collection_hours: val })}
                                    />
                                </div>
                            </div>
                            <div className="mt-3">
                                <button type="submit" className="btn btn-primary" disabled={savingLab}>
                                    {savingLab ? <><span className="spinner-border spinner-border-sm me-1"></span>Enregistrement...</> : <><i className="bi bi-check-lg me-1"></i>Sauvegarder les modifications</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===================== MODAL TEST CRUD ===================== */}
            {showTestModal && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">{editingTestId ? 'Modifier' : 'Ajouter'} une Analyse</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowTestModal(false)}></button>
                            </div>
                            <form onSubmit={handleTestSubmit}>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label">Code *</label>
                                            <input type="text" className="form-control" required value={testForm.code} onChange={e => setTestForm({ ...testForm, code: e.target.value })} disabled={!!editingTestId} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Nom *</label>
                                            <input type="text" className="form-control" required value={testForm.name} onChange={e => setTestForm({ ...testForm, name: e.target.value })} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Catégorie</label>
                                            <select className="form-select" value={testForm.category} onChange={e => setTestForm({ ...testForm, category: e.target.value })}>
                                                <option value="hematology">Hématologie</option>
                                                <option value="biochemistry">Biochimie</option>
                                                <option value="microbiology">Microbiologie</option>
                                                <option value="immunology">Immunologie</option>
                                                <option value="hormones">Hormones</option>
                                                <option value="urinalysis">Analyse d'urine</option>
                                                <option value="other">Autre</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Délai (heures) *</label>
                                            <input type="number" className="form-control" required value={testForm.turnaround_time} onChange={e => setTestForm({ ...testForm, turnaround_time: e.target.value })} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Prix (TND) *</label>
                                            <input type="number" step="0.001" className="form-control" required value={testForm.price} onChange={e => setTestForm({ ...testForm, price: e.target.value })} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Prix CNAM</label>
                                            <input type="number" step="0.001" className="form-control" value={testForm.cnam_price} onChange={e => setTestForm({ ...testForm, cnam_price: e.target.value })} />
                                        </div>
                                        <div className="col-md-4 d-flex align-items-end">
                                            <div className="form-check form-switch mt-2">
                                                <input className="form-check-input" type="checkbox" checked={testForm.cnam_coverage} onChange={e => setTestForm({ ...testForm, cnam_coverage: e.target.checked })} id="cnamTestSwitch" />
                                                <label className="form-check-label" htmlFor="cnamTestSwitch">Prise en charge CNAM</label>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label">Description</label>
                                            <textarea className="form-control" rows="2" value={testForm.description} onChange={e => setTestForm({ ...testForm, description: e.target.value })} placeholder="Description de l'analyse..." />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowTestModal(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary" disabled={savingTest}>{savingTest ? '...' : 'Enregistrer'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== MODAL SAISIE RÉSULTATS ===================== */}
            {showResult && currentReq && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">Saisie des Résultats</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowResult(false)}></button>
                            </div>
                            <form onSubmit={submitResults}>
                                <div className="modal-body">
                                    <div className="alert alert-light mb-3">
                                        <strong>Patient:</strong> {currentReq.patient_name}
                                    </div>
                                    {Object.entries(resultForm).map(([code, data]) => (
                                        <div key={code} className="row mb-2 align-items-center g-2">
                                            <div className="col-3 fw-bold">{code}</div>
                                            <div className="col-3">
                                                <input type="text" className="form-control" placeholder="Valeur" required value={data.value} onChange={e => setResultForm({ ...resultForm, [code]: { ...data, value: e.target.value } })} />
                                            </div>
                                            <div className="col-3">
                                                <input type="text" className="form-control" placeholder="Unité" value={data.unit} onChange={e => setResultForm({ ...resultForm, [code]: { ...data, unit: e.target.value } })} />
                                            </div>
                                            <div className="col-3">
                                                <input type="text" className="form-control" placeholder="Normes" value={data.normal_range} onChange={e => setResultForm({ ...resultForm, [code]: { ...data, normal_range: e.target.value } })} />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="form-check mt-4">
                                        <input className="form-check-input" type="checkbox" checked={resultMeta.is_abnormal} onChange={e => setResultMeta({ ...resultMeta, is_abnormal: e.target.checked })} id="resAbn" />
                                        <label className="form-check-label text-danger fw-bold" htmlFor="resAbn">Valeurs Anormales</label>
                                    </div>
                                    <div className="form-check mb-3">
                                        <input className="form-check-input" type="checkbox" checked={resultMeta.critical_finding} onChange={e => setResultMeta({ ...resultMeta, critical_finding: e.target.checked })} id="resCrit" />
                                        <label className="form-check-label text-danger fw-bold" htmlFor="resCrit">Finding Critique (Urgence médicale)</label>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Conclusion</label>
                                        <textarea className="form-control" rows="2" value={resultMeta.conclusion} onChange={e => setResultMeta({ ...resultMeta, conclusion: e.target.value })}></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowResult(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-success" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer les Résultats'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== MODAL VISUALISATION RÉSULTAT ===================== */}
            {showViewResult && viewData && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-success text-white d-flex justify-content-between align-items-center">
                                <h5 className="modal-title"><i className="bi bi-clipboard2-check me-2"></i>Résultats Enregistrés</h5>
                                <div>
                                    {viewData.validation_date ? <span className="badge bg-light text-success me-2">Validé</span> : <span className="badge bg-warning text-dark me-2">En attente de validation</span>}
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowViewResult(false)}></button>
                                </div>
                            </div>
                            <div className="modal-body">
                                {viewData.is_abnormal && <div className="alert alert-danger text-center"><i className="bi bi-exclamation-triangle me-2"></i>Valeurs anormales détectées</div>}
                                {viewData.critical_finding && <div className="alert alert-danger border border-2 border-danger text-center"><i className="bi bi-exclamation-octagon me-2"></i><strong>FINDING CRITIQUE</strong></div>}
                                <table className="table table-bordered">
                                    <thead><tr><th>Code</th><th>Valeur</th><th>Unité</th><th>Normes</th></tr></thead>
                                    <tbody>
                                        {Object.entries(viewData.results || {}).map(([c, d]) => (
                                            <tr key={c} className={d.is_abnormal ? 'table-danger' : ''}>
                                                <td className="fw-bold">{c}</td><td>{d.value}</td><td>{d.unit}</td><td className="text-muted">{d.normal_range}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {viewData.conclusion && <div className="mt-3 p-3 bg-light border rounded"><strong>Conclusion du biologiste:</strong><p className="mb-0 mt-1">{viewData.conclusion}</p></div>}
                                {viewData.recommendations && <div className="mt-3 p-3 border border-info rounded text-info"><strong>Recommandations:</strong><p className="mb-0 mt-1">{viewData.recommendations}</p></div>}
                            </div>
                            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowViewResult(false)}>Fermer</button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default LabStaffLab;