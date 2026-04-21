import { useMemo } from 'react';

const DAYS = [
  { key: 'monday', label: 'Lundi', short: 'Lun' },
  { key: 'tuesday', label: 'Mardi', short: 'Mar' },
  { key: 'wednesday', label: 'Mercredi', short: 'Mer' },
  { key: 'thursday', label: 'Jeudi', short: 'Jeu' },
  { key: 'friday', label: 'Vendredi', short: 'Ven' },
  { key: 'saturday', label: 'Samedi', short: 'Sam' },
  { key: 'sunday', label: 'Dimanche', short: 'Dim' },
];

const START_HOUR = 7;
const END_HOUR = 21;

// Couleurs par type de indisponibilité
const UNAVAIL_COLORS = {
  vacation: { bg: '#fff3cd', border: '#ffc107', text: '#856404', label: 'Vacances' },
  training: { bg: '#d1ecf1', border: '#17a2b8', text: '#0c5460', label: 'Formation' },
  emergency: { bg: '#f8d7da', border: '#dc3545', text: '#721c24', label: 'Urgence' },
  conference: { bg: '#e2d5f1', border: '#6f42c1', text: '#4a235a', label: 'Conférence' },
  other: { bg: '#e2e3e5', border: '#6c757d', text: '#383d41', label: 'Autre' },
};

