import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import MapView from '../../components/MapView';

// ── Composant principal ─────────────────────────────────────────────────
export default function CabinetDirectory() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────
  const [cabinets, setCabinets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(12);

  // Vue : liste ou carte
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  // Filtres
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    specialty: '',
    city: '',
    governorate: '',
    cnam: false,
    teleconsultation: false,
    accepts_patients: false,
    ordering: '-created_at',
  });

  // Options de filtres (dropdowns)
  const [filterOptions, setFilterOptions] = useState({
    specialties: [],
    cities: [],
    governorates: [],
    price_range: { min: 0, max: 0 },
  });
  const [filtersLoading, setFiltersLoading] = useState(true);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Auto-dismiss messages
  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(t); }, [message]);

  // ── Fetch filtres (dropdowns) ──────────────────────────────────
  useEffect(() => {
    const fetchFilters = async () => {
      setFiltersLoading(true);
      try {
        const { data } = await api.get('/cabinets/directory/filters/');
        setFilterOptions(data);
      } catch (err) {
        // Silently fail
      } finally {
        setFiltersLoading(false);
      }
    };
    fetchFilters();
  }, []);

  // ── Fetch cabinets ─────────────────────────────────────────────
  const fetchCabinets = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('page_size', pageSize);

      if (search.trim()) params.set('search', search.trim());
      if (filters.specialty) params.set('specialty', filters.specialty);
      if (filters.city) params.set('city', filters.city);
      if (filters.governorate) params.set('governorate', filters.governorate);
      if (filters.cnam) params.set('cnam', 'true');
      if (filters.teleconsultation) params.set('teleconsultation', 'true');
      if (filters.accepts_patients) params.set('accepts_patients', 'true');
      if (filters.ordering) params.set('ordering', filters.ordering);

      const { data } = await api.get(`/cabinets/directory/?${params.toString()}`);
      setCabinets(data.results || data || []);
      setTotalCount(data.count || (Array.isArray(data) ? data.length : 0));
    } catch (err) {
      setMessage("Erreur lors du chargement des cabinets.");
    } finally {
      setLoading(false);
    }
  }, [search, filters, pageSize]);

  useEffect(() => { fetchCabinets(currentPage); }, [fetchCabinets, currentPage]);

  // ── Reset page quand les filtres changent ──────────────────────
  useEffect(() => { setCurrentPage(1); }, [search, filters]);

  // ── Gouvernorat change → reset city ───────────────────────────
  const handleGovernorateChange = (govId) => {
    setFilters({ ...filters, governorate: govId, city: '' });
  };

  // ── Clear filters ─────────────────────────────────────────────
  const clearFilters = () => {
    setSearch('');
    setFilters({
      specialty: '', city: '', governorate: '',
      cnam: false, teleconsultation: false, accepts_patients: false,
      ordering: '-created_at',
    });
  };

  // ── Active filters count ──────────────────────────────────────
  const activeFilterCount = [
    filters.specialty, filters.city, filters.governorate,
    filters.cnam, filters.teleconsultation, filters.accepts_patients,
    search.trim()
  ].filter(Boolean).length;

  // ── Naviguer vers le profil cabinet ───────────────────────────
  const goToProfile = (cabinetId) => {
    navigate(`/cabinet-profile/${cabinetId}`);
  };

  // ── Helpers ───────────────────────────────────────────────────
  const renderStars = (rating) => {
    if (!rating || rating === 0) return <span className="text-muted small">Non noté</span>;
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < full) stars.push(<i key={i} className="bi bi-star-fill text-warning"></i>);
      else if (i === full && half) stars.push(<i key={i} className="bi bi-star-half text-warning"></i>);
      else stars.push(<i key={i} className="bi bi-star text-warning"></i>);
    }
    return <span className="d-inline-flex gap-0">{stars} <small className="ms-1 text-muted">({rating})</small></span>;
  };

  const DAY_LABELS = { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', thursday: 'Jeu', friday: 'Ven', saturday: 'Sam', sunday: 'Dim' };

  const filteredCities = filters.governorate
    ? filterOptions.cities.filter(c => String(c.governorate_id) === String(filters.governorate))
    : filterOptions.cities;

  // Compteur cabinets avec coords GPS
  const withCoordsCount = cabinets.filter(c => c.latitude && c.longitude).length;

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="container-fluid py-4">
      {/* En-tête */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1">
          <i className="bi bi-building me-2 text-primary"></i>
          Annuaire des Cabinets Médicaux
        </h2>
        <p className="text-muted mb-0">Trouvez le cabinet et le médecin qui vous conviennent</p>
      </div>

      {message && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      <div className="row g-4">
        {/* ═══ SIDEBAR FILTRES ═══ */}
        <div className="col-lg-3">
          <div className="card shadow-sm border-0 position-sticky" style={{ top: 80 }}>
            <div className="card-header bg-white py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold"><i className="bi bi-funnel me-2"></i>Filtres</h6>
                {activeFilterCount > 0 && (
                  <button className="btn btn-sm btn-outline-secondary" onClick={clearFilters}>
                    Effacer ({activeFilterCount})
                  </button>
                )}
              </div>
            </div>
            <div className="card-body">
              {/* Recherche */}
              <div className="mb-3">
                <label className="form-label fw-semibold small">Recherche</label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text"><i className="bi bi-search"></i></span>
                  <input type="text" className="form-control" placeholder="Cabinet, médecin, ville..."
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              {/* Gouvernorat */}
              {filterOptions.governorates.length > 0 && (
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Gouvernorat</label>
                  <select className="form-select form-select-sm" value={filters.governorate}
                    onChange={(e) => handleGovernorateChange(e.target.value)}>
                    <option value="">Tous les gouvernorats</option>
                    {filterOptions.governorates.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ville */}
              {filterOptions.cities.length > 0 && (
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Ville</label>
                  <select className="form-select form-select-sm" value={filters.city}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}>
                    <option value="">Toutes les villes</option>
                    {filteredCities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Spécialité */}
              {filterOptions.specialties.length > 0 && (
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Spécialité</label>
                  <select className="form-select form-select-sm" value={filters.specialty}
                    onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}>
                    <option value="">Toutes les spécialités</option>
                    {filterOptions.specialties.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Triage */}
              <div className="mb-3">
                <label className="form-label fw-semibold small">Trier par</label>
                <select className="form-select form-select-sm" value={filters.ordering}
                  onChange={(e) => setFilters({ ...filters, ordering: e.target.value })}>
                  <option value="-created_at">Plus récents</option>
                  <option value="name">Nom (A-Z)</option>
                  <option value="-name">Nom (Z-A)</option>
                  <option value="city__name">Ville (A-Z)</option>
                  <option value="-avg_rating">Meilleure note</option>
                </select>
              </div>

              <hr />

              {/* Filtres rapides */}
              <div className="mb-2">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="cnam-filter"
                    checked={filters.cnam} onChange={(e) => setFilters({ ...filters, cnam: e.target.checked })} />
                  <label className="form-check-label small" htmlFor="cnam-filter">
                    <span className="badge bg-success me-1">CNAM</span> Conventionné CNAM
                  </label>
                </div>
              </div>
              <div className="mb-2">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="tele-filter"
                    checked={filters.teleconsultation} onChange={(e) => setFilters({ ...filters, teleconsultation: e.target.checked })} />
                  <label className="form-check-label small" htmlFor="tele-filter">
                    <i className="bi bi-camera-video me-1"></i> Téléconsultation
                  </label>
                </div>
              </div>
              <div className="mb-2">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="accepts-filter"
                    checked={filters.accepts_patients} onChange={(e) => setFilters({ ...filters, accepts_patients: e.target.checked })} />
                  <label className="form-check-label small" htmlFor="accepts-filter">
                    <i className="bi bi-person-check me-1"></i> Accepte de nouveaux patients
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ CONTENU PRINCIPAL ═══ */}
        <div className="col-lg-9">
          {/* Barre supérieure : résultats + toggle vue */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="text-muted small">
              <strong>{totalCount}</strong> cabinet(s) trouvé(s)
              {activeFilterCount > 0 && ` avec ${activeFilterCount} filtre(s)`}
            </div>

            {/* Toggle Liste / Carte */}
            <div className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('list')}
              >
                <i className="bi bi-grid-3x3-gap me-1"></i> Liste
              </button>
              <button
                type="button"
                className={`btn ${viewMode === 'map' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('map')}
              >
                <i className="bi bi-geo-alt me-1"></i>
                Carte
                {withCoordsCount > 0 && (
                  <span className="badge bg-white text-primary ms-1">{withCoordsCount}</span>
                )}
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <p className="mt-2 text-muted">Recherche de cabinets...</p>
            </div>
          ) : cabinets.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-search display-1 text-muted"></i>
              <h5 className="mt-3 text-muted">Aucun cabinet trouvé</h5>
              <p className="text-muted">Essayez de modifier vos critères de recherche</p>
              <button className="btn btn-outline-primary btn-sm mt-2" onClick={clearFilters}>
                <i className="bi bi-arrow-counterclockwise me-1"></i> Réinitialiser les filtres
              </button>
            </div>
          ) : viewMode === 'map' ? (
            /* ═══ VUE CARTE ═══ */
            <MapView cabinets={cabinets} onCabinetClick={(cab) => goToProfile(cab.id)} />
          ) : (
            /* ═══ VUE LISTE ═══ */
            <>
              <div className="row g-3">
                {cabinets.map(cab => (
                  <div key={cab.id} className="col-md-6">
                    <div className="card h-100 shadow-sm border-0 hover-shadow" style={{ transition: 'box-shadow 0.2s', cursor: 'pointer' }}
                      onClick={() => goToProfile(cab.id)}>
                      {/* Header du cabinet */}
                      <div className="card-body pb-2">
                        <div className="d-flex gap-3">
                          {/* Logo */}
                          <div className="flex-shrink-0">
                            {cab.logo_url ? (
                              <img src={cab.logo_url} alt={cab.name}
                                className="rounded-3" style={{ width: 64, height: 64, objectFit: 'cover' }} />
                            ) : (
                              <div className="rounded-3 bg-primary bg-opacity-10 d-flex align-items-center justify-content-center"
                                style={{ width: 64, height: 64 }}>
                                <i className="bi bi-hospital text-primary" style={{ fontSize: '1.8rem' }}></i>
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-grow-1 min-w-0">
                            <h6 className="fw-bold mb-1 text-truncate">{cab.name}</h6>
                            <div className="text-muted small mb-1">
                              <i className="bi bi-geo-alt me-1"></i>
                              {cab.city_name}{cab.governorate_name ? `, ${cab.governorate_name}` : ''}
                            </div>
                            <div className="text-muted small mb-1">
                              <i className="bi bi-pin-map me-1"></i>
                              {cab.address?.substring(0, 60)}{cab.address?.length > 60 ? '...' : ''}
                            </div>
                            {/* Indicateur GPS */}
                            {cab.latitude && cab.longitude && (
                              <span className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: '0.65rem' }}>
                                <i className="bi bi-pin-map-fill me-1"></i>Sur la carte
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="d-flex flex-wrap gap-1 mt-2">
                          {cab.cnam_affiliated && <span className="badge bg-success text-white">CNAM</span>}
                          {cab.specialties_list?.map(s => (
                            <span key={s.id} className="badge bg-primary bg-opacity-10 text-primary">{s.name}</span>
                          ))}
                        </div>
                      </div>

                      {/* Médecins */}
                      {(cab.doctors_info || []).length > 0 && (
                        <div className="px-3 pb-2">
                          <small className="text-muted fw-semibold">Médecin(s) ({cab.doctors_count})</small>
                          <div className="mt-1">
                            {cab.doctors_info.slice(0, 3).map(doc => (
                              <div key={doc.id} className="d-flex align-items-center gap-2 py-1">
                                {doc.profile_photo_url ? (
                                  <img src={doc.profile_photo_url} alt="" className="rounded-circle"
                                    style={{ width: 28, height: 28, objectFit: 'cover' }} />
                                ) : (
                                  <div className="rounded-circle bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center"
                                    style={{ width: 28, height: 28 }}>
                                    <i className="bi bi-person-fill text-secondary" style={{ fontSize: '0.8rem' }}></i>
                                  </div>
                                )}
                                <div className="flex-grow-1 min-w-0">
                                  <div className="fw-semibold small text-truncate">Dr. {doc.full_name}</div>
                                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                    {doc.specialty}
                                    {doc.consultation_price > 0 && ` • ${doc.consultation_price.toFixed(3)} DT`}
                                  </div>
                                </div>
                                <div className="text-end">
                                  {renderStars(doc.rating)}
                                </div>
                              </div>
                            ))}
                            {cab.doctors_info.length > 3 && (
                              <div className="text-muted small">+{cab.doctors_info.length - 3} autre(s)...</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="card-footer bg-transparent py-2 px-3 d-flex justify-content-between align-items-center">
                        <div className="d-flex gap-3 text-muted small">
                          <span><i className="bi bi-telephone me-1"></i>{cab.phone_number}</span>
                        </div>
                        <span className="text-primary small fw-semibold">
                          Voir le profil <i className="bi bi-chevron-right"></i>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="mt-4">
                  <ul className="pagination pagination-sm justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(p => p - 1)}>
                        <i className="bi bi-chevron-left"></i>
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev !== undefined && p - prev > 1;
                        return (
                          <span key={p}>
                            {showEllipsis && <li className="page-item disabled"><span className="page-link">...</span></li>}
                            <li className={`page-item ${p === currentPage ? 'active' : ''}`}>
                              <button className="page-link" onClick={() => setCurrentPage(p)}>{p}</button>
                            </li>
                          </span>
                        );
                      })}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(p => p + 1)}>
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}