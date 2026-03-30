import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chargement du profil COMPLET au démarrage et après login
  const loadFullProfile = async () => {
    try {
      const res = await api.get('/users/profile/');
      setUser(res.data);
    } catch (err) {
      console.error('Erreur profil complet:', err);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    loadFullProfile();
  }, []);

  const login = async ({ username, password }) => {
    const res = await api.post('/users/token/', { username, password });

    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);

    await loadFullProfile();   // ← Profil complet ici
    return user;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    await loadFullProfile();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);