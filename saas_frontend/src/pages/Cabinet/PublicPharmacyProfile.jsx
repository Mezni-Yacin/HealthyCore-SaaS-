import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import MapView from '../../components/MapView';

const getMediaUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `http://localhost:8000${url}`;
};

const styles = {
  heroGradient: { background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #10b981 100%)' },
  infoIcon: { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 },
};

function renderHours(hoursObj) {
  if (!hoursObj || typeof hoursObj !== 'object' || Object.keys(hoursObj).length === 0) return <span className="text-muted small">Non renseigné</span>;
  const dayIndex = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0 };
  return Object.entries(hoursObj).map(([dayKey, dayData]) => {
    let label = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
    let slots = []; let isClosed = false;
    if (typeof dayData === 'string') {
      if (dayData.toLowerCase() === 'fermé' || dayData === '') isClosed = true; else slots = [dayData];
    } else if (typeof dayData === 'object' && dayData !== null) {
      if (dayData.label) label = dayData.label;
      if (Array.isArray(dayData.slots)) { slots = dayData.slots; if (slots.length === 0 || slots[0] === 'Fermé') isClosed = true; } 
      else if (dayData.slots) { slots = [String(dayData.slots)]; } else { isClosed = true; }
    } else { isClosed = true; }
    const isToday = dayIndex[dayKey.toLowerCase()] === new Date().getDay();
    return (
      <div key={dayKey} className="d-flex align-items-center justify-content-between py-2 px-3 rounded-3 mb-1" style={{ background: isToday ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'transparent', borderLeft: isToday ? '3px solid #10b981' : '3px solid transparent' }}>
        <span className={`fw-semibold ${isToday ? 'text-success' : 'text-dark'}`} style={{ fontSize: '0.85rem', minWidth: 100 }}>{label}{isToday && <span className="badge bg-success ms-2" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>Auj.</span>}</span>
        <span className={isClosed ? 'text-muted fst-italic' : 'text-dark'} style={{ fontSize: '0.85rem' }}>{isClosed ? 'Fermé' : slots.join('  ·  ')}</span>
      </div>
    );
  });
}

