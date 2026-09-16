import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../css/Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password });
      navigate('/dashboard');
    } catch (err) {
      // ✅ Gestion de l'erreur "Compte inactif" de Django
      const detail = err.response?.data?.detail || '';
      if (detail.includes("No active account")) {
        setError("Votre compte est en attente de validation par un administrateur, ou vos identifiants sont incorrects.");
      } else {
        setError('Identifiants incorrects. Veuillez vérifier votre nom d\'utilisateur et mot de passe.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-wrapper min-vh-100 d-flex align-items-center justify-content-center">
      <div className="lp-bg">
        <div className="lp-shape lp-shape-1"></div>
        <div className="lp-shape lp-shape-2"></div>
        <div className="lp-shape lp-shape-3"></div>
      </div>

      <div className="container position-relative" style={{ zIndex: 2 }}>
        <div className="row justify-content-center g-0">
          <div className="col-11 col-sm-9 col-md-7 col-lg-5">

            <div className="text-center mb-4">
              <Link to="/" className="lp-logo text-decoration-none d-inline-flex align-items-center gap-2">
                <i className="bi bi-heart-pulse-fill lp-logo-icon"></i>
                <span className="lp-logo-text">HealthyCore<span className="lp-logo-pro">.tn</span></span>
              </Link>
            </div>

            <div className="lp-card card border-0 shadow-lg">
              <div className="card-body p-4 p-md-5">

                <div className="text-center mb-4">
                  <h1 className="lp-title fw-bold mb-2">Bon retour !</h1>
                  <p className="lp-subtitle text-muted">Connectez-vous à votre espace médical</p>
                </div>

                {error && (
                  <div className="lp-error alert d-flex align-items-center gap-2" role="alert">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="lp-field mb-3">
                    <label htmlFor="username" className="form-label lp-label fw-medium">
                      <i className="bi bi-person me-1"></i> Nom d'utilisateur ou Email
                    </label>
                    <div className="lp-input-wrap">
                      <span className="lp-input-icon"><i className="bi bi-at"></i></span>
                      <input
                        id="username"
                        type="text"
                        className="form-control lp-input"
                        placeholder="Entrez votre identifiant"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoFocus
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div className="lp-field mb-4">
                    <label htmlFor="password" className="form-label lp-label fw-medium">
                      <i className="bi bi-lock me-1"></i> Mot de passe
                    </label>
                    <div className="lp-input-wrap">
                      <span className="lp-input-icon"><i className="bi bi-shield-lock"></i></span>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className="form-control lp-input lp-input-pw"
                        placeholder="Entrez votre mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="lp-toggle-pw"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Masquer' : 'Afficher'}
                      >
                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn lp-btn-submit w-100 mb-3" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="lp-spinner me-2"></span>
                        Connexion en cours...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Se connecter
                      </>
                    )}
                  </button>
                </form>

                <div className="lp-divider d-flex align-items-center my-4">
                  <span className="flex-grow-1"></span>
                  <span className="px-3 text-muted small">Comptes de test</span>
                  <span className="flex-grow-1"></span>
                </div>
                
                <div className="lp-accounts">
                  {[
                    { role: 'Super Admin', user: 'Superadmin', pass: 'Superadmin', icon: 'bi-shield-fill-check', color: '#e74c3c' },
                    { role: 'Admin', user: 'walid.benfakhet780', pass: 'Azerty@123', icon: 'bi-person-badge-fill', color: '#0bf559ff' },
                    { role: 'Médecin', user: 'DR.ahmed', pass: 'Azerty@123', icon: 'bi-heart-pulse-fill', color: '#4f46e5' },
                    { role: 'Patient', user: 'ines.ketata', pass: 'Azerty@123', icon: 'bi-person-fill', color: '#10b981' },
                    { role: 'Secrétaire', user: 'mezni.yacin', pass: 'Azerty@123', icon: 'bi-person-badge-fill', color: '#f59e0b' },
                    { role: 'Personnel Laboratoire', user: 'taha@gmail.dom', pass: 'Azerty@123', icon: 'bi-droplet-fill', color: '#06b6d4' },
                    { role: 'Personnel Pharmacie', user: 'ali', pass: 'Azerty@123', icon: 'bi-capsule-pill', color: '#8b5cf6' },
                  ].map((acc, i) => (
                    <div
                      key={i}
                      className="lp-account d-flex align-items-center gap-3 p-2 rounded-3 mb-2"
                      onClick={() => { setUsername(acc.user); setPassword(acc.pass); }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="lp-account-icon" style={{ backgroundColor: acc.color + '12', color: acc.color }}>
                        <i className={`bi ${acc.icon}`}></i>
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-semibold small lp-account-role">{acc.role}</div>
                        <div className="text-muted" style={{ fontSize: '.78rem' }}>{acc.user} / {acc.pass}</div>
                      </div>
                      <i className="bi bi-arrow-right-short text-muted"></i>
                    </div>
                  ))}
                </div>

                <p className="text-center mt-4 mb-0">
                  <span className="text-muted small">
                    <i className="bi bi-lock-fill me-1"></i>
                    Connexion sécurisée — Données chiffrées
                  </span>
                </p>
              </div>
            </div>

            <p className="text-center mt-4 mb-0">
              <Link to="/" className="lp-back-link text-decoration-none">
                <i className="bi bi-arrow-left me-1"></i> Retour à l'accueil
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}