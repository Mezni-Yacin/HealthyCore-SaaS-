// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  const LOCAL_IP = '192.168.100.12';   // ← Change si besoin

  if (Platform.OS === 'web') {
    return 'http://127.0.0.1:8000/api/';
  }
  return `http://${LOCAL_IP}:8000/api/`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ajoute automatiquement le token JWT
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Déconnexion automatique si 401 (token expiré/invalide)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('access_token');
      AsyncStorage.removeItem('refresh_token');
      // On ne peut pas faire window.location sur mobile → on gère via Context
      console.log('Token invalide → déconnexion automatique');
    }
    return Promise.reject(error);
  }
);

export default api;