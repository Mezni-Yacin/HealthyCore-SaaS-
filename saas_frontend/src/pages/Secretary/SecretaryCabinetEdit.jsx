import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';  
// ── Helpers ──────────────────────────────────────────────────────────────
const DAYS = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
];

export default function SecretaryCabinetEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cabinet, setCabinet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('info');

  // ── Form state ──
  const [form, setForm] = useState({
    name: '', address: '', city: '', phone_number: '', email: '',
    website: '', cnam_affiliated: false, cnam_code: '', accreditation: '',
    appointment_duration: '', latitude: '', longitude: '',
  });
  const [openingHours, setOpeningHours] = useState({});
  const [specialties, setSpecialties] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');

  // ── Dropdown data ──
  const [cities, setCities] = useState([]);
  const [allSpecialties, setAllSpecialties] = useState([]);
  const [governorates, setGovernorates] = useState([]);

  // ── Fetch data ──
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cabRes, citiesRes, govRes, specRes] = await Promise.all([
          api.get(`/cabinets/secretary/cabinets/${id}/`),
          api.get('/cabinets/my-cabinets/dropdown_cities/'),
          api.get('/cabinets/my-cabinets/dropdown_governorates/'),
          api.get('/cabinets/my-cabinets/dropdown_specialties/'),
        ]);
        const c = cabRes.data;
        setCabinet(c);

        setForm({
          name: c.name || '', address: c.address || '',
          city: c.city || '', phone_number: c.phone_number || '',
          email: c.email || '', website: c.website || '',
          cnam_affiliated: c.cnam_affiliated || false,
          cnam_code: c.cnam_code || '', accreditation: c.accreditation || '',
          appointment_duration: c.appointment_duration || '',
          latitude: c.latitude || '', longitude: c.longitude || '',
        });

        // Opening hours
        const oh = {};
        DAYS.forEach(d => { oh[d.key] = c.opening_hours?.[d.key] || []; });
        setOpeningHours(oh);

        // Specialties (IDs)
        setSpecialties((c.specialties_list || c.specialties_names || []).map(s => s.id || s));

        // Previews
        if (c.logo_url) setLogoPreview(c.logo_url);
        if (c.banner_url) setBannerPreview(c.banner_url);

        setCities(citiesRes.data);
        setGovernorates(govRes.data);
        setAllSpecialties(specRes.data);
      } catch (err) {
        console.error(err);
        setError("Ce cabinet n'existe pas ou vous n'y avez pas accès.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ── Handlers ──
  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleOpeningHoursChange = (day, slots) => {
    setOpeningHours(prev => ({ ...prev, [day]: slots }));
  };

  const addSlot = (day) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), '09:00-17:00'],
    }));
  };

  const removeSlot = (day, index) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: (prev[day] || []).filter((_, i) => i !== index),
    }));
  };

  const updateSlot = (day, index, value) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: (prev[day] || []).map((s, i) => i === index ? value : s),
    }));
  };

  const toggleSpecialty = (specId) => {
    setSpecialties(prev =>
      prev.includes(specId) ? prev.filter(id => id !== specId) : [...prev, specId]
    );
  };

  const handleFileChange = (type, file) => {
    if (type === 'logo') {
      setLogoFile(file);
      if (file) setLogoPreview(URL.createObjectURL(file));
    } else {
      setBannerFile(file);
      if (file) setBannerPreview(URL.createObjectURL(file));
    }
  };

  // ── Save ──
  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const data = new FormData();
      // Text fields
      Object.entries(form).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined) {
          data.append(key, val);
        }
      });
      if (form.cnam_affiliated) data.append('cnam_affiliated', 'true');
      if (form.appointment_duration) data.append('appointment_duration', form.appointment_duration);
      if (form.latitude) data.append('latitude', form.latitude);
      if (form.longitude) data.append('longitude', form.longitude);

      // Opening hours as JSON
      const cleanOH = {};
      Object.entries(openingHours).forEach(([day, slots]) => {
        const validSlots = slots.filter(s => s && s.includes('-'));
        if (validSlots.length > 0) cleanOH[day] = validSlots;
      });
      if (Object.keys(cleanOH).length > 0) {
        data.append('opening_hours', JSON.stringify(cleanOH));
      } else {
        data.append('opening_hours', JSON.stringify({}));
      }

      // Specialties
      specialties.forEach(id => data.append('specialties', id));

      // Files
      if (logoFile) data.append('logo', logoFile);
      if (bannerFile) data.append('banner', bannerFile);

      const res = await api.patch(`/cabinets/secretary/cabinets/${id}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCabinet(res.data);
      setSuccess('Cabinet mis à jour avec succès !');
      setLogoFile(null);
      setBannerFile(null);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data;
      if (typeof detail === 'object') {
        const msgs = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join(' | '));
      } else {
        setError(detail?.detail || detail?.error || "Erreur lors de la sauvegarde.");
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="container py-4 text-center">
        <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="text-muted mt-3">Chargement du cabinet...</p>
      </div>
    );
  }

  if (error && !cabinet) {
    return (
      <div className="container py-5 text-center">
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#fef2f2' }}
          className="d-inline-flex align-items-center justify-content-center mb-4">
          <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '2.5rem', color: '#dc2626' }}></i>
        </div>
        <h4 className="fw-bold text-dark mb-2">{error}</h4>
        <Link to="/secretary-cabinets" className="btn btn-primary mt-2">
          <i className="bi bi-arrow-left me-2"></i>Retour
        </Link>
      </div>
    );
  }

  // ── City filter by governorate ──
  const filteredCities = cities;

  return (
    <div className="container-fluid py-4">
      {/* ═══════ BREADCRUMB + HEADER ═══════ */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1" style={{ fontSize: '0.85rem' }}>
              <li className="breadcrumb-item"><Link to="/secretary-cabinets" className="text-decoration-none">Mes Cabinets</Link></li>
              <li className="breadcrumb-item active">{cabinet?.name || 'Édition'}</li>
            </ol>
          </nav>
          <h3 className="fw-bold text-dark mb-0">
            <i className="bi bi-pencil-square me-2" style={{ color: '#7c3aed' }}></i>
            Modifier le cabinet
          </h3>
        </div>
        <Link to={`/cabinet-profile/${id}`} className="btn btn-outline-secondary" style={{ borderRadius: 10 }}>
          <i className="bi bi-eye me-1"></i>Voir le profil
        </Link>
      </div>

      {/* ═══════ ALERTS ═══════ */}
      {error && <div className="alert alert-danger d-flex align-items-center"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}
      {success && <div className="alert alert-success d-flex align-items-center"><i className="bi bi-check-circle-fill me-2"></i>{success}</div>}

      {/* ═══════ TABS ═══════ */}
      <div className="d-flex gap-2 mb-4 p-1" style={{ background: '#e2e8f0', borderRadius: 14 }}>
        {[
          { key: 'info', icon: 'bi-info-circle', label: 'Informations' },
          { key: 'hours', icon: 'bi-clock', label: 'Horaires' },
          { key: 'media', icon: 'bi-image', label: 'Logo & Bannière' },
          { key: 'location', icon: 'bi-geo-alt', label: 'Localisation' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, textAlign: 'center', borderRadius: 50, padding: '10px 16px',
              fontWeight: 600, fontSize: '0.85rem', border: 'none', cursor: 'pointer',
              background: activeTab === tab.key ? 'white' : 'transparent',
              color: activeTab === tab.key ? '#6d28d9' : '#64748b',
              boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease',
            }}>
            <i className={`bi ${tab.icon} me-1`}></i>{tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        <div className="row g-4">
          {/* ═══════ TAB : INFORMATIONS ═══════ */}
          {activeTab === 'info' && (
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
                <div className="card-body p-4">
                  <h5 className="fw-bold text-dark mb-4">
                    <i className="bi bi-info-circle-fill me-2" style={{ color: '#7c3aed' }}></i>
                    Informations générales
                  </h5>

                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label fw-semibold small">Nom du cabinet *</label>
                      <input type="text" className="form-control" value={form.name}
                        onChange={e => handleFormChange('name', e.target.value)} required />
                    </div>

                    <div className="col-md-12">
                      <label className="form-label fw-semibold small">Adresse *</label>
                      <input type="text" className="form-control" value={form.address}
                        onChange={e => handleFormChange('address', e.target.value)} />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Gouvernorat</label>
                      <select className="form-select" value={''} onChange={e => {
                        const govId = e.target.value;
                        if (govId) {
                          api.get(`/cabinets/my-cabinets/dropdown_cities/?governorate=${govId}`)
                            .then(r => setCities(r.data));
                        }
                      }}>
                        <option value="">Tous les gouvernorats</option>
                        {governorates.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Ville</label>
                      <select className="form-select" value={form.city}
                        onChange={e => handleFormChange('city', e.target.value)}>
                        <option value="">Sélectionner...</option>
                        {filteredCities.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Téléphone</label>
                      <input type="tel" className="form-control" value={form.phone_number}
                        onChange={e => handleFormChange('phone_number', e.target.value)} />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Email</label>
                      <input type="email" className="form-control" value={form.email}
                        onChange={e => handleFormChange('email', e.target.value)} />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Site web</label>
                      <input type="url" className="form-control" value={form.website}
                        onChange={e => handleFormChange('website', e.target.value)}
                        placeholder="https://www.exemple.com" />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Durée consultation (min)</label>
                      <input type="number" className="form-control" value={form.appointment_duration}
                        onChange={e => handleFormChange('appointment_duration', e.target.value)}
                        min="5" max="480" />
                    </div>

                    <div className="col-md-6">
                      <div className="form-check form-switch mt-4">
                        <input className="form-check-input" type="checkbox" role="switch"
                          id="cnam_switch" checked={form.cnam_affiliated}
                          onChange={e => handleFormChange('cnam_affiliated', e.target.checked)} />
                        <label className="form-check-label fw-semibold small" htmlFor="cnam_switch">
                          Affilié CNAM
                        </label>
                      </div>
                    </div>

                    {form.cnam_affiliated && (
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">Code CNAM</label>
                        <input type="text" className="form-control" value={form.cnam_code}
                          onChange={e => handleFormChange('cnam_code', e.target.value)} />
                      </div>
                    )}

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Accréditation</label>
                      <input type="text" className="form-control" value={form.accreditation}
                        onChange={e => handleFormChange('accreditation', e.target.value)} />
                    </div>

                    {/* ── Spécialités ── */}
                    <div className="col-12 mt-4">
                      <label className="form-label fw-semibold small">
                        <i className="bi bi-tag me-1"></i>Spécialités
                      </label>
                      <div className="d-flex flex-wrap gap-2 p-3" style={{ background: '#f8fafc', borderRadius: 12 }}>
                        {allSpecialties.map(s => (
                          <button key={s.id} type="button" onClick={() => toggleSpecialty(s.id)}
                            className="btn btn-sm"
                            style={{
                              borderRadius: 20, fontSize: '0.8rem', fontWeight: 500,
                              background: specialties.includes(s.id) ? '#7c3aed' : '#e2e8f0',
                              color: specialties.includes(s.id) ? '#fff' : '#64748b',
                              border: 'none',
                            }}>
                            {specialties.includes(s.id) && <i className="bi bi-check-lg me-1"></i>}
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ TAB : HORAIRES ═══════ */}
          {activeTab === 'hours' && (
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
                <div className="card-body p-4">
                  <h5 className="fw-bold text-dark mb-4">
                    <i className="bi bi-clock-fill me-2" style={{ color: '#7c3aed' }}></i>
                    Horaires d'ouverture
                  </h5>
                  <p className="text-muted small mb-4">
                    Ajoutez ou modifiez les créneaux pour chaque jour. Format : HH:MM-HH:MM (ex: 08:00-17:00).
                    Utilisez 00:00 pour indiquer minuit.
                  </p>
                  <div className="space-y-3">
                    {DAYS.map(day => (
                      <div key={day.key} className="p-3 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="fw-semibold text-dark">{day.label}</span>
                          <button type="button" className="btn btn-sm btn-outline-primary" style={{ borderRadius: 8, fontSize: '0.8rem' }}
                            onClick={() => addSlot(day.key)}>
                            <i className="bi bi-plus"></i> Ajouter
                          </button>
                        </div>
                        {(openingHours[day.key] || []).length === 0 ? (
                          <span className="text-muted small fst-italic">Fermé</span>
                        ) : (
                          <div className="d-flex flex-column gap-2">
                            {(openingHours[day.key] || []).map((slot, idx) => (
                              <div key={idx} className="d-flex align-items-center gap-2">
                                <input type="text" className="form-control form-control-sm" value={slot}
                                  onChange={e => updateSlot(day.key, idx, e.target.value)}
                                  style={{ maxWidth: 180 }} placeholder="08:00-17:00" />
                                <button type="button" className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeSlot(day.key, idx)} style={{ borderRadius: 8 }}>
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ TAB : LOGO & BANNIÈRE ═══════ */}
          {activeTab === 'media' && (
            <div className="col-lg-8">
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
                    <div className="card-body p-4">
                      <h6 className="fw-bold text-dark mb-3">
                        <i className="bi bi-image me-2" style={{ color: '#7c3aed' }}></i>Logo du cabinet
                      </h6>
                      <div className="text-center mb-3">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo"
                            style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 16, border: '3px solid #e2e8f0' }} />
                        ) : (
                          <div style={{ width: 120, height: 120, borderRadius: 16, background: '#f1f5f9' }}
                            className="d-inline-flex align-items-center justify-content-center">
                            <i className="bi bi-image text-muted" style={{ fontSize: '2rem' }}></i>
                          </div>
                        )}
                      </div>
                      <input type="file" className="form-control form-control-sm" accept="image/*"
                        onChange={e => handleFileChange('logo', e.target.files[0])} />
                      <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>PNG, JPG — Max 2 Mo</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
                    <div className="card-body p-4">
                      <h6 className="fw-bold text-dark mb-3">
                        <i className="bi bi-panorama me-2" style={{ color: '#7c3aed' }}></i>Bannière
                      </h6>
                      <div className="text-center mb-3">
                        {bannerPreview ? (
                          <img src={bannerPreview} alt="Bannière"
                            style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 12, border: '2px solid #e2e8f0' }} />
                        ) : (
                          <div style={{ width: '100%', height: 120, borderRadius: 12, background: '#f1f5f9' }}
                            className="d-inline-flex align-items-center justify-content-center">
                            <i className="bi bi-panorama text-muted" style={{ fontSize: '2rem' }}></i>
                          </div>
                        )}
                      </div>
                      <input type="file" className="form-control form-control-sm" accept="image/*"
                        onChange={e => handleFileChange('banner', e.target.files[0])} />
                      <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>PNG, JPG — 1200×400 recommandé</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ TAB : LOCALISATION ═══════ */}
          {activeTab === 'location' && (
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
                <div className="card-body p-4">
                  <h5 className="fw-bold text-dark mb-4">
                    <i className="bi bi-geo-alt-fill me-2" style={{ color: '#7c3aed' }}></i>
                    Localisation
                  </h5>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Latitude</label>
                      <input type="number" step="any" className="form-control" value={form.latitude}
                        onChange={e => handleFormChange('latitude', e.target.value)}
                        placeholder="36.8065" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Longitude</label>
                      <input type="number" step="any" className="form-control" value={form.longitude}
                        onChange={e => handleFormChange('longitude', e.target.value)}
                        placeholder="10.1815" />
                    </div>
                    <div className="col-12">
                      <div className="text-muted small mt-2">
                        <i className="bi bi-info-circle me-1"></i>
                        Vous pouvez obtenir les coordonnées depuis
                        <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="ms-1 text-decoration-none">
                          Google Maps
                        </a>.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ SIDEBAR INFO ═══════ */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
              <div className="card-body p-4">
                <h6 className="fw-bold text-dark mb-3">
                  <i className="bi bi-info-circle me-2" style={{ color: '#7c3aed' }}></i>
                  Aperçu
                </h6>
                {cabinet && (
                  <div>
                    <div className="d-flex gap-3 mb-3">
                      {cabinet.logo_url ? (
                        <img src={logoPreview || cabinet.logo_url} alt=""
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 12 }} />
                      ) : (
                        <div className="d-flex align-items-center justify-content-center"
                          style={{ width: 48, height: 48, borderRadius: 12, background: '#ede9fe' }}>
                          <i className="bi bi-hospital" style={{ color: '#7c3aed' }}></i>
                        </div>
                      )}
                      <div>
                        <div className="fw-semibold text-dark small">{form.name || 'Sans nom'}</div>
                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>{form.address || 'Non renseigné'}</div>
                      </div>
                    </div>

                    <div className="space-y-2 mt-3">
                      {form.phone_number && (
                        <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                          <i className="bi bi-telephone text-muted"></i>
                          <span>{form.phone_number}</span>
                        </div>
                      )}
                      {form.email && (
                        <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
                          <i className="bi bi-envelope text-muted"></i>
                          <span>{form.email}</span>
                        </div>
                      )}
                      {form.cnam_affiliated && (
                        <span className="badge mt-2" style={{ background: '#ecfdf5', color: '#059669', borderRadius: 8 }}>
                          <i className="bi bi-shield-check me-1"></i>CNAM
                        </span>
                      )}
                    </div>

                    {cabinet.doctors_info && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid #e2e8f0' }}>
                        <div className="fw-semibold small text-muted mb-2">
                          <i className="bi bi-people-fill me-1"></i>
                          {cabinet.doctors_info.length} médecin{cabinet.doctors_info.length !== 1 ? 's' : ''}
                        </div>
                        <div className="d-flex flex-column gap-1">
                          {cabinet.doctors_info.slice(0, 5).map(doc => (
                            <div key={doc.id} className="d-flex align-items-center gap-2" style={{ fontSize: '0.8rem' }}>
                              {doc.profile_photo_url ? (
                                <img src={doc.profile_photo_url} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: 24, height: 24, borderRadius: 6, background: '#e2e8f0' }}
                                  className="d-flex align-items-center justify-content-center">
                                  <i className="bi bi-person" style={{ fontSize: '0.65rem' }}></i>
                                </div>
                              )}
                              <span>Dr. {doc.full_name}</span>
                              <span className="text-muted">— {doc.specialty}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="d-flex flex-column gap-2">
              <button type="submit" className="btn btn-primary fw-semibold text-white border-0"
                style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', borderRadius: 12, padding: '12px' }}
                disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-2"></i>
                    Enregistrer les modifications
                  </>
                )}
              </button>
              <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 12 }}
                onClick={() => navigate('/secretary-cabinets')}>
                <i className="bi bi-x-lg me-2"></i>Annuler
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}