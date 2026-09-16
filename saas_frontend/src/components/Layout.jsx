import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import SidebarSelector from './sidebar/SidebarSelector';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Layout() {
  const { user, logout } = useAuth();
  const [offcanvasOpen, setOffcanvasOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // ── Gestion du Mode Sombre / Clair ──
  const [darkMode, setDarkMode] = useState(() => {
    // Récupérer la préférence sauvegardée, sinon celle du navigateur
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Appliquer le thème sur la balise <html> pour activer le Dark Mode de Bootstrap 5.3
    document.documentElement.setAttribute('data-bs-theme', darkMode ? 'dark' : 'light');
    // Sauvegarder le choix de l'utilisateur
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // ── Compteur messages non-lus (Cabinet + Direct) ──
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token || !user) return;
        
        // ✅ FIX: Récupérer les conversations de cabinet ET directes en même temps
        const [convRes, directConvRes] = await Promise.all([
          api.get('/messaging/conversations/').catch(() => ({ data: [] })),
          api.get('/messaging/direct-conversations/').catch(() => ({ data: [] }))
        ]);

        const cabinetUnread = (convRes.data || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
        const directUnread = (directConvRes.data || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
        
        setUnreadCount(cabinetUnread + directUnread);
      } catch (err) {
        // Silencieux
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // 30 secondes
    return () => clearInterval(interval);
  }, [user]);

  const roleLabel = user ? (user.role === 'super_admin' ? 'Super Admin' : user.role.charAt(0).toUpperCase() + user.role.slice(1)) : '';

  return (
    <div className="d-flex" style={{ backgroundColor: 'var(--bs-body-bg)', minHeight: '100vh' }}>
      
      {/* Variables CSS pour les tailles */}
      <style>{`
        :root {
          --sidebar-width: 240px; 
          --navbar-height: 56px;  
        }
        @media (min-width: 768px) { 
          .main-content-wrapper { margin-left: var(--sidebar-width); } 
        }
      `}</style>

      {/* ═══════ Sidebar Desktop (Fixe à gauche) ═══════ */}
      <div
        className="d-none d-md-flex flex-column position-fixed top-0 start-0 h-100"
        style={{ width: 'var(--sidebar-width)', zIndex: 1031, backgroundColor: darkMode ? '#0f172a' : '#1e293b' }}
      >
        <SidebarSelector />
      </div>

      {/* ═══════ Offcanvas Mobile ═══════ */}
      <div
        className={`offcanvas offcanvas-start ${offcanvasOpen ? 'show' : ''}`}
        tabIndex="-1"
        style={{ width: '280px', backgroundColor: darkMode ? '#0f172a' : '#1e293b', color: 'white' }}
      >
        <div className="offcanvas-header border-bottom border-secondary border-opacity-25">
          <h5 className="offcanvas-title fw-bold text-white">Menu</h5>
          <button type="button" className="btn-close btn-close-white" onClick={() => setOffcanvasOpen(false)}></button>
        </div>
        <div className="offcanvas-body p-0">
          <SidebarSelector />
        </div>
      </div>
      {offcanvasOpen && <div className="offcanvas-backdrop fade show d-md-none" onClick={() => setOffcanvasOpen(false)}></div>}

      {/* ═══════ Zone Principale (Droite) ═══════ */}
      <div className="flex-grow-1">
        <div className="main-content-wrapper">
          
          {/* ═══════ Navbar Top ═══════ */}
          <nav className="navbar navbar-expand border-bottom sticky-top bg-body" style={{ height: 'var(--navbar-height)' }}>
            <div className="container-fluid px-3 px-md-4">
              
              {/* Burger Mobile */}
              <button
                className="btn btn-link text-body p-0 d-md-none me-3"
                type="button"
                onClick={() => setOffcanvasOpen(true)}
              >
                <i className="bi bi-list fs-4"></i>
              </button>

              {/* Logo Mobile */}
              <Link to="/" className="navbar-brand fw-bold text-primary d-md-none fs-5">
                <i className="bi bi-heart-pulse-fill me-1"></i> HealthyCore
              </Link>

              <div className="d-none d-md-block"></div>

              {/* Droite : Bouton Thème, Messages + Profil */}
              <div className="ms-auto d-flex align-items-center gap-3">
                
                {/* ── BOUTON DARK / LIGHT MODE ── */}
                <button 
                  onClick={() => setDarkMode(!darkMode)} 
                  className="btn btn-link p-0 text-body-secondary" 
                  title={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
                  style={{ fontSize: '1.2rem', lineHeight: 1 }}
                >
                  <i className={`bi ${darkMode ? 'bi-sun-fill text-warning' : 'bi-moon-stars-fill'}`}></i>
                </button>

                {/* Bouton Messages */}
                <NavLink to="/messages" className={({ isActive }) => `btn btn-icon position-relative ${isActive ? 'text-primary' : 'text-body-secondary'}`}>
                  <i className="bi bi-chat-left-text-fill fs-5"></i>
                  {unreadCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </NavLink>

                <div className="vr d-none d-sm-block" style={{ height: '24px' }}></div>

                {/* Menu Utilisateur */}
                <div className="dropdown">
                  <button className="btn d-flex align-items-center gap-2 p-1 ps-2 border-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" style={{ borderRadius: '30px', backgroundColor: 'var(--bs-tertiary-bg)' }}>
                    {user?.profile_picture ? (
                      <img src={user.profile_picture} alt="Profil" className="rounded-circle" style={{ width: '30px', height: '30px', objectFit: 'cover' }} />
                    ) : (
                      <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '30px', height: '30px', fontSize: '0.75rem' }}>
                        {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                    <div className="text-start d-none d-sm-block me-2">
                      <div className="fw-bold text-body" style={{ fontSize: '0.75rem', lineHeight: 1 }}>{user?.first_name || user?.username}</div>
                      <small className="text-body-secondary" style={{ fontSize: '0.65rem' }}>{roleLabel}</small>
                    </div>
                    <i className="bi bi-chevron-down text-body-secondary me-2 d-none d-sm-block" style={{ fontSize: '0.65rem' }}></i>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2" style={{ borderRadius: '12px' }}>
                    <li><Link to="/profile" className="dropdown-item d-flex align-items-center gap-2 py-2"><i className="bi bi-person-circle text-primary"></i> Mon Profil</Link></li>
                    <li><Link to="/settings" className="dropdown-item d-flex align-items-center gap-2 py-2"><i className="bi bi-gear text-secondary"></i> Paramètres</Link></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><button onClick={logout} className="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"><i className="bi bi-box-arrow-right"></i> Déconnexion</button></li>
                  </ul>
                </div>

              </div>
            </div>
          </nav>

          {/* ═══════ Contenu des Pages ═══════ */}
          <main className="py-4 px-3 px-md-4">
            <Outlet />
          </main>

        </div>
      </div>
    </div>
  );
}