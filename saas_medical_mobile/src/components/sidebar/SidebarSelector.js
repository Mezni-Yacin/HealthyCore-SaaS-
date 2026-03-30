// src/components/sidebar/SidebarSelector.js
import React from 'react';
import { useAuth } from '../../context/AuthContext';

import SidebarSuperAdmin from './SidebarSuperAdmin';
import SidebarAdmin from './SidebarAdmin';
import SidebarDoctor from './SidebarDoctor';
import SidebarSecretary from './SidebarSecretary';
import SidebarPatient from './SidebarPatient';
import SidebarLabStaff from './SidebarLabStaff';
import SidebarPharmacist from './SidebarPharmacist';

const roleToSidebar = {
  super_admin: SidebarSuperAdmin,
  admin:       SidebarAdmin,
  doctor:      SidebarDoctor,
  secretary:   SidebarSecretary,
  patient:     SidebarPatient,
  lab_staff:   SidebarLabStaff,
  pharmacist:  SidebarPharmacist,
};

export default function SidebarSelector(props) {
  const { user } = useAuth();

  if (!user?.role) return null;

  const SidebarComponent = roleToSidebar[user.role];
  if (!SidebarComponent) return null;

  return <SidebarComponent {...props} />;
}