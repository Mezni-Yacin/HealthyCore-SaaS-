// src/App.jsx
// VERSION FINALE — Toutes les routes organisées par rôle

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import UsersManagement from './pages/Super_admin/UsersManagement';
import GovernoratesManagement from './pages/Super_admin/GovernoratesManagement';
import CitiesManagement from './pages/Super_admin/CitiesManagement';
import CabinetsManagement from './pages/Super_admin/CabinetsManagement';
import DoctorCabinets from './pages/Doctor/DoctorCabinets';
import DoctorSchedule from './pages/Doctor/DoctorSchedule';
import CabinetDirectory from './pages/CabinetDirectory';
import DoctorSecretaries from './pages/Doctor/DoctorSecretaries';
import DoctorsManagement from './pages/Super_admin/DoctorsManagement';
import PlansManagement from './pages/Super_admin/PlansManagement';
import SpecialtiesManagement from './pages/Super_admin/SpecialtiesManagement';
import SubscriptionsManagement from './pages/Super_admin/SubscriptionsManagement';

function NotFound() {
  return (
    <div className="container my-5 text-center">
      <h1 className="display-1 fw-bold text-danger">404</h1>
      <h2>Page non trouvée</h2>
      <p className="lead text-muted">La page que vous cherchez n'existe pas.</p>
      <a href="/" className="btn btn-primary mt-3">Retour à l'accueil</a>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Page publique */}
          <Route path="/login" element={<Login />} />

          {/* Pages protégées */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              {/* ====================== COMMUN ====================== */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />

              {/* ====================== MÉDECIN (propriétaire) ====================== */}
              <Route path="/cabinet-directory" element={<CabinetDirectory />} />
              <Route path="/my-secretaries" element={<DoctorSecretaries />} />
              <Route path="/my-schedule" element={<DoctorSchedule />} />
              <Route path="/my-cabinets" element={<DoctorCabinets />} />

              {/* ====================== SUPER ADMIN ====================== */}
              <Route path="/users" element={<UsersManagement />} />
              <Route path="/doctors" element={<DoctorsManagement />} />
              <Route path="/specialties" element={<SpecialtiesManagement />} />
              <Route path="/cabinets" element={<CabinetsManagement />} />
              <Route path="/cities" element={<CitiesManagement />} />
              <Route path="/governorates" element={<GovernoratesManagement />} />
              <Route path="/plans" element={<PlansManagement />} />
              <Route path="/subscriptions" element={<SubscriptionsManagement />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>

          {/* 404 global */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;