// src/components/sidebar/SidebarPatient.jsx
import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarPatient() {
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
          Mon espace
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
        <NavLink
          to="/appointments"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-calendar-check me-2"></i>
          Mes rendez-vous
        </NavLink>
      </li>

      <li className="nav-item">
        <NavLink
          to="/documents"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-file-earmark-medical me-2"></i>
          Mes documents
        </NavLink>
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