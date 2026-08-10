import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import MapView from '../../components/MapView';

// ✅ Helper pour corriger les URLs des images (logo et bannière)
const getMediaUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `http://localhost:8000${url}`;
};

// ── Composant pour les horaires ──
const DAYS = [
    { key: 'lundi', label: 'Lundi' }, { key: 'mardi', label: 'Mardi' }, { key: 'mercredi', label: 'Mercredi' },
    { key: 'jeudi', label: 'Jeudi' }, { key: 'vendredi', label: 'Vendredi' }, { key: 'samedi', label: 'Samedi' }, { key: 'dimanche', label: 'Dimanche' },
];

const WeeklyHoursPicker = ({ value, onChange, label }) => {
    let parsed = {};
    try { parsed = typeof value === 'string' ? JSON.parse(value || '{}') : (value || {}); } catch (e) {}
    
    const daysState = DAYS.map(day => {
        const raw = parsed[day.key];
        if (raw && typeof raw === 'string' && raw.includes('-')) {
            const [start, end] = raw.split('-').map(s => s.trim());
            return { ...day, enabled: true, start, end };
        }
        return { ...day, enabled: false, start: '08:00', end: '17:00' };
    });

    const toggleDay = (index) => {
        const updated = [...daysState];
        updated[index] = { ...updated[index], enabled: !updated[index].enabled };
        convertAndSend(updated);
    };

    const changeTime = (index, field, val) => {
        const updated = [...daysState];
        updated[index] = { ...updated[index], [field]: val };
        convertAndSend(updated);
    };

    const convertAndSend = (days) => {
        const json = {};
        days.forEach(d => { if (d.enabled) json[d.key] = `${d.start}-${d.end}`; });
        onChange(JSON.stringify(json));
    };

    return (
        <div className="mb-3">
            <label className="form-label fw-bold text-secondary">{label}</label>
            <div className="card border">
                <div className="card-body p-0">
                    <table className="table table-sm mb-0 align-middle">
                        <thead className="table-light"><tr><th style={{ width: '40px' }}></th><th>Jour</th><th style={{ width: '140px' }}>Début</th><th style={{ width: '140px' }}>Fin</th></tr></thead>
                        <tbody>
                            {daysState.map((day, idx) => (
                                <tr key={day.key} className={!day.enabled ? 'table-secondary opacity-50' : ''}>
                                    <td className="text-center">
                                        <div className="form-check form-switch m-0">
                                            <input className="form-check-input" type="checkbox" checked={day.enabled} onChange={() => toggleDay(idx)} id={`${label}-${day.key}`} />
                                        </div>
                                    </td>
                                    <td><label className="form-check-label fw-semibold mb-0" htmlFor={`${label}-${day.key}`}>{day.label}</label></td>
                                    <td><input type="time" className="form-control form-control-sm" value={day.start} onChange={e => changeTime(idx, 'start', e.target.value)} disabled={!day.enabled} /></td>
                                    <td><input type="time" className="form-control form-control-sm" value={day.end} onChange={e => changeTime(idx, 'end', e.target.value)} disabled={!day.enabled} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default function PharmacyProfile() {
  const [pharmacy, setPharmacy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [form, setForm] = useState({
    name: '', address: '', city: '', phone_number: '', email: '', 
    is_on_duty: false, latitude: '', longitude: '', opening_hours: '{}',
    logo_file: null, banner_file: null
  });

  useEffect(() => {
    api.get('/pharmacy/pharmacist/my-pharmacy/')
      .then(r => {
        setPharmacy(r.data);
        setForm({
          name: r.data.name || '',
          address: r.data.address || '',
          city: r.data.city || '',
          phone_number: r.data.phone_number || '',
          email: r.data.email || '',
          is_on_duty: r.data.is_on_duty || false,
          latitude: r.data.latitude || '',
          longitude: r.data.longitude || '',
          opening_hours: JSON.stringify(r.data.opening_hours || {}),
          logo_file: null,
          banner_file: null
        });
      })
      .catch(() => setMessage({ type: 'danger', text: 'Profil pharmacie introuvable.' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('address', form.address);
    formData.append('city', form.city);
    formData.append('phone_number', form.phone_number);
    formData.append('email', form.email);
    formData.append('is_on_duty', form.is_on_duty);
    formData.append('latitude', form.latitude);
    formData.append('longitude', form.longitude);
    formData.append('opening_hours', form.opening_hours);

    if (form.logo_file) formData.append('logo', form.logo_file);
    if (form.banner_file) formData.append('banner', form.banner_file);

    api.patch('/pharmacy/pharmacist/my-pharmacy/', formData, {
        headers: { 'Content-Type': undefined },
        transformRequest: [(data, headers) => data]
    })
      .then(r => {
        setPharmacy(r.data);
        setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
      })
      .catch(() => setMessage({ type: 'danger', text: 'Erreur lors de la mise à jour.' }))
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  // Préparation des données pour la carte
  const mapPharmacies = pharmacy?.latitude && pharmacy?.longitude ? [{ 
    id: pharmacy.id, 
    name: pharmacy.name, 
    latitude: parseFloat(pharmacy.latitude), 
    longitude: parseFloat(pharmacy.longitude) 
  }] : [];

  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <h2 className="fw-bold mb-1"><i className="bi bi-shop me-2 text-primary"></i>Profil de la Pharmacie</h2>
        <p className="text-muted mb-0">Gérez les informations de votre officine.</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type} alert-dismissible fade show`}>
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      <div className="row g-4">
        {/* Colonne Gauche : Aperçu et Carte */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm text-center p-4 mb-4" style={{ borderRadius: 16 }}>
            {pharmacy?.logo ? (
              <img src={getMediaUrl(pharmacy.logo)} alt={pharmacy.name} className="rounded-circle mx-auto mb-3" style={{ width: 120, height: 120, objectFit: 'cover', border: '4px solid #f8fafc' }} />
            ) : (
              <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: 120, height: 120 }}>
                <i className="bi bi-shop text-primary" style={{ fontSize: '3rem' }}></i>
              </div>
            )}
            <h4 className="fw-bold mb-1">{pharmacy?.name}</h4>
            <p className="text-muted small mb-3">{pharmacy?.city_name}</p>
            <div className="form-check form-switch d-flex justify-content-center">
              <input className="form-check-input me-2" type="checkbox" id="dutySwitch" checked={form.is_on_duty} onChange={e => setForm({...form, is_on_duty: e.target.checked})} />
              <label className="form-check-label fw-semibold" htmlFor="dutySwitch">Pharmacie de garde</label>
            </div>
          </div>

          {mapPharmacies.length > 0 && (
             <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: 16 }}>
                <div className="card-header bg-white py-3">
                    <h6 className="mb-0 fw-bold"><i className="bi bi-geo-alt-fill text-danger me-2"></i>Localisation</h6>
                </div>
                <div style={{ height: 300 }}>
                    <MapView cabinets={mapPharmacies} />
                </div>
             </div>
          )}
        </div>

        {/* Colonne Droite : Formulaire */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                
                {/* Uploads */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Logo de la pharmacie</label>
                    <input type="file" className="form-control" accept="image/*" onChange={e => setForm({...form, logo_file: e.target.files[0]})} />
                    {pharmacy?.logo && !form.logo_file && <small className="text-muted d-block mt-1">Logo actuel: <a href={getMediaUrl(pharmacy.logo)} target="_blank" rel="noreferrer">Voir</a></small>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Photo de couverture (Bannière)</label>
                    <input type="file" className="form-control" accept="image/*" onChange={e => setForm({...form, banner_file: e.target.files[0]})} />
                    {pharmacy?.banner && !form.banner_file && <small className="text-muted d-block mt-1">Bannière actuelle: <a href={getMediaUrl(pharmacy.banner)} target="_blank" rel="noreferrer">Voir</a></small>}
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Nom de la pharmacie</label>
                    <input type="text" className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Téléphone</label>
                    <input type="tel" className="form-control" value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Adresse</label>
                    <textarea className="form-control" rows="2" value={form.address} onChange={e => setForm({...form, address: e.target.value})}></textarea>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Latitude</label>
                    <input type="text" className="form-control" value={form.latitude} onChange={e => setForm({...form, latitude: e.target.value})} placeholder="Ex: 36.8065" />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Longitude</label>
                    <input type="text" className="form-control" value={form.longitude} onChange={e => setForm({...form, longitude: e.target.value})} placeholder="Ex: 10.1815" />
                  </div>
                </div>

                <div className="mt-4">
                  <WeeklyHoursPicker label="Horaires d'ouverture" value={form.opening_hours} onChange={val => setForm({...form, opening_hours: val})} />
                </div>

                <div className="mt-4">
                  <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-check-lg me-1"></i> Sauvegarder les modifications</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}