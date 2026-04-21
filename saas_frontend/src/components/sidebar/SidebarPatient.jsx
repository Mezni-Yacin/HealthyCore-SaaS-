// src/components/sidebar/SidebarPatient.jsx
import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarPatient() {
  return (
    <SidebarBase>

      {/* Mon Espace */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Mon Espace</h6>
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

      {/* Santé */}
      {/* File d'attente */}
        <li className="nav-item mt-3">
          <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">File d'attente</h6>
        </li>
        <li className="nav-item">
          <NavLink to="/patient-queue" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
            <i className="bi bi-hourglass-split me-2"></i>
            File d'attente
          </NavLink>
        </li>
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Santé</h6>
      </li>
      <li className="nav-item">
        <NavLink
          to="/patient-records"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : ''}`
          }
        >
          <i className="bi bi-file-medical me-2"></i>
          Mes dossiers médicaux
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink
          to="/my-appointments"
          className={({ isActive }) =>
            `nav-link text-white ${isActive ? 'active bg-primary' : ''}`
          }
        >
          <i className="bi bi-calendar-event me-2"></i>
          Mes rendez-vous
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