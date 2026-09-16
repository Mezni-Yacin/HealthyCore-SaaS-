import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const API_BASE = '/laboratories/staff';

const CATEGORY_MAP = {
    hematology: { label: 'Hématologie', cls: 'bg-danger-subtle text-danger' },
    biochemistry: { label: 'Biochimie', cls: 'bg-primary-subtle text-primary' },
    microbiology: { label: 'Microbiologie', cls: 'bg-info-subtle text-info' },
    immunology: { label: 'Immunologie', cls: 'bg-warning-subtle text-warning' },
    hormones: { label: 'Hormones', cls: 'bg-success-subtle text-success' },
    urinalysis: { label: 'Urine', cls: 'bg-secondary-subtle text-secondary' },
    other: { label: 'Autre', cls: 'bg-light text-dark' },
};

export default function LabCatalogTab() {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTestModal, setShowTestModal] = useState(false);
    const [testForm, setTestForm] = useState({ 
        name: '', 
        code: '', 
        category: 'biochemistry', 
        description: '', 
        preparation_instructions: '', 
        turnaround_time: '24', 
        price: '', 
        cnam_coverage: false, 
        cnam_price: '0.000' 
    });
    const [editingTestId, setEditingTestId] = useState(null);
    const [savingTest, setSavingTest] = useState(false);

    const fetchCatalogData = useCallback(() => {
        setLoading(true);
        api.get(`${API_BASE}/tests/`)
            .then(r => setTests(r.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchCatalogData();
    }, [fetchCatalogData]);

    const openTestModal = (test = null) => {
        if (test) {
            setEditingTestId(test.id);
            setTestForm({ 
                name: test.name, 
                code: test.code, 
                category: test.category, 
                description: test.description || '', 
                preparation_instructions: test.preparation_instructions || '', 
                turnaround_time: String(test.turnaround_time), 
                price: test.price, 
                cnam_coverage: test.cnam_coverage, 
                cnam_price: test.cnam_price 
            });
        } else {
            setEditingTestId(null);
            setTestForm({ 
                name: '', 
                code: '', 
                category: 'biochemistry', 
                description: '', 
                preparation_instructions: '', 
                turnaround_time: '24', 
                price: '', 
                cnam_coverage: false, 
                cnam_price: '0.000' 
            });
        }
        setShowTestModal(true);
    };

    const handleTestSubmit = (e) => {
        e.preventDefault(); 
        setSavingTest(true);
        const payload = { 
            ...testForm, 
            turnaround_time: parseInt(testForm.turnaround_time) || 24,
            price: parseFloat(testForm.price) || 0,
            cnam_price: parseFloat(testForm.cnam_price) || 0,
        };
        
        const req = editingTestId 
            ? api.patch(`${API_BASE}/tests/${editingTestId}/`, payload) 
            : api.post(`${API_BASE}/tests/`, payload);
            
        req.then(() => { 
                setShowTestModal(false); 
                fetchCatalogData(); 
            })
            .catch(err => alert(err.response?.data?.code?.[0] || "Erreur lors de l'enregistrement."))
            .finally(() => setSavingTest(false));
    };

    const deleteTest = (id) => {
        if (window.confirm('Voulez-vous vraiment supprimer cette analyse ? Cette action est irréversible.')) {
            api.delete(`${API_BASE}/tests/${id}/`)
                .then(() => fetchCatalogData())
                .catch(() => alert("Impossible de supprimer. Cette analyse est peut-être liée à des demandes."));
        }
    };

    return (
        <div className="container-fluid py-4" style={{ backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 56px)' }}>
            
            {/* En-tête de page */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="mb-1 fw-bold">
                        <i className="bi bi-grid-3x3-gap me-2 text-primary"></i>
                        Catalogue des Analyses
                    </h3>
                    <p className="text-muted mb-0">Gérez les analyses disponibles, leurs tarifs et la couverture CNAM.</p>
                </div>
                <button className="btn btn-primary" onClick={() => openTestModal()}>
                    <i className="bi bi-plus-lg me-2"></i>Nouvelle Analyse
                </button>
            </div>

            {/* Carte et Tableau */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <div className="card-header bg-white py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div className="d-flex align-items-center justify-content-between">
                        <h6 className="mb-0 fw-bold text-dark">Liste des analyses ({tests.length})</h6>
                    </div>
                </div>
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status"></div>
                            <p className="mt-2 text-muted">Chargement du catalogue...</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '120px' }}>Code</th>
                                        <th>Nom de l'analyse</th>
                                        <th>Catégorie</th>
                                        <th className="text-center">Délai</th>
                                        <th className="text-end">Prix</th>
                                        <th className="text-center">CNAM</th>
                                        <th className="text-center" style={{ width: '120px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tests.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-5 text-muted">
                                                <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
                                                Aucune analyse enregistrée pour le moment.
                                                <br />
                                                <button className="btn btn-link p-0 mt-2" onClick={() => openTestModal()}>Ajouter la première</button>
                                            </td>
                                        </tr>
                                    ) : (
                                        tests.map(t => (
                                            <tr key={t.id}>
                                                <td>
                                                    <span className="badge bg-light text-dark border fs-6 fw-bold p-2">
                                                        <i className="bi bi-upc-scan me-1"></i>{t.code}
                                                    </span>
                                                </td>
                                                <td className="fw-semibold text-dark">{t.name}</td>
                                                <td>
                                                    {t.category_display && (
                                                        <span className={`badge ${CATEGORY_MAP[t.category]?.cls || 'bg-light text-dark'}`}>
                                                            {t.category_display}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <i className="bi bi-clock me-1 text-muted"></i>{t.turnaround_time}h
                                                </td>
                                                <td className="text-end fw-bold">{Number(t.price).toFixed(3)} <small className="text-muted">TND</small></td>
                                                <td className="text-center">
                                                    {t.cnam_coverage ? (
                                                        <span className="badge bg-success-subtle text-success">
                                                            <i className="bi bi-check-circle-fill me-1"></i>Oui
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-light text-muted">Non</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="d-flex gap-1 justify-content-center">
                                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => openTestModal(t)} title="Modifier">
                                                            <i className="bi bi-pencil"></i>
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => deleteTest(t.id)} title="Supprimer">
                                                            <i className="bi bi-trash"></i>
                                                        </button>
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

            {/* MODALE D'AJOUT / MODIFICATION */}
            {showTestModal && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
                            <div className="modal-header bg-primary text-white" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                                <h5 className="modal-title fw-bold">
                                    <i className={`bi ${editingTestId ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`}></i>
                                    {editingTestId ? 'Modifier l\'analyse' : 'Ajouter une nouvelle analyse'}
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowTestModal(false)}></button>
                            </div>
                            <form onSubmit={handleTestSubmit}>
                                <div className="modal-body py-4">
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold text-dark">Code *</label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-light"><i className="bi bi-upc-scan"></i></span>
                                                <input 
                                                    type="text" 
                                                    className="form-control" 
                                                    required 
                                                    value={testForm.code} 
                                                    onChange={e => setTestForm({ ...testForm, code: e.target.value.toUpperCase() })} 
                                                    disabled={!!editingTestId}
                                                    style={{ textTransform: 'uppercase' }}
                                                />
                                            </div>
                                            <small className="text-muted">Unique, ex: NFS, GLU</small>
                                        </div>
                                        <div className="col-md-8">
                                            <label className="form-label fw-semibold text-dark">Nom de l'analyse *</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                required 
                                                value={testForm.name} 
                                                onChange={e => setTestForm({ ...testForm, name: e.target.value })} 
                                                placeholder="Ex: Hémogramme complet"
                                            />
                                        </div>
                                        
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold text-dark">Catégorie</label>
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
                                            <label className="form-label fw-semibold text-dark">Délai de rendu (heures) *</label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-light"><i className="bi bi-clock"></i></span>
                                                <input 
                                                    type="number" 
                                                    className="form-control" 
                                                    required 
                                                    value={testForm.turnaround_time} 
                                                    onChange={e => setTestForm({ ...testForm, turnaround_time: e.target.value })} 
                                                />
                                                <span className="input-group-text">h</span>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold text-dark">Prix Patient (TND) *</label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-light"><i className="bi bi-cash-stack"></i></span>
                                                <input 
                                                    type="number" 
                                                    step="0.001" 
                                                    className="form-control" 
                                                    required 
                                                    value={testForm.price} 
                                                    onChange={e => setTestForm({ ...testForm, price: e.target.value })} 
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="col-md-6">
                                            <div className="form-check form-switch mt-4">
                                                <input 
                                                    className="form-check-input" 
                                                    type="checkbox" 
                                                    checked={testForm.cnam_coverage} 
                                                    onChange={e => setTestForm({ ...testForm, cnam_coverage: e.target.checked })} 
                                                    id="cnamTestSwitch" 
                                                    style={{ width: '2.5em', height: '1.5em' }}
                                                />
                                                <label className="form-check-label fw-semibold text-dark" htmlFor="cnamTestSwitch" style={{ cursor: 'pointer' }}>
                                                    Prise en charge CNAM
                                                </label>
                                            </div>
                                            {testForm.cnam_coverage && (
                                                <div className="mt-2">
                                                    <label className="form-label small text-muted">Tarif CNAM (TND)</label>
                                                    <input 
                                                        type="number" 
                                                        step="0.001" 
                                                        className="form-control" 
                                                        value={testForm.cnam_price} 
                                                        onChange={e => setTestForm({ ...testForm, cnam_price: e.target.value })} 
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-12 mt-3">
                                            <label className="form-label fw-semibold text-dark">Description</label>
                                            <textarea 
                                                className="form-control" 
                                                rows="3" 
                                                value={testForm.description} 
                                                onChange={e => setTestForm({ ...testForm, description: e.target.value })} 
                                                placeholder="Décrivez l'analyse, son utilité, etc."
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-top-0 bg-light p-3" style={{ borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                                    <button type="button" className="btn btn-light px-4" onClick={() => setShowTestModal(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary px-4" disabled={savingTest}>
                                        {savingTest ? (
                                            <><span className="spinner-border spinner-border-sm me-2"></span>Enregistrement...</>
                                        ) : (
                                            <><i className="bi bi-check-lg me-2"></i>{editingTestId ? 'Mettre à jour' : 'Enregistrer'}</>
                                        )}
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