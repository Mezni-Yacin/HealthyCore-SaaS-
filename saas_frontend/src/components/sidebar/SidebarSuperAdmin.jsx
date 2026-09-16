// src/components/sidebar/SidebarSuperAdmin.jsx
import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarSuperAdmin() {
  const menuSections = [
    {
      title: "Vue Globale",
      items: [
        { to: "/dashboard", icon: "bi-speedometer2", label: "Dashboard" },
        { to: "/cabinet-directory", icon: "bi-search", label: "Annuaire" }
      ]
    },
    {
      title: "Gestion de cabinets",
      items: [
        { to: "/cabinets", icon: "bi-building", label: "Cabinets" },
        { to: "/doctors", icon: "bi-person-badge", label: "Médecins" },
        { to: "/specialties", icon: "bi-star", label: "Spécialités" }
      ]
    },
    {
      title: "Gestion des Labos",
      items: [
        { to: "/admin-labs", icon: "bi-hospital", label: "Laboratoires" },
        { to: "/admin-lab-tests", icon: "bi-clipboard2-pulse", label: "Types d'Analyses" },
        { to: "/admin-lab-requests", icon: "bi-list-check", label: "Demandes & Résultats" }
      ]
    },
    {
      title: "Gestion des utilisateurs",
      items: [
        { to: "/users", icon: "bi-people", label: "Utilisateurs" },
        { to: "/account-requests", icon: "bi-people", label: "Demandes d'inscription" } // J'ai gardé ton icône bi-people ici
      ]
    },
       {
      title: "Facturation",
      items: [
        { to: "/invoices-management", icon: "bi-receipt-cutoff", label: "Factures" }
      ]
    },
    {
      title: "Gestion géographique",
      items: [
        { to: "/cities", icon: "bi-geo-alt", label: "Villes" },
        { to: "/governorates", icon: "bi-map", label: "Gouvernorats" }
      ]
    },
    {
      title: "Gestion des abonnements",
      items: [
        { to: "/plans", icon: "bi-credit-card-2-front", label: "Plans d'abonnement" },
        { to: "/subscriptions", icon: "bi-journal-text", label: "Abonnements" }
      ]
    }
  ];

  return (
    <SidebarBase>
      {menuSections.map((section, idx) => (
        <div key={idx} className="mb-3">
          <h6 className="px-3 text-uppercase text-secondary small fw-bold mb-2">
            {section.title}
          </h6>
          {section.items.map((item, i) => (
            <li className="nav-item" key={i}>
              <NavLink 
                to={item.to} 
                className={({ isActive }) => `nav-link text-white ${isActive ? 'active bg-primary' : ''}`}
              >
                <i className={`bi ${item.icon} me-2`}></i>
                {item.label}
              </NavLink>
            </li>
          ))}
        </div>
      ))}
    </SidebarBase>
  );
}