import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ── Config ─────────────────────────────────────────────────────────────────
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

const getInitials = (first, last, username) => {
  const initials = `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
  return initials || username?.[0]?.toUpperCase() || '?';
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ── Composant principal ────────────────────────────────────────────────────
export default function AccountRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  // ── Fetch Données ────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/manage/', { params: { is_active: 'false', page_size: 50 } });
      setRequests(res.data.results || res.data || []);
    } catch (err) {
      setMessage("Erreur lors du chargement des demandes.");
      setMessageType('danger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleAccept = async (userId) => {
    try {
      await api.post(`/users/manage/${userId}/activate/`);
      setMessage("Compte accepté et activé avec succès. Un email a été envoyé à l'utilisateur.");
      setMessageType('success');
      setShowDetailModal(false); 
      fetchRequests(); 
    } catch (err) {
      setMessage("Erreur lors de l'activation du compte.");
      setMessageType('danger');
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Refuser cette demande ? Le compte sera définitivement supprimé et un email de refus sera envoyé.')) return;
    try {
      await api.delete(`/users/manage/${userId}/`);
      setMessage("Demande refusée. Un email a été envoyé à l'utilisateur.");
      setMessageType('success');
      setShowDetailModal(false);
      fetchRequests(); 
    } catch (err) {
      setMessage("Erreur lors de la suppression de la demande.");
      setMessageType('danger');
    }
  };

  const openDetailModal = async (userId) => {
    setLoadingDetail(true);
    setDetailUser(null);
    setShowDetailModal(true);
    try {
      const res = await api.get(`/users/manage/${userId}/`);
      setDetailUser(res.data);
    } catch (err) {
      setMessage("Erreur lors du chargement des détails.");
      setMessageType('danger');
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">
            <i className="bi bi-hourglass-split me-2 text-warning"></i>
            Demandes d'inscription
          </h2>
          <p className="text-muted mb-0">Validez ou refusez les nouveaux comptes en attente.</p>
        </div>
        <span className="badge bg-warning bg-opacity-10 text-warning fs-6 px-3 py-2 rounded-pill">
          {requests.length} en attente
        </span>
      </div>

      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">Chargement des demandes...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="card border-0 shadow-sm text-center py-5">
          <i className="bi bi-check-circle-fill text-success display-1 mb-3"></i>
          <h4 className="text-muted">Aucune demande en attente</h4>
          <p className="text-muted mb-0">Tous les nouveaux comptes ont été traités.</p>
        </div>
      ) : (
        <div className="row g-4">
          {requests.map(user => {
            const roleInfo = getRoleInfo(user.role);
            return (
              <div key={user.id} className="col-md-6 col-xl-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body d-flex flex-column p-4">
                    <div className="d-flex align-items-center mb-3">
                      <div className={`bg-${roleInfo.color} bg-opacity-10 text-${roleInfo.color} rounded-circle d-flex align-items-center justify-content-center me-3 fw-bold`} style={{ width: '50px', height: '50px', fontSize: '1.2rem' }}>
                        {getInitials(user.first_name, user.last_name, user.username)}
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="mb-0 text-truncate">{user.first_name} {user.last_name}</h5>
                        <small className="text-muted d-block text-truncate">@{user.username}</small>
                      </div>
                      <span className={`badge bg-${roleInfo.color} bg-opacity-10 text-${roleInfo.color} ms-2`}>{roleInfo.label}</span>
                    </div>

                    <ul className="list-unstyled mb-4 small text-muted">
                      <li className="mb-2 d-flex align-items-center">
                        <i className="bi bi-envelope me-2"></i> 
                        <span className="text-truncate">{user.email || 'Non renseigné'}</span>
                      </li>
                      <li className="mb-2 d-flex align-items-center">
                        <i className="bi bi-telephone me-2"></i> 
                        <span>{user.phone_number || 'Non renseigné'}</span>
                      </li>
                      <li className="d-flex align-items-center">
                        <i className="bi bi-calendar-event me-2"></i> 
                        <span>Demandé le {formatDate(user.created_at)}</span>
                      </li>
                    </ul>

                    <div className="d-flex gap-2 mt-auto">
                      <button className="btn btn-outline-primary btn-sm flex-grow-1" onClick={() => openDetailModal(user.id)}>
                        <i className="bi bi-eye me-1"></i> Détails
                      </button>
                      <button className="btn btn-success btn-sm" onClick={() => handleAccept(user.id)} title="Accepter">
                        <i className="bi bi-check-lg"></i>
                      </button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleReject(user.id)} title="Refuser">
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
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setShowDetailModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-person-vcard me-2"></i>
                  Détails de la demande
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetailModal(false)}></button>
              </div>
              <div className="modal-body p-4" style={{ maxHeight: '70vh' }}>
                {loadingDetail || !detailUser ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status" />
                  </div>
                ) : (
                  <>
                    {/* Profil Header */}
                    <div className="d-flex align-items-center mb-4 p-3 bg-light rounded-3">
                      <div className={`bg-${getRoleInfo(detailUser.role).color} bg-opacity-10 text-${getRoleInfo(detailUser.role).color} rounded-circle d-flex align-items-center justify-content-center me-3 fw-bold fs-4`} style={{ width: '60px', height: '60px' }}>
                        {getInitials(detailUser.first_name, detailUser.last_name, detailUser.username)}
                      </div>
                      <div>
                        <h4 className="mb-0">{detailUser.first_name} {detailUser.last_name}</h4>
                        <small className="text-muted">@{detailUser.username}</small>
                        <div><span className={`badge bg-${getRoleInfo(detailUser.role).color} bg-opacity-10 text-${getRoleInfo(detailUser.role).color}`}>{getRoleInfo(detailUser.role).label}</span></div>
                      </div>
                    </div>

                    {/* Infos Générales */}
                    <h6 className="text-uppercase text-muted fw-bold small mb-3 pb-2 border-bottom">Informations générales</h6>
                    <div className="row mb-4">
                      <div className="col-md-6 mb-3"><small className="text-muted d-block">Email</small><span className="fw-semibold">{detailUser.email || '—'}</span></div>
                      <div className="col-md-6 mb-3"><small className="text-muted d-block">Téléphone</small><span className="fw-semibold">{detailUser.phone_number || '—'}</span></div>
                      <div className="col-md-6 mb-3"><small className="text-muted d-block">Ville</small><span className="fw-semibold">{detailUser.city_detail?.name || '—'}</span></div>
                      <div className="col-12 mb-3"><small className="text-muted d-block">Adresse</small><span className="fw-semibold">{detailUser.address || '—'}</span></div>
                    </div>

                    {/* Infos Patient */}
                    {detailUser.role === 'patient' && detailUser.patient_profile && (
                      <>
                        <h6 className="text-uppercase text-muted fw-bold small mb-3 pb-2 border-bottom">Informations médicales (Patient)</h6>
                        <div className="row mb-4">
                          <div className="col-md-6 mb-3"><small className="text-muted d-block">Date de naissance</small><span className="fw-semibold">{formatDate(detailUser.patient_profile.date_of_birth)}</span></div>
                          <div className="col-md-6 mb-3"><small className="text-muted d-block">Genre</small><span className="fw-semibold">{detailUser.patient_profile.gender === 'M' ? 'Homme' : detailUser.patient_profile.gender === 'F' ? 'Femme' : 'Autre'}</span></div>
                          <div className="col-md-6 mb-3"><small className="text-muted d-block">Groupe sanguin</small><span className="fw-semibold">{detailUser.patient_profile.blood_type || '—'}</span></div>
                          <div className="col-md-6 mb-3"><small className="text-muted d-block">Taille / Poids</small><span className="fw-semibold">{detailUser.patient_profile.height ? detailUser.patient_profile.height + ' cm' : '—'} / {detailUser.patient_profile.weight ? detailUser.patient_profile.weight + ' kg' : '—'}</span></div>
                          <div className="col-12 mb-3"><small className="text-muted d-block">Allergies</small><span className="fw-semibold">{detailUser.patient_profile.allergies || 'Aucune'}</span></div>
                          <div className="col-12 mb-3"><small className="text-muted d-block">Maladies chroniques</small><span className="fw-semibold">{detailUser.patient_profile.chronic_diseases || 'Aucune'}</span></div>
                        </div>
                      </>
                    )}

                    {/* Infos Médecin */}
                    {detailUser.role === 'doctor' && detailUser.doctor_profile && (
                      <>
                        <h6 className="text-uppercase text-muted fw-bold small mb-3 pb-2 border-bottom">Informations professionnelles (Médecin)</h6>
                        <div className="row mb-4">
                          <div className="col-md-6 mb-3"><small className="text-muted d-block">Spécialité</small><span className="fw-semibold">{detailUser.doctor_profile.specialty_name || '—'}</span></div>
                          <div className="col-md-6 mb-3"><small className="text-muted d-block">Numéro de licence</small><span className="fw-semibold">{detailUser.doctor_profile.license_number || '—'}</span></div>
                          <div className="col-md-6 mb-3"><small className="text-muted d-block">Années d'expérience</small><span className="fw-semibold">{detailUser.doctor_profile.years_experience || '0'} ans</span></div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer bg-light border-top-0">
                <button className="btn btn-outline-secondary" onClick={() => setShowDetailModal(false)}>
                  Fermer
                </button>
                <button className="btn btn-outline-danger" onClick={() => handleReject(detailUser?.id)} disabled={loadingDetail || !detailUser}>
                  <i className="bi bi-x-lg me-1"></i> Refuser
                </button>
                <button className="btn btn-success" onClick={() => handleAccept(detailUser?.id)} disabled={loadingDetail || !detailUser}>
                  <i className="bi bi-check-lg me-1"></i> Accepter et Activer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}