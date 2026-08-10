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
  const [cities, setCities] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(user?.profile_picture_url || null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/users/cities/?page_size=500')
      .then(res => setCities(res.data.results || res.data || []))
      .catch(() => {});
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

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
    <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
      <div className="card-header bg-white py-3 border-0">
        <h3 className="card-title mb-0 fw-bold text-primary"><i className="bi bi-person-gear me-2"></i>Informations générales</h3>
      </div>
      <div className="card-body p-4">
        {message && <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-danger'}`}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-4 text-center mb-4">
              <div className="position-relative d-inline-block">
                {preview ? (
                  <img src={preview} alt="Profil" className="rounded-circle shadow" style={{width:'140px', height:'140px', objectFit:'cover', border: '4px solid white'}} />
                ) : (
                  <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white" style={{width:'140px', height:'140px', border: '4px solid white', fontSize: '3rem'}}>
                    <i className="bi bi-person"></i>
                  </div>
                )}
                <label className="btn btn-light btn-sm rounded-circle shadow position-absolute bottom-0 end-0" style={{width: '40px', height: '40px'}}>
                  <i className="bi bi-camera"></i>
                  <input type="file" accept="image/*" onChange={handlePhoto} hidden />
                </label>
              </div>
            </div>

            <div className="col-md-8">
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small fw-bold">Prénom</label>
                  <input type="text" name="first_name" value={form.first_name} onChange={handleChange} className="form-control" />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold">Nom</label>
                  <input type="text" name="last_name" value={form.last_name} onChange={handleChange} className="form-control" />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold">Téléphone</label>
                  <input type="tel" name="phone_number" value={form.phone_number} onChange={handleChange} className="form-control" />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold">Adresse</label>
                  <textarea name="address" value={form.address} onChange={handleChange} className="form-control" rows="2"></textarea>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold">Ville</label>
                  <select name="city" value={form.city} onChange={handleChange} className="form-select">
                    <option value="">-- Choisir --</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name} ({c.governorate_name})</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold">Langue</label>
                  <select name="language_preference" value={form.language_preference} onChange={handleChange} className="form-select">
                    <option value="fr">Français</option>
                    <option value="ar">Arabe</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-100 mt-4" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-check-lg me-2"></i>Enregistrer les modifications</>}
          </button>
        </form>
      </div>
    </div>
  );
}