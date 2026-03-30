// src/components/sidebar/SidebarDoctor.jsx
import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarDoctor() {
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
       {/* ✅ Annuaire Cabinets */}
      <li className="nav-item">
        <NavLink
          to="/cabinet-directory"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : ''}`
          }
        >
          <i className="bi bi-search me-2"></i>
          Annuaire
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/my-cabinets" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-people-fill me-2"></i>
          cabinets
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/my-schedule" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-people-fill me-2"></i>
          Emploi
        </NavLink>
      </li>
       <li className="nav-item">
        <NavLink to="/my-secretaries" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-people-fill me-2"></i>
          my-secretaries
        </NavLink>
      </li>
    </SidebarBase>
  );
}