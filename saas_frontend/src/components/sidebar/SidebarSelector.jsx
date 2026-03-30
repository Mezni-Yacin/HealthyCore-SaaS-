// components/sidebar/SidebarSelector.jsx
import { useAuth } from '../../context/AuthContext';

import SidebarSuperAdmin   from './SidebarSuperAdmin';
import SidebarAdmin         from './SidebarAdmin';
import SidebarDoctor        from './SidebarDoctor';
import SidebarSecretary     from './SidebarSecretary';
import SidebarPatient       from './SidebarPatient';
import SidebarLabStaff      from './SidebarLabStaff';
import SidebarPharmacist    from './SidebarPharmacist';

const roleToSidebar = {
  'super_admin': SidebarSuperAdmin,
  'admin':       SidebarAdmin,
  'doctor':      SidebarDoctor,
  'secretary':   SidebarSecretary,
  'patient':     SidebarPatient,
  'lab_staff':   SidebarLabStaff,
  'pharmacist':  SidebarPharmacist,
};

export default function SidebarSelector() {
  const { user, loading } = useAuth();

  if (loading || !user?.role) {
    return (
      <div className="w-64 bg-gray-800 text-white flex flex-col h-screen">
        <div className="p-6">Chargement...</div>
      </div>
    );
  }

  const SidebarComponent = roleToSidebar[user.role];

  if (!SidebarComponent) {
    return (
      <div className="w-64 bg-gray-800 text-white flex flex-col h-screen p-6">
        <div className="text-red-400">Menu non disponible pour ce rôle</div>
      </div>
    );
  }

  return <SidebarComponent />;
}