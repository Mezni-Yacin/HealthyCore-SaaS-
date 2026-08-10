import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import MapView from '../components/MapView';

// ── CSS Inline Styles ─────────────────────────────────────────────────────
const styles = {
  heroGradient: { background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0ea5e9 100%)' },
  glassCard: { background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.8)' },
  accentCard: { borderLeft: '4px solid #0ea5e9', transition: 'all 0.3s ease' },
  pillTab: { borderRadius: 50, padding: '10px 24px', fontWeight: 600, transition: 'all 0.2s ease', border: 'none', cursor: 'pointer', fontSize: '0.9rem' },
  statCard: { background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16 },
  infoIcon: { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 },
};

// ✅ Helper pour corriger les URLs des images
const getMediaUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `http://localhost:8000${url}`;
};

// ✅ Helper pour s'assurer que les horaires sont bien un objet JSON
const formatHours = (hoursData) => {
  if (!hoursData) return {};
  if (typeof hoursData === 'string') {
    try {
      const parsed = JSON.parse(hoursData);
      return typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }
  return hoursData;
};

function renderHours(hoursObj) {
  if (!hoursObj || typeof hoursObj !== 'object' || Object.keys(hoursObj).length === 0) return <span className="text-muted small">Non renseigné</span>;
  const dayIndex = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
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
      <div key={dayKey} className="d-flex align-items-center justify-content-between py-2 px-3 rounded-3 mb-1" style={{ background: isToday ? 'linear-gradient(135deg, #eff6ff, #dbeafe)' : 'transparent', borderLeft: isToday ? '3px solid #0ea5e9' : '3px solid transparent' }}>
        <span className={`fw-semibold ${isToday ? 'text-primary' : 'text-dark'}`} style={{ fontSize: '0.85rem', minWidth: 100 }}>{label}{isToday && <span className="badge bg-primary ms-2" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>Auj.</span>}</span>
        <span className={isClosed ? 'text-muted fst-italic' : 'text-dark'} style={{ fontSize: '0.85rem' }}>{isClosed ? 'Fermé' : slots.join('  ·  ')}</span>
      </div>
    );
  });
}

