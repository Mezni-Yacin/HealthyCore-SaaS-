import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarLabStaff() {
  const linkClass = ({ isActive }) =>
    `nav-link text-white d-flex align-items-center ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`;

  return (
    <SidebarBase>
      
      {/* Vue Globale */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Vue Globale</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/cabinet-directory" className={linkClass}>
          <i className="bi bi-search me-2"></i>Annuaire
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/dashboard" className={linkClass}>
          <i className="bi bi-house-door me-2"></i>
          Tableau de bord
        </NavLink>
      </li>

      {/* Gestion du Laboratoire */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Gestion du Laboratoire</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/lab-staff/workflow" className={linkClass}>
          <i className="bi bi-list-task me-2"></i>
          Demandes & Résultats
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/lab-staff/catalog" className={linkClass}>
          <i className="bi bi-grid-3x3-gap me-2"></i>
          Catalogue Analyses
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/lab-staff/settings" className={linkClass}>
          <i className="bi bi-building me-2"></i>
          Mon Laboratoire
        </NavLink>
      </li>

      {/* Communication */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Communication</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/messages" className={linkClass}>
          <i className="bi bi-envelope me-2"></i>
          Messages
        </NavLink>
      </li>

      {/* Mon Compte */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Mon Compte</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/profile" className={linkClass}>
          <i className="bi bi-person me-2"></i>
          Mon profil
        </NavLink>
      </li>

    </SidebarBase>
  );
}