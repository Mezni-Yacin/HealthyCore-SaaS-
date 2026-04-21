import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

// ── Styles ────────────────────────────────────────────────────────────────
const styles = {
  headerGradient: {
    background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #8b5cf6 100%)',
  },
  cardHover: {
    transition: 'all 0.3s ease',
  },
};

// ── Composant principal ──────────────────────────────────────────────────

export default function SecretaryCabinets() {
  const [cabinets, setCabinets] = useState([]);
  const [stats, setStats] = useState({ total_cabinets: 0, active_cabinets: 0, total_doctors: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cabinetsRes, statsRes] = await Promise.all([
          api.get('/cabinets/secretary/cabinets/'),
          api.get('/cabinets/secretary/cabinets/stats/'),
        ]);
        setCabinets(cabinetsRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement des cabinets.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Loading ──
  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="text-muted mt-3">Chargement de vos cabinets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* ═══════ HEADER ═══════ */}
      <div className="rounded-4 p-4 mb-4 text-white" style={styles.headerGradient}>
        <div className="row align-items-center">
          <div className="col-md-8">
            <h2 className="fw-bold mb-1" style={{ fontSize: '1.6rem' }}>
              <i className="bi bi-hospital-fill me-2"></i>
              Mes Cabinets
            </h2>
            <p className="mb-0" style={{ opacity: 0.85 }}>
              Gérez les cabinets qui vous sont assignés
            </p>
          </div>
          <div className="col-md-4 text-md-end mt-3 mt-md-0">
            <div className="d-flex gap-3 justify-content-md-end">
              <div className="text-center">
                <div className="fw-bold" style={{ fontSize: '1.5rem' }}>{stats.total_cabinets}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Cabinets</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.3)' }}></div>
              <div className="text-center">
                <div className="fw-bold" style={{ fontSize: '1.5rem' }}>{stats.active_cabinets}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Actifs</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.3)' }}></div>
              <div className="text-center">
                <div className="fw-bold" style={{ fontSize: '1.5rem' }}>{stats.total_doctors}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Médecins</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ ERREUR ═══════ */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}

      {/* ═══════ LISTE VIDE ═══════ */}
      {cabinets.length === 0 && !error && (
        <div className="text-center py-5">
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#f3e8ff' }}
            className="d-inline-flex align-items-center justify-content-center mb-4">
            <i className="bi bi-hospital" style={{ fontSize: '2.5rem', color: '#7c3aed' }}></i>
          </div>
          <h4 className="fw-bold text-dark mb-2">Aucun cabinet assigné</h4>
          <p className="text-muted">
            Vous n'êtes assigné(e) à aucun cabinet pour le moment.
          </p>
          <p className="text-muted small">
            Contactez le médecin propriétaire pour être assigné(e) à un cabinet.
          </p>
        </div>
      )}

      {/* ═══════ GRILLE CABINETS ═══════ */}
      {cabinets.length > 0 && (
        <div className="row g-4">
          {cabinets.map(cabinet => (
            <div key={cabinet.id} className="col-xl-4 col-lg-6 col-md-6">
              <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16, ...styles.cardHover }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(109,40,217,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
                {/* Top gradient bar */}
                <div style={{ height: 4, background: 'linear-gradient(90deg, #6d28d9, #8b5cf6, #a78bfa)', borderRadius: '16px 16px 0 0' }}></div>

                <div className="card-body p-4">
                  {/* Logo + Name */}
                  <div className="d-flex gap-3 mb-3">
                    {cabinet.logo_url ? (
                      <img src={cabinet.logo_url} alt=""
                        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 14 }} />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center"
                        style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
                        <i className="bi bi-hospital-fill" style={{ fontSize: '1.3rem', color: '#7c3aed' }}></i>
                      </div>
                    )}
                    <div className="flex-grow-1 min-w-0">
                      <h5 className="fw-bold text-dark mb-0" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cabinet.name}
                      </h5>
                      <div className="text-muted small">
                        <i className="bi bi-geo-alt me-1"></i>{cabinet.address}{cabinet.city_name ? `, ${cabinet.city_name}` : ''}
                      </div>
                      {cabinet.owner_name && (
                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                          <i className="bi bi-person-badge me-1"></i>Dr. {cabinet.owner_name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {cabinet.phone_number && (
                      <span className="badge d-flex align-items-center gap-1 px-2 py-1" style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 8, fontSize: '0.75rem' }}>
                        <i className="bi bi-telephone-fill"></i> {cabinet.phone_number}
                      </span>
                    )}
                    {cabinet.email && (
                      <span className="badge d-flex align-items-center gap-1 px-2 py-1" style={{ background: '#eff6ff', color: '#2563eb', borderRadius: 8, fontSize: '0.75rem' }}>
                        <i className="bi bi-envelope-fill"></i> {cabinet.email}
                      </span>
                    )}
                    {cabinet.cnam_affiliated && (
                      <span className="badge px-2 py-1" style={{ background: '#ecfdf5', color: '#059669', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600 }}>
                        <i className="bi bi-shield-check me-1"></i>CNAM
                      </span>
                    )}
                    <span className={`badge px-2 py-1`} style={{
                      background: cabinet.is_active ? '#ecfdf5' : '#fef2f2',
                      color: cabinet.is_active ? '#059669' : '#dc2626',
                      borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
                        background: cabinet.is_active ? '#22c55e' : '#ef4444',
                        marginRight: 4,
                      }}></span>
                      {cabinet.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  {/* Spécialités */}
                  {cabinet.specialties_names && cabinet.specialties_names.length > 0 && (
                    <div className="d-flex flex-wrap gap-1 mb-3">
                      {cabinet.specialties_names.map((name, i) => (
                        <span key={i} className="badge" style={{ background: '#f5f3ff', color: '#6d28d9', borderRadius: 6, fontSize: '0.7rem' }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Doctors count */}
                  <div className="d-flex align-items-center gap-2 mb-3" style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    <i className="bi bi-people-fill"></i>
                    <span><strong>{cabinet.doctors_count}</strong> médecin{cabinet.doctors_count !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Actions */}
                  <div className="d-flex gap-2">
                    <Link to={`/secretary-cabinets/${cabinet.id}`}
                      className="btn flex-grow-1 text-white fw-semibold border-0"
                      style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', borderRadius: 10, fontSize: '0.85rem' }}>
                      <i className="bi bi-pencil-square me-1"></i> Gérer
                    </Link>
                    <Link to={`/cabinet-profile/${cabinet.id}`}
                      className="btn btn-outline-secondary"
                      style={{ borderRadius: 10, fontSize: '0.85rem' }}>
                      <i className="bi bi-eye"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}