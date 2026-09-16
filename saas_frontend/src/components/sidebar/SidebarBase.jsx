import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SidebarBase({ children }) {
  const { logout, user } = useAuth();

  return (
    <div className="d-flex flex-column h-100 w-100 text-white">
      
      {/* Logo / Brand */}
      <div className="p-4 border-bottom border-secondary border-opacity-25">
        <Link to="/" className="text-decoration-none d-flex align-items-center gap-2 text-white">
          <i className="bi bi-heart-pulse-fill text-danger fs-3"></i>
          <div>
            <h5 className="mb-0 fw-bold">HealthyCore</h5>
            <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Espace {user?.role === 'super_admin' ? 'Admin' : user?.role}</small>
          </div>
        </Link>
      </div>

      {/* Navigation principale */}
      <nav className="flex-grow-1 py-3 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
        <ul className="nav flex-column px-2">
          {children}
        </ul>
      </nav>

      {/* Footer / Déconnexion */}
      <div className="p-3 border-top border-secondary border-opacity-25 mt-auto">
        <button
          onClick={logout}
          className="btn btn-outline-light w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-3"
          style={{ borderWidth: '1px', borderColor: 'rgba(255,255,255,0.2)' }}
        >
          <i className="bi bi-box-arrow-right"></i>
          <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>Déconnexion</span>
        </button>
      </div>
    </div>
  );
}