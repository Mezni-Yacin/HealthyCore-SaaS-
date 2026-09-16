import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const cardStyle = { borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };

export default function PublicProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [convLoading, setConvLoading] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get(`/users/${id}/profile/`);
                setUserData(res.data);
            } catch (err) {
                setError("Impossible de charger le profil de cet utilisateur.");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id]);

    const startConversation = async () => {
        setConvLoading(true);
        try {
            const res = await api.post('/messaging/direct-conversations/', { user_id: id });
            navigate(`/chat/direct/${res.data.id}`);
        } catch (err) {
            alert("Erreur lors de la création de la conversation.");
        } finally {
            setConvLoading(false);
        }
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
    if (error) return <div className="alert alert-danger m-4">{error}</div>;
    if (!userData) return null;

    const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username;
    const displayImage = userData.profile_picture_url;

    return (
        <div className="container-fluid py-4" style={{ background: '#f8fafc', minHeight: '100vh' }}>
            
            {/* Bannière */}
            <div className="position-relative mb-5 rounded-4 shadow-sm overflow-hidden" style={{ height: '200px', background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
                <div className="position-absolute top-0 start-0 p-3">
                    <button className="btn btn-light btn-sm shadow-sm" onClick={() => navigate(-1)}>
                        <i className="bi bi-arrow-left me-1"></i> Retour
                    </button>
                </div>
            </div>

            <div className="row g-4" style={{ marginTop: '-100px' }}>
                
                {/* Carte de visite */}
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm sticky-top" style={{ top: '20px', borderRadius: 16 }}>
                        <div className="card-body text-center p-4">
                            <div className="position-relative d-inline-block mb-3">
                                {displayImage ? (
                                    <img src={displayImage} alt="Profil" className="rounded-circle shadow" style={{ width: '140px', height: '140px', objectFit: 'cover', border: '4px solid white' }} />
                                ) : (
                                    <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white shadow" style={{ width: '140px', height: '140px', border: '4px solid white', fontSize: '3rem' }}>
                                        <i className="bi bi-person-fill"></i>
                                    </div>
                                )}
                            </div>
                            <h3 className="fw-bold mb-1">{fullName}</h3>
                            <p className="text-muted text-uppercase small fw-bold mb-3">
                                <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2">{userData.role_display || userData.role}</span>
                            </p>
                            
                            <div className="text-start mt-4 mb-4">
                                <div className="d-flex align-items-center mb-3 text-muted">
                                    <i className="bi bi-envelope me-3 fs-5"></i>
                                    <span className="small text-dark">{userData.email || 'Non renseigné'}</span>
                                </div>
                                <div className="d-flex align-items-center mb-3 text-muted">
                                    <i className="bi bi-telephone me-3 fs-5"></i>
                                    <span className="small text-dark">{userData.phone_number || 'Non renseigné'}</span>
                                </div>
                                <div className="d-flex align-items-center text-muted">
                                    <i className="bi bi-geo-alt me-3 fs-5"></i>
                                    <span className="small text-dark">{userData.city_detail?.name || 'Non renseignée'}</span>
                                </div>
                            </div>

                            <button className="btn btn-primary w-100 rounded-3 fw-semibold" onClick={startConversation} disabled={convLoading}>
                                {convLoading ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-chat-dots me-2"></i> Envoyer un message</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Détails spécifiques au rôle */}
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
                        <div className="card-header bg-white border-0 py-3">
                            <h5 className="mb-0 fw-bold"><i className="bi bi-info-circle text-primary me-2"></i>Informations détaillées</h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-6"><strong className="d-block text-muted small">Nom d'utilisateur</strong> @{userData.username}</div>
                                <div className="col-md-6"><strong className="d-block text-muted small">Email</strong> {userData.email || '—'}</div>
                                <div className="col-md-6"><strong className="d-block text-muted small">Téléphone</strong> {userData.phone_number || '—'}</div>
                                <div className="col-md-6"><strong className="d-block text-muted small">Ville</strong> {userData.city_detail?.name || '—'}</div>
                                <div className="col-12"><strong className="d-block text-muted small">Adresse</strong> {userData.address || '—'}</div>
                            </div>

                            {/* Si c'est un Patient */}
                            {userData.role === 'patient' && userData.patient_profile && (
                                <div className="mt-4 border-top pt-3">
                                    <h6 className="text-danger mb-3"><i className="bi bi-heart-pulse me-2"></i>Informations Médicales</h6>
                                    <div className="row g-3">
                                        <div className="col-md-4"><strong className="d-block text-muted small">Date de naissance</strong> {userData.patient_profile.date_of_birth || '—'}</div>
                                        <div className="col-md-4"><strong className="d-block text-muted small">Groupe Sanguin</strong> {userData.patient_profile.blood_type || '—'}</div>
                                        <div className="col-md-4"><strong className="d-block text-muted small">Genre</strong> {userData.patient_profile.gender === 'M' ? 'Homme' : userData.patient_profile.gender === 'F' ? 'Femme' : '—'}</div>
                                        <div className="col-md-4"><strong className="d-block text-muted small">Taille</strong> {userData.patient_profile.height ? `${userData.patient_profile.height} cm` : '—'}</div>
                                        <div className="col-md-4"><strong className="d-block text-muted small">Poids</strong> {userData.patient_profile.weight ? `${userData.patient_profile.weight} kg` : '—'}</div>
                                        <div className="col-12"><strong className="d-block text-muted small">Allergies</strong> {userData.patient_profile.allergies || 'Aucune'}</div>
                                        <div className="col-12"><strong className="d-block text-muted small">Maladies chroniques</strong> {userData.patient_profile.chronic_diseases || 'Aucune'}</div>
                                    </div>
                                </div>
                            )}

                            {/* Si c'est un Médecin */}
                            {userData.role === 'doctor' && userData.doctor_profile && (
                                <div className="mt-4 border-top pt-3">
                                    <h6 className="text-primary mb-3"><i className="bi bi-person-badge me-2"></i>Informations Professionnelles</h6>
                                    <div className="row g-3">
                                        <div className="col-md-6"><strong className="d-block text-muted small">Spécialité</strong> {userData.doctor_profile.specialty_name || '—'}</div>
                                        <div className="col-md-6"><strong className="d-block text-muted small">Numéro de licence</strong> {userData.doctor_profile.license_number || '—'}</div>
                                        <div className="col-md-6"><strong className="d-block text-muted small">Années d'expérience</strong> {userData.doctor_profile.years_experience ? `${userData.doctor_profile.years_experience} ans` : '—'}</div>
                                        <div className="col-md-6"><strong className="d-block text-muted small">Prix consultation</strong> {userData.doctor_profile.consultation_price ? `${userData.doctor_profile.consultation_price} TND` : '—'}</div>
                                        <div className="col-12"><strong className="d-block text-muted small">Biographie</strong> {userData.doctor_profile.bio || 'Aucune biographie'}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}