// src/components/sidebar/SidebarSecretary.jsx
import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarSecretary() {
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
          <i className="bi bi-calendar-event me-2"></i>
          Agenda
        </NavLink>
      </li>

      <li className="nav-item">
        <NavLink
          to="/patients"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-people me-2"></i>
          Patients
        </NavLink>
      </li>

      <li className="nav-item">
        <NavLink
          to="/waiting-room"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-door-open me-2"></i>
          Salle d'attente
        </NavLink>
      </li>
    </SidebarBase>
  );
}