// src/components/CreateUserModal.jsx
// Modal dédié pour la création d'un nouvel utilisateur

import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Configuration
const ROLE_CHOICES = [
  { value: 'patient', label: 'Patient', icon: '👤', description: 'Accès aux dossiers médicaux personnels' },
  { value: 'doctor', label: 'Médecin', icon: '👨‍⚕️', description: 'Gestion des patients et consultations' },
  { value: 'secretary', label: 'Secrétaire', icon: '👩‍💼', description: 'Gestion des rendez-vous' },
  { value: 'lab_staff', label: 'Personnel de Laboratoire', icon: '🔬', description: 'Gestion des analyses' },
  { value: 'pharmacist', label: 'Pharmacien', icon: '💊', description: 'Gestion des ordonnances' },
  { value: 'admin', label: 'Administrateur', icon: '👔', description: 'Administration du système' },
  { value: 'super_admin', label: 'Super Administrateur', icon: '👑', description: 'Accès complet au système' },
];

const GENDER_CHOICES = [
  { value: 'M', label: 'Homme', icon: '👨' },
  { value: 'F', label: 'Femme', icon: '👩' },
  { value: 'O', label: 'Autre', icon: '🧑' },
  { value: 'U', label: 'Non spécifié', icon: '❓' },
];

// Générer mot de passe aléatoire
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export default function CreateUserModal({ show, onClose, onSuccess }) {
  // État du formulaire
  const [step, setStep] = useState(1); // 1: Rôle, 2: Infos, 3: Confirmation
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState([]);
  
  const [form, setForm] = useState({
    role: 'patient',
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    password: '',
    generatePassword: true,
    address: '',
    city: '',
    language_preference: 'fr',
    is_active: true,
    send_welcome_email: false,
    // Patient
    date_of_birth: '',
    gender: 'U',
  });

  const [errors, setErrors] = useState({});

  // Charger les villes
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await api.get('/users/cities/');
        setCities(res.data.results || res.data);
      } catch (err) {
        console.error('Erreur chargement villes:', err);
      }
    };
    if (show) fetchCities();
  }, [show]);

  // Reset form quand le modal s'ouvre
  useEffect(() => {
    if (show) {
      setStep(1);
      setForm({
        role: 'patient',
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        phone_number: '',
        password: '',
        generatePassword: true,
        address: '',
        city: '',
        language_preference: 'fr',
        is_active: true,
        send_welcome_email: false,
        date_of_birth: '',
        gender: 'U',
      });
      setErrors({});
    }
  }, [show]);

  // Générer username automatiquement
  const generateUsername = () => {
    if (form.first_name && form.last_name) {
      const base = `${form.first_name.toLowerCase()}.${form.last_name.toLowerCase()}`.replace(/\s+/g, '');
      const random = Math.floor(Math.random() * 1000);
      return `${base}${random}`;
    }
    return '';
  };

  // Valider étape 1
  const validateStep1 = () => {
    if (!form.role) {
      setErrors({ role: 'Veuillez sélectionner un rôle' });
      return false;
    }
    setErrors({});
    return true;
  };

  // Valider étape 2
  const validateStep2 = () => {
    const newErrors = {};
    
    if (!form.username) newErrors.username = 'Le nom d\'utilisateur est obligatoire';
    if (!form.first_name) newErrors.first_name = 'Le prénom est obligatoire';
    if (!form.last_name) newErrors.last_name = 'Le nom est obligatoire';
    
    // Email obligatoire pour médecins
    if (form.role === 'doctor' && !form.email) {
      newErrors.email = 'L\'email est obligatoire pour les médecins';
    }
    
    // Date de naissance obligatoire pour patients
    if (form.role === 'patient' && !form.date_of_birth) {
      newErrors.date_of_birth = 'La date de naissance est obligatoire pour les patients';
    }
    
    // Mot de passe
    if (!form.generatePassword && form.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Passer à l'étape suivante
  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  // Étape précédente
  const prevStep = () => {
    setStep(Math.max(1, step - 1));
  };

  // Créer l'utilisateur
  const handleCreate = async () => {
    setLoading(true);
    setErrors({});

    const payload = {
      username: form.username,
      email: form.email || null,
      first_name: form.first_name,
      last_name: form.last_name,
      role: form.role,
      phone_number: form.phone_number || null,
      address: form.address || null,
      city: form.city || null,
      language_preference: form.language_preference,
      is_active: form.is_active,
    };

    // Mot de passe
    if (form.generatePassword) {
      payload.password = generatePassword();
      payload.password_confirm = payload.password;
    } else {
      payload.password = form.password;
      payload.password_confirm = form.password;
    }

    // Patient
    if (form.role === 'patient' && form.date_of_birth) {
      payload.date_of_birth = form.date_of_birth;
      payload.gender = form.gender;
    }

    try {
      const res = await api.post('/users/manage/', payload);
      setLoading(false);
      
      // Afficher le mot de passe généré
      const createdPassword = payload.password;
      
      onSuccess && onSuccess({
        ...res.data,
        generatedPassword: createdPassword
      });
      
      onClose();
    } catch (err) {
      setLoading(false);
      console.error('Erreur:', err.response?.data);
      
      let newErrors = {};
      const data = err.response?.data || {};
      
      if (data.username) newErrors.username = Array.isArray(data.username) ? data.username[0] : data.username;
      if (data.email) newErrors.email = Array.isArray(data.email) ? data.email[0] : data.email;
      if (data.phone_number) newErrors.phone_number = Array.isArray(data.phone_number) ? data.phone_number[0] : data.phone_number;
      if (data.detail) newErrors.general = data.detail;
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setStep(2); // Retour à l'étape 2 en cas d'erreur
      } else {
        setErrors({ general: 'Une erreur est survenue. Veuillez réessayer.' });
        setStep(2);
      }
    }
  };

  if (!show) return null;

  // Rôle sélectionné
  const selectedRole = ROLE_CHOICES.find(r => r.value === form.role);

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header bg-primary text-white">
            <div>
              <h5 className="modal-title">
                ➕ Créer un nouvel utilisateur
              </h5>
              <small className="opacity-75">
                Étape {step} sur 3
              </small>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          {/* Progress bar */}
          <div className="progress rounded-0" style={{ height: '4px' }}>
            <div 
              className="progress-bar bg-success" 
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            
            {/* Erreur générale */}
            {errors.general && (
              <div className="alert alert-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {errors.general}
              </div>
            )}

            {/* ====================== ÉTAPE 1: CHOIX DU RÔLE ====================== */}
            {step === 1 && (
              <div>
                <h6 className="text-muted mb-3">
                  <i className="bi bi-person-badge me-2"></i>
                  Sélectionnez le type d'utilisateur
                </h6>
                
                <div className="row g-3">
                  {ROLE_CHOICES.map(role => (
                    <div className="col-md-6" key={role.value}>
                      <div
                        className={`card h-100 cursor-pointer ${form.role === role.value ? 'border-primary bg-light' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setForm({ ...form, role: role.value })}
                      >
                        <div className="card-body d-flex align-items-center">
                          <div className="me-3" style={{ fontSize: '2rem' }}>
                            {role.icon}
                          </div>
                          <div>
                            <h6 className="mb-1">{role.label}</h6>
                            <small className="text-muted">{role.description}</small>
                          </div>
                          {form.role === role.value && (
                            <i className="bi bi-check-circle-fill text-primary ms-auto" style={{ fontSize: '1.5rem' }}></i>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.role && (
                  <div className="text-danger mt-2 small">{errors.role}</div>
                )}
              </div>
            )}

            {/* ====================== ÉTAPE 2: INFORMATIONS ====================== */}
            {step === 2 && (
              <div>
                {/* Badge du rôle sélectionné */}
                <div className="d-flex align-items-center mb-4">
                  <span className="badge bg-primary fs-6 me-2">
                    {selectedRole?.icon} {selectedRole?.label}
                  </span>
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setStep(1)}
                  >
                    Changer
                  </button>
                </div>

                <div className="row g-3">
                  {/* Informations personnelles */}
                  <div className="col-12">
                    <h6 className="text-primary border-bottom pb-2 mb-3">
                      <i className="bi bi-person me-2"></i>
                      Informations personnelles
                    </h6>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Prénom *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      placeholder="Ahmed"
                    />
                    {errors.first_name && <div className="invalid-feedback">{errors.first_name}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Nom *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      placeholder="Ben Ali"
                    />
                    {errors.last_name && <div className="invalid-feedback">{errors.last_name}</div>}
                  </div>

                  <div className="col-md-8">
                    <label className="form-label">Nom d'utilisateur *</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className={`form-control ${errors.username ? 'is-invalid' : ''}`}
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        placeholder="ahmed.benali123"
                      />
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => setForm({ ...form, username: generateUsername() })}
                        title="Générer automatiquement"
                      >
                        <i className="bi bi-magic"></i>
                      </button>
                    </div>
                    {errors.username && <div className="invalid-feedback">{errors.username}</div>}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">
                      Email {form.role === 'doctor' && '*'}
                    </label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@exemple.com"
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Téléphone</label>
                    <input
                      type="tel"
                      className={`form-control ${errors.phone_number ? 'is-invalid' : ''}`}
                      value={form.phone_number}
                      onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                      placeholder="+216 XX XXX XXX"
                    />
                    {errors.phone_number && <div className="invalid-feedback">{errors.phone_number}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Ville</label>
                    <select
                      className="form-select"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    >
                      <option value="">-- Sélectionner --</option>
                      {cities.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.governorate_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Patient spécifique */}
                  {form.role === 'patient' && (
                    <>
                      <div className="col-12 mt-4">
                        <h6 className="text-primary border-bottom pb-2 mb-3">
                          <i className="bi bi-heart-pulse me-2"></i>
                          Informations Patient
                        </h6>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Date de naissance *</label>
                        <input
                          type="date"
                          className={`form-control ${errors.date_of_birth ? 'is-invalid' : ''}`}
                          value={form.date_of_birth}
                          onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                        />
                        {errors.date_of_birth && <div className="invalid-feedback">{errors.date_of_birth}</div>}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Genre</label>
                        <select
                          className="form-select"
                          value={form.gender}
                          onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        >
                          {GENDER_CHOICES.map(g => (
                            <option key={g.value} value={g.value}>{g.icon} {g.label}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* Mot de passe */}
                  <div className="col-12 mt-4">
                    <h6 className="text-primary border-bottom pb-2 mb-3">
                      <i className="bi bi-key me-2"></i>
                      Mot de passe
                    </h6>
                  </div>

                  <div className="col-12">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="generatePassword"
                        checked={form.generatePassword}
                        onChange={(e) => setForm({ ...form, generatePassword: e.target.checked, password: '' })}
                      />
                      <label className="form-check-label" htmlFor="generatePassword">
                        Générer un mot de passe automatiquement
                      </label>
                    </div>
                  </div>

                  {!form.generatePassword && (
                    <div className="col-md-6">
                      <label className="form-label">Mot de passe *</label>
                      <input
                        type="password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Min. 8 caractères"
                      />
                      {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                    </div>
                  )}

                  {/* Options */}
                  <div className="col-12 mt-4">
                    <h6 className="text-primary border-bottom pb-2 mb-3">
                      <i className="bi bi-gear me-2"></i>
                      Options
                    </h6>
                  </div>

                  <div className="col-md-6">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="is_active"
                        checked={form.is_active}
                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="is_active">
                        Compte actif immédiatement
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ====================== ÉTAPE 3: CONFIRMATION ====================== */}
            {step === 3 && (
              <div>
                <div className="text-center mb-4">
                  <div className="display-4 text-success mb-2">✅</div>
                  <h5>Vérifiez les informations</h5>
                  <p className="text-muted">Confirmez la création de cet utilisateur</p>
                </div>

                <div className="card bg-light">
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <p><strong>Rôle:</strong> <span className="badge bg-primary">{selectedRole?.icon} {selectedRole?.label}</span></p>
                        <p><strong>Nom d'utilisateur:</strong> {form.username}</p>
                        <p><strong>Nom complet:</strong> {form.first_name} {form.last_name}</p>
                        <p><strong>Email:</strong> {form.email || '-'}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Téléphone:</strong> {form.phone_number || '-'}</p>
                        <p><strong>Statut:</strong> {form.is_active ? '✅ Actif' : '⏸️ Inactif'}</p>
                        {form.role === 'patient' && (
                          <>
                            <p><strong>Date de naissance:</strong> {form.date_of_birth}</p>
                            <p><strong>Genre:</strong> {GENDER_CHOICES.find(g => g.value === form.gender)?.label}</p>
                          </>
                        )}
                        <p>
                          <strong>Mot de passe:</strong>{' '}
                          {form.generatePassword ? (
                            <span className="badge bg-info">Sera généré automatiquement</span>
                          ) : (
                            <span className="badge bg-secondary">Défini manuellement</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="alert alert-info mt-3">
                  <i className="bi bi-info-circle me-2"></i>
                  L'utilisateur pourra modifier son mot de passe après la première connexion.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            {step > 1 && (
              <button type="button" className="btn btn-outline-secondary me-auto" onClick={prevStep}>
                <i className="bi bi-arrow-left me-2"></i>
                Retour
              </button>
            )}
            
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>

            {step < 3 ? (
              <button type="button" className="btn btn-primary" onClick={nextStep}>
                Suivant
                <i className="bi bi-arrow-right ms-2"></i>
              </button>
            ) : (
              <button 
                type="button" 
                className="btn btn-success" 
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Création en cours...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-2"></i>
                    Créer l'utilisateur
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}