import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

export default function Register() {
  const { role } = useParams();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone_number: '', address: '', city: '', password: '', password_confirm: ''
  });
  
  const [patientData, setPatientData] = useState({ 
    date_of_birth: '', gender: 'U', blood_type: '', height: '', weight: '', allergies: '' 
  });
  
  const [doctorData, setDoctorData] = useState({ 
    specialty: '', license_number: '', years_experience: 0 
  });

  const [specialties, setSpecialties] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roleConfig = {
    patient: { label: 'Patient', icon: 'bi-person-fill', color: 'success' },
    doctor: { label: 'Médecin', icon: 'bi-heart-pulse-fill', color: 'danger' },
    pharmacist: { label: 'Pharmacien', icon: 'bi-shop', color: 'primary' },
    lab_staff: { label: 'Personnel de Laboratoire', icon: 'bi-clipboard2-pulse', color: 'info' },
    secretary: { label: 'Secrétaire', icon: 'bi-person-badge-fill', color: 'secondary' },
  };

  const currentRole = roleConfig[role] || roleConfig.patient;

  useEffect(() => {
    if (role === 'doctor') {
      api.get('/users/specialties/')
        .then(res => setSpecialties(res.data.results || res.data || []))
        .catch(err => console.error("Erreur spécialités:", err));
    }
    
    api.get('/users/cities/?page_size=500')
      .then(res => setCities(res.data.results || res.data || []))
      .catch(err => console.error("Erreur villes:", err));
  }, [role]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handlePatientChange = (e) => setPatientData({ ...patientData, [e.target.name]: e.target.value });
  const handleDoctorChange = (e) => setDoctorData({ ...doctorData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (form.password !== form.password_confirm) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    try {
      const payload = { ...form, role: role };
      
      if (role === 'patient') {
        Object.assign(payload, patientData);
      } else if (role === 'doctor') {
        Object.assign(payload, doctorData);
      }

      const res = await api.post('/users/register/', payload);
      
      alert(res.data.detail || 'Compte créé avec succès ! En attente de validation.');
      navigate('/login');
      
    } catch (err) {
      const errData = err.response?.data;
      if (errData) {
        if (errData.detail) {
          setError(errData.detail);
        } else {
          let msg = '';
          for (const key in errData) {
            msg += `${key}: ${errData[key]} | `;
          }
          setError(msg || 'Erreur lors de l\'inscription.');
        }
      } else {
        setError('Erreur serveur. Vérifiez votre connexion.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-11 col-lg-9">
            <div className="card border-0 shadow-lg" style={{ borderRadius: 20 }}>
              <div className="row g-0">
                
                <div className={`col-md-5 bg-${currentRole.color} text-white d-flex flex-column justify-content-center align-items-center p-5`} style={{ borderTopLeftRadius: 20, borderBottomLeftRadius: 20 }}>
                  <Link to="/" className="text-white text-decoration-none mb-5">
                    <h3 className="fw-bold"><i className="bi bi-heart-pulse-fill me-2"></i>HealthyCore.tn</h3>
                  </Link>
                  <i className={`bi ${currentRole.icon} display-1 mb-4`}></i>
                  <h2 className="fw-bold text-center">Inscription {currentRole.label}</h2>
                  <p className="text-center text-white-50 mt-3">
                    Rejoignez la plateforme N°1 de gestion de santé en Tunisie.
                  </p>
                </div>

                <div className="col-md-7 p-4 p-md-5">
                  <h4 className="mb-4">Créer mon compte</h4>
                  
                  {error && <div className="alert alert-danger py-2 small">{error}</div>}

                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Prénom <span className="text-danger">*</span></label>
                        <input type="text" name="first_name" className="form-control" value={form.first_name} onChange={handleChange} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Nom <span className="text-danger">*</span></label>
                        <input type="text" name="last_name" className="form-control" value={form.last_name} onChange={handleChange} required />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold">Email <span className="text-danger">*</span></label>
                        <input type="email" name="email" className="form-control" value={form.email} onChange={handleChange} required />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-bold">Téléphone <span className="text-danger">*</span></label>
                        <input type="tel" name="phone_number" className="form-control" placeholder="+216..." value={form.phone_number} onChange={handleChange} required />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Ville <span className="text-danger">*</span></label>
                        <select name="city" className="form-select" value={form.city} onChange={handleChange} required>
                          <option value="">-- Choisir --</option>
                          {cities.map(c => <option key={c.id} value={c.id}>{c.name} ({c.governorate_name})</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Adresse <span className="text-danger">*</span></label>
                        <input type="text" name="address" className="form-control" placeholder="Rue, imm..." value={form.address} onChange={handleChange} required />
                      </div>

                      {role === 'patient' && (
                        <>
                          <div className="col-md-6">
                            <label className="form-label small fw-bold">Date de naissance <span className="text-danger">*</span></label>
                            <input type="date" name="date_of_birth" className="form-control" value={patientData.date_of_birth} onChange={handlePatientChange} required />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small fw-bold">Genre</label>
                            <select name="gender" className="form-select" value={patientData.gender} onChange={handlePatientChange}>
                              <option value="M">Homme</option>
                              <option value="F">Femme</option>
                              <option value="U">Non spécifié</option>
                            </select>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small fw-bold">Groupe Sanguin</label>
                            <select name="blood_type" className="form-select" value={patientData.blood_type} onChange={handlePatientChange}>
                              <option value="">—</option>
                              <option>A+</option><option>A-</option>
                              <option>B+</option><option>B-</option>
                              <option>AB+</option><option>AB-</option>
                              <option>O+</option><option>O-</option>
                            </select>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small fw-bold">Taille (m)</label>
                            <input type="number" step="0.01" name="height" className="form-control" placeholder="Ex: 1.80" value={patientData.height} onChange={handlePatientChange} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small fw-bold">Poids (kg)</label>
                            <input type="number" step="0.1" name="weight" className="form-control" value={patientData.weight} onChange={handlePatientChange} />
                          </div>
                          <div className="col-12">
                            <label className="form-label small fw-bold">Allergies connues</label>
                            <input type="text" name="allergies" className="form-control" placeholder="Ex: Pénicilline, Arachide..." value={patientData.allergies} onChange={handlePatientChange} />
                          </div>
                        </>
                      )}

                      {role === 'doctor' && (
                        <>
                          <div className="col-md-6">
                            <label className="form-label small fw-bold">Spécialité médicale <span className="text-danger">*</span></label>
                            <select name="specialty" className="form-select" value={doctorData.specialty} onChange={handleDoctorChange} required>
                              <option value="">-- Choisir --</option>
                              {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small fw-bold">Numéro de licence (CNAM) <span className="text-danger">*</span></label>
                            <input type="text" name="license_number" className="form-control" value={doctorData.license_number} onChange={handleDoctorChange} required />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small fw-bold">Années d'expérience</label>
                            <input type="number" name="years_experience" className="form-control" value={doctorData.years_experience} onChange={handleDoctorChange} />
                          </div>
                        </>
                      )}

                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Mot de passe <span className="text-danger">*</span></label>
                        <input type="password" name="password" className="form-control" value={form.password} onChange={handleChange} required minLength="8" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-bold">Confirmer le mot de passe <span className="text-danger">*</span></label>
                        <input type="password" name="password_confirm" className="form-control" value={form.password_confirm} onChange={handleChange} required minLength="8" />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary w-100 mt-4 py-2" disabled={loading}>
                      {loading ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-person-plus me-2"></i>S'inscrire</>}
                    </button>
                  </form>

                  <div className="text-center mt-4">
                    <small className="text-muted">
                      Déjà un compte ? <Link to="/login" className="text-decoration-none fw-bold">Connectez-vous</Link>
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}