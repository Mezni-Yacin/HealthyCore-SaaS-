import { Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import SidebarBase from './SidebarBase';

export default function SidebarDoctor() {
  const menuSections = [
    {
      title: "Vue Globale",
      items: [
        { to: "/dashboard", icon: "bi-house-door", label: "Tableau de bord" },
        { to: "/cabinet-directory", icon: "bi-search", label: "Annuaire" }
      ]
    },
    {
      title: "Gestion de cabinets",
      items: [
        { to: "/my-cabinets", icon: "bi-building", label: "Mes Cabinets" },
        { to: "/my-schedule", icon: "bi-calendar3", label: "Emploi du temps" },
        { to: "/my-secretaries", icon: "bi-person-workspace", label: "Secrétaires" }
      ]
    },
    {
      title: "Patients & RDV",
      items: [
        { to: "/medical-records", icon: "bi-folder2-open", label: "Dossiers médicaux" },
        { to: "/doctor-prescriptions", icon: "bi-file-earmark-medical", label: "Ordonnances" },
        { to: "/appointments", icon: "bi-calendar-event", label: "Rendez-vous" },
        { to: "/waiting-queue", icon: "bi-hourglass-split", label: "File d'attente" }
      ]
    },
    {
      title: "Services Externes",
      items: [
        { to: "/lab-doctor", icon: "bi-clipboard2-pulse", label: "Analyses de Labo" },
        { to: "/messages", icon: "bi-envelope", label: "Messagerie" }
      ]
    },
    {
      title: "Finance & Compte",
      items: [
        { to: "/doctor-invoices", icon: "bi-receipt", label: "Facturation" },
        { to: "/profile", icon: "bi-person", label: "Mon profil" }
      ]
    }
  ];

  return (
    <SidebarBase>
      {menuSections.map((section, idx) => (
        <Fragment key={idx}>
          {/* Titre de la section (sans hover, style gris discret) */}
          <li className="nav-item">
            <span className="nav-link text-uppercase text-secondary small fw-bold px-3 mt-3 mb-1 disabled">
              {section.title}
            </span>
          </li>
          
          {/* Liens de la section */}
          {section.items.map((item, i) => (
            <li className="nav-item" key={i}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded-3 mb-1 ${isActive ? 'bg-primary text-white shadow-sm' : 'text-white-50'}`
                }
              >
                <i className={`bi ${item.icon}`}></i>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </Fragment>
      ))}
    </SidebarBase>
  );
}