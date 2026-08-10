// src/components/sidebar/SidebarSuperAdmin.jsx
import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarSuperAdmin() {
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

      {/* Gestion de cabinets */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Gestion de cabinets</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/cabinets" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-building me-2"></i>Cabinets
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/doctors" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-person-badge me-2"></i>Médecins
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/specialties" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-star me-2"></i>Spécialités
        </NavLink>
      </li>

      {/* ✅ NOUVEAU : Gestion des Laboratoires */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Gestion des Labos</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/admin-labs" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-hospital me-2"></i>Laboratoires
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/admin-lab-tests" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-clipboard2-pulse me-2"></i>Types d'Analyses
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/admin-lab-requests" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-list-check me-2"></i>Demandes & Résultats
        </NavLink>
      </li>

      {/* Gestion des utilisateurs */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Gestion des utilisateurs</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/users" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-people me-2"></i>Utilisateurs
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/account-requests" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-people me-2"></i>    Demandes d'inscription

        </NavLink>
      </li>
      {/* Gestion géographique */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Gestion géographique</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/cities" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-geo-alt me-2"></i>Villes
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/governorates" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-map me-2"></i>Gouvernorats
        </NavLink>
      </li>

      {/* Gestion des abonnements */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Gestion des abonnements</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/plans" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-credit-card-2-front me-2"></i>Plans d'abonnement
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/subscriptions" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-journal-text me-2"></i>Abonnements
        </NavLink>
      </li>

      
      
      {/* Facturation */}
      <li className="nav-item mt-3">
        <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">Facturation</h6>
      </li>
      <li className="nav-item">
        <NavLink to="/invoices-management" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-receipt-cutoff me-2"></i>Factures
        </NavLink>
      </li>
    </SidebarBase>
  );
}