import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarDoctor() {
  return (
    <SidebarBase>

      {/* Vue Globale */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Vue Globale</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`}>
          <i className="bi bi-house-door me-2"></i>Tableau de bord
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/cabinet-directory" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-search me-2"></i>Annuaire
        </NavLink>
      </li>

      {/* Gestion de cabinets */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Gestion de cabinets</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/my-cabinets" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-people-fill me-2"></i>Cabinets
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/my-schedule" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-calendar3 me-2"></i>Emploi
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/my-secretaries" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-person-workspace me-2"></i>Secrétaires
        </NavLink>
      </li>

      {/* Dossiers Médicaux */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Dossiers Médicaux</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/medical-records" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-folder2-open me-2"></i>Dossiers médicaux
        </NavLink>
      </li>
        {/* Ordonnances*/}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Ordonnances</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/doctor-prescriptions" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-folder2-open me-2"></i>Ordonnances
        </NavLink>
      </li>


      {/* Rendez-vous */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Rendez-vous</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/appointments" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-calendar-event me-2"></i>Rendez-vous
        </NavLink>
      </li>

      {/* Laboratoire */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Laboratoire</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/lab-doctor" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-clipboard2-pulse me-2"></i>Analyses de Labo
        </NavLink>
      </li>

      {/* Communication */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Communication</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/messages" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-envelope me-2"></i>Messages
        </NavLink>
      </li>

      {/* File d'attente */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">File d'attente</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/waiting-queue" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-hourglass-split me-2"></i>File d'attente
        </NavLink>
      </li>

      {/* Facturation */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Facturation</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/doctor-invoices" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-receipt me-2"></i>Facturation
        </NavLink>
      </li>

      {/* Mon Compte */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Mon Compte</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/profile" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`}>
          <i className="bi bi-person me-2"></i>Mon profil
        </NavLink>
      </li>

    </SidebarBase>
  );
}