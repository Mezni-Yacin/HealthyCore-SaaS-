// src/components/ProfileForm.jsx
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function ProfileForm({ user, refreshUser }) {
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone_number: user?.phone_number || '',
    address: user?.address || '',
    city: user?.city || '',
    language_preference: user?.language_preference || 'fr',
  });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(user?.profile_picture || null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const data = new FormData();
    Object.keys(form).forEach(key => {
      if (form[key]) data.append(key, form[key]);
    });
    if (photo) data.append('profile_picture', photo);

    try {
      await api.patch('/users/profile/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage('✅ Profil mis à jour avec succès !');
      refreshUser();
    } catch (err) {
      setMessage('❌ Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card shadow-lg">
      <div className="card-body p-5">
        <h3 className="card-title text-primary mb-4">Informations générales</h3>

        {message && <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-danger'}`}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-4 text-center mb-4">
              <img src={preview || '/default-avatar.png'} alt="Profil" className="rounded-circle" style={{width:'160px', height:'160px', objectFit:'cover'}} />
              <label className="btn btn-outline-primary mt-3">
                Changer photo
                <input type="file" accept="image/*" onChange={handlePhoto} hidden />
              </label>
            </div>

            <div className="col-md-8">
              <div className="row g-3">
                <div className="col-6">
                  <label>Prénom</label>
                  <input type="text" name="first_name" value={form.first_name} onChange={handleChange} className="form-control" />
                </div>
                <div className="col-6">
                  <label>Nom</label>
                  <input type="text" name="last_name" value={form.last_name} onChange={handleChange} className="form-control" />
                </div>
                <div className="col-12">
                  <label>Téléphone</label>
                  <input type="tel" name="phone_number" value={form.phone_number} onChange={handleChange} className="form-control" />
                </div>
                <div className="col-12">
                  <label>Adresse</label>
                  <textarea name="address" value={form.address} onChange={handleChange} className="form-control" rows="2"></textarea>
                </div>
                <div className="col-6">
                  <label>Ville (ID)</label>
                  <input type="number" name="city" value={form.city} onChange={handleChange} className="form-control" />
                </div>
                <div className="col-6">
                  <label>Langue</label>
                  <select name="language_preference" value={form.language_preference} onChange={handleChange} className="form-select">
                    <option value="fr">Français</option>
                    <option value="ar">Arabe</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-100 mt-4" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </form>
      </div>
    </div>
  );
}