function SkeletonProfile() {
  return (
    <div>
      <div style={{ height: 300, background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }}></div>
      <div className="container py-4"><div className="placeholder-glow"><div className="placeholder col-4" style={{ height: 40 }}></div><div className="placeholder col-12 mt-4" style={{ height: 200 }}></div><div className="placeholder col-12 mt-3" style={{ height: 200 }}></div></div></div>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

export default function LabProfile() {
  const { id } = useParams();
  const location = useLocation();
  const [lab, setLab] = useState(null);
  const [catalog, setCatalog] = useState([]); // ✅ État pour le catalogue des analyses
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // ✅ Récupération du catalogue global des analyses
    api.get('/laboratories/doctor/catalog/')
      .then(res => setCatalog(res.data || []))
      .catch(() => {});

    // Récupération des infos du laboratoire
    if (location.state?.labData) {
      setLab(location.state.labData);
      setLoading(false);
    } else {
      api.get('/laboratories/doctor/labs/')
        .then(res => {
          const foundLab = (res.data || []).find(l => l.id === parseInt(id));
          if (foundLab) {
            setLab(foundLab);
          } else {
            setError("Ce laboratoire n'existe pas ou est indisponible.");
          }
        })
        .catch(() => setError("Erreur lors du chargement du laboratoire."))
        .finally(() => setLoading(false));
    }
  }, [id, location.state]);

  if (loading) return <SkeletonProfile />;

  if (error || !lab) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#f8fafc' }}>
        <div className="text-center">
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }} className="d-inline-flex align-items-center justify-content-center mb-4">
            <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: '2.5rem' }}></i>
          </div>
          <h3 className="fw-bold text-dark mb-2">{error || "Laboratoire introuvable"}</h3>
          <p className="text-muted mb-4">Le laboratoire que vous cherchez n'est pas disponible.</p>
          <Link to="/cabinet-directory" className="btn px-4 py-2 text-white border-0 fw-semibold" style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', borderRadius: 12 }}>
            <i className="bi bi-arrow-left me-2"></i> Retour à l'annuaire
          </Link>
        </div>
      </div>
    );
  }

  const mapLabs = lab.latitude && lab.longitude ? [{ 
    id: lab.id, 
    name: lab.name, 
    latitude: parseFloat(lab.latitude), 
    longitude: parseFloat(lab.longitude) 
  }] : [];

  const logoUrl = getMediaUrl(lab.logo);
  const bannerUrl = getMediaUrl(lab.banner);

  // ✅ Formater les horaires pour s'assurer qu'ils sont valides
  const openingHours = formatHours(lab.opening_hours);
  const sampleHours = formatHours(lab.sample_collection_hours);

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh' }}>
      {/* ═══════ HERO BANNER ═══════ */}
      <div className="position-relative" style={{ overflow: 'hidden' }}>
        {bannerUrl ? (
          <img src={bannerUrl} alt={lab.name} className="w-100" style={{ height: 320, objectFit: 'cover', filter: 'brightness(0.5)' }} />
        ) : (
          <div className="w-100" style={{ height: 320, ...styles.heroGradient }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(14,165,233,0.2)' }}></div>
            <div style={{ position: 'absolute', bottom: -80, left: -40, width: 250, height: 250, borderRadius: '50%', background: 'rgba(37,99,235,0.15)' }}></div>
          </div>
        )}
        
        <div className="position-absolute bottom-0 start-0 end-0" style={{ height: '70%', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}></div>
        
        <div className="container">
          <Link to="/cabinet-directory" className="position-absolute top-0 start-0 mt-3 d-inline-flex align-items-center gap-2 text-white text-decoration-none" style={{ opacity: 0.85 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }} className="d-flex align-items-center justify-content-center">
              <i className="bi bi-arrow-left" style={{ fontSize: '0.9rem' }}></i>
            </div>
            <span className="fw-medium small">Retour</span>
          </Link>
        </div>
        
        <div className="position-absolute bottom-0 start-0 end-0 pb-4 pt-5">
          <div className="container">
            <div className="d-flex align-items-end gap-4">
              <div className="flex-shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={lab.name} className="border-4 shadow-lg" style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 20, borderColor: 'rgba(255,255,255,0.8)' }} />
                ) : (
                  <div className="shadow-lg d-flex align-items-center justify-content-center" style={{ width: 88, height: 88, borderRadius: 20, background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', border: '3px solid rgba(255,255,255,0.3)' }}>
                    <i className="bi bi-clipboard2-pulse-fill text-white" style={{ fontSize: '2.2rem' }}></i>
                  </div>
                )}
              </div>
              <div className="flex-grow-1 min-w-0">
                <h1 className="fw-bold text-white mb-1" style={{ fontSize: '1.8rem', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{lab.name}</h1>
                <div className="d-flex flex-wrap align-items-center gap-3 text-white" style={{ opacity: 0.9 }}>
                  <span className="d-flex align-items-center gap-1"><i className="bi bi-geo-alt"></i>{lab.address}, {lab.city_name}</span>
                  {lab.phone_number && (<span className="d-flex align-items-center gap-1"><i className="bi bi-telephone"></i>{lab.phone_number}</span>)}
                </div>
                <div className="d-flex flex-wrap gap-2 mt-3">
                  {lab.cnam_affiliated && (<span className="badge text-white fw-semibold px-3 py-2" style={{ background: 'rgba(34,197,94,0.85)', borderRadius: 8, fontSize: '0.75rem' }}><i className="bi bi-shield-check me-1"></i>CNAM Affilié</span>)}
                  {lab.accreditation && (<span className="badge text-white fw-semibold px-3 py-2" style={{ background: 'rgba(14,165,233,0.85)', borderRadius: 8, fontSize: '0.75rem' }}><i className="bi bi-patch-check me-1"></i>{lab.accreditation}</span>)}
                  {lab.is_active ? (<span className="badge text-white fw-semibold px-3 py-2" style={{ background: 'rgba(5,150,105,0.85)', borderRadius: 8, fontSize: '0.75rem' }}><i className="bi bi-check-circle me-1"></i>Actif</span>) : (<span className="badge text-white fw-semibold px-3 py-2" style={{ background: 'rgba(239,68,68,0.85)', borderRadius: 8, fontSize: '0.75rem' }}><i className="bi bi-x-circle me-1"></i>Inactif</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ STATS BAR ═══════ */}
      <div className="container" style={{ marginTop: -28, position: 'relative', zIndex: 10 }}>
        <div className="row g-3">
          {[
            { icon: 'bi-clipboard2-pulse', label: 'Analyses Disponibles', value: catalog.length, color: '#0ea5e9' },
            { icon: 'bi-people-fill', label: 'Spécialités', value: lab.specialties_info?.length || lab.specialties?.length || 0, color: '#7c3aed' },
            { icon: 'bi-droplet-half', label: 'Prélèvement', value: Object.keys(sampleHours).length > 0 ? 'Disponible' : 'N/A', color: '#dc2626' },
            { icon: 'bi-calendar-check', label: 'Membre depuis', value: new Date(lab.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }), color: '#059669' },
          ].map((stat, i) => (
            <div key={i} className="col-6 col-md-3">
              <div className="card border-0 shadow-lg" style={{ borderRadius: 16 }}>
                <div className="card-body py-3 px-4 d-flex align-items-center gap-3">
                  <div style={{ ...styles.infoIcon, background: `${stat.color}15`, color: stat.color }}><i className={`bi ${stat.icon}`}></i></div>
                  <div><div className="fw-bold text-dark" style={{ fontSize: '1rem', lineHeight: 1.2 }}>{stat.value}</div><div className="text-muted" style={{ fontSize: '0.75rem' }}>{stat.label}</div></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ CONTENU PRINCIPAL ═══════ */}
      <div className="container py-4">
        <div className="row g-4">
          {/* COLONNE GAUCHE */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
              <div className="card-body p-4">
                <h5 className="fw-bold text-dark mb-4"><span className="d-inline-flex align-items-center justify-content-center me-2" style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}><i className="bi bi-info-circle-fill text-white" style={{ fontSize: '0.85rem' }}></i></span>Informations</h5>
                <div className="d-flex gap-3 mb-4"><div style={{ ...styles.infoIcon, background: '#eff6ff', color: '#2563eb' }}><i className="bi bi-geo-alt-fill"></i></div><div><div className="fw-semibold text-dark small">Adresse</div><div className="text-muted small">{lab.address}</div><div className="fw-medium text-dark small">{lab.city_name}</div></div></div>
                <div className="d-flex gap-3 mb-4"><div style={{ ...styles.infoIcon, background: '#f0fdf4', color: '#16a34a' }}><i className="bi bi-telephone-fill"></i></div><div><div className="fw-semibold text-dark small">Contact</div>{lab.phone_number && (<a href={`tel:${lab.phone_number}`} className="text-decoration-none small d-block" style={{ color: '#2563eb' }}>{lab.phone_number}</a>)}{lab.email && (<a href={`mailto:${lab.email}`} className="text-decoration-none small d-block text-muted">{lab.email}</a>)}{lab.website && (<a href={lab.website} target="_blank" rel="noopener noreferrer" className="text-decoration-none small d-block text-muted"><i className="bi bi-globe me-1"></i>{lab.website}</a>)}</div></div>
                {lab.owner_name && (<div className="d-flex gap-3 mb-4"><div style={{ ...styles.infoIcon, background: '#fef3c7', color: '#d97706' }}><i className="bi bi-person-badge-fill"></i></div><div><div className="fw-semibold text-dark small">Directeur / Responsable</div><div className="text-muted small">{lab.owner_name}</div></div></div>)}
                {lab.accreditation && (<div className="d-flex gap-3 mb-0"><div style={{ ...styles.infoIcon, background: '#fce7f3', color: '#db2777' }}><i className="bi bi-patch-check-fill"></i></div><div><div className="fw-semibold text-dark small">Accréditation</div><div className="text-muted small">{lab.accreditation} ({lab.accreditation_number || 'N/A'})</div></div></div>)}
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
              <div className="card-body p-4">
                <h5 className="fw-bold text-dark mb-4"><span className="d-inline-flex align-items-center justify-content-center me-2" style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #059669, #10b981)' }}><i className="bi bi-clock-fill text-white" style={{ fontSize: '0.85rem' }}></i></span>Horaires d'ouverture</h5>
                <div className="space-y-1">{renderHours(openingHours)}</div>
              </div>
            </div>

            {Object.keys(sampleHours).length > 0 && (
              <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
                <div className="card-body p-4">
                  <h5 className="fw-bold text-dark mb-4"><span className="d-inline-flex align-items-center justify-content-center me-2" style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}><i className="bi bi-droplet-half text-white" style={{ fontSize: '0.85rem' }}></i></span>Horaires de Prélèvement</h5>
                  <div className="space-y-1">{renderHours(sampleHours)}</div>
                </div>
              </div>
            )}

            {/* CARTE DE LOCALISATION (MAP) */}
            {mapLabs.length > 0 && (
              <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: 16 }}>
                <div className="p-4 pb-3 d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold text-dark mb-0">
                    <span className="d-inline-flex align-items-center justify-content-center me-2" style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
                      <i className="bi bi-geo-alt-fill text-white" style={{ fontSize: '0.85rem' }}></i>
                    </span>
                    Localisation
                  </h5>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${mapLabs[0].latitude},${mapLabs[0].longitude}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm fw-semibold px-3 text-white border-0" style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', borderRadius: 10, fontSize: '0.8rem' }}>
                    <i className="bi bi-box-arrow-up-right me-1"></i>Itinéraire
                  </a>
                </div>
                <div className="px-3 pb-3">
                  <div className="overflow-hidden" style={{ borderRadius: 12 }}>
                    <MapView cabinets={mapLabs} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* COLONNE DROITE */}
          <div className="col-lg-8">
            {/* ✅ CATALOGUE DES ANALYSES */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16, ...styles.accentCard, borderLeftColor: '#0ea5e9' }}>
              <div className="card-body p-4">
                <h5 className="fw-bold text-dark mb-4"><span className="d-inline-flex align-items-center justify-content-center me-2" style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}><i className="bi bi-clipboard2-pulse-fill text-white" style={{ fontSize: '0.85rem' }}></i></span>Catalogue des Analyses</h5>
                {catalog.length > 0 ? (
                  <div className="table-responsive" style={{ borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <table className="table table-hover mb-0 align-middle">
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          <th>Code</th>
                          <th>Analyse</th>
                          <th>Catégorie</th>
                          <th className="text-end">Prix</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalog.map(test => (
                          <tr key={test.id}>
                            <td className="fw-bold text-primary">{test.code}</td>
                            <td>
                              <div className="fw-semibold">{test.name}</div>
                              <small className="text-muted">Délai: {test.turnaround_time}h</small>
                            </td>
                            <td><span className="badge bg-light text-dark">{test.category_display}</span></td>
                            <td className="text-end fw-bold">{Number(test.price).toFixed(3)} TND</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted small mb-0">Aucune analyse disponible dans le catalogue pour le moment.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-4 mt-4" style={{ background: '#e2e8f0' }}>
        <div className="container">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <Link to="/cabinet-directory" className="text-decoration-none text-muted d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}><i className="bi bi-arrow-left"></i> Retour à l'annuaire</Link>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}><i className="bi bi-clipboard2-pulse me-1"></i> Laboratoire d'analyses · {lab.city_name}</div>
          </div>
        </div>
      </div>
    </div>
  );
}