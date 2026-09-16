// src/App.jsx
// VERSION FINALE — Toutes les routes organisées par rôle

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/auth/Login';
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
import SuperAdminLabs from './pages/Super_admin/SuperAdminLabs';
import SuperAdminLabTests from './pages/Super_admin/SuperAdminLabTests';
import SuperAdminLabRequests from './pages/Super_admin/SuperAdminLabRequests';
import PublicProfile from './pages/PublicProfile';
import PharmacistCommande from './pages/Pharmacy/PharmacistCommande'; 


// Doctor
import DoctorMedicalRecords from './pages/Doctor/DoctorMedicalRecords';
import DoctorMedicalRecordDetail from './pages/Doctor/DoctorMedicalRecordDetail';
import DoctorSchedule from './pages/Doctor/DoctorSchedule';
import DoctorSecretaries from './pages/Doctor/DoctorSecretaries';
import DoctorAppointments from './pages/Doctor/DoctorAppointments';
import DoctorAppointmentDetail from './pages/Doctor/DoctorAppointmentDetail';
import DoctorLab from './pages/Doctor/DoctorLab';
import DoctorPrescriptions from './pages/Doctor/DoctorPrescriptions';

// Patient
import PatientMedicalRecords from './pages/Patient/PatientMedicalRecords';
import PatientMedicalRecordDetail from './pages/Patient/PatientMedicalRecordDetail';
import PatientAppointments from './pages/Patient/PatientAppointments';
import PatientAppointmentDetail from './pages/Patient/PatientAppointmentDetail';
import PatientLab from './pages/Patient/PatientLab';
import PatientPharmacy from './pages/Patient/PatientPharmacy';
// Secretary
import SecretaryMedicalRecords from './pages/Secretary/SecretaryMedicalRecords';
import SecretaryMedicalRecordDetail from './pages/Secretary/SecretaryMedicalRecordDetail';
import SecretaryAppointments from './pages/Secretary/SecretaryAppointments';
import SecretaryAppointmentDetail from './pages/Secretary/SecretaryAppointmentDetail';
import SecretaryCabinets from './pages/Secretary/SecretaryCabinets';
import SecretaryCabinetEdit from './pages/Secretary/SecretaryCabinetEdit';

// Laboratoire (Lab Staff)
import LabWorkflowTab from './pages/lab-staff/LabWorkflowTab'; 
import LabCatalogTab from './pages/lab-staff/LabCatalogTab';   
import LabSettingsTab from './pages/lab-staff/LabSettingsTab';
import LabProfile from './pages/Cabinet/LabProfile'; 
// Cabinet
import CabinetDirectory from './pages/Cabinet/CabinetDirectory';
import CabinetProfile from './pages/Cabinet/CabinetProfile';

// Chat
import ChatPage from './pages/Chat/ChatPage';
import MessagesPage from './pages/Chat/MessagesPage';
import PatientPayments from './pages/Patient/PatientPayments'; 

// Pharmacien
import PharmacistPOS from './pages/Pharmacy/PharmacistPOS';
import PharmacistStock from './pages/Pharmacy/PharmacistStock';
import PharmacistPrescriptions from './pages/Pharmacy/PharmacistPrescriptions';
import PharmacistSales from './pages/Pharmacy/PharmacistSales';
import PharmacyProfile from './pages/Pharmacy/PharmacyProfile';
// Chatbot IA
import MedicalChatbot from './components/MedicalChatbot'; 
import PublicPharmacyProfile from './pages/Cabinet/PublicPharmacyProfile';

import HomePage from './pages/HomePage';

import DoctorWaitingQueue from './pages/Doctor/DoctorWaitingQueue';
import PatientWaitingQueue from './pages/Patient/PatientWaitingQueue';
import SecretaryWaitingQueue from './pages/Secretary/SecretaryWaitingQueue';

import SuperAdminInvoices from './pages/Super_admin/SuperAdminInvoices';
import DoctorInvoices from './pages/Doctor/DoctorInvoices';
import SecretaryInvoices from './pages/Secretary/SecretaryInvoices';
import PatientInvoices from './pages/Patient/PatientInvoices';
import Register from './pages/auth/Register';
import AccountRequests from './pages/Super_admin/AccountRequests';


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
          <Route path="/register/:role" element={<Register />} />
          <Route path="/user/:id" element={<PublicProfile />} />


          {/* Pages protégées */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              {/* ====================== COMMUN ====================== */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              

              <Route path="/chat/:cabinetId" element={<ChatPage />} />
              <Route path="/pharmacy-profile/:id" element={<PublicPharmacyProfile />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/chat/direct/:conversationId" element={<ChatPage type="direct" />} />

              {/* ====================== PROFIL CABINET PUBLIC ====================== */}
              <Route path="/cabinet-profile/:id" element={<CabinetProfile />} />
              <Route path="/lab-profile/:id" element={<LabProfile />} />
              
              {/* ====================== PATIENT ====================== */}
              <Route path="/patient-records" element={<PatientMedicalRecords />} />
              <Route path="/patient-records/:id" element={<PatientMedicalRecordDetail />} />
              <Route path="/my-appointments" element={<PatientAppointments />} />
              <Route path="/my-appointments/:id" element={<PatientAppointmentDetail />} />
              <Route path="/patient-invoices" element={<PatientInvoices />} />
              <Route path="/patient-lab" element={<PatientLab />} />
              <Route path="/patient-pharmacy" element={<PatientPharmacy />} />
              <Route path="/patient/payments" element={<PatientPayments />} />

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
              <Route path="/doctor-prescriptions" element={<DoctorPrescriptions />} />

              {/* ====================== LABORATOIRE (Lab Staff) ====================== */}
              <Route path="/lab-staff/workflow" element={<LabWorkflowTab />} />
              <Route path="/lab-staff/catalog" element={<LabCatalogTab />} />
              <Route path="/lab-staff/settings" element={<LabSettingsTab />} />
            {/* ====================== PHARMACIEN ====================== */}
            <Route path="/pharmacy-pos" element={<PharmacistPOS />} />
            <Route path="/pharmacy-stock" element={<PharmacistStock />} />
            <Route path="/pharmacy-prescriptions" element={<PharmacistPrescriptions />} />
            <Route path="/pharmacy-sales" element={<PharmacistSales />} />
            <Route path="/pharmacy-profile" element={<PharmacyProfile />} />
             <Route path="/pharmacy-orders" element={<PharmacistCommande />} />

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
              <Route path="/admin-labs" element={<SuperAdminLabs />} />
              <Route path="/admin-lab-tests" element={<SuperAdminLabTests />} />
              <Route path="/account-requests" element={<AccountRequests />} /> 

              <Route path="/admin-lab-requests" element={<SuperAdminLabRequests />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>

          {/* 404 global */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>

      {/* ====================== WIDGET CHATBOT IA ====================== */}
      <div className="position-fixed bottom-0 end-0 p-3" style={{ width: '350px', zIndex: 1050 }}>
        <MedicalChatbot />
      </div>

    </AuthProvider>
  );
}

export default App;