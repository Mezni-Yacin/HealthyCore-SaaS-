import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import MapView from '../../components/MapView';

// ── Composant principal ─────────────────────────────────────────────────
export default function CabinetDirectory() {
  const navigate = useNavigate();

  // ── Onglet actif ────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('cabinets'); // 'cabinets' | 'labs'

  // ══════════════════ STATE COMMUNS ══════════════════
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  // Options de filtres (dropdowns) - Commun aux deux onglets
  const [filterOptions, setFilterOptions] = useState({
    specialties: [],
    cities: [],
    governorates: [],
    price_range: { min: 0, max: 0 },
  });
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Auto-dismiss messages
  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(t); }, [message]);


  // ══════════════════ STATE CABINETS ══════════════════
  const [cabinets, setCabinets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(12);

  const [searchCab, setSearchCab] = useState('');
  const [filtersCab, setFiltersCab] = useState({
    specialty: '', city: '', governorate: '',
    cnam: false, teleconsultation: false, accepts_patients: false,
    ordering: '-created_at',
  });

  const totalPagesCab = Math.ceil(totalCount / pageSize);

  // ══════════════════ STATE LABORATOIRES ══════════════════
  const [labs, setLabs] = useState([]);
  const [loadingLabs, setLoadingLabs] = useState(false);
  
  const [searchLab, setSearchLab] = useState('');
  const [filterLabCity, setFilterLabCity] = useState('');
  const [filterLabCnam, setFilterLabCnam] = useState(false);


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

  // ── Fetch Cabinets ─────────────────────────────────────────────
  const fetchCabinets = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('page_size', pageSize);

      if (searchCab.trim()) params.set('search', searchCab.trim());
      if (filtersCab.specialty) params.set('specialty', filtersCab.specialty);
      if (filtersCab.city) params.set('city', filtersCab.city);
      if (filtersCab.governorate) params.set('governorate', filtersCab.governorate);
      if (filtersCab.cnam) params.set('cnam', 'true');
      if (filtersCab.teleconsultation) params.set('teleconsultation', 'true');
      if (filtersCab.accepts_patients) params.set('accepts_patients', 'true');
      if (filtersCab.ordering) params.set('ordering', filtersCab.ordering);

      const { data } = await api.get(`/cabinets/directory/?${params.toString()}`);
      setCabinets(data.results || data || []);
      setTotalCount(data.count || (Array.isArray(data) ? data.length : 0));
    } catch (err) {
      setMessage("Erreur lors du chargement des cabinets.");
    } finally {
      setLoading(false);
    }
  }, [searchCab, filtersCab, pageSize]);

  useEffect(() => { 
    if (activeTab === 'cabinets') fetchCabinets(currentPage); 
  }, [fetchCabinets, currentPage, activeTab]);

  // ── Fetch Laboratoires ─────────────────────────────────────────
  const fetchLabs = useCallback(async () => {
    setLoadingLabs(true);
    try {
      const { data } = await api.get('/laboratory/doctor/labs/');
      setLabs(data || []);
    } catch (err) {
      setMessage("Erreur lors du chargement des laboratoires.");
    } finally {
      setLoadingLabs(false);
    }
  }, []);

  useEffect(() => { 
    if (activeTab === 'labs') fetchLabs(); 
  }, [activeTab, fetchLabs]);


  // ── Reset page quand les filtres changent ──────────────────────
  useEffect(() => { setCurrentPage(1); }, [searchCab, filtersCab]);

  const handleGovernorateChange = (govId) => {
    setFiltersCab({ ...filtersCab, governorate: govId, city: '' });
  };

  const clearFiltersCab = () => {
    setSearchCab('');
    setFiltersCab({
      specialty: '', city: '', governorate: '',
      cnam: false, teleconsultation: false, accepts_patients: false,
      ordering: '-created_at',
    });
  };

  const clearFiltersLab = () => {
    setSearchLab('');
    setFilterLabCity('');
    setFilterLabCnam(false);
  };

  // ── Compteurs de filtres actifs ──────────────────────────────
  const activeCabFilterCount = [
    filtersCab.specialty, filtersCab.city, filtersCab.governorate,
    filtersCab.cnam, filtersCab.teleconsultation, filtersCab.accepts_patients,
    searchCab.trim()
  ].filter(Boolean).length;

  const activeLabFilterCount = [
    filterLabCity, filterLabCnam, searchLab.trim()
  ].filter(Boolean).length;

  // ── Filtrage client-side pour les Labos ──────────────────────
  const filteredLabs = labs.filter(lab => {
    const matchSearch = !searchLab.trim() || 
      lab.name?.toLowerCase().includes(searchLab.toLowerCase()) || 
      (lab.city_name || '').toLowerCase().includes(searchLab.toLowerCase()) ||
      (lab.address || '').toLowerCase().includes(searchLab.toLowerCase());
    const matchCity = !filterLabCity || String(lab.city) === String(filterLabCity);
    const matchCnam = !filterLabCnam || lab.cnam_affiliated === true;
    return matchSearch && matchCity && matchCnam;
  });

  const filteredCitiesCab = filtersCab.governorate
    ? filterOptions.cities.filter(c => String(c.governorate_id) === String(filtersCab.governorate))
    : filterOptions.cities;

  // Compteur cabinets avec coords GPS
  const withCoordsCount = cabinets.filter(c => c.latitude && c.longitude).length;


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

  // Helper pour formater les horaires rapidement
  const renderHoursSummary = (hours) => {
    if (!hours || typeof hours !== 'object' || Object.keys(hours).length === 0) {
      return <span className="text-muted small">Non renseigné</span>;
    }
    const days = Object.entries(hours);
    const firstDay = days[0];
    return (
      <span className="small">
        <span className="fw-semibold text-dark">{firstDay[0]?.substring(0, 3)}</span> : {firstDay[1]}
        {days.length > 1 && <span className="text-muted"> + {days.length - 1} jour(s)</span>}
      </span>
    );
  };


  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="container-fluid py-4">
      {/* En-tête */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1">
          <i className="bi bi-journal-text me-2 text-primary"></i>
          Annuaire Médical
        </h2>
        <p className="text-muted mb-0">Trouvez le cabinet ou le laboratoire qui vous convient</p>
      </div>

      {message && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      {/* ═══ ONGLETS PRINCIPAUX ═══ */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'cabinets' ? 'active' : ''}`} 
            onClick={() => setActiveTab('cabinets')}
          >
            <i className="bi bi-building me-2"></i>Cabinets Médicaux
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'labs' ? 'active' : ''}`} 
            onClick={() => setActiveTab('labs')}
          >
            <i className="bi bi-clipboard2-pulse me-2"></i>Laboratoires d'Analyses
          </button>
        </li>
      </ul>


      <div className="row g-4">
        {/* ═══ SIDEBAR FILTRES ═══ */}
        <div className="col-lg-3">
          <div className="card shadow-sm border-0 position-sticky" style={{ top: 80 }}>
            <div className="card-header bg-white py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold"><i className="bi bi-funnel me-2"></i>Filtres</h6>
                {activeTab === 'cabinets' && activeCabFilterCount > 0 && (
                  <button className="btn btn-sm btn-outline-secondary" onClick={clearFiltersCab}>
                    Effacer ({activeCabFilterCount})
                  </button>
                )}
                {activeTab === 'labs' && activeLabFilterCount > 0 && (
                  <button className="btn btn-sm btn-outline-secondary" onClick={clearFiltersLab}>
                    Effacer ({activeLabFilterCount})
                  </button>
                )}
              </div>
            </div>
            
            <div className="card-body">
              {/* Recherche */}
              <div className="mb-3">
                <label className="form-label fw-semibold small">
                  {activeTab === 'cabinets' ? 'Recherche' : 'Rechercher un labo'}
                </label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text"><i className="bi bi-search"></i></span>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder={activeTab === 'cabinets' ? "Cabinet, médecin, ville..." : "Nom du laboratoire, ville..."}
                    value={activeTab === 'cabinets' ? searchCab : searchLab} 
                    onChange={(e) => activeTab === 'cabinets' ? setSearchCab(e.target.value) : setSearchLab(e.target.value)} 
                  />
                </div>
              </div>

              {/* Ville (Commun aux deux) */}
              {filterOptions.cities.length > 0 && (
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Ville</label>
                  <select 
                    className="form-select form-select-sm" 
                    value={activeTab === 'cabinets' ? filtersCab.city : filterLabCity}
                    onChange={(e) => {
                      if(activeTab === 'cabinets') setFiltersCab({ ...filtersCab, city: e.target.value });
                      else setFilterLabCity(e.target.value);
                    }}
                  >
                    <option value="">Toutes les villes</option>
                    {(activeTab === 'cabinets' ? filteredCitiesCab : filterOptions.cities).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* --- FILTRES SPÉCIFIQUES CABINETS --- */}
              {activeTab === 'cabinets' && (
                <>
                  {/* Gouvernorat */}
                  {filterOptions.governorates.length > 0 && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">Gouvernorat</label>
                      <select className="form-select form-select-sm" value={filtersCab.governorate}
                        onChange={(e) => handleGovernorateChange(e.target.value)}>
                        <option value="">Tous les gouvernorats</option>
                        {filterOptions.governorates.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Spécialité */}
                  {filterOptions.specialties.length > 0 && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">Spécialité</label>
                      <select className="form-select form-select-sm" value={filtersCab.specialty}
                        onChange={(e) => setFiltersCab({ ...filtersCab, specialty: e.target.value })}>
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
                    <select className="form-select form-select-sm" value={filtersCab.ordering}
                      onChange={(e) => setFiltersCab({ ...filtersCab, ordering: e.target.value })}>
                      <option value="-created_at">Plus récents</option>
                      <option value="name">Nom (A-Z)</option>
                      <option value="-name">Nom (Z-A)</option>
                      <option value="city__name">Ville (A-Z)</option>
                      <option value="-avg_rating">Meilleure note</option>
                    </select>
                  </div>

                  <hr />

                  <div className="mb-2">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="cnam-filter"
                        checked={filtersCab.cnam} onChange={(e) => setFiltersCab({ ...filtersCab, cnam: e.target.checked })} />
                      <label className="form-check-label small" htmlFor="cnam-filter">
                        <span className="badge bg-success me-1">CNAM</span> Conventionné CNAM
                      </label>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="tele-filter"
                        checked={filtersCab.teleconsultation} onChange={(e) => setFiltersCab({ ...filtersCab, teleconsultation: e.target.checked })} />
                      <label className="form-check-label small" htmlFor="tele-filter">
                        <i className="bi bi-camera-video me-1"></i> Téléconsultation
                      </label>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="accepts-filter"
                        checked={filtersCab.accepts_patients} onChange={(e) => setFiltersCab({ ...filtersCab, accepts_patients: e.target.checked })} />
                      <label className="form-check-label small" htmlFor="accepts-filter">
                        <i className="bi bi-person-check me-1"></i> Accepte de nouveaux patients
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* --- FILTRES SPÉCIFIQUES LABORATOIRES --- */}
              {activeTab === 'labs' && (
                <div className="mb-2">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="lab-cnam-filter"
                      checked={filterLabCnam} onChange={(e) => setFilterLabCnam(e.target.checked)} />
                    <label className="form-check-label small" htmlFor="lab-cnam-filter">
                      <span className="badge bg-success me-1">CNAM</span> Conventionné CNAM
                    </label>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ═══ CONTENU PRINCIPAL ═══ */}
        <div className="col-lg-9">
          
          {/* ==================== AFFICHAGE CABINETS ==================== */}
          {activeTab === 'cabinets' && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="text-muted small">
                  <strong>{totalCount}</strong> cabinet(s) trouvé(s)
                  {activeCabFilterCount > 0 && ` avec ${activeCabFilterCount} filtre(s)`}
                </div>
                <div className="btn-group btn-group-sm" role="group">
                  <button type="button" className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setViewMode('list')}>
                    <i className="bi bi-grid-3x3-gap me-1"></i> Liste
                  </button>
                  <button type="button" className={`btn ${viewMode === 'map' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setViewMode('map')}>
                    <i className="bi bi-geo-alt me-1"></i> Carte
                    {withCoordsCount > 0 && <span className="badge bg-white text-primary ms-1">{withCoordsCount}</span>}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" role="status" /><p className="mt-2 text-muted">Recherche de cabinets...</p></div>
              ) : cabinets.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-search display-1 text-muted"></i>
                  <h5 className="mt-3 text-muted">Aucun cabinet trouvé</h5>
                  <p className="text-muted">Essayez de modifier vos critères de recherche</p>
                  <button className="btn btn-outline-primary btn-sm mt-2" onClick={clearFiltersCab}><i className="bi bi-arrow-counterclockwise me-1"></i> Réinitialiser</button>
                </div>
              ) : viewMode === 'map' ? (
                <MapView cabinets={cabinets} onCabinetClick={(cab) => goToProfile(cab.id)} />
              ) : (
                <>
                  <div className="row g-3">
                    {cabinets.map(cab => (
                      <div key={cab.id} className="col-md-6">
                        <div className="card h-100 shadow-sm border-0 hover-shadow" style={{ transition: 'box-shadow 0.2s', cursor: 'pointer' }} onClick={() => goToProfile(cab.id)}>
                          <div className="card-body pb-2">
                            <div className="d-flex gap-3">
                              <div className="flex-shrink-0">
                                {cab.logo_url ? (
                                  <img src={cab.logo_url} alt={cab.name} className="rounded-3" style={{ width: 64, height: 64, objectFit: 'cover' }} />
                                ) : (
                                  <div className="rounded-3 bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: 64, height: 64 }}>
                                    <i className="bi bi-hospital text-primary" style={{ fontSize: '1.8rem' }}></i>
                                  </div>
                                )}
                              </div>
                              <div className="flex-grow-1 min-w-0">
                                <h6 className="fw-bold mb-1 text-truncate">{cab.name}</h6>
                                <div className="text-muted small mb-1"><i className="bi bi-geo-alt me-1"></i>{cab.city_name}{cab.governorate_name ? `, ${cab.governorate_name}` : ''}</div>
                                <div className="text-muted small mb-1"><i className="bi bi-pin-map me-1"></i>{cab.address?.substring(0, 60)}{cab.address?.length > 60 ? '...' : ''}</div>
                                {cab.latitude && cab.longitude && (
                                  <span className="badge bg-success bg-opacity-10 text-success" style={{ fontSize: '0.65rem' }}><i className="bi bi-pin-map-fill me-1"></i>Sur la carte</span>
                                )}
                              </div>
                            </div>
                            <div className="d-flex flex-wrap gap-1 mt-2">
                              {cab.cnam_affiliated && <span className="badge bg-success text-white">CNAM</span>}
                              {cab.specialties_list?.map(s => (<span key={s.id} className="badge bg-primary bg-opacity-10 text-primary">{s.name}</span>))}
                            </div>
                          </div>
                          {(cab.doctors_info || []).length > 0 && (
                            <div className="px-3 pb-2">
                              <small className="text-muted fw-semibold">Médecin(s) ({cab.doctors_count})</small>
                              <div className="mt-1">
                                {cab.doctors_info.slice(0, 3).map(doc => (
                                  <div key={doc.id} className="d-flex align-items-center gap-2 py-1">
                                    {doc.profile_photo_url ? (
                                      <img src={doc.profile_photo_url} alt="" className="rounded-circle" style={{ width: 28, height: 28, objectFit: 'cover' }} />
                                    ) : (
                                      <div className="rounded-circle bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>
                                        <i className="bi bi-person-fill text-secondary" style={{ fontSize: '0.8rem' }}></i>
                                      </div>
                                    )}
                                    <div className="flex-grow-1 min-w-0">
                                      <div className="fw-semibold small text-truncate">Dr. {doc.full_name}</div>
                                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>{doc.specialty}{doc.consultation_price > 0 && ` • ${doc.consultation_price.toFixed(3)} DT`}</div>
                                    </div>
                                    <div className="text-end">{renderStars(doc.rating)}</div>
                                  </div>
                                ))}
                                {cab.doctors_info.length > 3 && <div className="text-muted small">+{cab.doctors_info.length - 3} autre(s)...</div>}
                              </div>
                            </div>
                          )}
                          <div className="card-footer bg-transparent py-2 px-3 d-flex justify-content-between align-items-center">
                            <div className="text-muted small"><i className="bi bi-telephone me-1"></i>{cab.phone_number}</div>
                            <span className="text-primary small fw-semibold">Voir le profil <i className="bi bi-chevron-right"></i></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalPagesCab > 1 && (
                    <nav className="mt-4">
                      <ul className="pagination pagination-sm justify-content-center">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setCurrentPage(p => p - 1)}><i className="bi bi-chevron-left"></i></button></li>
                        {Array.from({ length: totalPagesCab }, (_, i) => i + 1).filter(p => p === 1 || p === totalPagesCab || Math.abs(p - currentPage) <= 1).map((p, idx, arr) => {
                          const prev = arr[idx - 1];
                          const showEllipsis = prev !== undefined && p - prev > 1;
                          return (<span key={p}>{showEllipsis && <li className="page-item disabled"><span className="page-link">...</span></li>}<li className={`page-item ${p === currentPage ? 'active' : ''}`}><button className="page-link" onClick={() => setCurrentPage(p)}>{p}</button></li></span>);
                        })}
                        <li className={`page-item ${currentPage === totalPagesCab ? 'disabled' : ''}`}><button className="page-link" onClick={() => setCurrentPage(p => p + 1)}><i className="bi bi-chevron-right"></i></button></li>
                      </ul>
                    </nav>
                  )}
                </>
              )}
            </>
          )}


          {/* ==================== AFFICHAGE LABORATOIRES ==================== */}
          {activeTab === 'labs' && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="text-muted small">
                  <strong>{filteredLabs.length}</strong> laboratoire(s) trouvé(s)
                  {activeLabFilterCount > 0 && ` avec ${activeLabFilterCount} filtre(s)`}
                </div>
              </div>

              {loadingLabs ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status" />
                  <p className="mt-2 text-muted">Recherche de laboratoires...</p>
                </div>
              ) : filteredLabs.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-clipboard2-pulse display-1 text-muted"></i>
                  <h5 className="mt-3 text-muted">Aucun laboratoire trouvé</h5>
                  <p className="text-muted">Essayez de modifier vos critères de recherche</p>
                  <button className="btn btn-outline-primary btn-sm mt-2" onClick={clearFiltersLab}>
                    <i className="bi bi-arrow-counterclockwise me-1"></i> Réinitialiser
                  </button>
                </div>
              ) : (
                <div className="row g-3">
                  {filteredLabs.map(lab => (
                    <div key={lab.id} className="col-md-6">
                      <div className="card h-100 shadow-sm border-0">
                        <div className="card-body">
                          <div className="d-flex gap-3 mb-3">
                            {/* Logo */}
                            <div className="flex-shrink-0">
                              {lab.logo ? (
                                <img 
                                  src={lab.logo} 
                                  alt={lab.name} 
                                  className="rounded-3" 
                                  style={{ width: 64, height: 64, objectFit: 'cover' }} 
                                />
                              ) : (
                                <div className="rounded-3 bg-info bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: 64, height: 64 }}>
                                  <i className="bi bi-clipboard2-pulse text-info" style={{ fontSize: '1.8rem' }}></i>
                                </div>
                              )}
                            </div>
                            
                            {/* Infos principales */}
                            <div className="flex-grow-1 min-w-0">
                              <h6 className="fw-bold mb-1 text-truncate">{lab.name}</h6>
                              <div className="text-muted small mb-1">
                                <i className="bi bi-geo-alt me-1"></i>
                                {lab.city_name || 'Ville non renseignée'}
                              </div>
                              <div className="text-muted small text-truncate">
                                <i className="bi bi-pin-map me-1"></i>
                                {lab.address || 'Adresse non renseignée'}
                              </div>
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="d-flex flex-wrap gap-1 mb-3">
                            {lab.cnam_affiliated && <span className="badge bg-success text-white">CNAM</span>}
                            {lab.is_active && <span className="badge bg-success bg-opacity-10 text-success">Actif</span>}
                            {lab.accreditation && <span className="badge bg-info bg-opacity-10 text-info">Agréé</span>}
                          </div>

                          {/* Détails contact & horaires */}
                          <div className="row g-2 small">
                            <div className="col-6">
                              <div className="text-muted"><i className="bi bi-telephone me-1"></i> Tél</div>
                              <div className="fw-semibold">{lab.phone_number || '-'}</div>
                            </div>
                            <div className="col-6">
                              <div className="text-muted"><i className="bi bi-envelope me-1"></i> Email</div>
                              <div className="fw-semibold text-truncate">{lab.email || '-'}</div>
                            </div>
                            <div className="col-12">
                              <div className="text-muted mb-1"><i className="bi bi-clock me-1"></i> Horaires d'ouverture</div>
                              {renderHoursSummary(lab.opening_hours)}
                            </div>
                            {lab.sample_collection_hours && Object.keys(lab.sample_collection_hours).length > 0 && (
                              <div className="col-12">
                                <div className="text-muted mb-1"><i className="bi bi-droplet me-1"></i> Horaires prélèvement</div>
                                {renderHoursSummary(lab.sample_collection_hours)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer */}
                        {lab.website && (
                          <div className="card-footer bg-transparent py-2 px-3 d-flex justify-content-between align-items-center">
                            <a href={lab.website} target="_blank" rel="noreferrer" className="text-muted small" onClick={e => e.stopPropagation()}>
                              <i className="bi bi-globe me-1"></i>Site web
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}