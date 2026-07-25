// src/App.jsx
// VERSION FINALE — Toutes les routes organisées par rôle

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

// Super admin
import UsersManagement from './pages/Super_admin/UsersManagement';
import GovernoratesManagement from './pages/Super_admin/GovernoratesManagement';
import CitiesManagement from './pages/Super_admin/CitiesManagement';
import CabinetsManagement from './pages/Super_admin/CabinetsManagement';
import DoctorCabinets from './pages/Doctor/DoctorCabinets';
import DoctorsManagement from './pages/Super_admin/DoctorsManagement';
import PlansManagement from './pages/Super_admin/PlansManagement';
import SpecialtiesManagement from './pages/Super_admin/SpecialtiesManagement';
import SubscriptionsManagement from './pages/Super_admin/SubscriptionsManagement';

// Doctor
import DoctorMedicalRecords from './pages/Doctor/DoctorMedicalRecords';
import DoctorMedicalRecordDetail from './pages/Doctor/DoctorMedicalRecordDetail';
import DoctorSchedule from './pages/Doctor/DoctorSchedule';
import DoctorSecretaries from './pages/Doctor/DoctorSecretaries';
import DoctorAppointments from './pages/Doctor/DoctorAppointments';
import DoctorAppointmentDetail from './pages/Doctor/DoctorAppointmentDetail';
import DoctorLab from './pages/DoctorLab';

// Patient
import PatientMedicalRecords from './pages/Patient/PatientMedicalRecords';
import PatientMedicalRecordDetail from './pages/Patient/PatientMedicalRecordDetail';
import PatientAppointments from './pages/Patient/PatientAppointments';
import PatientAppointmentDetail from './pages/Patient/PatientAppointmentDetail';
import PatientLab from './pages/PatientLab';

// Secretary
import SecretaryMedicalRecords from './pages/Secretary/SecretaryMedicalRecords';
import SecretaryMedicalRecordDetail from './pages/Secretary/SecretaryMedicalRecordDetail';
import SecretaryAppointments from './pages/Secretary/SecretaryAppointments';
import SecretaryAppointmentDetail from './pages/Secretary/SecretaryAppointmentDetail';
import SecretaryCabinets from './pages/Secretary/SecretaryCabinets';
import SecretaryCabinetEdit from './pages/Secretary/SecretaryCabinetEdit';

// Laboratoire (Lab Staff)
import LabStaffLab from './pages/LabStaffLab';

// Cabinet
import CabinetDirectory from './pages/Cabinet/CabinetDirectory';
import CabinetProfile from './pages/Cabinet/CabinetProfile';

// Chat
import ChatPage from './pages/Chat/ChatPage';
import MessagesPage from './pages/Chat/MessagesPage';

import HomePage from './pages/HomePage';

import DoctorWaitingQueue from './pages/DoctorWaitingQueue';
import PatientWaitingQueue from './pages/PatientWaitingQueue';
import SecretaryWaitingQueue from './pages/SecretaryWaitingQueue';

import SuperAdminInvoices from './pages/SuperAdminInvoices';
import DoctorInvoices from './pages/DoctorInvoices';
import SecretaryInvoices from './pages/SecretaryInvoices';
import PatientInvoices from './pages/PatientInvoices';

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
          {/* Pages publiques */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />

          {/* Pages protégées */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              {/* ====================== COMMUN ====================== */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />

              <Route path="/chat/:cabinetId" element={<ChatPage />} />
              <Route path="/messages" element={<MessagesPage />} />

              {/* ====================== PROFIL CABINET PUBLIC ====================== */}
              <Route path="/cabinet-profile/:id" element={<CabinetProfile />} />
              
              {/* ====================== PATIENT ====================== */}
              <Route path="/patient-records" element={<PatientMedicalRecords />} />
              <Route path="/patient-records/:id" element={<PatientMedicalRecordDetail />} />
              <Route path="/my-appointments" element={<PatientAppointments />} />
              <Route path="/my-appointments/:id" element={<PatientAppointmentDetail />} />
              <Route path="/patient-invoices" element={<PatientInvoices />} />
              <Route path="/patient-lab" element={<PatientLab />} />

              {/* ====================== SECRÉTAIRE ====================== */}
              <Route path="/secretary-cabinets" element={<SecretaryCabinets />} />
              <Route path="/secretary-cabinets/:id" element={<SecretaryCabinetEdit />} />
              <Route path="/secretary-records" element={<SecretaryMedicalRecords />} />
              <Route path="/secretary-records/:id" element={<SecretaryMedicalRecordDetail />} />
              <Route path="/appointments/secretary" element={<SecretaryAppointments />} />
              <Route path="/appointments/secretary/:id" element={<SecretaryAppointmentDetail />} />
              <Route path="/secretary-invoices" element={<SecretaryInvoices />} />

              {/* ====================== MÉDECIN (propriétaire) ====================== */}
              <Route path="/cabinet-directory" element={<CabinetDirectory />} />
              <Route path="/my-secretaries" element={<DoctorSecretaries />} />
              <Route path="/my-schedule" element={<DoctorSchedule />} />
              <Route path="/my-cabinets" element={<DoctorCabinets />} />
              <Route path="/medical-records" element={<DoctorMedicalRecords />} />
              <Route path="/medical-records/:id" element={<DoctorMedicalRecordDetail />} />
              <Route path="/appointments" element={<DoctorAppointments />} />
              <Route path="/appointments/doctor" element={<DoctorAppointments />} />
              <Route path="/appointments/doctor/:id" element={<DoctorAppointmentDetail />} />
              <Route path="/doctor-invoices" element={<DoctorInvoices />} />
              <Route path="/lab-doctor" element={<DoctorLab />} />

              {/* ====================== LABORATOIRE (Lab Staff) ====================== */}
              <Route path="/lab-staff" element={<LabStaffLab />} />

              {/* ====================== FILE D'ATTENTE ====================== */}
              <Route path="/waiting-queue" element={<DoctorWaitingQueue />} />
              <Route path="/patient-queue" element={<PatientWaitingQueue />} />
              <Route path="/secretary-queue" element={<SecretaryWaitingQueue />} />

              {/* ====================== SUPER ADMIN ====================== */}
              <Route path="/users" element={<UsersManagement />} />
              <Route path="/doctors" element={<DoctorsManagement />} />
              <Route path="/specialties" element={<SpecialtiesManagement />} />
              <Route path="/cabinets" element={<CabinetsManagement />} />
              <Route path="/cities" element={<CitiesManagement />} />
              <Route path="/governorates" element={<GovernoratesManagement />} />
              <Route path="/plans" element={<PlansManagement />} />
              <Route path="/subscriptions" element={<SubscriptionsManagement />} />
              <Route path="/invoices-management" element={<SuperAdminInvoices />} />

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