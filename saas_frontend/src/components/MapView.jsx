import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ═══════ Fix Leaflet default icons (broken in webpack/bundler) ═══════
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ═══════ Icône personnalisée pour les marqueurs cabinets ═══════
const cabinetIcon = new L.DivIcon({
  html: `
    <div style="
      background: linear-gradient(135deg, #0d6efd, #6610f2);
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      transform: rotate(-45deg);
    ">
      <i class="bi bi-hospital-fill" style="
        color: white; font-size: 14px;
        transform: rotate(45deg);
      "></i>
    </div>
  `,
  className: 'cabinet-marker-icon',
  iconSize: [36, 42],
  iconAnchor: [18, 42],
  popupAnchor: [0, -45],
});

// ═══════ Composant pour recentrer la carte ═══════
function FitBounds({ cabinets }) {
  const map = useMap();

  if (cabinets.length === 0) return null;

  const validCabinets = cabinets.filter(c => c.latitude && c.longitude);

  if (validCabinets.length === 0) return null;

  const bounds = L.latLngBounds(
    validCabinets.map(c => [c.latitude, c.longitude])
  );

  // Petit padding autour des marqueurs
  map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });

  return null;
}

// ═══════ Star rating helper ═══════
function renderStars(rating) {
  if (!rating || rating === 0) return <span className="text-muted small">Non noté</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push(<i key={i} className="bi bi-star-fill text-warning"></i>);
    else if (i === full && half) stars.push(<i key={i} className="bi bi-star-half text-warning"></i>);
    else stars.push(<i key={i} className="bi bi-star text-warning opacity-50"></i>);
  }
  return (
    <span className="d-inline-flex align-items-center gap-0">
      {stars} <small className="ms-1 text-muted">({rating})</small>
    </span>
  );
}

