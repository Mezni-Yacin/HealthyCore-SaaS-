import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarLabStaff() {
  return (
    <SidebarBase>

      {/* Vue Globale */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Vue Globale</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/cabinet-directory" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-search me-2"></i>Annuaire
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-house-door me-2"></i>
          Tableau de bord
        </NavLink>
      </li>

      {/* Gestion du Laboratoire */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Gestion du Laboratoire</h6>
      </li>
      <li className="nav-item">
        <NavLink
          to="/lab-staff"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : ''}`
          }
        >
          <i className="bi bi-clipboard2-data me-2"></i>
          Analyses & Résultats
        </NavLink>
      </li>

      {/* Communication */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Communication</h6>
      </li>
      <li className="nav-item">
        <NavLink
          to="/messages"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : ''}`
          }
        >
          <i className="bi bi-envelope me-2"></i>
          Messages
        </NavLink>
      </li>

      {/* Mon Compte */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Mon Compte</h6>
      </li>
      <li className="nav-item">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-person me-2"></i>
          Mon profil
        </NavLink>
      </li>

    </SidebarBase>
  );
}