// src/pages/UsersManagement.jsx
// VERSION CORRIGÉE V2 - Avec affichage correct des dates et is_verified

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import CreateUserModal from '../../components/CreateUserModal';

// Configuration des rôles
const ROLE_CHOICES = [
  { value: 'super_admin', label: 'Super Administrateur', color: 'danger' },
  { value: 'admin', label: 'Administrateur', color: 'warning' },
  { value: 'doctor', label: 'Médecin', color: 'primary' },
  { value: 'lab_staff', label: 'Personnel de Laboratoire', color: 'info' },
  { value: 'patient', label: 'Patient', color: 'success' },
  { value: 'secretary', label: 'Secrétaire', color: 'secondary' },
  { value: 'pharmacist', label: 'Pharmacien', color: 'dark' },
];

const GENDER_CHOICES = [
  { value: 'M', label: 'Homme' },
  { value: 'F', label: 'Femme' },
  { value: 'O', label: 'Autre' },
  { value: 'U', label: 'Non spécifié' },
];

// Helper pour afficher le rôle
const getRoleInfo = (role) => {
  return ROLE_CHOICES.find(r => r.value === role) || { label: role, color: 'secondary' };
};

// Helper pour générer un mot de passe aléatoire
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// ✅ CORRECTION: Helper pour formater les dates correctement
const formatDate = (dateString) => {
  if (!dateString) return '-';
  
  try {
    // Django renvoie les dates au format ISO 8601: "2024-03-26T22:02:24.123456Z"
    const date = new Date(dateString);
    
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    return date.toLocaleDateString('fr-TN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (e) {
    return '-';
  }
};

// ✅ CORRECTION: Helper pour formater la date et l'heure
const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    return date.toLocaleString('fr-TN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '-';
  }
};

// ✅ CORRECTION: Helper pour calculer le temps écoulé
const timeAgo = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
    return `Il y a ${Math.floor(diffDays / 365)} ans`;
  } catch (e) {
    return '';
  }
};

