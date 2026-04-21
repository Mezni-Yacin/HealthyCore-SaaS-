import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import MapView from '../../components/MapView';
import DoctorWeeklyCalendar from '../../components/DoctorWeeklyCalendar';

// ── CSS Inline Styles ─────────────────────────────────────────────────────
const styles = {
  heroGradient: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #2563eb 100%)',
  },
  glassCard: {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.8)',
  },
  accentCard: {
    borderLeft: '4px solid #2563eb',
    transition: 'all 0.3s ease',
  },
  doctorCardHover: {
    transition: 'all 0.3s ease',
  },
  pillTab: {
    borderRadius: 50,
    padding: '10px 24px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  statCard: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    flexShrink: 0,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────

function renderStars(rating, reviewCount, size = '0.85rem') {
  if (!rating || rating === 0) return <span className="text-muted" style={{ fontSize: '0.8rem' }}>Non noté</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push(<i key={i} className="bi bi-star-fill text-warning" style={{ fontSize: size }}></i>);
    else if (i === full && half) stars.push(<i key={i} className="bi bi-star-half text-warning" style={{ fontSize: size }}></i>);
    else stars.push(<i key={i} className="bi bi-star text-warning opacity-25" style={{ fontSize: size }}></i>);
  }
  return (
    <span className="d-inline-flex align-items-center gap-0">
      {stars}
      <span className="ms-1 fw-semibold" style={{ fontSize: '0.85rem', color: '#d97706' }}>{rating}</span>
      {reviewCount > 0 && <span className="ms-1 text-muted" style={{ fontSize: '0.8rem' }}>({reviewCount} avis)</span>}
    </span>
  );
}

