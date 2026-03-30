import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password });
      navigate('/');
    } catch (err) {
      setError('Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%)' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow-lg border-0 rounded-4">
              <div className="card-body p-5">
                <h2 className="text-center mb-4 fw-bold text-primary">SaaS Médical</h2>
                <p className="text-center text-muted mb-5">Connectez-vous à votre espace</p>

                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="form-label fw-medium">Nom d'utilisateur</label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      placeholder="user..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-medium">Mot de passe</label>
                    <input
                      type="password"
                      className="form-control form-control-lg"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg w-100" disabled={loading}>
                    {loading ? 'Connexion...' : 'Se connecter'}
                  </button>
                </form>

                <p className="text-center mt-4 text-muted">
                  Pas encore de compte ? <a href="#" className="text-primary">Inscrivez-vous</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}