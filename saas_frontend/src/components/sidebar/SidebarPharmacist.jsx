// src/components/sidebar/SidebarPharmacist.jsx
import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarPharmacist() {
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
          to="/prescriptions"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-prescription2 me-2"></i>
          Ordonnances reçues
        </NavLink>
      </li>

      <li className="nav-item">
        <NavLink
          to="/stock"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-box-seam me-2"></i>
          Gestion stock
        </NavLink>
      </li>

      <li className="nav-item">
        <NavLink
          to="/alerts"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-bell me-2"></i>
          Alertes stock bas
        </NavLink>
      </li>

      <li className="nav-item">
        <NavLink
          to="/reimbursements"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`
          }
        >
          <i className="bi bi-currency-dollar me-2"></i>
          Remboursements CNAM
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
          Historique délivrances
        </NavLink>
      </li>
    </SidebarBase>
  );
}