// ── Skeleton Loader ─────────────────────────────────────────────────────
function SkeletonProfile() {
  return (
    <div>
      {/* Hero skeleton */}
      <div style={{ height: 300, background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }}></div>
      <div className="container py-4">
        <div className="row g-4">
          <div className="col-lg-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card border-0 shadow-sm mb-3" style={{ borderRadius: 16 }}>
                <div className="card-body p-4">
                  <div className="placeholder-glow">
                    <div className="placeholder col-8 mb-2"></div>
                    <div className="placeholder col-12 mb-1"></div>
                    <div className="placeholder col-10"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="col-lg-8">
            <div className="placeholder-glow mb-3">
              <div className="placeholder col-4" style={{ height: 40 }}></div>
            </div>
            <div className="row g-3">
              {[1, 2].map(i => (
                <div key={i} className="col-md-6">
                  <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
                    <div className="card-body p-4">
                      <div className="placeholder-glow">
                        <div className="d-flex gap-3 mb-3">
                          <div className="placeholder rounded-circle" style={{ width: 60, height: 60 }}></div>
                          <div className="flex-grow-1">
                            <div className="placeholder col-8 mb-2"></div>
                            <div className="placeholder col-6"></div>
                          </div>
                        </div>
                        <div className="placeholder col-12 mb-1"></div>
                        <div className="placeholder col-9"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

// ── Composant principal ──────────────────────────────────────────────────

export default function CabinetProfile() {
  const { id } = useParams();
  const [cabinet, setCabinet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!id) return;
    const fetchCabinet = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/cabinets/directory/${id}/`);
        setCabinet(data);
      } catch (err) {
        setError("Ce cabinet n'existe pas ou est indisponible.");
      } finally {
        setLoading(false);
      }
    };
    fetchCabinet();
  }, [id]);

  // ── Loading skeleton ──
  if (loading) return <SkeletonProfile />;

  // ── Erreur ──
  if (error || !cabinet) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#f8fafc' }}>
        <div className="text-center">
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }} className="d-inline-flex align-items-center justify-content-center mb-4">
            <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: '2.5rem' }}></i>
          </div>
          <h3 className="fw-bold text-dark mb-2">{error || "Cabinet introuvable"}</h3>
          <p className="text-muted mb-4">Le cabinet que vous cherchez n'est pas disponible.</p>
          <Link to="/directory" className="btn px-4 py-2 text-white border-0 fw-semibold" style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius: 12 }}>
            <i className="bi bi-arrow-left me-2"></i> Retour à l'annuaire
          </Link>
        </div>
      </div>
    );
  }

  const doctors = cabinet.doctors_info || [];
  const secretaries = cabinet.secretaries || cabinet.secretaries_list || cabinet.secretaries_info || [];
  const isOpenNow = checkIfOpen(cabinet.opening_hours_display);

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh' }}>
      {/* ═══════ HERO BANNER ═══════ */}
      <div className="position-relative" style={{ overflow: 'hidden' }}>
        {/* Background */}
        {cabinet.banner_url ? (
          <img src={cabinet.banner_url} alt="" className="w-100"
            style={{ height: 320, objectFit: 'cover', filter: 'brightness(0.35)' }} />
        ) : (
          <div className="w-100" style={{ height: 320, ...styles.heroGradient }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(37,99,235,0.2)' }}></div>
            <div style={{ position: 'absolute', bottom: -80, left: -40, width: 250, height: 250, borderRadius: '50%', background: 'rgba(124,58,237,0.15)' }}></div>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="position-absolute bottom-0 start-0 end-0" style={{ height: '70%', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}></div>

        {/* Back button */}
        <div className="container">
          <Link to="/directory" className="position-absolute top-0 start-0 mt-3 d-inline-flex align-items-center gap-2 text-white text-decoration-none"
            style={{ opacity: 0.85, transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.85}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}
              className="d-flex align-items-center justify-content-center">
              <i className="bi bi-arrow-left" style={{ fontSize: '0.9rem' }}></i>
            </div>
            <span className="fw-medium small">Retour</span>
          </Link>
        </div>

        {/* Hero content */}
        <div className="position-absolute bottom-0 start-0 end-0 pb-4 pt-5">
          <div className="container">
            <div className="d-flex align-items-end gap-4">
              {/* Logo */}
              <div className="flex-shrink-0">
                {cabinet.logo_url ? (
                  <img src={cabinet.logo_url} alt={cabinet.name}
                    className="border-4 shadow-lg"
                    style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 20, borderColor: 'rgba(255,255,255,0.8)' }} />
                ) : (
                  <div className="shadow-lg d-flex align-items-center justify-content-center"
                    style={{ width: 88, height: 88, borderRadius: 20, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', border: '3px solid rgba(255,255,255,0.3)' }}>
                    <i className="bi bi-hospital-fill text-white" style={{ fontSize: '2.2rem' }}></i>
                  </div>
                )}
              </div>

              {/* Name & address */}
              <div className="flex-grow-1 min-w-0">
                <h1 className="fw-bold text-white mb-1" style={{ fontSize: '1.8rem', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  {cabinet.name}
                </h1>
                <div className="d-flex flex-wrap align-items-center gap-3 text-white" style={{ opacity: 0.9 }}>
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-geo-alt"></i>
                    {cabinet.address}, {cabinet.city_name}
                  </span>
                  {cabinet.phone_number && (
                    <span className="d-flex align-items-center gap-1">
                      <i className="bi bi-telephone"></i>
                      {cabinet.phone_number}
                    </span>
                  )}
                </div>
                {/* Badges in hero */}
                <div className="d-flex flex-wrap gap-2 mt-3">
                  {cabinet.cnam_affiliated && (
                    <span className="badge text-white fw-semibold px-3 py-2" style={{ background: 'rgba(34,197,94,0.85)', borderRadius: 8, fontSize: '0.75rem' }}>
                      <i className="bi bi-shield-check me-1"></i>CNAM
                    </span>
                  )}
                  {cabinet.specialties_list?.slice(0, 3).map(s => (
                    <span key={s.id} className="badge px-3 py-2 fw-medium" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: 8, color: 'white', fontSize: '0.75rem' }}>
                      {s.name}
                    </span>
                  ))}
                  {cabinet.specialties_list?.length > 3 && (
                    <span className="badge px-3 py-2" style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, color: 'white', fontSize: '0.75rem' }}>
                      +{cabinet.specialties_list.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex-shrink-0 d-none d-md-block">
                <div className="text-center px-4 py-2" style={{ ...styles.statCard, minWidth: 120 }}>
                  <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: isOpenNow ? '#22c55e' : '#ef4444', boxShadow: `0 0 8px ${isOpenNow ? '#22c55e' : '#ef4444'}` }}></span>
                    <span className="text-white fw-semibold" style={{ fontSize: '0.85rem' }}>
                      {isOpenNow ? 'Ouvert' : 'Fermé'}
                    </span>
                  </div>
                  <span className="text-white" style={{ opacity: 0.7, fontSize: '0.75rem' }}>Maintenant</span>
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
            { icon: 'bi-people-fill', label: 'Médecins', value: cabinet.doctors_count || 0, color: '#2563eb' },
            { icon: 'bi-star-fill', label: 'Note', value: cabinet.avg_rating ? `${cabinet.avg_rating}/5` : '--', color: '#d97706' },
            { icon: 'bi-calendar-check', label: 'Spécialités', value: cabinet.specialties_list?.length || 0, color: '#7c3aed' },
            { icon: 'bi-clock-fill', label: 'Consultation', value: cabinet.appointment_duration ? `${cabinet.appointment_duration} min` : '--', color: '#059669' },
          ].map((stat, i) => (
            <div key={i} className="col-6 col-md-3">
              <div className="card border-0 shadow-lg" style={{ borderRadius: 16 }}>
                <div className="card-body py-3 px-4 d-flex align-items-center gap-3">
                  <div style={{ ...styles.infoIcon, background: `${stat.color}15`, color: stat.color }}>
                    <i className={`bi ${stat.icon}`}></i>
                  </div>
                  <div>
                    <div className="fw-bold text-dark" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{stat.value}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{stat.label}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ CONTENU PRINCIPAL ═══════ */}
      <div className="container py-4">
        <div className="row g-4">
          {/* ═══════ COLONNE GAUCHE ═══════ */}
          <div className="col-lg-4">

            {/* ── Informations card ── */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
              <div className="card-body p-4">
                <h5 className="fw-bold text-dark mb-4">
                  <span className="d-inline-flex align-items-center justify-content-center me-2"
                    style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                    <i className="bi bi-info-circle-fill text-white" style={{ fontSize: '0.85rem' }}></i>
                  </span>
                  Informations
                </h5>

                {/* Address */}
                <div className="d-flex gap-3 mb-4">
                  <div style={{ ...styles.infoIcon, background: '#eff6ff', color: '#2563eb' }}>
                    <i className="bi bi-geo-alt-fill"></i>
                  </div>
                  <div>
                    <div className="fw-semibold text-dark small">Adresse</div>
                    <div className="text-muted small">{cabinet.address}</div>
                    <div className="fw-medium text-dark small">{cabinet.city_name}, {cabinet.governorate_name}</div>
                  </div>
                </div>

                {/* Contact */}
                <div className="d-flex gap-3 mb-4">
                  <div style={{ ...styles.infoIcon, background: '#f0fdf4', color: '#16a34a' }}>
                    <i className="bi bi-telephone-fill"></i>
                  </div>
                  <div>
                    <div className="fw-semibold text-dark small">Contact</div>
                    {cabinet.phone_number && (
                      <a href={`tel:${cabinet.phone_number}`} className="text-decoration-none small d-block" style={{ color: '#2563eb' }}>
                        {cabinet.phone_number}
                      </a>
                    )}
                    {cabinet.email && (
                      <a href={`mailto:${cabinet.email}`} className="text-decoration-none small d-block text-muted">
                        {cabinet.email}
                      </a>
                    )}
                    {cabinet.website && (
                      <a href={cabinet.website} target="_blank" rel="noopener noreferrer" className="text-decoration-none small d-block text-muted">
                        <i className="bi bi-globe me-1"></i>{cabinet.website}
                      </a>
                    )}
                  </div>
                </div>

                {/* Director */}
                {cabinet.owner_name && (
                  <div className="d-flex gap-3 mb-4">
                    <div style={{ ...styles.infoIcon, background: '#fef3c7', color: '#d97706' }}>
                      <i className="bi bi-person-badge-fill"></i>
                    </div>
                    <div>
                      <div className="fw-semibold text-dark small">Directeur</div>
                      <div className="text-muted small">Dr. {cabinet.owner_name}</div>
                    </div>
                  </div>
                )}

                {/* Accreditation */}
                {cabinet.accreditation && (
                  <div className="d-flex gap-3 mb-0">
                    <div style={{ ...styles.infoIcon, background: '#fce7f3', color: '#db2777' }}>
                      <i className="bi bi-patch-check-fill"></i>
                    </div>
                    <div>
                      <div className="fw-semibold text-dark small">Accréditation</div>
                      <div className="text-muted small">{cabinet.accreditation}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ═══════ BOUTON CONTACTER LE SÉCRÉTARIAT ═══════ */}
            <div className="mb-4">
              <Link to={`/chat/${id}`} className="text-decoration-none">
                <div
                  className="card border-0 shadow-sm overflow-hidden"
                  style={{ borderRadius: 16, cursor: 'pointer', transition: 'all 0.3s ease' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(37,99,235,0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <div style={{ height: 4, background: 'linear-gradient(90deg, #2563eb, #7c3aed, #2563eb)' }}></div>
                  <div className="card-body p-4 text-center">
                    <div
                      className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                      style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                    >
                      <i className="bi bi-chat-dots-fill text-white" style={{ fontSize: '1.5rem' }}></i>
                    </div>
                    <h6 className="fw-bold text-dark mb-1">Contacter le secrétariat</h6>
                    <p className="text-muted small mb-0">
                      Réponse rapide par les secrétaires du cabinet
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            {/* ═══════ SECRÉTAIRES DU CABINET ═══════ */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
              <div className="card-body p-4">
                <h5 className="fw-bold text-dark mb-3">
                  <span className="d-inline-flex align-items-center justify-content-center me-2"
                    style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                    <i className="bi bi-people-fill text-white" style={{ fontSize: '0.85rem' }}></i>
                  </span>
                  Secrétaires
                  {secretaries.length > 0 && (
                    <span className="badge ms-2" style={{ background: '#f5f3ff', color: '#7c3aed', fontWeight: 600, fontSize: '0.75rem' }}>
                      {secretaries.length}
                    </span>
                  )}
                </h5>

                {secretaries.length === 0 ? (
                  <div className="text-center py-3">
                    <i className="bi bi-person-x text-muted" style={{ fontSize: '1.5rem' }}></i>
                    <p className="text-muted small mt-2 mb-0">
                      Aucun secrétaire assigné à ce cabinet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {secretaries.map((sec, idx) => {
                      const secName = sec.full_name || sec.name || sec.username || `${sec.first_name || ''} ${sec.last_name || ''}`.trim();
                      const secPhone = sec.phone || sec.phone_number || sec.telephone;
                      const secEmail = sec.email;
                      const secPhoto = sec.profile_picture || sec.profile_picture_url || sec.photo || sec.avatar;
                      const secRole = sec.role || sec.position || 'Secrétaire';

                      return (
                        <div
                          key={sec.id || idx}
                          className="d-flex align-items-center gap-3 p-3 rounded-3"
                          style={{
                            background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)',
                            border: '1px solid #ede9fe',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#ede9fe';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #faf5ff, #f3e8ff)';
                            e.currentTarget.style.transform = 'none';
                          }}
                        >
                          {/* Photo */}
                          <div
                            className="flex-shrink-0 d-flex align-items-center justify-content-center"
                            style={{
                              width: 42, height: 42, borderRadius: 12,
                              background: secPhoto ? 'none' : 'linear-gradient(135deg, #c4b5fd, #a78bfa)',
                              overflow: 'hidden',
                            }}
                          >
                            {secPhoto ? (
                              <img src={secPhoto} alt={secName}
                                style={{ width: 42, height: 42, borderRadius: 12, objectFit: 'cover' }} />
                            ) : (
                              <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
                                {(secName || '?')[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-grow-1 min-w-0">
                            <div className="fw-semibold text-dark small mb-1" style={{
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {secName || 'Secrétaire'}
                            </div>
                            <div className="d-flex flex-wrap align-items-center gap-2">
                              <span
                                className="badge px-2 py-0 fw-medium"
                                style={{
                                  background: 'rgba(124,58,237,0.1)',
                                  color: '#6d28d9',
                                  borderRadius: 6,
                                  fontSize: '0.65rem',
                                }}
                              >
                                <i className="bi bi-shield-check me-1"></i>
                                {typeof secRole === 'string' && secRole.includes('_')
                                  ? secRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                                  : secRole.charAt(0).toUpperCase() + secRole.slice(1)
                                }
                              </span>
                            </div>
                          </div>

                          {/* Contact icons */}
                          <div className="d-flex flex-column gap-1 flex-shrink-0">
                            {secPhone && (
                              <a
                                href={`tel:${secPhone}`}
                                className="d-flex align-items-center justify-content-center rounded-2"
                                style={{
                                  width: 28, height: 28,
                                  background: '#f0fdf4',
                                  color: '#16a34a',
                                  fontSize: '0.7rem',
                                  textDecoration: 'none',
                                }}
                                title={secPhone}
                              >
                                <i className="bi bi-telephone-fill"></i>
                              </a>
                            )}
                            {secEmail && (
                              <a
                                href={`mailto:${secEmail}`}
                                className="d-flex align-items-center justify-content-center rounded-2"
                                style={{
                                  width: 28, height: 28,
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  fontSize: '0.7rem',
                                  textDecoration: 'none',
                                }}
                                title={secEmail}
                              >
                                <i className="bi bi-envelope-fill"></i>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Opening hours */}
            {cabinet.opening_hours_display && (
              <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
                <div className="card-body p-4">
                  <h5 className="fw-bold text-dark mb-4">
                    <span className="d-inline-flex align-items-center justify-content-center me-2"
                      style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                      <i className="bi bi-clock-fill text-white" style={{ fontSize: '0.85rem' }}></i>
                    </span>
                    Horaires d'ouverture
                  </h5>

                  <div className="space-y-1">
                    {Object.entries(cabinet.opening_hours_display).map(([dayKey, dayData]) => {
                      const isClosed = dayData.slots.length === 0 || dayData.slots[0] === 'Fermé';
                      const dayIndex = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0 };
                      const isToday = dayIndex[dayKey] === new Date().getDay();

                      return (
                        <div key={dayKey} className="d-flex align-items-center justify-content-between py-2 px-3 rounded-3 mb-1"
                          style={{
                            background: isToday ? 'linear-gradient(135deg, #eff6ff, #dbeafe)' : 'transparent',
                            borderLeft: isToday ? '3px solid #2563eb' : '3px solid transparent',
                          }}>
                          <span className={`fw-semibold ${isToday ? 'text-primary' : 'text-dark'}`} style={{ fontSize: '0.85rem', minWidth: 90 }}>
                            {dayData.label}
                            {isToday && <span className="badge bg-primary ms-2" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>Auj.</span>}
                          </span>
                          <span className={isClosed ? 'text-danger' : 'text-dark'} style={{ fontSize: '0.85rem', fontWeight: isClosed ? 500 : 400 }}>
                            {isClosed ? (
                              <span className="text-muted fst-italic">Fermé</span>
                            ) : (
                              dayData.slots.join('  ·  ')
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Map */}
            {cabinet.latitude && cabinet.longitude && (
              <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: 16 }}>
                <div className="p-4 pb-3 d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold text-dark mb-0">
                    <span className="d-inline-flex align-items-center justify-content-center me-2"
                      style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
                      <i className="bi bi-geo-alt-fill text-white" style={{ fontSize: '0.85rem' }}></i>
                    </span>
                    Localisation
                  </h5>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${cabinet.latitude},${cabinet.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn btn-sm fw-semibold px-3 text-white border-0"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius: 10, fontSize: '0.8rem' }}>
                    <i className="bi bi-box-arrow-up-right me-1"></i>Itinéraire
                  </a>
                </div>
                <div className="px-3 pb-3">
                  <div className="overflow-hidden" style={{ borderRadius: 12 }}>
                    <MapView cabinets={[cabinet]} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══════ COLONNE DROITE ═══════ */}
          <div className="col-lg-8">
            {/* Pill tabs */}
            <div className="d-flex gap-2 mb-4 p-1" style={{ background: '#e2e8f0', borderRadius: 14 }}>
              {[
                { key: 'overview', icon: 'bi-grid-3x3-gap-fill', label: 'Aperçu' },
                { key: 'doctors', icon: 'bi-people-fill', label: 'Médecins', count: doctors.length },
                { key: 'calendar', icon: 'bi-calendar3', label: 'Calendriers' },
              ].map(tab => (
                <button key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    ...styles.pillTab,
                    background: activeTab === tab.key ? 'white' : 'transparent',
                    color: activeTab === tab.key ? '#1e40af' : '#64748b',
                    boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    flex: 1,
                    textAlign: 'center',
                  }}>
                  <i className={`bi ${tab.icon} me-2`} style={{ fontSize: '0.85rem' }}></i>
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ms-1 px-2 py-0 rounded-pill" style={{
                      fontSize: '0.7rem',
                      background: activeTab === tab.key ? '#dbeafe' : 'transparent',
                      color: activeTab === tab.key ? '#2563eb' : '#94a3b8',
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ═══ TAB : APERÇU ═══ */}
            {activeTab === 'overview' && (
              <div>
                {doctors.length === 0 ? (
                  <div className="text-center py-5">
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f1f5f9' }} className="d-inline-flex align-items-center justify-content-center mb-3">
                      <i className="bi bi-people text-muted" style={{ fontSize: '2rem' }}></i>
                    </div>
                    <h5 className="text-muted fw-semibold">Aucun médecin dans ce cabinet</h5>
                    <p className="text-muted small">Les médecins apparaîtront ici une fois ajoutés.</p>
                  </div>
                ) : (
                  <div className="row g-3">
                    {doctors.map(doc => (
                      <div key={doc.id} className="col-md-6">
                        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16, ...styles.doctorCardHover }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
                          <div style={{ height: 4, background: 'linear-gradient(90deg, #2563eb, #7c3aed, #ec4899)', borderRadius: '16px 16px 0 0' }}></div>
                          <div className="card-body p-4">
                            <div className="d-flex gap-3 mb-3">
                              {doc.profile_photo_url ? (
                                <img src={doc.profile_photo_url} alt="" className="shadow-sm"
                                  style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 14 }} />
                              ) : (
                                <div className="d-flex align-items-center justify-content-center shadow-sm"
                                  style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #dbeafe, #c7d2fe)' }}>
                                  <i className="bi bi-person-fill" style={{ fontSize: '1.4rem', color: '#4f46e5' }}></i>
                                </div>
                              )}
                              <div className="flex-grow-1 min-w-0">
                                <h6 className="fw-bold text-dark mb-0">Dr. {doc.full_name}</h6>
                                <div className="text-muted small mb-1">{doc.specialty}</div>
                                {renderStars(doc.rating, doc.review_count, '0.75rem')}
                              </div>
                            </div>

                            {doc.bio && (
                              <p className="text-muted small mb-3" style={{
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5
                              }}>
                                {doc.bio}
                              </p>
                            )}

                            <div className="d-flex flex-wrap gap-1 mb-3">
                              {doc.consultation_price > 0 && (
                                <span className="badge d-flex align-items-center gap-1 px-2 py-1 fw-medium" style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 8, fontSize: '0.7rem' }}>
                                  <i className="bi bi-cash-stack"></i> {doc.consultation_price.toFixed(3)} DT
                                </span>
                              )}
                              {doc.accepts_new_patients && (
                                <span className="badge d-flex align-items-center gap-1 px-2 py-1 fw-medium" style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 8, fontSize: '0.7rem' }}>
                                  <i className="bi bi-person-plus"></i> Nouveaux
                                </span>
                              )}
                              {doc.teleconsultation_available && (
                                <span className="badge d-flex align-items-center gap-1 px-2 py-1 fw-medium text-white" style={{ background: '#7c3aed', borderRadius: 8, fontSize: '0.7rem' }}>
                                  <i className="bi bi-camera-video"></i> Téléconsult.
                                </span>
                              )}
                              {doc.years_experience > 0 && (
                                <span className="badge d-flex align-items-center gap-1 px-2 py-1 fw-medium" style={{ background: '#fef3c7', color: '#92400e', borderRadius: 8, fontSize: '0.7rem' }}>
                                  <i className="bi bi-briefcase"></i> {doc.years_experience} ans
                                </span>
                              )}
                            </div>

                            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 12px' }}>
                              <div className="d-flex align-items-center gap-1 mb-2">
                                <i className="bi bi-calendar-week text-primary" style={{ fontSize: '0.8rem' }}></i>
                                <span className="fw-semibold text-dark" style={{ fontSize: '0.78rem' }}>Disponibilités</span>
                              </div>
                              <DoctorWeeklyCalendar doctor={doc} compact />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ TAB : MÉDECINS (détaillé) ═══ */}
            {activeTab === 'doctors' && (
              <div>
                {doctors.length === 0 ? (
                  <div className="text-center py-5">
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f1f5f9' }} className="d-inline-flex align-items-center justify-content-center mb-3">
                      <i className="bi bi-people text-muted" style={{ fontSize: '2rem' }}></i>
                    </div>
                    <h5 className="text-muted fw-semibold">Aucun médecin dans ce cabinet</h5>
                  </div>
                ) : (
                  doctors.map((doc, idx) => (
                    <div key={doc.id} className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16, ...styles.accentCard, borderLeftColor: ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'][idx % 5] }}>
                      <div className="card-body p-4">
                        <div className="d-flex gap-4 mb-4">
                          {doc.profile_photo_url ? (
                            <img src={doc.profile_photo_url} alt="" className="shadow"
                              style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 18 }} />
                          ) : (
                            <div className="shadow d-flex align-items-center justify-content-center"
                              style={{ width: 88, height: 88, borderRadius: 18, background: `linear-gradient(135deg, ${['#dbeafe,#c7d2fe', '#ede9fe,#ddd6fe', '#d1fae5,#a7f3d0', '#fef3c7,#fde68a', '#fee2e2,#fecaca'][idx % 5]})` }}>
                              <i className="bi bi-person-fill" style={{ fontSize: '2rem', color: ['#4f46e5', '#7c3aed', '#059669', '#d97706', '#dc2626'][idx % 5] }}></i>
                            </div>
                          )}
                          <div className="flex-grow-1">
                            <h5 className="fw-bold text-dark mb-1">Dr. {doc.full_name}</h5>
                            <div className="text-muted mb-2">{doc.specialty}</div>
                            <div className="d-flex flex-wrap gap-1 mb-2">
                              {doc.consultation_price > 0 && (
                                <span className="badge d-flex align-items-center gap-1 px-2 py-1" style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 8, fontSize: '0.75rem' }}>
                                  <i className="bi bi-cash-stack"></i> {doc.consultation_price.toFixed(3)} DT
                                </span>
                              )}
                              {doc.accepts_new_patients && (
                                <span className="badge d-flex align-items-center gap-1 px-2 py-1" style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 8, fontSize: '0.75rem' }}>
                                  <i className="bi bi-person-check"></i> Nouveaux patients
                                </span>
                              )}
                              {doc.teleconsultation_available && (
                                <span className="badge d-flex align-items-center gap-1 px-2 py-1 text-white" style={{ background: '#7c3aed', borderRadius: 8, fontSize: '0.75rem' }}>
                                  <i className="bi bi-camera-video"></i> Téléconsultation
                                </span>
                              )}
                              {doc.years_experience > 0 && (
                                <span className="badge d-flex align-items-center gap-1 px-2 py-1" style={{ background: '#fef3c7', color: '#92400e', borderRadius: 8, fontSize: '0.75rem' }}>
                                  <i className="bi bi-briefcase"></i> {doc.years_experience} ans d'exp.
                                </span>
                              )}
                              {doc.license_number && (
                                <span className="badge d-flex align-items-center gap-1 px-2 py-1" style={{ background: '#f1f5f9', color: '#475569', borderRadius: 8, fontSize: '0.75rem' }}>
                                  <i className="bi bi-patch-check"></i> {doc.license_number}
                                </span>
                              )}
                            </div>
                            {renderStars(doc.rating, doc.review_count)}
                          </div>
                        </div>

                        {doc.bio && (
                          <div className="mb-4 p-3" style={{ background: '#f8fafc', borderRadius: 12 }}>
                            <div className="d-flex align-items-start gap-2">
                              <i className="bi bi-chat-quote-fill text-primary mt-1" style={{ fontSize: '0.9rem' }}></i>
                              <div>
                                <div className="fw-semibold text-dark small mb-1">Biographie</div>
                                <p className="text-muted small mb-0" style={{ lineHeight: 1.6 }}>{doc.bio}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {(doc.email || doc.phone_number) && (
                          <div className="d-flex flex-wrap gap-3 mb-4">
                            {doc.email && (
                              <a href={`mailto:${doc.email}`} className="d-flex align-items-center gap-2 text-decoration-none px-3 py-2 rounded-3"
                                style={{ background: '#eff6ff', fontSize: '0.85rem', color: '#2563eb' }}>
                                <i className="bi bi-envelope-fill"></i>
                                <span>{doc.email}</span>
                              </a>
                            )}
                            {doc.phone_number && (
                              <a href={`tel:${doc.phone_number}`} className="d-flex align-items-center gap-2 text-decoration-none px-3 py-2 rounded-3"
                                style={{ background: '#f0fdf4', fontSize: '0.85rem', color: '#16a34a' }}>
                                <i className="bi bi-telephone-fill"></i>
                                <span>{doc.phone_number}</span>
                              </a>
                            )}
                          </div>
                        )}

                        {(doc.education?.length > 0 || doc.certifications?.length > 0) && (
                          <div className="row g-3 mb-4">
                            {doc.education?.length > 0 && (
                              <div className="col-md-6">
                                <div className="p-3 h-100" style={{ background: '#f8fafc', borderRadius: 12 }}>
                                  <div className="d-flex align-items-center gap-2 mb-2">
                                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#dbeafe', color: '#2563eb' }} className="d-flex align-items-center justify-content-center">
                                      <i className="bi bi-mortarboard-fill" style={{ fontSize: '0.75rem' }}></i>
                                    </div>
                                    <span className="fw-bold text-dark small">Formation</span>
                                  </div>
                                  <ul className="list-unstyled mb-0">
                                    {doc.education.map((edu, i) => (
                                      <li key={i} className="d-flex align-items-start gap-2 mb-2">
                                        <i className="bi bi-check-circle-fill text-success mt-1" style={{ fontSize: '0.6rem' }}></i>
                                        <span className="text-muted small">{edu}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                            {doc.certifications?.length > 0 && (
                              <div className="col-md-6">
                                <div className="p-3 h-100" style={{ background: '#f8fafc', borderRadius: 12 }}>
                                  <div className="d-flex align-items-center gap-2 mb-2">
                                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fef3c7', color: '#d97706' }} className="d-flex align-items-center justify-content-center">
                                      <i className="bi bi-award-fill" style={{ fontSize: '0.75rem' }}></i>
                                    </div>
                                    <span className="fw-bold text-dark small">Certifications</span>
                                  </div>
                                  <ul className="list-unstyled mb-0">
                                    {doc.certifications.map((cert, i) => (
                                      <li key={i} className="d-flex align-items-start gap-2 mb-2">
                                        <i className="bi bi-patch-check-fill text-warning mt-1" style={{ fontSize: '0.6rem' }}></i>
                                        <span className="text-muted small">{cert}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="p-3" style={{ background: '#f8fafc', borderRadius: 12 }}>
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#d1fae5', color: '#059669' }} className="d-flex align-items-center justify-content-center">
                              <i className="bi bi-calendar-check-fill" style={{ fontSize: '0.75rem' }}></i>
                            </div>
                            <span className="fw-bold text-dark small">Disponibilités</span>
                          </div>
                          <DoctorWeeklyCalendar doctor={doc} compact />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ═══ TAB : CALENDRIERS ═══ */}
            {activeTab === 'calendar' && (
              <div>
                {doctors.length === 0 ? (
                  <div className="text-center py-5">
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f1f5f9' }} className="d-inline-flex align-items-center justify-content-center mb-3">
                      <i className="bi bi-calendar3 text-muted" style={{ fontSize: '2rem' }}></i>
                    </div>
                    <h5 className="text-muted fw-semibold">Aucun médecin dans ce cabinet</h5>
                  </div>
                ) : (
                  doctors.map((doc, idx) => (
                    <div key={doc.id} className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16 }}>
                      <div className="px-4 pt-4 pb-3" style={{ background: `linear-gradient(135deg, ${['#eff6ff,#dbeafe', '#f5f3ff,#ede9fe', '#ecfdf5,#d1fae5', '#fffbeb,#fef3c7', '#fef2f2,#fee2e2'][idx % 5]})`, borderRadius: '16px 16px 0 0' }}>
                        <div className="d-flex align-items-center gap-3">
                          {doc.profile_photo_url ? (
                            <img src={doc.profile_photo_url} alt="" className="border-2 shadow-sm"
                              style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 14, borderColor: 'white' }} />
                          ) : (
                            <div className="shadow-sm d-flex align-items-center justify-content-center border-2"
                              style={{ width: 48, height: 48, borderRadius: 14, borderColor: 'white', background: `linear-gradient(135deg, ${['#dbeafe,#c7d2fe', '#ede9fe,#ddd6fe', '#d1fae5,#a7f3d0', '#fef3c7,#fde68a', '#fee2e2,#fecaca'][idx % 5]})` }}>
                              <i className="bi bi-person-fill" style={{ fontSize: '1.1rem', color: ['#4f46e5', '#7c3aed', '#059669', '#d97706', '#dc2626'][idx % 5] }}></i>
                            </div>
                          )}
                          <div className="flex-grow-1">
                            <h6 className="fw-bold text-dark mb-0">Dr. {doc.full_name}</h6>
                            <span className="text-muted small">{doc.specialty}</span>
                          </div>
                          <div className="d-flex gap-1">
                            {doc.consultation_price > 0 && (
                              <span className="badge px-2 py-1 fw-medium" style={{ background: 'white', color: '#1d4ed8', borderRadius: 8, fontSize: '0.7rem' }}>
                                {doc.consultation_price.toFixed(3)} DT
                              </span>
                            )}
                            {doc.teleconsultation_available && (
                              <span className="badge px-2 py-1 fw-medium text-white" style={{ background: '#7c3aed', borderRadius: 8, fontSize: '0.7rem' }}>
                                <i className="bi bi-camera-video me-1"></i>Téléconsult.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="card-body p-4">
                        <DoctorWeeklyCalendar doctor={doc} />

                        {doc.upcoming_unavailabilities?.length > 0 && (
                          <div className="mt-4">
                            <div className="d-flex align-items-center gap-2 mb-3">
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fee2e2', color: '#dc2626' }} className="d-flex align-items-center justify-content-center">
                                <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '0.75rem' }}></i>
                              </div>
                              <h6 className="fw-bold text-dark mb-0" style={{ fontSize: '0.9rem' }}>Indisponibilités à venir</h6>
                            </div>
                            <div className="space-y-2">
                              {doc.upcoming_unavailabilities.map(u => {
                                const reasonColors = {
                                  vacation: { bg: '#fffbeb', border: '#f59e0b', icon: 'bi-umbrella-fill', iconColor: '#d97706' },
                                  training: { bg: '#ecfeff', border: '#06b6d4', icon: 'bi-book-fill', iconColor: '#0891b2' },
                                  emergency: { bg: '#fef2f2', border: '#ef4444', icon: 'bi-exclamation-circle-fill', iconColor: '#dc2626' },
                                  conference: { bg: '#f5f3ff', border: '#8b5cf6', icon: 'bi-mic-fill', iconColor: '#7c3aed' },
                                  other: { bg: '#f8fafc', border: '#94a3b8', icon: 'bi-info-circle-fill', iconColor: '#64748b' },
                                };
                                const rc = reasonColors[u.reason] || reasonColors.other;

                                return (
                                  <div key={u.id} className="d-flex align-items-center gap-3 p-3 rounded-3"
                                    style={{ background: rc.bg, borderLeft: `3px solid ${rc.border}` }}>
                                    <i className={`bi ${rc.icon}`} style={{ color: rc.iconColor, fontSize: '1rem' }}></i>
                                    <div className="flex-grow-1">
                                      <div className="fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                                        {u.reason_display || 'Indisponible'}
                                      </div>
                                      {u.description && (
                                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>{u.description}</div>
                                      )}
                                    </div>
                                    <div className="text-end flex-shrink-0">
                                      <div className="fw-semibold text-dark" style={{ fontSize: '0.8rem' }}>
                                        {new Date(u.start_datetime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                      </div>
                                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        {new Date(u.start_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        {' → '}
                                        {new Date(u.end_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ FOOTER ═══════ */}
      <div className="py-4 mt-4" style={{ background: '#e2e8f0' }}>
        <div className="container">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <Link to="/directory" className="text-decoration-none text-muted d-flex align-items-center gap-2" style={{ fontSize: '0.85rem' }}>
              <i className="bi bi-arrow-left"></i> Retour à l'annuaire
            </Link>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
              <i className="bi bi-building me-1"></i> Cabinet médical · {cabinet.city_name}, {cabinet.governorate_name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper: Check if cabinet is open now ──────────────────────────────────
function checkIfOpen(openingHours) {
  if (!openingHours) return false;
  const now = new Date();
  const dayMap = { 0: 'dimanche', 1: 'lundi', 2: 'mardi', 3: 'mercredi', 4: 'jeudi', 5: 'vendredi', 6: 'samedi' };
  const todayKey = dayMap[now.getDay()];
  const todayData = openingHours[todayKey];
  if (!todayData || todayData.slots.length === 0 || todayData.slots[0] === 'Fermé') return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return todayData.slots.some(slot => {
    const parts = slot.split('-');
    if (parts.length !== 2) return false;
    const [sh, sm] = parts[0].trim().split(':').map(Number);
    const [eh, em] = parts[1].trim().split(':').map(Number);
    let start = sh * 60 + (sm || 0);
    let end = eh * 60 + (em || 0);
    // ✅ FIX : 00:00 = minuit = fin de journée = 1440 (24h × 60)
    if (end === 0 && eh === 0) {
      end = 1440;
    }
    // ✅ FIX : créneau qui traverse minuit ex: 22:00-06:00
    if (end <= start) {
      return currentMinutes >= start || currentMinutes < end;
    }
    return currentMinutes >= start && currentMinutes < end;
  });
}