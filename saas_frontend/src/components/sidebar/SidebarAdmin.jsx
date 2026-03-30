// src/components/sidebar/SidebarSuperAdmin.jsx
// VERSION COMPLÈTE - Avec lien vers gestion utilisateurs

import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarSuperAdmin() {
  return (
    <SidebarBase>
      {/* Vue Globale */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Vue Globale</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-graph-up-arrow me-2"></i>
          Statistiques globales
        </NavLink>
      </li>
       <li className="nav-item">
        <NavLink
          to="/cabinet-directory"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : ''}`
          } >
          <i className="bi bi-search me-2"></i>
          Annuaire
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/users" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-people-fill me-2"></i>
          Utilisateurs
        </NavLink>
      </li>

      {/* Gestion */}
      <li className="nav-item mt-4">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Gestion</h6>
      </li>
      
      <li className="nav-item">
        <NavLink to="/plans" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-credit-card-2-front me-2"></i>
          Plans d'abonnement
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/subscriptions" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-journal-text me-2"></i>
          Abonnements
        </NavLink>
      </li>

      {/* Modération */}
      <li className="nav-item mt-4">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Modération</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/reports" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-flag me-2"></i>
          Signalements
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/audit" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-journal-bookmark me-2"></i>
          Journaux d'audit
        </NavLink>
      </li>
    </SidebarBase>
  );
}