// ═══════ Composant principal ═══════
export default function MapView({ cabinets, onCabinetClick }) {
  // Centre par défaut : Tunis
  const defaultCenter = [36.8065, 10.1815];

  if (cabinets.length === 0) {
    return (
      <div className="rounded-4 border bg-light d-flex align-items-center justify-content-center"
        style={{ height: '500px' }}>
        <div className="text-center text-muted">
          <i className="bi bi-geo-alt display-4 d-block mb-2"></i>
          <p>Aucun cabinet avec coordonnées GPS à afficher</p>
        </div>
      </div>
    );
  }

  // Séparer les cabinets avec/sans coordonnées
  const withCoords = cabinets.filter(c => c.latitude && c.longitude);
  const withoutCoords = cabinets.filter(c => !c.latitude || !c.longitude);

  return (
    <div>
      {/* Info si certains cabinets n'ont pas de coords */}
      {withoutCoords.length > 0 && (
        <div className="alert alert-info py-2 px-3 mb-2 small">
          <i className="bi bi-info-circle me-1"></i>
          {withoutCoords.length} cabinet(s) sans coordonnées GPS ne sont pas affichés sur la carte.
        </div>
      )}

      {/* Carte */}
      <div className="rounded-4 overflow-hidden border shadow-sm" style={{ height: '560px' }}>
        <MapContainer
          center={defaultCenter}
          zoom={12}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
          attributionControl={true}
        >
          {/* Contrôle de zoom à droite */}
          <ZoomControl position="topright" />

          {/* Tuiles OpenStreetMap */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
            maxZoom={19}
          />

          {/* Recentrage automatique */}
          <FitBounds cabinets={withCoords} />

          {/* Marqueurs */}
          {withCoords.map(cab => (
            <Marker
              key={cab.id}
              position={[cab.latitude, cab.longitude]}
              icon={cabinetIcon}
              eventHandlers={{
                click: () => onCabinetClick && onCabinetClick(cab),
              }}
            >
              <Popup maxWidth={320} minWidth={260}>
                {/* Contenu du popup */}
                <div style={{ fontSize: '0.85rem' }}>
                  {/* Header */}
                  <div className="d-flex align-items-center gap-2 mb-2">
                    {cab.logo_url ? (
                      <img src={cab.logo_url} alt="" className="rounded-2"
                        style={{ width: 40, height: 40, objectFit: 'cover' }} />
                    ) : (
                      <div className="rounded-2 bg-primary bg-opacity-10 d-flex align-items-center justify-content-center"
                        style={{ width: 40, height: 40 }}>
                        <i className="bi bi-hospital text-primary"></i>
                      </div>
                    )}
                    <div>
                      <strong className="d-block text-dark" style={{ fontSize: '0.9rem' }}>{cab.name}</strong>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {cab.city_name}{cab.governorate_name ? `, ${cab.governorate_name}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Adresse */}
                  {cab.address && (
                    <div className="text-muted mb-2">
                      <i className="bi bi-pin-map me-1"></i>{cab.address}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {cab.cnam_affiliated && <span className="badge bg-success">CNAM</span>}
                    {cab.specialties_list?.slice(0, 3).map(s => (
                      <span key={s.id} className="badge bg-primary bg-opacity-10 text-primary"
                        style={{ fontSize: '0.7rem' }}>{s.name}</span>
                    ))}
                    {cab.specialties_list?.length > 3 && (
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                        +{cab.specialties_list.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Médecins */}
                  {(cab.doctors_info || []).length > 0 && (
                    <div className="mb-2">
                      <div className="fw-semibold small mb-1">
                        <i className="bi bi-people me-1"></i>
                        {cab.doctors_info.length} médecin(s)
                      </div>
                      {cab.doctors_info.slice(0, 2).map(doc => (
                        <div key={doc.id} className="d-flex align-items-center gap-1 mb-1">
                          {doc.profile_photo_url ? (
                            <img src={doc.profile_photo_url} alt="" className="rounded-circle"
                              style={{ width: 22, height: 22, objectFit: 'cover' }} />
                          ) : (
                            <div className="rounded-circle bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center"
                              style={{ width: 22, height: 22 }}>
                              <i className="bi bi-person-fill text-secondary" style={{ fontSize: '0.65rem' }}></i>
                            </div>
                          )}
                          <div className="flex-grow-1">
                            <span className="fw-semibold" style={{ fontSize: '0.8rem' }}>
                              Dr. {doc.full_name}
                            </span>
                            {doc.specialty && (
                              <span className="text-muted ms-1" style={{ fontSize: '0.7rem' }}>
                                {doc.specialty}
                              </span>
                            )}
                          </div>
                          {doc.consultation_price > 0 && (
                            <span className="badge bg-info text-dark" style={{ fontSize: '0.65rem' }}>
                              {doc.consultation_price.toFixed(3)} DT
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Rating */}
                  {cab.avg_rating && (
                    <div className="mb-2">
                      {renderStars(cab.avg_rating)}
                    </div>
                  )}

                  {/* Contact */}
                  <div className="d-flex gap-3 text-muted mb-2" style={{ fontSize: '0.8rem' }}>
                    {cab.phone_number && (
                      <span><i className="bi bi-telephone me-1"></i>{cab.phone_number}</span>
                    )}
                  </div>

                  {/* Bouton voir détails */}
                  <button
                    className="btn btn-sm btn-primary w-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCabinetClick && onCabinetClick(cab);
                    }}
                  >
                    <i className="bi bi-eye me-1"></i> Voir les détails
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Compteur */}
      <div className="d-flex justify-content-between align-items-center mt-2">
        <small className="text-muted">
          <i className="bi bi-pin-map-fill text-primary me-1"></i>
          <strong>{withCoords.length}</strong> cabinet(s) affiché(s) sur la carte
        </small>
        {withoutCoords.length > 0 && (
          <small className="text-muted">
            {withoutCoords.length} sans localisation
          </small>
        )}
      </div>
    </div>
  );
}