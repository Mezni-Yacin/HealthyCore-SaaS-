// src/components/sidebar/SidebarPharmacist.jsx
import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarPharmacist() {
  const linkClass = ({ isActive }) =>
    `nav-link text-white ${isActive ? 'active bg-primary' : 'hover-bg-secondary'}`;

  return (
    <SidebarBase>
      <li className="nav-item">
        <NavLink to="/dashboard" className={linkClass}>
          <i className="bi bi-house-door me-2"></i>
          Tableau de bord
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/cabinet-directory" className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}>
          <i className="bi bi-search me-2"></i>Annuaire
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/pharmacy-pos" className={linkClass}>
          <i className="bi bi-cart-plus me-2"></i>
          Caisse (Vente)
        </NavLink>
      </li>
      {/* ✅ NOUVEAU LIEN : COMMANDES PATIENTS */}
      <li className="nav-item">
        <NavLink to="/pharmacy-orders" className={linkClass}>
          <i className="bi bi-bag-check me-2"></i>
          Commandes 
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/pharmacy-stock" className={linkClass}>
          <i className="bi bi-box-seam me-2"></i>
          Gestion du stock
        </NavLink>
      </li>

      <li className="nav-item">
        <NavLink to="/pharmacy-prescriptions" className={linkClass}>
          <i className="bi bi-prescription2 me-2"></i>
          Ordonnances reçues
        </NavLink>
      </li>

      <li className="nav-item">
        <NavLink to="/pharmacy-sales" className={linkClass}>
          <i className="bi bi-clock-history me-2"></i>
          Historique des ventes
        </NavLink>
      </li>

      <li className="nav-item">
        <NavLink to="/pharmacy-profile" className={linkClass}>
          <i className="bi bi-shop me-2"></i>
          Ma Pharmacie
        </NavLink>
      </li>
    </SidebarBase>
  );
}