export default function PublicPharmacyProfile() {
  const { id } = useParams();
  const location = useLocation();
  const [pharma, setPharma] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location.state?.pharmacyData) {
      setPharma(location.state.pharmacyData);
      setLoading(false);
    } else {
      api.get(`/pharmacy/public/pharmacies/${id}/`)
        .then(r => setPharma(r.data))
        .catch(() => setError("Cette pharmacie n'existe pas ou est indisponible."))
        .finally(() => setLoading(false));
    }
  }, [id, location.state]);

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-success"></div></div>;

  if (error || !pharma) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#f8fafc' }}>
        <div className="text-center">
          <h3 className="fw-bold text-dark mb-2">{error || "Pharmacie introuvable"}</h3>
          <Link to="/cabinet-directory" className="btn btn-success mt-3">
            <i className="bi bi-arrow-left me-2"></i> Retour à l'annuaire
          </Link>
        </div>
      </div>
    );
  }

  const mapPharmacies = pharma.latitude && pharma.longitude ? [{ 
    id: pharma.id, name: pharma.name, latitude: parseFloat(pharma.latitude), longitude: parseFloat(pharma.longitude) 
  }] : [];

  const logoUrl = getMediaUrl(pharma.logo);
  const bannerUrl = getMediaUrl(pharma.banner);

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh' }}>
      {/* HERO BANNER */}
      <div className="position-relative" style={{ overflow: 'hidden' }}>
        {bannerUrl ? (
          <img src={bannerUrl} alt={pharma.name} className="w-100" style={{ height: 320, objectFit: 'cover', filter: 'brightness(0.5)' }} />
        ) : (
          <div className="w-100" style={{ height: 320, ...styles.heroGradient }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(16,185,129,0.2)' }}></div>
          </div>
        )}
        
        <div className="position-absolute bottom-0 start-0 end-0" style={{ height: '70%', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}></div>
        
        <div className="container">
          <Link to="/cabinet-directory" className="position-absolute top-0 start-0 mt-3 d-inline-flex align-items-center gap-2 text-white text-decoration-none" style={{ opacity: 0.85 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }} className="d-flex align-items-center justify-content-center">
              <i className="bi bi-arrow-left"></i>
            </div>
            <span className="fw-medium small">Retour</span>
          </Link>
        </div>
        
        <div className="position-absolute bottom-0 start-0 end-0 pb-4 pt-5">
          <div className="container">
            <div className="d-flex align-items-end gap-4">
              <div className="flex-shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={pharma.name} className="border-4 shadow-lg" style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 20, borderColor: 'rgba(255,255,255,0.8)' }} />
                ) : (
                  <div className="shadow-lg d-flex align-items-center justify-content-center" style={{ width: 88, height: 88, borderRadius: 20, background: 'linear-gradient(135deg, #10b981, #059669)', border: '3px solid rgba(255,255,255,0.3)' }}>
                    <i className="bi bi-shop text-white" style={{ fontSize: '2.2rem' }}></i>
                  </div>
                )}
              </div>
              <div className="flex-grow-1 min-w-0">
                <h1 className="fw-bold text-white mb-1" style={{ fontSize: '1.8rem', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{pharma.name}</h1>
                <div className="d-flex flex-wrap align-items-center gap-3 text-white" style={{ opacity: 0.9 }}>
                  <span><i className="bi bi-geo-alt me-1"></i>{pharma.address}, {pharma.city_name}</span>
                  {pharma.phone_number && <span><i className="bi bi-telephone me-1"></i>{pharma.phone_number}</span>}
                </div>
                <div className="d-flex flex-wrap gap-2 mt-3">
                  {pharma.is_on_duty && <span className="badge text-white fw-semibold px-3 py-2 bg-danger"><i className="bi bi-moon-stars me-1"></i>Pharmacie de Garde</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENU */}
      <div className="container py-4">
        <div className="row g-4">
          {/* COLONNE GAUCHE */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4"><i className="bi bi-info-circle-fill text-success me-2"></i>Informations</h5>
                <div className="d-flex gap-3 mb-4">
                  <div style={{ ...styles.infoIcon, background: '#eff6ff', color: '#2563eb' }}><i className="bi bi-geo-alt-fill"></i></div>
                  <div><div className="fw-semibold text-dark small">Adresse</div><div className="text-muted small">{pharma.address}</div><div className="fw-medium text-dark small">{pharma.city_name}</div></div>
                </div>
                <div className="d-flex gap-3 mb-4">
                  <div style={{ ...styles.infoIcon, background: '#f0fdf4', color: '#16a34a' }}><i className="bi bi-telephone-fill"></i></div>
                  <div><div className="fw-semibold text-dark small">Contact</div>{pharma.phone_number && <a href={`tel:${pharma.phone_number}`} className="text-decoration-none small d-block text-primary">{pharma.phone_number}</a>}{pharma.email && <a href={`mailto:${pharma.email}`} className="text-decoration-none small d-block text-muted">{pharma.email}</a>}</div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4"><i className="bi bi-clock-fill text-success me-2"></i>Horaires d'ouverture</h5>
                <div>{renderHours(pharma.opening_hours)}</div>
              </div>
            </div>

            {mapPharmacies.length > 0 && (
              <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: 16 }}>
                <div className="p-4 pb-3 d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold text-dark mb-0"><i className="bi bi-geo-alt-fill text-danger me-2"></i>Localisation</h5>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${mapPharmacies[0].latitude},${mapPharmacies[0].longitude}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm text-white border-0" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: 10 }}>
                    Itinéraire
                  </a>
                </div>
                <div style={{ height: 250 }}><MapView cabinets={mapPharmacies} /></div>
              </div>
            )}
          </div>

          {/* COLONNE DROITE */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm" style={{ borderRadius: 16, borderLeft: '4px solid #10b981' }}>
              <div className="card-body p-4 text-center">
                <i className="bi bi-capsule-pill text-success" style={{ fontSize: '3rem' }}></i>
                <h4 className="mt-3 fw-bold">Pharmacie {pharma.name}</h4>
                <p className="text-muted">
                  Cette pharmacie est partie intégrante du réseau médical. Présentez vos ordonnances numériques directement à le comptoir pour une délivrance rapide et sans attente.
                </p>
                {pharma.is_on_duty ? (
                  <span className="badge bg-danger p-3 fs-6"><i className="bi bi-moon-stars me-2"></i>Ouverte de garde actuellement</span>
                ) : (
                  <span className="badge bg-success p-3 fs-6"><i className="bi bi-check-circle me-2"></i>Pharmacie partenaire</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}