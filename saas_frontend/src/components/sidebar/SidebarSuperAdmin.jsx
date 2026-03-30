// src/components/sidebar/SidebarSuperAdmin.jsx
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
        <NavLink to="/cabinets" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-people-fill me-2"></i>
          Cabinets
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/specialties" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-people-fill me-2"></i>
          Specialites
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/doctors" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-people-fill me-2"></i>
          Doctor
        </NavLink>
      </li>

      {/* Gestion */}
      <li className="nav-item mt-4">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Gestion</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/cities" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-people-fill me-2"></i>
          City
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/governorates" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-people-fill me-2"></i>
          Governorates
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
      <li className="nav-item">
        <NavLink to="/plans" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-credit-card-2-front me-2"></i>
          Plans d’abonnement
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
    </SidebarBase>
  );
}