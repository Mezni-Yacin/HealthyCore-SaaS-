// src/components/Layout.jsx
import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom'; // ← ajouter NavLink pour le lien
import SidebarSelector from './sidebar/SidebarSelector';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  const [offcanvasOpen, setOffcanvasOpen] = useState(false);

  return (
    <>
      {/* Navbar fixe en haut */}
      <nav className="navbar navbar-expand navbar-light bg-white shadow-sm fixed-top">
        <div className="container-fluid px-3 px-md-4">
          {/* Burger mobile */}
          <button
            className="navbar-toggler d-md-none me-3"
            type="button"
            onClick={() => setOffcanvasOpen(true)}
            aria-label="Ouvrir le menu latéral"
          >
            <i className="bi bi-list fs-3"></i>
          </button>

          {/* Logo */}
          <a className="navbar-brand fw-bold text-primary fs-4" href="/">
            SaaS Médical
          </a>

          {/* Infos utilisateur + bouton Mon profil à droite */}
          <div className="ms-auto d-flex align-items-center gap-3">
            {user && (
              <>
                {/* Nom + rôle (déjà là) */}
                <div className="d-none d-sm-block text-end">
                  <div className="fw-medium small">
                    {user.first_name || user.username}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {user.role === 'super_admin'
                      ? 'Super Administrateur'
                      : user.role === 'lab_staff'
                      ? 'Personnel de Laboratoire'
                      : user.role === 'pharmacist'
                      ? 'Pharmacien'
                      : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </div>
                </div>

                {/* Avatar rond */}
                {user.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt="Profil"
                    className="rounded-circle"
                    style={{ width: '38px', height: '38px', objectFit: 'cover', border: '1px solid #dee2e6' }}
                  />
                ) : (
                  <div
                    className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold"
                    style={{ width: '38px', height: '38px' }}
                  >
                    {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
                  </div>
                )}

                {/* Bouton Mon Profil – AJOUTÉ ICI */}
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `btn btn-outline-primary btn-sm ${isActive ? 'active' : ''}`
                  }
                >
                  <i className="bi bi-person me-1"></i>
                  Mon profil
                </NavLink>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Offcanvas mobile (sidebar pour petits écrans) */}
      <div
        className="offcanvas offcanvas-start bg-dark text-white"
        tabIndex="-1"
        id="sidebarOffcanvas"
        aria-labelledby="sidebarOffcanvasLabel"
        style={{ width: '280px' }}
      >
        <div className="offcanvas-header border-bottom border-secondary">
          <h5 className="offcanvas-title fw-bold" id="sidebarOffcanvasLabel">
            Menu
          </h5>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={() => setOffcanvasOpen(false)}
            aria-label="Fermer"
          ></button>
        </div>
        <div className="offcanvas-body p-0">
          <SidebarSelector />
        </div>
      </div>

      {/* Sidebar fixe à gauche sur écrans ≥ md */}
      <div
        className="d-none d-md-block bg-dark text-white position-fixed top-0 start-0 h-100 overflow-auto"
        style={{ width: '260px', paddingTop: '70px' }}
      >
        <SidebarSelector />
      </div>

      {/* Contenu principal */}
      <main
        className="flex-grow-1"
        style={{
          paddingTop: '70px',
          marginLeft: '0',
          paddingLeft: '260px' // espace pour la sidebar desktop
        }}
      >
        {/* Espace vide pour mobile (navbar) */}
        <div className="d-md-none" style={{ height: '70px' }}></div>

        <div className="container-fluid py-4 py-md-5">
          <Outlet />
        </div>
      </main>

      {/* Overlay quand offcanvas ouvert (mobile) */}
      {offcanvasOpen && (
        <div
          className="offcanvas-backdrop fade show d-md-none"
          onClick={() => setOffcanvasOpen(false)}
        ></div>
      )}
    </>
  );
}