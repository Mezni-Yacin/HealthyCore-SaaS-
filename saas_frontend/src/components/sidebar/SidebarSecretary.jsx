import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarSecretary() {
  return (
    <SidebarBase>

      {/* Vue Globale */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Vue Globale</h6>
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

      {/* Gestion */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Gestion</h6>
      </li>
      <li className="nav-item">
        <NavLink
          to="/secretary-cabinets"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : ''}`
          }
        >
          <i className="bi bi-building me-2"></i>
          Cabinet
        </NavLink>
      </li>

      {/* Dossiers Médicaux */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Dossiers Médicaux</h6>
      </li>
      <li className="nav-item">
        <NavLink
          to="/secretary-records"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : ''}`
          }
        >
          <i className="bi bi-folder2-open me-2"></i>
          Dossiers médicaux
        </NavLink>
      </li>

      {/* Rendez-vous */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Rendez-vous</h6>
      </li>
      <li className="nav-item">
        <NavLink
          to="/appointments/secretary"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : ''}`
          }
        >
          <i className="bi bi-calendar-event me-2"></i>
          Rendez-vous
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

      {/* File d'attente */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">File d'attente</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/secretary-queue" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-hourglass-split me-2"></i>
          File d'attente
        </NavLink>
      </li>

      {/* Facturation */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Facturation</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/secretary-invoices" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-receipt me-2"></i>
          Facturation
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