export default function UsersManagement() {
  // États
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Filtres
  const [filters, setFilters] = useState({
    role: '',
    is_active: '',
    search: '',
  });

  // Formulaire d'édition
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'patient',
    phone_number: '',
    address: '',
    city: '',
    language_preference: 'fr',
    is_active: true,
    is_verified: false,
    two_factor_enabled: false,
    date_of_birth: '',
    gender: 'U',
  });

  // Nouveau mot de passe
  const [newPassword, setNewPassword] = useState('');

  // Villes
  const [cities, setCities] = useState([]);

  // ====================== CHARGEMENT DES DONNÉES ======================

  const fetchStats = async () => {
    try {
      const res = await api.get('/users/manage/stats/');
      setStats(res.data);
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = {};
      if (filters.role) params.role = filters.role;
      if (filters.is_active) params.is_active = filters.is_active;
      if (filters.search) params.search = filters.search;

      const res = await api.get('/users/manage/', { params });
      const data = res.data.results || res.data;
      
      // ✅ DEBUG: Afficher les données reçues
      console.log('Données utilisateurs reçues:', data);
      
      setUsers(data);
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const res = await api.get('/users/cities/');
      setCities(res.data.results || res.data);
    } catch (err) {
      console.error('Erreur chargement villes:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchCities();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  // ====================== GESTION DES MODALS ======================

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCreateSuccess = (user) => {
    fetchUsers();
    fetchStats();
    
    if (user.generatedPassword) {
      alert(`✅ Utilisateur créé avec succès!\n\nNom d'utilisateur: ${user.username}\nMot de passe: ${user.generatedPassword}\n\n⚠️ Notez bien ce mot de passe, il ne sera plus affiché.`);
    } else {
      alert(`✅ Utilisateur "${user.username}" créé avec succès!`);
    }
  };

  const openEditModal = (user) => {
    setEditForm({
      username: user.username || '',
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role || 'patient',
      phone_number: user.phone_number || '',
      address: user.address || '',
      city: user.city || '',
      language_preference: user.language_preference || 'fr',
      is_active: user.is_active ?? true,
      is_verified: user.is_verified ?? false,
      two_factor_enabled: user.two_factor_enabled ?? false,
      date_of_birth: user.patient_profile?.date_of_birth || '',
      gender: user.patient_profile?.gender || 'U',
    });
    setEditingUser(user);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  const openDetailModal = (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword(generatePassword());
    setShowPasswordModal(true);
  };

  // ====================== ACTIONS CRUD ======================

  const handleUpdate = async (e) => {
    e.preventDefault();

    const payload = {
      username: editForm.username,
      email: editForm.email || null,
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      role: editForm.role,
      phone_number: editForm.phone_number || null,
      address: editForm.address || null,
      city: editForm.city || null,
      language_preference: editForm.language_preference,
      is_active: editForm.is_active,
      is_verified: editForm.is_verified,
      two_factor_enabled: editForm.two_factor_enabled,
    };

    if (editForm.role === 'patient' && editForm.date_of_birth) {
      payload.date_of_birth = editForm.date_of_birth;
      payload.gender = editForm.gender;
    }

    try {
      await api.patch(`/users/manage/${editingUser.id}/`, payload);
      alert('✅ Utilisateur modifié avec succès !');
      fetchUsers();
      fetchStats();
      closeEditModal();
    } catch (err) {
      console.error('Erreur:', err.response?.data);
      let errorMsg = 'Erreur inconnue';
      
      if (err.response?.data) {
        const data = err.response.data;
        const firstError = Object.values(data)[0];
        errorMsg = Array.isArray(firstError) ? firstError[0] : JSON.stringify(data);
      }
      
      alert('❌ Erreur : ' + errorMsg);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`⚠️ Supprimer l'utilisateur "${user.username}" ?\n\nCette action est irréversible.`)) return;
    
    try {
      await api.delete(`/users/manage/${user.id}/`);
      alert('✅ Utilisateur supprimé');
      fetchUsers();
      fetchStats();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Erreur lors de la suppression';
      alert('❌ ' + errorMsg);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      if (user.is_active) {
        await api.post(`/users/manage/${user.id}/deactivate/`);
        alert('✅ Utilisateur désactivé');
      } else {
        await api.post(`/users/manage/${user.id}/activate/`);
        alert('✅ Utilisateur activé');
      }
      fetchUsers();
      fetchStats();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Erreur';
      alert('❌ ' + errorMsg);
    }
  };

  const handleVerify = async (user) => {
    try {
      await api.post(`/users/manage/${user.id}/verify/`);
      alert('✅ Utilisateur vérifié');
      fetchUsers();
    } catch (err) {
      alert('❌ Erreur lors de la vérification');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      alert('❌ Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      await api.post(`/users/manage/${selectedUser.id}/reset_password/`, {
        new_password: newPassword
      });
      alert('✅ Mot de passe réinitialisé avec succès !');
      setShowPasswordModal(false);
    } catch (err) {
      alert('❌ Erreur lors de la réinitialisation');
    }
  };

  // ====================== RENDU ======================

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" />
        <p className="mt-2">Chargement des utilisateurs...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h3 fw-bold text-primary">
          <i className="bi bi-people-fill me-2"></i>
          Gestion des Utilisateurs
        </h2>
        <button className="btn btn-primary btn-lg" onClick={openCreateModal}>
          <i className="bi bi-person-plus me-2"></i>
          Nouvel Utilisateur
        </button>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-2">
            <div className="card bg-primary text-white">
              <div className="card-body text-center py-3">
                <h3 className="mb-0">{stats.total}</h3>
                <small>Total</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-success text-white">
              <div className="card-body text-center py-3">
                <h3 className="mb-0">{stats.active}</h3>
                <small>Actifs</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-secondary text-white">
              <div className="card-body text-center py-3">
                <h3 className="mb-0">{stats.inactive}</h3>
                <small>Inactifs</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-info text-white">
              <div className="card-body text-center py-3">
                <h3 className="mb-0">{stats.verified}</h3>
                <small>Vérifiés</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-warning text-dark">
              <div className="card-body text-center py-3">
                <h3 className="mb-0">{stats.created_this_month}</h3>
                <small>Ce mois</small>
              </div>
            </div>
          </div>
          <div className="col-md-2">
            <div className="card bg-dark text-white">
              <div className="card-body text-center py-3">
                <small>Répartition</small>
                <div style={{ fontSize: '0.7rem' }}>
                  {Object.entries(stats.by_role).slice(0, 3).map(([role, count]) => (
                    <div key={role}>{getRoleInfo(role).label.slice(0, 10)}: {count}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card mb-4">
        <div className="card-body py-2">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small">Rechercher</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nom, email, téléphone..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Rôle</label>
              <select
                className="form-select"
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              >
                <option value="">Tous les rôles</option>
                {ROLE_CHOICES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">Statut</label>
              <select
                className="form-select"
                value={filters.is_active}
                onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              >
                <option value="">Tous</option>
                <option value="true">Actifs</option>
                <option value="false">Inactifs</option>
              </select>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => setFilters({ role: '', is_active: '', search: '' })}
              >
                <i className="bi bi-x-circle me-1"></i>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table des utilisateurs */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Utilisateur</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Téléphone</th>
                <th>Statut</th>
                <th>Vérifié</th>
                <th>Inscription</th>
                <th style={{ width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const roleInfo = getRoleInfo(user.role);
                return (
                  <tr key={user.id} className={!user.is_active ? 'table-secondary' : ''}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div
                          className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white me-2"
                          style={{ width: '40px', height: '40px', fontSize: '1rem' }}
                        >
                          {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-bold">
                            {user.first_name} {user.last_name}
                          </div>
                          <small className="text-muted">@{user.username}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {user.email ? (
                        <a href={`mailto:${user.email}`} className="text-decoration-none">{user.email}</a>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge bg-${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td>{user.phone_number || '-'}</td>
                    <td>
                      <span className={`badge ${user.is_active ? 'bg-success' : 'bg-secondary'}`}>
                        {user.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    {/* ✅ CORRECTION: Affichage correct de is_verified */}
                    <td>
                      {user.is_verified ? (
                        <span className="badge bg-success">
                          <i className="bi bi-check-circle me-1"></i>
                          Vérifié
                        </span>
                      ) : (
                        <span className="badge bg-secondary">
                          <i className="bi bi-clock me-1"></i>
                          En attente
                        </span>
                      )}
                    </td>
                    {/* ✅ CORRECTION: Affichage correct de la date */}
                    <td>
                      <div>
                        <strong>{formatDate(user.created_at)}</strong>
                      </div>
                      <small className="text-muted">{timeAgo(user.created_at)}</small>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-info"
                          onClick={() => openDetailModal(user)}
                          title="Voir détails"
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        <button
                          className="btn btn-outline-warning"
                          onClick={() => openEditModal(user)}
                          title="Modifier"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className={`btn ${user.is_active ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                          onClick={() => handleToggleActive(user)}
                          title={user.is_active ? 'Désactiver' : 'Activer'}
                        >
                          <i className={`bi ${user.is_active ? 'bi-pause' : 'bi-play'}`}></i>
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDelete(user)}
                          title="Supprimer"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center text-muted py-5">
                    <i className="bi bi-people display-4"></i>
                    <p className="mt-2">Aucun utilisateur trouvé</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====================== MODAL CRÉATION (COMPOSANT SÉPARÉ) ====================== */}
      <CreateUserModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* ====================== MODAL ÉDITION ====================== */}
      {showEditModal && editingUser && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">
                  ✏️ Modifier l'utilisateur
                </h5>
                <button type="button" className="btn-close" onClick={closeEditModal}></button>
              </div>
              <form onSubmit={handleUpdate}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Nom d'utilisateur</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Prénom</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Nom</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Rôle</label>
                      <select
                        className="form-select"
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      >
                        {ROLE_CHOICES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Téléphone</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={editForm.phone_number}
                        onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                      />
                    </div>
                    {editForm.role === 'patient' && (
                      <>
                        <div className="col-md-6">
                          <label className="form-label">Date de naissance</label>
                          <input
                            type="date"
                            className="form-control"
                            value={editForm.date_of_birth}
                            onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Genre</label>
                          <select
                            className="form-select"
                            value={editForm.gender}
                            onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                          >
                            {GENDER_CHOICES.map(g => (
                              <option key={g.value} value={g.value}>{g.label}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                    <div className="col-12">
                      <label className="form-label">Adresse</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Ville</label>
                      <select
                        className="form-select"
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      >
                        <option value="">-- Sélectionner --</option>
                        {cities.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.governorate_name})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Langue</label>
                      <select
                        className="form-select"
                        value={editForm.language_preference}
                        onChange={(e) => setEditForm({ ...editForm, language_preference: e.target.value })}
                      >
                        <option value="fr">Français</option>
                        <option value="ar">Arabe</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <div className="row">
                        <div className="col-md-4">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={editForm.is_active}
                              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                            />
                            <label className="form-check-label">Compte actif</label>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={editForm.is_verified}
                              onChange={(e) => setEditForm({ ...editForm, is_verified: e.target.checked })}
                            />
                            <label className="form-check-label">Vérifié</label>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={editForm.two_factor_enabled}
                              onChange={(e) => setEditForm({ ...editForm, two_factor_enabled: e.target.checked })}
                            />
                            <label className="form-check-label">2FA</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-warning">
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ====================== MODAL DÉTAILS ====================== */}
      {showDetailModal && selectedUser && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">👤 Détails de l'utilisateur</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetailModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>Nom d'utilisateur:</strong> {selectedUser.username}</p>
                    <p><strong>Email:</strong> {selectedUser.email || '-'}</p>
                    <p><strong>Nom complet:</strong> {selectedUser.first_name} {selectedUser.last_name}</p>
                    <p><strong>Rôle:</strong> <span className={`badge bg-${getRoleInfo(selectedUser.role).color}`}>{getRoleInfo(selectedUser.role).label}</span></p>
                    <p><strong>Téléphone:</strong> {selectedUser.phone_number || '-'}</p>
                  </div>
                  <div className="col-md-6">
                    <p>
                      <strong>Statut:</strong>{' '}
                      {selectedUser.is_active ? (
                        <span className="badge bg-success">Actif</span>
                      ) : (
                        <span className="badge bg-secondary">Inactif</span>
                      )}
                    </p>
                    <p>
                      <strong>Vérifié:</strong>{' '}
                      {selectedUser.is_verified ? (
                        <span className="badge bg-success">✅ Oui</span>
                      ) : (
                        <span className="badge bg-secondary">❌ Non</span>
                      )}
                    </p>
                    <p>
                      <strong>2FA:</strong>{' '}
                      {selectedUser.two_factor_enabled ? '✅ Activé' : '❌ Désactivé'}
                    </p>
                    {/* ✅ CORRECTION: Affichage correct des dates */}
                    <p><strong>Inscrit le:</strong> {formatDateTime(selectedUser.created_at)}</p>
                    <p><strong>Mis à jour:</strong> {formatDateTime(selectedUser.updated_at)}</p>
                  </div>
                </div>
                
                <div className="border-top pt-3 mt-3">
                  <h6>Actions rapides</h6>
                  <div className="btn-group">
                    <button
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => { setShowDetailModal(false); openEditModal(selectedUser); }}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => { setShowDetailModal(false); openPasswordModal(selectedUser); }}
                    >
                      🔑 Réinitialiser MDP
                    </button>
                    {!selectedUser.is_verified && (
                      <button
                        className="btn btn-outline-success btn-sm"
                        onClick={() => { handleVerify(selectedUser); setShowDetailModal(false); }}
                      >
                        ✓ Vérifier
                      </button>
                    )}
                    <button
                      className={`btn btn-sm ${selectedUser.is_active ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                      onClick={() => { handleToggleActive(selectedUser); setShowDetailModal(false); }}
                    >
                      {selectedUser.is_active ? '⏸️ Désactiver' : '▶️ Activer'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================== MODAL RÉINITIALISATION MOT DE PASSE ====================== */}
      {showPasswordModal && selectedUser && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">🔑 Réinitialiser le mot de passe</h5>
                <button type="button" className="btn-close" onClick={() => setShowPasswordModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>
                  Réinitialiser le mot de passe pour <strong>{selectedUser.username}</strong>
                </p>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nouveau mot de passe"
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setNewPassword(generatePassword())}
                  >
                    🎲 Générer
                  </button>
                </div>
                <small className="text-muted">Minimum 8 caractères</small>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  Annuler
                </button>
                <button className="btn btn-warning" onClick={handleResetPassword}>
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}