// ── Helper : convertir "HH:MM" en minutes ──
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ── Helper : formater les minutes en "HH:MM" ──
function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export default function DoctorWeeklyCalendar({ doctor, compact = false }) {
  const allAvailabilities = doctor?.all_availabilities || [];
  const upcomingUnavails = doctor?.upcoming_unavailabilities || [];

  // Indexer les dispos par jour
  const availByDay = useMemo(() => {
    const map = {};
    DAYS.forEach(d => { map[d.key] = []; });
    allAvailabilities.forEach(a => {
      if (map[a.day]) map[a.day].push(a);
    });
    // Trier par heure de début
    Object.keys(map).forEach(day => {
      map[day].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    });
    return map;
  }, [allAvailabilities]);

  // Indexer les indisponibilités par jour de la semaine
  const unavailByDay = useMemo(() => {
    const map = {};
    DAYS.forEach(d => { map[d.key] = []; });
    upcomingUnavails.forEach(u => {
      if (u.start_datetime) {
        const d = new Date(u.start_datetime);
        const dayIndex = d.getDay(); // 0=Dim, 1=Lun, ...
        const dayMap = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
        const dayKey = dayMap[dayIndex];
        if (dayKey && map[dayKey]) {
          map[dayKey].push(u);
        }
      }
    });
    return map;
  }, [upcomingUnavails]);

  // Heures à afficher
  const hours = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  // Journal actuel
  const today = new Date().getDay(); // 0=Dim
  const todayMap = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
  const todayKey = todayMap[today];
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  // Calculer le nombre total de créneaux activés
  const totalActiveSlots = allAvailabilities.filter(a => a.is_available).length;

  if (compact) {
    // ═══════ VERSION COMPACTE (pills par jour) ═══════
    return (
      <div>
        {DAYS.map(day => {
          const avails = availByDay[day.key] || [];
          const activeAvails = avails.filter(a => a.is_available);
          if (activeAvails.length === 0) return null;

          return (
            <div key={day.key} className="d-flex align-items-center gap-2 mb-1">
              <span className="fw-semibold text-muted" style={{ fontSize: '0.8rem', width: 65 }}>
                {day.short}
              </span>
              <div className="d-flex flex-wrap gap-1">
                {activeAvails.map(a => (
                  <span key={a.id} className="badge bg-success bg-opacity-10 text-success"
                    style={{ fontSize: '0.7rem' }}>
                    {a.start_time}-{a.end_time}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {totalActiveSlots === 0 && (
          <span className="text-muted small">Aucun créneau défini</span>
        )}
      </div>
    );
  }

  // ═══════ VERSION COMPLÈTE (grille horaire) ═══════
  return (
    <div className="table-responsive" style={{ fontSize: '0.82rem' }}>
      <table className="table table-bordered table-sm mb-0" style={{ minWidth: 600 }}>
        <thead>
          <tr className="table-light">
            <th style={{ width: 60, position: 'sticky', left: 0, zIndex: 2, background: '#f8f9fa' }}>
              Heure
            </th>
            {DAYS.map(day => (
              <th key={day.key} className="text-center"
                style={{
                  fontWeight: day.key === todayKey ? 'bold' : 'normal',
                  background: day.key === todayKey ? '#e7f1ff' : undefined,
                }}>
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map(hour => {
            const isNoon = hour === 12;
            const isCurrentHour = hour === new Date().getHours();

            return (
              <tr key={hour}>
                {/* Heure */}
                <td className="text-center align-middle fw-semibold text-muted"
                  style={{
                    position: 'sticky', left: 0, zIndex: 1, background: 'white',
                    fontSize: '0.75rem',
                    borderBottom: isNoon ? '2px solid #ffc107' : undefined,
                  }}>
                  {String(hour).padStart(2, '0')}:00
                </td>

                {/* Chaque jour */}
                {DAYS.map(day => {
                  const avails = availByDay[day.key] || [];
                  const hourStart = hour * 60;
                  const hourEnd = (hour + 1) * 60;
                  const isToday = day.key === todayKey;

                  // Trouver les créneaux qui couvrent cette heure
                  const covering = avails.filter(a => {
                    const s = timeToMinutes(a.start_time);
                    const e = timeToMinutes(a.end_time);
                    return s < hourEnd && e > hourStart;
                  });

                  // Trouver les indisponibilités qui couvrent cette heure
                  const unavails = (unavailByDay[day.key] || []).filter(u => {
                    if (!u.start_datetime) return false;
                    const s = new Date(u.start_datetime);
                    const e = new Date(u.end_datetime);
                    const sMin = s.getHours() * 60 + s.getMinutes();
                    const eMin = e.getHours() * 60 + e.getMinutes();
                    return sMin < hourEnd && eMin > hourStart;
                  });

                  // Style de la cellule
                  let cellStyle = {};
                  let content = null;

                  if (unavails.length > 0) {
                    const u = unavails[0];
                    const colors = UNAVAIL_COLORS[u.reason] || UNAVAIL_COLORS.other;
                    cellStyle = {
                      background: colors.bg,
                      borderBottom: `2px solid ${colors.border}`,
                    };
                    content = (
                      <span className="d-block text-center" style={{ color: colors.text, fontSize: '0.7rem' }}>
                        <i className="bi bi-x-circle me-1"></i>{u.reason_display || 'Indisponible'}
                      </span>
                    );
                  } else if (covering.length > 0) {
                    // Trouver le créneau principal (le plus long ou le premier actif)
                    const main = covering.find(a => a.is_available) || covering[0];
                    const isActive = main.is_available;

                    if (isActive) {
                      cellStyle = {
                        background: '#d1e7dd',
                        borderBottom: '2px solid #198754',
                      };
                      // Afficher l'heure de début si c'est le premier créneau de l'heure
                      const slotStart = timeToMinutes(main.start_time);
                      const slotEnd = timeToMinutes(main.end_time);
                      if (slotStart <= hourStart) {
                        content = (
                          <span className="d-block text-center text-success" style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                            {main.start_time} - {main.end_time}
                          </span>
                        );
                      }
                    } else {
                      cellStyle = {
                        background: '#f8f9fa',
                        borderBottom: '2px dashed #dee2e6',
                      };
                      if (timeToMinutes(main.start_time) <= hourStart) {
                        content = (
                          <span className="d-block text-center text-decoration-line-through" style={{ color: '#adb5bd', fontSize: '0.7rem' }}>
                            {main.start_time}-{main.end_time}
                          </span>
                        );
                      }
                    }
                  } else {
                    // Pas de créneau
                    cellStyle = {
                      background: isToday ? '#f8f9fa' : undefined,
                    };
                  }

                  // Ligne rouge pour l'heure actuelle
                  if (isToday && isCurrentHour) {
                    cellStyle.borderTop = '2px solid #dc3545';
                    cellStyle.position = 'relative';
                  }

                  return (
                    <td key={day.key} className="align-middle text-center p-1"
                      style={{
                        ...cellStyle,
                        fontSize: '0.78rem',
                        minHeight: 36,
                      }}>
                      {content}
                      {/* Indicateur ligne midi */}
                      {isNoon && <div style={{ borderTop: '1px dashed #ffc107', marginTop: 2 }} />}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Légende */}
      <div className="d-flex flex-wrap gap-3 mt-2 small">
        <span className="d-flex align-items-center gap-1">
          <span style={{ display: 'inline-block', width: 14, height: 14, background: '#d1e7dd', border: '1px solid #198754', borderRadius: 2 }}></span>
          Disponible
        </span>
        <span className="d-flex align-items-center gap-1">
          <span style={{ display: 'inline-block', width: 14, height: 14, background: '#f8f9fa', border: '1px dashed #dee2e6', borderRadius: 2 }}></span>
          Désactivé
        </span>
        {upcomingUnavails.length > 0 && (
          <>
            <span className="d-flex align-items-center gap-1">
              <span style={{ display: 'inline-block', width: 14, height: 14, background: '#f8d7da', border: '1px solid #dc3545', borderRadius: 2 }}></span>
              Urgence
            </span>
            <span className="d-flex align-items-center gap-1">
              <span style={{ display: 'inline-block', width: 14, height: 14, background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 2 }}></span>
              Vacances
            </span>
            <span className="d-flex align-items-center gap-1">
              <span style={{ display: 'inline-block', width: 14, height: 14, background: '#d1ecf1', border: '1px solid #17a2b8', borderRadius: 2 }}></span>
              Formation
            </span>
          </>
        )}
        <span className="d-flex align-items-center gap-1">
          <span style={{ display: 'inline-block', width: 14, height: 1, background: '#dc3545' }}></span>
          Maintenant
        </span>
        <span className="d-flex align-items-center gap-1">
          <span style={{ display: 'inline-block', width: 14, height: 1, background: '#ffc107', borderStyle: 'dashed' }}></span>
          Midi
        </span>
      </div>
    </div>
  );
}
