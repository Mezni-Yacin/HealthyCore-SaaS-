import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import LabWorkflowTab from './LabWorkflowTab';
import LabCatalogTab from './LabCatalogTab';
import LabSettingsTab from './LabSettingsTab';

const API_BASE = '/laboratories/staff';

export default function LabStaffLab() {
    const [activeTab, setActiveTab] = useState('workflow');
    const [isLabConfigured, setIsLabConfigured] = useState(null);
    const [labData, setLabData] = useState(null);

    const fetchLabData = useCallback(() => {
        api.get(`${API_BASE}/my-lab/`)
            .then(r => { setLabData(r.data); setIsLabConfigured(true); })
            .catch(() => setIsLabConfigured(false));
    }, []);

    useEffect(() => {
        fetchLabData();
    }, [fetchLabData]);

    if (isLabConfigured === null) {
        return (<div className="container-fluid py-5 text-center"><div className="spinner-border text-primary" role="status"></div><p className="mt-3 text-muted">Vérification de votre profil laboratoire...</p></div>);
    }

    if (!isLabConfigured) {
        return (
            <div className="container-fluid py-5">
                <div className="row justify-content-center">
                    <div className="col-md-8 col-lg-7">
                        <div className="text-center mb-4">
                            <i className="bi bi-building text-primary" style={{ fontSize: '4rem' }}></i>
                            <h4 className="mt-3">Bienvenue dans votre espace</h4>
                            <p className="text-muted mb-0">Pour commencer, vous devez enregistrer votre laboratoire.</p>
                        </div>
                        <LabSettingsTab labData={null} onLabCreated={(data) => { setLabData(data); setIsLabConfigured(true); }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between mb-4">
                <div>
                    <h4 className="mb-1"><i className="bi bi-clipboard2-data me-2 text-primary"></i>Espace Laboratoire</h4>
                    <p className="text-muted mb-0">{labData?.name}</p>
                </div>
            </div>

            <ul className="nav nav-tabs mb-4">
                <li className="nav-item"><button className={`nav-link ${activeTab === 'workflow' ? 'active' : ''}`} onClick={() => setActiveTab('workflow')}><i className="bi bi-list-task me-1"></i>Demandes & Résultats</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')}><i className="bi bi-grid-3x3-gap me-1"></i>Catalogue Analyses</button></li>
                <li className="nav-item"><button className={`nav-link ${activeTab === 'lab' ? 'active' : ''}`} onClick={() => setActiveTab('lab')}><i className="bi bi-building me-1"></i>Mon Laboratoire</button></li>
            </ul>

            {activeTab === 'workflow' && <LabWorkflowTab />}
            {activeTab === 'catalog' && <LabCatalogTab />}
            {activeTab === 'lab' && <LabSettingsTab labData={labData} onLabCreated={(data) => setLabData(data)} />}
        </div>
    );
}