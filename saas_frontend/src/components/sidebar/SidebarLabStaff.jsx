// src/components/sidebar/SidebarLabStaff.jsx
import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarLabStaff() {
  return (
    <SidebarBase>
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

      <li className="nav-item">
        <NavLink
          to="/analyses"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-flask me-2"></i>
          Analyses en cours
        </NavLink>
      </li>

      <li className="nav-item">
        <NavLink
          to="/results"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-check-circle me-2"></i>
          Résultats à valider
        </NavLink>
      </li>

      <li className="nav-item">
        <NavLink
          to="/urgent"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-exclamation-triangle me-2"></i>
          Demandes urgentes
        </NavLink>
      </li>

      <li className="nav-item">
        <NavLink
          to="/history"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-clock-history me-2"></i>
          Historique analyses
        </NavLink>
      </li>

      <li className="nav-item">
        <NavLink
          to="/doctors-contact"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-chat-dots me-2"></i>
          Contacter médecins
        </NavLink>
      </li>
    </SidebarBase>
  );
}