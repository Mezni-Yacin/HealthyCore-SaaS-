// src/pages/Dashboard.jsx
import { useAuth } from '../context/AuthContext';
import * as Dashboards from '../dashboards';

const roleToDashboard = {
  'super_admin': Dashboards.SuperAdminDashboard,
  'admin':       Dashboards.AdminDashboard,
  'doctor':      Dashboards.DoctorDashboard,
  'secretary':   Dashboards.SecretaryDashboard,
  'patient':     Dashboards.PatientDashboard,
  'lab_staff':   Dashboards.LabStaffDashboard,
  'pharmacist':  Dashboards.PharmacistDashboard,
};

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="text-muted">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.role) {
    return (
      <div className="container my-5">
        <div className="alert alert-danger text-center">
          <h4>Rôle non détecté</h4>
          <p>Veuillez vous reconnecter.</p>
        </div>
      </div>
    );
  }

  const DashboardComponent = roleToDashboard[user.role];

  if (!DashboardComponent) {
    return (
      <div className="container my-5">
        <div className="alert alert-warning text-center">
          <h4>Rôle non géré : {user.role}</h4>
          <p>Contactez l'administrateur.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 py-md-5">
      <div className="mb-4">
        <h1 className="display-5 fw-bold">
          Bienvenue{user.first_name ? `, ${user.first_name}` : ''} !
        </h1>
        <p className="lead text-muted">
          {user.role === 'super_admin' ? 'Super Administrateur' :
           user.role === 'lab_staff'   ? 'Personnel de Laboratoire' :
           user.role === 'pharmacist'  ? 'Pharmacien' :
           user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </p>
      </div>

      <DashboardComponent />
    </div>
  );
}