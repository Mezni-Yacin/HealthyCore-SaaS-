import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ROLE_CHOICES = [
  { value: 'super_admin', label: 'Super Admin', color: 'danger' },
  { value: 'admin', label: 'Administrateur', color: 'warning' },
  { value: 'doctor', label: 'Médecin', color: 'primary' },
  { value: 'lab_staff', label: 'Personnel Labo', color: 'info' },
  { value: 'patient', label: 'Patient', color: 'success' },
  { value: 'secretary', label: 'Secrétaire', color: 'secondary' },
  { value: 'pharmacist', label: 'Pharmacien', color: 'dark' },
];

const getRoleInfo = (role) => ROLE_CHOICES.find(r => r.value === role) || { label: role, color: 'secondary' };

export default function AccountRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/manage/', { params: { is_active: 'false', page_size: 50 } });
      setRequests(res.data.results || res.data || []);
    } catch (err) {
      console.error('Erreur:', err);
      setMessage({ type: 'danger', text: 'Erreur lors du chargement des demandes.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (userId) => {
    try {
      await api.post(`/users/manage/${userId}/activate/`);
      setMessage({ type: 'success', text: '✅ Compte accepté et activé ! Un email a été envoyé à l\'utilisateur.' });
      setShowDetailModal(false); 
      fetchRequests(); 
    } catch (err) {
      setMessage({ type: 'danger', text: 'Erreur lors de l\'activation.' });
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('⚠️ Refuser cette demande ? Le compte sera définitivement supprimé et un email de refus sera envoyé.')) return;
    try {
      await api.delete(`/users/manage/${userId}/`);
      setMessage({ type: 'success', text: '❌ Demande refusée. Un email a été envoyé à l\'utilisateur.' });
      setShowDetailModal(false);
      fetchRequests(); 
    } catch (err) {
      setMessage({ type: 'danger', text: 'Erreur lors de la suppression.' });
    }
  };

  const openDetailModal = async (userId) => {
    setLoadingDetail(true);
    setShowDetailModal(true);
    try {
      const res = await api.get(`/users/manage/${userId}/`);
      setDetailUser(res.data);
    } catch (err) {
      console.error('Erreur détails:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h3 fw-bold text-primary mb-1">
            <i className="bi bi-hourglass-split me-2"></i>
            Demandes d'inscription
          </h2>
          <p className="text-muted mb-0">Validez ou refusez les nouveaux comptes en attente de validation.</p>
        </div>
        <span className="badge bg-warning text-dark fs-6 px-3 py-2 rounded-pill">
          {requests.length} en attente
        </span>
      </div>

      {message && (
        <div className={`alert alert-${message.type} alert-dismissible fade show`}>
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="card border-0 shadow-sm text-center py-5">
          <i className="bi bi-check-circle-fill text-success display-1 mb-3"></i>
          <h4 className="text-muted">Aucune demande en attente</h4>
          <p className="text-muted">Tous les nouveaux comptes ont été traités.</p>
        </div>
      ) : (
        <div className="row g-4">
          {requests.map(user => {
            const roleInfo = getRoleInfo(user.role);
            return (
              <div key={user.id} className="col-md-6 col-lg-4">
                <div className="card border-0 shadow-sm h-100" style={{ borderTop: `4px solid var(--bs-${roleInfo.color})` }}>
                  <div className="card-body d-flex flex-column p-4">
                    <div className="d-flex align-items-center mb-3">
                      <div className={`bg-${roleInfo.color} bg-opacity-10 text-${roleInfo.color} rounded-circle d-flex align-items-center justify-content-center me-3`} style={{ width: '50px', height: '50px', fontSize: '1.2rem' }}>
                        <i className="bi bi-person-fill"></i>
                      </div>
                      <div>
                        <h5 className="mb-0">{user.first_name} {user.last_name}</h5>
                        <small className="text-muted">@{user.username}</small>
                      </div>
                    </div>

                    <ul className="list-unstyled mb-4 small">
                      <li className="mb-2"><i className="bi bi-envelope me-2 text-muted"></i> {user.email || 'Non renseigné'}</li>
                      <li className="mb-2"><i className="bi bi-telephone me-2 text-muted"></i> {user.phone_number || 'Non renseigné'}</li>
                      <li className="mb-2">
                        <i className="bi bi-person-badge me-2 text-muted"></i> 
                        <span className={`badge bg-${roleInfo.color}`}>{roleInfo.label}</span>
                      </li>
                      <li><i className="bi bi-calendar-event me-2 text-muted"></i> Demandé le {new Date(user.created_at).toLocaleDateString('fr-FR')}</li>
                    </ul>

                    <div className="d-flex gap-2 mt-auto">
                      <button 
                        className="btn btn-outline-primary flex-grow-1"
                        onClick={() => openDetailModal(user.id)}
                      >
                        <i className="bi bi-eye me-1"></i> Voir détails
                      </button>
                      <button 
                        className="btn btn-success"
                        onClick={() => handleAccept(user.id)}
                        title="Accepter"
                      >
                        <i className="bi bi-check-lg"></i>
                      </button>
                      <button 
                        className="btn btn-outline-danger"
                        onClick={() => handleReject(user.id)}
                        title="Refuser"
                      >
                        <i className="bi bi-x-lg"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════ MODALE DES DÉTAILS ══════════ */}
      {showDetailModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-person-vcard me-2"></i>
                  Détails de la demande
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetailModal(false)}></button>
              </div>
              <div className="modal-body">
                {loadingDetail || !detailUser ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary"></div>
                  </div>
                ) : (
                  <>
                    <h6 className="text-muted text-uppercase fw-bold mb-3 pb-2 border-bottom">Informations générales</h6>
                    <div className="row mb-4">
                      <div className="col-md-6 mb-2"><strong>Nom complet :</strong> {detailUser.first_name} {detailUser.last_name}</div>
                      <div className="col-md-6 mb-2"><strong>Email :</strong> {detailUser.email || '-'}</div>
                      <div className="col-md-6 mb-2"><strong>Téléphone :</strong> {detailUser.phone_number || '-'}</div>
                      <div className="col-md-6 mb-2"><strong>Rôle :</strong> <span className={`badge bg-${getRoleInfo(detailUser.role).color}`}>{getRoleInfo(detailUser.role).label}</span></div>
                      <div className="col-md-6 mb-2"><strong>Ville :</strong> {detailUser.city_detail?.name || '-'}</div>
                      <div className="col-12 mb-2"><strong>Adresse :</strong> {detailUser.address || '-'}</div>
                    </div>

                    {detailUser.role === 'patient' && detailUser.patient_profile && (
                      <>
                        <h6 className="text-muted text-uppercase fw-bold mb-3 pb-2 border-bottom">Informations médicales (Patient)</h6>
                        <div className="row mb-4">
                          <div className="col-md-6 mb-2"><strong>Date de naissance :</strong> {detailUser.patient_profile.date_of_birth || '-'}</div>
                          <div className="col-md-6 mb-2"><strong>Genre :</strong> {detailUser.patient_profile.gender === 'M' ? 'Homme' : detailUser.patient_profile.gender === 'F' ? 'Femme' : 'Autre'}</div>
                          <div className="col-md-6 mb-2"><strong>Groupe sanguin :</strong> {detailUser.patient_profile.blood_type || '-'}</div>
                          <div className="col-md-6 mb-2"><strong>Taille :</strong> {detailUser.patient_profile.height ? detailUser.patient_profile.height + ' cm' : '-'}</div>
                          <div className="col-md-6 mb-2"><strong>Poids :</strong> {detailUser.patient_profile.weight ? detailUser.patient_profile.weight + ' kg' : '-'}</div>
                          <div className="col-12 mb-2"><strong>Allergies :</strong> {detailUser.patient_profile.allergies || 'Aucune'}</div>
                          <div className="col-12 mb-2"><strong>Maladies chroniques :</strong> {detailUser.patient_profile.chronic_diseases || 'Aucune'}</div>
                        </div>
                      </>
                    )}

                    {detailUser.role === 'doctor' && detailUser.doctor_profile && (
                      <>
                        <h6 className="text-muted text-uppercase fw-bold mb-3 pb-2 border-bottom">Informations professionnelles (Médecin)</h6>
                        <div className="row mb-4">
                          <div className="col-md-6 mb-2"><strong>Spécialité :</strong> {detailUser.doctor_profile.specialty_name || '-'}</div>
                          <div className="col-md-6 mb-2"><strong>Numéro de licence :</strong> {detailUser.doctor_profile.license_number || '-'}</div>
                          <div className="col-md-6 mb-2"><strong>Années d'expérience :</strong> {detailUser.doctor_profile.years_experience || '0'} ans</div>
                        </div>
                      </>
                    )}

                    <div className="d-flex gap-2 mt-4 border-top pt-3">
                      <button 
                        className="btn btn-success btn-lg w-100"
                        onClick={() => handleAccept(detailUser.id)}
                      >
                        <i className="bi bi-check-lg me-1"></i> Accepter et Activer
                      </button>
                      <button 
                        className="btn btn-outline-danger btn-lg"
                        onClick={() => handleReject(detailUser.id)}
                      >
                        <i className="bi bi-x-lg me-1"></i> Refuser
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}