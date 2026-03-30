// src/components/sidebar/SidebarBase.jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SidebarBase({ children }) {
  const { logout } = useAuth();

  return (
    <div className="d-flex flex-column h-100 bg-dark text-white">
      {/* Header / Logo */}
      <div className="p-4 border-bottom border-secondary">
        <h4 className="mb-1 fw-bold">SaaS Médical</h4>
        <small className="text-secondary">Espace connecté</small>
      </div>

      {/* Navigation principale */}
      <nav className="flex-grow-1 p-3 overflow-auto">
        <ul className="nav flex-column">
          {children}
        </ul>
      </nav>

      {/* Déconnexion en bas */}
      <div className="p-3 border-top border-secondary mt-auto">
        <button
          onClick={logout}
          className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
        >
          <i className="bi bi-box-arrow-right"></i>
          Déconnexion
        </button>
      </div>
    </div>
  );
}