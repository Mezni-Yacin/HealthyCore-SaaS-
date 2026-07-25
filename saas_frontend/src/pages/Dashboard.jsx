// src/pages/Dashboard.jsx
// VERSION CORRIGÉE - Routeur de Dashboard par rôle

import React from 'react';
import { useAuth } from '../context/AuthContext';

// Import des dashboards par rôle
import SuperAdminDashboard from '../dashboards/SuperAdminDashboard';
import AdminDashboard from '../dashboards/AdminDashboard';
import DoctorDashboard from '../dashboards/DoctorDashboard';
import SecretaryDashboard from '../dashboards/SecretaryDashboard';
import PatientDashboard from '../dashboards/PatientDashboard';
import LabStaffDashboard from '../dashboards/LabStaffDashboard';
import PharmacistDashboard from '../dashboards/PharmacistDashboard';

// Mapping rôle -> Dashboard component
const roleToDashboard = {
  'super_admin': SuperAdminDashboard,
  'admin': AdminDashboard,
  'doctor': DoctorDashboard,
  'secretary': SecretaryDashboard,
  'patient': PatientDashboard,
  'lab_staff': LabStaffDashboard,
  'pharmacist': PharmacistDashboard,
};

// Labels pour l'affichage
const roleLabels = {
  'super_admin': 'Super Administrateur',
  'admin': 'Administrateur',
  'doctor': 'Médecin',
  'secretary': 'Secrétaire',
  'patient': 'Patient',
  'lab_staff': 'Personnel de Laboratoire',
  'pharmacist': 'Pharmacien',
};

// Icônes par rôle
const roleIcons = {
  'super_admin': 'bi-shield-fill-check',
  'admin': 'bi-building',
  'doctor': 'bi-activity',
  'secretary': 'bi-calendar-check',
  'patient': 'bi-person-fill',
  'lab_staff': 'bi-clipboard2-pulse',
  'pharmacist': 'bi-capsule',
};

// Dashboard par défaut pour les rôles non gérés
const DefaultDashboard = ({ role }) => (
  <div className="container-fluid py-4">
    <div className="card border-0 shadow-sm">
      <div className="card-body text-center py-5">
        <i className={`bi ${roleIcons[role] || 'bi-person'} display-1 text-muted mb-4 d-block`}></i>
        <h3 className="text-muted">Dashboard en cours de développement</h3>
        <p className="text-muted mb-0">
          Le tableau de bord pour le rôle <strong>"{roleLabels[role] || role}"</strong> sera bientôt disponible.
        </p>
      </div>
    </div>
  </div>
);

// Composant de chargement
const LoadingScreen = () => (
  <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
    <div className="text-center">
      <div className="position-relative mb-4" style={{ width: 80, height: 80, margin: '0 auto' }}>
        <div className="spinner-border text-primary" style={{ width: 80, height: 80 }} role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <div className="position-absolute top-50 start-50 translate-middle">
          <i className="bi bi-heart-pulse-fill text-primary fs-4"></i>
        </div>
      </div>
      <h5 className="text-muted mb-2">Chargement de votre espace</h5>
      <p className="text-muted small mb-0">Veuillez patienter...</p>
    </div>
  </div>
);

// Composant d'erreur
const ErrorScreen = ({ message, onRetry }) => (
  <div className="container-fluid py-5">
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-4">
        <div className="card border-0 shadow-sm text-center">
          <div className="card-body py-5">
            <div className="rounded-circle bg-danger bg-opacity-10 d-flex align-items-center justify-content-center mx-auto mb-4" style={{ width: 80, height: 80 }}>
              <i className="bi bi-exclamation-triangle-fill text-danger fs-1"></i>
            </div>
            <h4 className="text-danger mb-3">Erreur de chargement</h4>
            <p className="text-muted mb-4">{message}</p>
            {onRetry && (
              <button className="btn btn-primary" onClick={onRetry}>
                <i className="bi bi-arrow-clockwise me-2"></i>
                Réessayer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { user, loading, error } = useAuth();

  // État de chargement
  if (loading) {
    return <LoadingScreen />;
  }

  // Erreur d'authentification
  if (error) {
    return <ErrorScreen message={error} />;
  }

  // Utilisateur non connecté
  if (!user) {
    return (
      <ErrorScreen 
        message="Session expirée. Veuillez vous reconnecter."
        onRetry={() => window.location.href = '/login'}
      />
    );
  }

  // Récupérer le composant Dashboard approprié
  const DashboardComponent = roleToDashboard[user.role];
  const roleLabel = roleLabels[user.role] || user.role;
  const roleIcon = roleIcons[user.role] || 'bi-person';

  // Rôle non géré - afficher le dashboard par défaut
  if (!DashboardComponent) {
    return (
      <div className="container-fluid py-4">
        {/* En-tête */}
        <div className="alert alert-warning alert-dismissible fade show d-flex align-items-center mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-3 fs-4"></i>
          <div>
            <strong>Rôle non configuré :</strong> Le tableau de bord pour "{roleLabel}" n'est pas encore disponible.
          </div>
        </div>
        
        <DefaultDashboard role={user.role} />
      </div>
    );
  }

  // Dashboard normal
  return (
    <div className="container-fluid">
      {/* Breadcrumb / Fil d'Ariane */}
      <nav aria-label="breadcrumb" className="py-2 mb-3">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item">
            <a href="/" className="text-decoration-none text-muted">
              <i className="bi bi-house-door me-1"></i>
              Accueil
            </a>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {roleLabel}
          </li>
        </ol>
      </nav>

      {/* Barre de bienvenue compacte */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div className="d-flex align-items-center">
          <div 
            className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center me-3"
            style={{ width: 48, height: 48 }}
          >
            <i className={`bi ${roleIcon} text-primary fs-4`}></i>
          </div>
          <div>
            <h1 className="h4 mb-0 fw-bold">
              Bienvenue, {user.first_name || user.username} !
            </h1>
            <p className="text-muted mb-0 small">
              <i className="bi bi-person-badge me-1"></i>
              {roleLabel}
              {user.email && (
                <>
                  <span className="mx-2">•</span>
                  <i className="bi bi-envelope me-1"></i>
                  {user.email}
                </>
              )}
            </p>
          </div>
        </div>
        
        <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
          <span className="badge bg-success-subtle text-success">
            <i className="bi bi-circle-fill me-1" style={{ fontSize: 8 }}></i>
            En ligne
          </span>
          <small className="text-muted d-none d-md-block">
            {new Date().toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </small>
        </div>
      </div>

      {/* Dashboard spécifique au rôle */}
      <DashboardComponent user={user} />
    </div>
  );
}