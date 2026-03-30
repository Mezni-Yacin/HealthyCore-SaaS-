// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadFullProfile = useCallback(async () => {
    try {
      const res = await api.get('/users/profile/');
      setUser(res.data);
    } catch (err) {
      console.error('Erreur profil:', err);
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        await loadFullProfile();
      } else {
        setLoading(false);
      }
    };
    initAuth();
  }, [loadFullProfile]);

  const login = async ({ username, password }) => {
    try {
      const res = await api.post('/users/token/', { username, password });

      await AsyncStorage.setItem('access_token', res.data.access);
      await AsyncStorage.setItem('refresh_token', res.data.refresh);

      await loadFullProfile();
      return true;
    } catch (error) {
      console.error(error.response?.data || error);
      return false;
    }
  };

  const refreshUser = loadFullProfile;  

  return (
    <AuthContext.Provider value={{ user, login, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};