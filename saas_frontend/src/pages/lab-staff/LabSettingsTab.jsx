import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import WeeklyHoursPicker from './WeeklyHoursPicker';

const API_BASE = '/laboratories/staff';

export default function LabSettingsTab() {
    const navigate = useNavigate();
    const [labData, setLabData] = useState(null);
    const [isLabConfigured, setIsLabConfigured] = useState(null);
    const [labForm, setLabForm] = useState({ name: '', address: '', city: '', phone_number: '', email: '', website: '', cnam_affiliated: false, cnam_code: '', opening_hours: '{}', sample_collection_hours: '{}', latitude: '', longitude: '' });
    const [cities, setCities] = useState([]);
    const [citiesError, setCitiesError] = useState(false);
    const [savingLab, setSavingLab] = useState(false);
    const [labError, setLabError] = useState(''); // Contiendra le message d'erreur précis

    const fetchLabData = () => {
        api.get(`${API_BASE}/my-lab/`)
            .then(r => { 
                setLabData(r.data); 
                setIsLabConfigured(true); 
                setLabForm({
                    name: r.data.name || '', address: r.data.address || '', city: r.data.city || '',
                    phone_number: r.data.phone_number || '', email: r.data.email || '', website: r.data.website || '',
                    cnam_affiliated: r.data.cnam_affiliated || false, cnam_code: r.data.cnam_code || '',
                    opening_hours: JSON.stringify(r.data.opening_hours || {}),
                    sample_collection_hours: JSON.stringify(r.data.sample_collection_hours || {}),
                    latitude: r.data.latitude || '', longitude: r.data.longitude || ''
                });
            })
            .catch(() => setIsLabConfigured(false));
    };

    useEffect(() => {
        fetchLabData();
        api.get(`${API_BASE}/cities/`).then(r => setCities(r.data || [])).catch(() => setCitiesError(true));
    }, []);

    const buildFormData = (formObj) => {
        const formData = new FormData();
        for (const key in formObj) {
            if (key === 'logo_file' || key === 'banner_file') continue;
            if (key === 'opening_hours' || key === 'sample_collection_hours') {
                formData.append(key, JSON.stringify(JSON.parse(formObj[key] || '{}')));
            } else if (formObj[key] !== null && formObj[key] !== undefined) {
                formData.append(key, formObj[key]);
            }
        }
        if (formObj.logo_file) formData.append('logo', formObj.logo_file);
        if (formObj.banner_file) formData.append('banner', formObj.banner_file);
        return formData;
    };

    const handleLabSubmit = (e) => {
        e.preventDefault(); setLabError(''); setSavingLab(true);
        const formData = buildFormData(labForm);
        api.patch(`${API_BASE}/my-lab/`, formData, { headers: { 'Content-Type': undefined }, transformRequest: [(data, headers) => data] })
            .then(r => { setLabData(r.data); setLabError(''); alert('Laboratoire mis à jour avec succès !'); })
            .catch(err => {
                // ✅ Extraction propre de l'erreur
                const errData = err.response?.data || {};
                const errMessages = Object.entries(errData).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`).join(' | ');
                setLabError(errMessages || 'Erreur lors de la mise à jour.');
            })
            .finally(() => setSavingLab(false));
    };

    const handleCreateLab = (e) => {
        e.preventDefault(); setLabError(''); setSavingLab(true);
        const formData = buildFormData(labForm);
        api.post(`${API_BASE}/create-lab/`, formData, { headers: { 'Content-Type': undefined }, transformRequest: [(data, headers) => data] })
            .then((res) => { 
                setIsLabConfigured(true); 
                setLabData(res.data);
                alert("Laboratoire créé avec succès !");
                navigate('/lab-staff'); 
            })
            .catch(err => {
                // ✅ Extraction propre de l'erreur pour afficher le champ manquant
                const errData = err.response?.data || {};
                const errMessages = Object.entries(errData).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`).join(' | ');
                setLabError(errMessages || "Erreur lors de la création.");
            })
            .finally(() => setSavingLab(false));
    };

    const CitySelector = ({ value, onChange, required }) => {
        if (citiesError) return (<div><input type="number" className="form-control" required={required} placeholder="ID de la ville" value={value} onChange={e => onChange(e.target.value)} /><small className="text-muted">Liste inaccessible. Entrez l'ID manuellement.</small></div>);
        return (<select className="form-select" required={required} value={value} onChange={e => onChange(e.target.value)}><option value="">-- Sélectionner --</option>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>);
    };

    if (isLabConfigured === null) {
        return <div className="container-fluid py-5 text-center"><div className="spinner-border text-primary" role="status"></div><p className="mt-3 text-muted">Vérification de votre profil laboratoire...</p></div>;
    }

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between mb-4">
                <div>
                    <h4 className="mb-1"><i className="bi bi-building me-2 text-primary"></i>{labData ? "Configuration du Laboratoire" : "Création du Laboratoire"}</h4>
                    <p className="text-muted mb-0">{labData?.name || "Configurez les informations de votre établissement"}</p>
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-body">
                    {/* ✅ AFFICHAGE DE L'ERREUR PRÉCISE ICI */}
                    {labError && (
                        <div className="alert alert-danger">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            <strong>Erreur :</strong> {labError}
                        </div>
                    )}
                    
                    {!isLabConfigured && (
                        <div className="alert alert-warning"><i className="bi bi-info-circle me-2"></i>Votre laboratoire n'est pas encore configuré. Veuillez remplir ce formulaire pour commencer.</div>
                    )}

                    <form onSubmit={isLabConfigured ? handleLabSubmit : handleCreateLab}>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label">Nom du laboratoire <span className="text-danger">*</span></label>
                                <input type="text" className="form-control" value={labForm.name} onChange={e => setLabForm({ ...labForm, name: e.target.value })} required />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Ville <span className="text-danger">*</span></label>
                                <CitySelector value={labForm.city} onChange={val => setLabForm({ ...labForm, city: val })} required={true} />
                            </div>
                            <div className="col-12">
                                <label className="form-label">Adresse <span className="text-danger">*</span></label>
                                <textarea className="form-control" rows="2" value={labForm.address} onChange={e => setLabForm({ ...labForm, address: e.target.value })} required />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Téléphone <span className="text-danger">*</span></label>
                                <input type="tel" className="form-control" value={labForm.phone_number} onChange={e => setLabForm({ ...labForm, phone_number: e.target.value })} placeholder="+216 XX XXX XXX" required />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Email <span className="text-danger">*</span></label>
                                <input type="email" className="form-control" value={labForm.email} onChange={e => setLabForm({ ...labForm, email: e.target.value })} required />
                            </div>
                            <div className="col-md-4"><label className="form-label">Site Web</label><input type="text" className="form-control" value={labForm.website} onChange={e => setLabForm({ ...labForm, website: e.target.value })} placeholder="https://" /></div>
                            
                            {isLabConfigured && labData && (
                                <>
                                    <div className="col-md-6">
                                        <label className="form-label">Logo du laboratoire</label>
                                        <input type="file" className="form-control" accept="image/*" onChange={e => setLabForm({ ...labForm, logo_file: e.target.files[0] })} />
                                        {labData.logo && !labForm.logo_file && <small className="text-muted">Logo actuel: <a href={labData.logo} target="_blank" rel="noreferrer">Voir</a></small>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Photo de couverture (Bannière)</label>
                                        <input type="file" className="form-control" accept="image/*" onChange={e => setLabForm({ ...labForm, banner_file: e.target.files[0] })} />
                                        {labData.banner && !labForm.banner_file && <small className="text-muted">Bannière actuelle: <a href={labData.banner} target="_blank" rel="noreferrer">Voir</a></small>}
                                    </div>
                                </>
                            )}

                            <div className="col-md-6"><label className="form-label">Latitude (pour la carte)</label><input type="text" className="form-control" value={labForm.latitude} onChange={e => setLabForm({ ...labForm, latitude: e.target.value })} placeholder="Ex: 36.8065" /></div>
                            <div className="col-md-6"><label className="form-label">Longitude (pour la carte)</label><input type="text" className="form-control" value={labForm.longitude} onChange={e => setLabForm({ ...labForm, longitude: e.target.value })} placeholder="Ex: 10.1815" /></div>

                            <div className="col-md-6"><label className="form-label">Code CNAM</label><input type="text" className="form-control" value={labForm.cnam_code} onChange={e => setLabForm({ ...labForm, cnam_code: e.target.value })} /></div>
                            <div className="col-md-6 d-flex align-items-end"><div className="form-check form-switch mt-2"><input className="form-check-input" type="checkbox" checked={labForm.cnam_affiliated} onChange={e => setLabForm({ ...labForm, cnam_affiliated: e.target.checked })} id="cnamSwitch" /><label className="form-check-label" htmlFor="cnamSwitch">Affilié CNAM</label></div></div>
                            <div className="col-md-6"><WeeklyHoursPicker label="Horaires d'ouverture" value={labForm.opening_hours} onChange={val => setLabForm({ ...labForm, opening_hours: val })} /></div>
                            <div className="col-md-6"><WeeklyHoursPicker label="Horaires de prélèvement" value={labForm.sample_collection_hours} onChange={val => setLabForm({ ...labForm, sample_collection_hours: val })} /></div>
                        </div>
                        <div className="mt-3">
                            <button type="submit" className="btn btn-primary" disabled={savingLab}>
                                {savingLab ? <><span className="spinner-border spinner-border-sm me-1"></span>Enregistrement...</> : <><i className="bi bi-check-lg me-1"></i>{isLabConfigured ? 'Sauvegarder les modifications' : 'Créer et Démarrer'}</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}