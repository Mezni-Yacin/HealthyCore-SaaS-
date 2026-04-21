import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import SidebarSelector from './sidebar/SidebarSelector';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Layout() {
  const { user } = useAuth();
  const [offcanvasOpen, setOffcanvasOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Compteur messages non-lus ──
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token || !user) return;
        const res = await api.get('/messaging/conversations/');
        const total = res.data.reduce((sum, c) => sum + (c.unread_count || 0), 0);
        setUnreadCount(total);
      } catch (err) {
        // Pas connecté ou erreur silencieuse
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <>
      {/* ═══════ Navbar fixe en haut ═══════ */}
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

          {/* Boutons + infos utilisateur à droite */}
          <div className="ms-auto d-flex align-items-center gap-2">
            {user && (
              <>
                {/* ── Bouton Messages avec badge ── */}
                <NavLink
                  to="/messages"
                  className={({ isActive }) =>
                    `btn btn-sm position-relative ${isActive ? 'btn-primary' : 'btn-outline-secondary'}`
                  }
                  style={{ fontWeight: 500 }}
                >
                  <i className="bi bi-chat-dots-fill" style={{ fontSize: '1rem' }}></i>
                  <span className="d-none d-sm-inline ms-1">Messages</span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: unreadCount > 9 ? '-8px' : '-6px',
                        right: unreadCount > 9 ? '-10px' : '-8px',
                        minWidth: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                        padding: '0 4px',
                        lineHeight: 1,
                        border: '2px solid #fff',
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </NavLink>

                {/* Nom + rôle */}
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

                {/* Bouton Mon profil */}
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

      {/* ═══════ Offcanvas mobile ═══════ */}
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

      {/* ═══════ Sidebar fixe à gauche (desktop) ═══════ */}
      <div
        className="d-none d-md-block bg-dark text-white position-fixed top-0 start-0 h-100 overflow-auto"
        style={{ width: '260px', paddingTop: '70px' }}
      >
        <SidebarSelector />
      </div>

      {/* ═══════ Contenu principal ═══════ */}
      <main
        className="flex-grow-1"
        style={{
          paddingTop: '70px',
          marginLeft: '0',
          paddingLeft: '260px',
        }}
      >
        {/* Espace vide pour mobile */}
        <div className="d-md-none" style={{ height: '70px' }}></div>

        <div className="container-fluid py-4 py-md-5">
          <Outlet />
        </div>
      </main>

      {/* ═══════ Overlay offcanvas ═══════ */}
      {offcanvasOpen && (
        <div
          className="offcanvas-backdrop fade show d-md-none"
          onClick={() => setOffcanvasOpen(false)}
        ></div>
      )}
    </>
  );
}