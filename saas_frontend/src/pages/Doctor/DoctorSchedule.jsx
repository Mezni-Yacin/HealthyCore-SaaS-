import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';

// ── Modal ──────────────────────────────────────────────────────────────
function Modal({ show, title, onClose, children, onSubmit, submitLabel, submitDisabled, submitVariant, size }) {
  if (!show) return null;
  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className={`modal-dialog modal-dialog-centered ${size || 'modal-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-content shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title"><i className="bi bi-calendar-week me-2"></i>{title}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} />
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>{children}</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
              <button type="submit" className={`btn ${submitVariant || 'btn-primary'}`} disabled={submitDisabled}>
                {submitLabel || 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── FormField ───────────────────────────────────────────────────────────
function FormField({ label, required, error, children, helpText }) {
  return (
    <div className="mb-3">
      <label className="form-label fw-semibold">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <div className="invalid-feedback d-block">{Array.isArray(error) ? error[0] : error}</div>}
      {helpText && <div className="form-text">{helpText}</div>}
    </div>
  );
}

// ── Constantes ─────────────────────────────────────────────────────────
const DAY_OPTIONS = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' },
];

const DAY_LABELS = { monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche' };

// Ordre des jours ISO (lundi=0, dimanche=6) pour le calendrier
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_SHORT = { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', thursday: 'Jeu', friday: 'Ven', saturday: 'Sam', sunday: 'Dim' };

const REASON_OPTIONS = [
  { value: 'vacation', label: 'Vacances' },
  { value: 'training', label: 'Formation' },
  { value: 'emergency', label: 'Urgence' },
  { value: 'conference', label: 'Conférence' },
  { value: 'other', label: 'Autre' },
];

const REASON_LABELS = { vacation: 'Vacances', training: 'Formation', emergency: 'Urgence', conference: 'Conférence', other: 'Autre' };

// Helper: "08:00:00" → "08:00"
const toTimeInput = (t) => (t || '').substring(0, 5);

// Helper: "08:00" → "08:00:00" (Django TimeField)
const toDjangoTime = (t) => t && t.length === 5 ? `${t}:00` : t;

// Helper: datetime-local value → ISO string for Django
const toDjangoDateTime = (dtStr) => {
  if (!dtStr) return '';
  return dtStr.replace('T', ' ');
};

// Helper: "HH:MM:SS" → minutes since midnight
const timeToMinutes = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Helper: minutes since midnight → "HH:MM"
const minutesToTime = (m) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};

// Helper: "YYYY-MM-DD" + "HH:MM:SS" → Date object
const parseDatetime = (dtStr) => {
  if (!dtStr) return null;
  return new Date(dtStr.replace(' ', 'T'));
};

// ── Weekly Calendar Component ─────────────────────────────────────────
function WeeklyCalendar({ availabilities, unavailabilities, weekStart, onWeekChange }) {
  const HOUR_START = 6;  // 06:00
  const HOUR_END = 22;   // 22:00
  const TOTAL_HOURS = HOUR_END - HOUR_START;
  const SLOT_HEIGHT = 50; // px par heure

  // Calculer les dates de la semaine (lundi → dimanche)
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekStart]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Grouper les disponibilités par jour
  const availByDay = useMemo(() => {
    const map = {};
    availabilities.forEach(a => {
      if (!map[a.day]) map[a.day] = [];
      map[a.day].push(a);
    });
    return map;
  }, [availabilities]);

  // Filtrer les indisponibilités pour la semaine courante
  const unavailForWeek = useMemo(() => {
    return unavailabilities.filter(u => {
      const start = parseDatetime(u.start_datetime);
      const end = parseDatetime(u.end_datetime);
      if (!start || !end) return false;
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return start < weekEnd && end > weekStart;
    });
  }, [unavailabilities, weekStart]);

  // Trouver les indisponibilités pour un jour donné
  const getUnavailsForDay = (date) => {
    return unavailForWeek.filter(u => {
      const start = parseDatetime(u.start_datetime);
      const end = parseDatetime(u.end_datetime);
      if (!start || !end) return false;
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      return start < dayEnd && end > dayStart;
    });
  };

  // Générer les lignes d'heures
  const hours = useMemo(() => {
    const h = [];
    for (let i = HOUR_START; i <= HOUR_END; i++) h.push(i);
    return h;
  }, []);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    onWeekChange(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    onWeekChange(d);
  };

  const goToday = () => {
    const d = new Date(today);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // lundi = début
    d.setDate(d.getDate() + diff);
    onWeekChange(d);
  };

  const formatDateRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    const pad = (n) => String(n).padStart(2, '0');
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
    return `${pad(start.getDate())} ${months[start.getMonth()]} ${start.getFullYear()} — ${pad(end.getDate())} ${months[end.getMonth()]} ${end.getFullYear()}`;
  };

  const isCurrentWeek = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    return today >= start && today <= end;
  };

  // Couleurs pour les raisons d'indisponibilité
  const reasonColors = {
    vacation: '#e67e22',
    training: '#9b59b6',
    emergency: '#e74c3c',
    conference: '#3498db',
    other: '#95a5a6',
  };

  return (
    <div className="card shadow-sm border-0">
      {/* Navigation semaine */}
      <div className="card-header bg-white py-3">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={prevWeek}>
              <i className="bi bi-chevron-left"></i>
            </button>
            <button className="btn btn-outline-primary btn-sm" onClick={goToday}>
              <i className="bi bi-calendar-day me-1"></i> Aujourd'hui
            </button>
            <button className="btn btn-outline-secondary btn-sm" onClick={nextWeek}>
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
          <h6 className="mb-0 fw-bold text-primary">{formatDateRange()}</h6>
          <div className="d-flex gap-3 align-items-center" style={{ fontSize: '0.8rem' }}>
            <span><span className="d-inline-block rounded me-1" style={{ width: 12, height: 12, backgroundColor: '#198754' }}></span> Disponible</span>
            <span><span className="d-inline-block rounded me-1" style={{ width: 12, height: 12, backgroundColor: '#6c757d' }}></span> Inactif</span>
            <span><span className="d-inline-block rounded me-1" style={{ width: 12, height: 12, backgroundColor: '#e74c3c' }}></span> Indisponible</span>
          </div>
        </div>
      </div>

      {/* Grille du calendrier */}
      <div className="card-body p-0" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 700 }}>
          {/* En-tête des jours */}
          <div className="d-flex border-bottom" style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8f9fa' }}>
            <div style={{ width: 55, flexShrink: 0 }} className="border-end p-2 text-center">
              <small className="fw-bold text-muted">Heure</small>
            </div>
            {weekDates.map((date, i) => {
              const dayKey = DAY_ORDER[i];
              const isToday = date.getTime() === today.getTime();
              const isSunday = i === 6;
              return (
                <div key={dayKey} className="flex-fill border-end p-2 text-center" style={{ backgroundColor: isToday ? '#e7f5ff' : (isSunday ? '#fdf2f2' : 'transparent') }}>
                  <div className="fw-bold" style={{ color: isToday ? '#0d6efd' : (isSunday ? '#c0392b' : '#333') }}>
                    {DAY_SHORT[dayKey]}
                  </div>
                  <div className={`small ${isToday ? 'text-primary fw-bold' : 'text-muted'}`}>
                    {date.getDate()}/{date.getMonth() + 1}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Corps du calendrier avec les heures */}
          <div className="d-flex" style={{ position: 'relative' }}>
            {/* Colonne des heures */}
            <div style={{ width: 55, flexShrink: 0 }}>
              {hours.map(h => (
                <div key={h} className="border-bottom border-end d-flex align-items-start justify-content-center pt-0" style={{ height: SLOT_HEIGHT }}>
                  <small className="text-muted" style={{ marginTop: -8, fontSize: '0.7rem' }}>{minutesToTime(h * 60)}</small>
                </div>
              ))}
            </div>

            {/* Colonnes des jours */}
            {weekDates.map((date, dayIdx) => {
              const dayKey = DAY_ORDER[dayIdx];
              const isToday = date.getTime() === today.getTime();
              const dayAvails = availByDay[dayKey] || [];
              const dayUnavails = getUnavailsForDay(date);

              return (
                <div key={dayKey} className="flex-fill border-end position-relative" style={{ backgroundColor: isToday ? '#f0f8ff' : 'transparent' }}>
                  {/* Lignes horaires de fond */}
                  {hours.map(h => (
                    <div key={h} className="border-bottom" style={{ height: SLOT_HEIGHT, backgroundColor: (h >= 12 && h < 14) ? '#fffdf0' : 'transparent' }}></div>
                  ))}

                  {/* Disponibilités */}
                  {dayAvails.map(avail => {
                    const startMin = timeToMinutes(avail.start_time);
                    const endMin = timeToMinutes(avail.end_time);
                    const top = ((startMin - HOUR_START * 60) / 60) * SLOT_HEIGHT;
                    const height = ((endMin - startMin) / 60) * SLOT_HEIGHT;
                    if (top + height < 0 || top > TOTAL_HOURS * SLOT_HEIGHT) return null;
                    const clampedTop = Math.max(0, top);
                    const clampedBottom = Math.min(TOTAL_HOURS * SLOT_HEIGHT, top + height);
                    const clampedHeight = clampedBottom - clampedTop;

                    return (
                      <div
                        key={`avail-${avail.id}`}
                        className="position-absolute rounded-pill d-flex align-items-center justify-content-center overflow-hidden"
                        style={{
                          top: clampedTop,
                          left: 2,
                          right: 2,
                          height: clampedHeight,
                          backgroundColor: avail.is_available ? '#198754' : '#6c757d',
                          opacity: 0.85,
                          zIndex: 2,
                          cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.3)',
                        }}
                        title={`${avail.start_time} - ${avail.end_time} (${avail.slot_duration}min)`}
                      >
                        <div className="text-white text-center px-1" style={{ fontSize: '0.65rem', lineHeight: 1.1 }}>
                          <div className="fw-bold">{avail.start_time?.substring(0, 5)}-{avail.end_time?.substring(0, 5)}</div>
                          <div>{avail.slot_duration}min</div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Indisponibilités */}
                  {dayUnavails.map(unavail => {
                    const start = parseDatetime(unavail.start_datetime);
                    const end = parseDatetime(unavail.end_datetime);
                    if (!start || !end) return null;

                    // Calculer les minutes dans ce jour spécifique
                    const dayStart = new Date(date);
                    dayStart.setHours(HOUR_START, 0, 0, 0);
                    const dayEnd = new Date(date);
                    dayEnd.setHours(HOUR_END, 0, 0, 0);

                    const overlapStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
                    const overlapEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));

                    if (overlapStart >= overlapEnd) return null;

                    const startMin = overlapStart.getHours() * 60 + overlapStart.getMinutes();
                    const endMin = overlapEnd.getHours() * 60 + overlapEnd.getMinutes();
                    const top = ((startMin - HOUR_START * 60) / 60) * SLOT_HEIGHT;
                    const height = ((endMin - startMin) / 60) * SLOT_HEIGHT;

                    const color = reasonColors[unavail.reason] || '#e74c3c';

                    return (
                      <div
                        key={`unavail-${unavail.id}`}
                        className="position-absolute rounded d-flex align-items-center justify-content-center overflow-hidden"
                        style={{
                          top: Math.max(0, top),
                          left: 2,
                          right: 2,
                          height: Math.max(10, height),
                          backgroundColor: color,
                          opacity: 0.35,
                          zIndex: 1,
                          border: `2px dashed ${color}`,
                        }}
                        title={`${REASON_LABELS[unavail.reason] || unavail.reason}: ${unavail.description || 'Sans description'}`}
                      >
                        <div className="text-white text-center px-1 fw-bold" style={{ fontSize: '0.6rem', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                          {REASON_LABELS[unavail.reason] || unavail.reason}
                        </div>
                      </div>
                    );
                  })}

                  {/* Ligne "maintenant" */}
                  {isToday && (() => {
                    const now = new Date();
                    const nowMin = now.getHours() * 60 + now.getMinutes();
                    const top = ((nowMin - HOUR_START * 60) / 60) * SLOT_HEIGHT;
                    if (top < 0 || top > TOTAL_HOURS * SLOT_HEIGHT) return null;
                    return (
                      <div
                        className="position-absolute"
                        style={{
                          top: top,
                          left: 0,
                          right: 0,
                          height: 2,
                          backgroundColor: '#dc3545',
                          zIndex: 5,
                        }}
                      >
                        <div className="position-absolute" style={{ top: -5, left: -4, width: 10, height: 10, borderRadius: '50%', backgroundColor: '#dc3545' }}></div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Légende détaillée */}
      <div className="card-footer bg-white py-2">
        <div className="d-flex flex-wrap gap-3 justify-content-center" style={{ fontSize: '0.75rem' }}>
          <span className="d-flex align-items-center gap-1">
            <span className="d-inline-block rounded-pill" style={{ width: 20, height: 10, backgroundColor: '#198754' }}></span>
            Créneau disponible
          </span>
          <span className="d-flex align-items-center gap-1">
            <span className="d-inline-block rounded-pill" style={{ width: 20, height: 10, backgroundColor: '#6c757d' }}></span>
            Créneau inactif
          </span>
          {REASON_OPTIONS.map(r => (
            <span key={r.value} className="d-flex align-items-center gap-1">
              <span className="d-inline-block rounded" style={{ width: 20, height: 10, backgroundColor: reasonColors[r.value], border: `1px dashed ${reasonColors[r.value]}` }}></span>
              {r.label}
            </span>
          ))}
          <span className="d-flex align-items-center gap-1">
            <span className="d-inline-block rounded-pill" style={{ width: 20, height: 2, backgroundColor: '#dc3545' }}></span>
            Maintenant
          </span>
          <span className="d-flex align-items-center gap-1">
            <span className="d-inline-block rounded" style={{ width: 20, height: 10, backgroundColor: '#fffdf0', border: '1px solid #eee' }}></span>
            Pause midi
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ─────────────────────────────────────────────────
export default function DoctorSchedule() {
  const [activeTab, setActiveTab] = useState('calendar');

  // ── Disponibilités ──────────────────────────────────────────────
  const [availabilities, setAvailabilities] = useState([]);
  const [availLoading, setAvailLoading] = useState(true);
  const [availModal, setAvailModal] = useState(false);
  const [editingAvail, setEditingAvail] = useState(null);
  const [availErrors, setAvailErrors] = useState({});
  const [availSubmitting, setAvailSubmitting] = useState(false);

  // ── Indisponibilités ──────────────────────────────────────────
  const [unavailabilities, setUnavailabilities] = useState([]);
  const [unavailLoading, setUnavailLoading] = useState(true);
  const [unavailModal, setUnavailModal] = useState(false);
  const [editingUnavail, setEditingUnavail] = useState(null);
  const [unavailErrors, setUnavailErrors] = useState({});
  const [unavailSubmitting, setUnavailSubmitting] = useState(false);

  // ── Calendrier ──────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // lundi = début
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // ── Message ──────────────────────────────────────────────────
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(t); }, [message]);

  // ── Fetch disponibilités ────────────────────────────────────────
  const fetchAvailabilities = useCallback(async () => {
    setAvailLoading(true);
    try {
      const { data } = await api.get('/cabinets/my-availabilities/');
      setAvailabilities(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      setMessage("Erreur lors du chargement des disponibilités.");
      setMessageType('danger');
    } finally {
      setAvailLoading(false);
    }
  }, []);

  useEffect(() => { fetchAvailabilities(); }, [fetchAvailabilities]);

  // ── Fetch indisponibilités ────────────────────────────────────
  const fetchUnavailabilities = useCallback(async () => {
    setUnavailLoading(true);
    try {
      const { data } = await api.get('/cabinets/my-unavailabilities/');
      setUnavailabilities(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      setMessage("Erreur lors du chargement des indisponibilités.");
      setMessageType('danger');
    } finally {
      setUnavailLoading(false);
    }
  }, []);

  useEffect(() => { fetchUnavailabilities(); }, [fetchUnavailabilities]);

  // ── Helpers: Availability ─────────────────────────────────────
  const emptyAvailForm = { day: 'monday', start_time: '08:00', end_time: '12:00', slot_duration: '15', is_available: true };
  const [availForm, setAvailForm] = useState({ ...emptyAvailForm });

  const openAvailCreate = () => {
    setEditingAvail(null);
    setAvailForm({ ...emptyAvailForm });
    setAvailErrors({});
    setAvailModal(true);
  };

  const openAvailEdit = (slot) => {
    setEditingAvail(slot);
    setAvailForm({
      day: slot.day,
      start_time: toTimeInput(slot.start_time),
      end_time: toTimeInput(slot.end_time),
      slot_duration: String(slot.slot_duration),
      is_available: slot.is_available,
    });
    setAvailErrors({});
    setAvailModal(true);
  };

  const handleAvailSubmit = async (e) => {
    e.preventDefault();
    setAvailSubmitting(true);
    setAvailErrors({});

    try {
      const payload = {
        day: availForm.day,
        start_time: toDjangoTime(availForm.start_time),
        end_time: toDjangoTime(availForm.end_time),
        slot_duration: parseInt(availForm.slot_duration) || 15,
        is_available: availForm.is_available,
      };

      if (editingAvail) {
        await api.patch(`/cabinets/my-availabilities/${editingAvail.id}/`, payload);
        setMessage('Disponibilité modifiée.');
      } else {
        await api.post('/cabinets/my-availabilities/', payload);
        setMessage('Disponibilité ajoutée.');
      }
      setMessageType('success');
      setAvailModal(false);
      fetchAvailabilities();
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object' && errors !== null) {
        setAvailErrors(errors);
        setMessage(errors.non_field_errors?.join(' | ') || 'Vérifiez les champs.');
      } else {
        setMessage("Erreur lors de l'enregistrement.");
      }
      setMessageType('danger');
    } finally {
      setAvailSubmitting(false);
    }
  };

  const handleAvailDelete = async (slot) => {
    if (!window.confirm(`Supprimer cette disponibilité (${DAY_LABELS[slot.day]} ${slot.start_time}-${slot.end_time}) ?`)) return;
    try {
      await api.delete(`/cabinets/my-availabilities/${slot.id}/`);
      setMessage('Disponibilité supprimée.');
      setMessageType('success');
      fetchAvailabilities();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Erreur lors de la suppression.');
      setMessageType('danger');
    }
  };

  const handleAvailToggle = async (slot) => {
    try {
      await api.post(`/cabinets/my-availabilities/${slot.id}/toggle/`);
      fetchAvailabilities();
    } catch (err) {
      setMessage("Erreur lors du changement d'état.");
      setMessageType('danger');
    }
  };

  // ── Helpers: Unavailability ───────────────────────────────────
  const emptyUnavailForm = {
    start_datetime: '', end_datetime: '',
    reason: 'vacation', description: '', is_recurring: false, recurrence_rule: '',
  };
  const [unavailForm, setUnavailForm] = useState({ ...emptyUnavailForm });

  const openUnavailCreate = () => {
    setEditingUnavail(null);
    setUnavailForm({ ...emptyUnavailForm });
    setUnavailErrors({});
    setUnavailModal(true);
  };

  const openUnavailEdit = (unavail) => {
    setEditingUnavail(unavail);
    const toLocal = (isoStr) => {
      if (!isoStr) return '';
      const d = new Date(isoStr);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setUnavailForm({
      start_datetime: toLocal(unavail.start_datetime),
      end_datetime: toLocal(unavail.end_datetime),
      reason: unavail.reason || 'vacation',
      description: unavail.description || '',
      is_recurring: unavail.is_recurring || false,
      recurrence_rule: unavail.recurrence_rule || '',
    });
    setUnavailErrors({});
    setUnavailModal(true);
  };

  const handleUnavailSubmit = async (e) => {
    e.preventDefault();
    setUnavailSubmitting(true);
    setUnavailErrors({});

    try {
      const payload = {
        start_datetime: toDjangoDateTime(unavailForm.start_datetime),
        end_datetime: toDjangoDateTime(unavailForm.end_datetime),
        reason: unavailForm.reason,
        description: unavailForm.description || '',
        is_recurring: unavailForm.is_recurring,
        recurrence_rule: unavailForm.is_recurring ? (unavailForm.recurrence_rule || '') : '',
      };

      if (editingUnavail) {
        await api.patch(`/cabinets/my-unavailabilities/${editingUnavail.id}/`, payload);
        setMessage('Indisponibilité modifiée.');
      } else {
        await api.post('/cabinets/my-unavailabilities/', payload);
        setMessage('Indisponibilité ajoutée.');
      }
      setMessageType('success');
      setUnavailModal(false);
      fetchUnavailabilities();
    } catch (err) {
      const errors = err.response?.data;
      if (typeof errors === 'object' && errors !== null) {
        setUnavailErrors(errors);
        setMessage(errors.non_field_errors?.join(' | ') || 'Vérifiez les champs.');
      } else {
        setMessage("Erreur lors de l'enregistrement.");
      }
      setMessageType('danger');
    } finally {
      setUnavailSubmitting(false);
    }
  };

  const handleUnavailDelete = async (unavail) => {
    const reason = REASON_OPTIONS.find(r => r.value === unavail.reason)?.label || unavail.reason;
    if (!window.confirm(`Supprimer cette indisponibilité (${reason}) ?`)) return;
    try {
      await api.delete(`/cabinets/my-unavailabilities/${unavail.id}/`);
      setMessage('Indisponibilité supprimée.');
      setMessageType('success');
      fetchUnavailabilities();
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Erreur lors de la suppression.');
      setMessageType('danger');
    }
  };

  // ── Format date pour affichage ──────────────────────────────────
  const formatDate = (dtStr) => {
    if (!dtStr) return '—';
    const d = new Date(dtStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const formatDateShort = (dtStr) => {
    if (!dtStr) return '—';
    const d = new Date(dtStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="container-fluid py-4">
      {/* En-tête */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">
            <i className="bi bi-calendar-week me-2 text-primary"></i>
            Mon Emploi du Temps
          </h2>
          <p className="text-muted mb-0">Gérez vos disponibilités et indisponibilités</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`alert alert-${messageType} alert-dismissible fade show`} role="alert">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')} />
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4 border-bottom">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}>
            <i className="bi bi-calendar3 me-1"></i> Calendrier
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'availabilities' ? 'active' : ''}`}
            onClick={() => setActiveTab('availabilities')}>
            <i className="bi bi-check-circle me-1"></i> Disponibilités
            <span className="badge bg-primary text-white ms-1">{availabilities.length}</span>
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'unavailabilities' ? 'active' : ''}`}
            onClick={() => setActiveTab('unavailabilities')}>
            <i className="bi bi-x-circle me-1"></i> Indisponibilités
            <span className="badge bg-warning text-dark ms-1">{unavailabilities.length}</span>
          </button>
        </li>
      </ul>

      {/* ═══════════ TAB : CALENDRIER ═══════════ */}
      {activeTab === 'calendar' && (
        (availLoading || unavailLoading) ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-2 text-muted">Chargement du calendrier...</p>
          </div>
        ) : (
          <WeeklyCalendar
            availabilities={availabilities}
            unavailabilities={unavailabilities}
            weekStart={weekStart}
            onWeekChange={setWeekStart}
          />
        )
      )}

      {/* ═══════════ TAB : DISPONIBILITÉS ═══════════ */}
      {activeTab === 'availabilities' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
            <h5 className="mb-0 fw-semibold">
              <i className="bi bi-clock me-2 text-success"></i>
              Disponibilités hebdomadaires
            </h5>
            <button className="btn btn-success btn-sm" onClick={openAvailCreate}>
              <i className="bi bi-plus-lg me-1"></i> Ajouter un créneau
            </button>
          </div>
          <div className="card-body p-0">
            {availLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" />
                <p className="mt-2 text-muted">Chargement...</p>
              </div>
            ) : availabilities.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-calendar-check display-1 text-muted"></i>
                <p className="mt-2 text-muted">Aucune disponibilité définie.</p>
                <button className="btn btn-success mt-2" onClick={openAvailCreate}>Ajouter un créneau</button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3" style={{ width: '50px' }}>#</th>
                      <th>Jour</th>
                      <th>Heure début</th>
                      <th>Heure fin</th>
                      <th className="text-center">Durée (min)</th>
                      <th className="text-center">Statut</th>
                      <th style={{ width: '140px' }} className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availabilities.map((slot, idx) => (
                      <tr key={slot.id}>
                        <td className="ps-3 text-muted">{idx + 1}</td>
                        <td>
                          <span className="badge bg-primary bg-opacity-10 text-primary">
                            {DAY_LABELS[slot.day] || slot.day}
                          </span>
                        </td>
                        <td><code>{slot.start_time}</code></td>
                        <td><code>{slot.end_time}</code></td>
                        <td className="text-center">{slot.slot_duration}</td>
                        <td className="text-center">
                          <span className={`badge ${slot.is_available ? 'bg-success' : 'bg-secondary'}`}>
                            {slot.is_available ? 'Disponible' : 'Indisponible'}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => openAvailEdit(slot)} title="Modifier">
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className={`btn btn-sm ${slot.is_available ? 'btn-outline-warning' : 'btn-outline-success'}`}
                              onClick={() => handleAvailToggle(slot)} title="Changer statut">
                              <i className="bi bi-arrow-repeat"></i>
                            </button>
                            <button className="btn btn-outline-danger" onClick={() => handleAvailDelete(slot)} title="Supprimer">
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ TAB : INDISPONIBILITÉS ═══════════ */}
      {activeTab === 'unavailabilities' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
            <h5 className="mb-0 fw-semibold">
              <i className="bi bi-calendar-x me-2 text-warning"></i>
              Indisponibilités exceptionnelles
            </h5>
            <button className="btn btn-warning btn-sm" onClick={openUnavailCreate}>
              <i className="bi bi-plus-lg me-1"></i> Ajouter
            </button>
          </div>
          <div className="card-body p-0">
            {unavailLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" />
                <p className="mt-2 text-muted">Chargement...</p>
              </div>
            ) : unavailabilities.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-calendar-check display-1 text-muted"></i>
                <p className="mt-2 text-muted">Aucune indisponibilité planifiée.</p>
                <button className="btn btn-warning mt-2" onClick={openUnavailCreate}>Ajouter une indisponibilité</button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3" style={{ width: '50px' }}>#</th>
                      <th>Période</th>
                      <th>Raison</th>
                      <th>Description</th>
                      <th className="text-center">Récurrent</th>
                      <th style={{ width: '100px' }} className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unavailabilities.map((unavail, idx) => (
                      <tr key={unavail.id}>
                        <td className="ps-3 text-muted">{idx + 1}</td>
                        <td>
                          <div>
                            <div className="fw-semibold">{formatDateShort(unavail.start_datetime)}</div>
                            <small className="text-muted">→ {formatDateShort(unavail.end_datetime)}</small>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-warning text-dark">
                            {REASON_OPTIONS.find(r => r.value === unavail.reason)?.label || unavail.reason}
                          </span>
                        </td>
                        <td className="text-muted small" style={{ maxWidth: '200px' }}>
                          {unavail.description || <span className="text-muted fst-italic">—</span>}
                        </td>
                        <td className="text-center">
                          {unavail.is_recurring ? (
                            <span className="badge bg-info text-dark">
                              <i className="bi bi-arrow-repeat me-1"></i>Oui
                            </span>
                          ) : (
                            <span className="badge bg-light text-dark">Non</span>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => openUnavailEdit(unavail)} title="Modifier">
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-outline-danger" onClick={() => handleUnavailDelete(unavail)} title="Supprimer">
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL DISPONIBILITÉ ==================== */}
      <Modal
        show={availModal}
        title={editingAvail ? 'Modifier la disponibilité' : 'Ajouter une disponibilité'}
        onClose={() => setAvailModal(false)}
        onSubmit={handleAvailSubmit}
        submitLabel={availSubmitting ? 'Enregistrement...' : (editingAvail ? 'Mettre à jour' : 'Ajouter')}
        submitDisabled={availSubmitting}
        submitVariant={editingAvail ? 'btn-warning' : 'btn-success'}
      >
        <div className="row g-3">
          <div className="col-md-6">
            <FormField label="Jour" required error={availErrors.day}>
              <select className={`form-select ${availErrors.day ? 'is-invalid' : ''}`}
                value={availForm.day} onChange={(e) => setAvailForm({ ...availForm, day: e.target.value })}>
                {DAY_OPTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="col-md-3">
            <FormField label="Heure début" required error={availErrors.start_time}>
              <input type="time" className={`form-control ${availErrors.start_time ? 'is-invalid' : ''}`}
                value={availForm.start_time} onChange={(e) => setAvailForm({ ...availForm, start_time: e.target.value })} />
            </FormField>
          </div>
          <div className="col-md-3">
            <FormField label="Heure fin" required error={availErrors.end_time}>
              <input type="time" className={`form-control ${availErrors.end_time ? 'is-invalid' : ''}`}
                value={availForm.end_time} onChange={(e) => setAvailForm({ ...availForm, end_time: e.target.value })} />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Durée du créneau (minutes)" error={availErrors.slot_duration}
              helpText="Durée de chaque consultation dans ce créneau">
              <input type="number" min="5" max="480" className={`form-control ${availErrors.slot_duration ? 'is-invalid' : ''}`}
                value={availForm.slot_duration} onChange={(e) => setAvailForm({ ...availForm, slot_duration: e.target.value })} />
            </FormField>
          </div>
          <div className="col-md-6">
            <div className="form-check form-switch mt-4">
              <input className="form-check-input" type="checkbox" id="avail_status"
                checked={availForm.is_available} onChange={(e) => setAvailForm({ ...availForm, is_available: e.target.checked })} />
              <label className="form-check-label fw-semibold" htmlFor="avail_status">
                Disponible
                {availForm.is_available ? (
                  <span className="text-success ms-1">✓</span>
                ) : (
                  <span className="text-danger ms-1">✗</span>
                )}
              </label>
            </div>
          </div>
        </div>
        {availErrors.non_field_errors && (
          <div className="alert alert-danger mt-2">
            {Array.isArray(availErrors.non_field_errors) ? availErrors.non_field_errors.join(' | ') : availErrors.non_field_errors}
          </div>
        )}
      </Modal>

      {/* ==================== MODAL INDISPONIBILITÉ ==================== */}
      <Modal
        show={unavailModal}
        title={editingUnavail ? 'Modifier l\'indisponibilité' : 'Ajouter une indisponibilité'}
        onClose={() => setUnavailModal(false)}
        onSubmit={handleUnavailSubmit}
        submitLabel={unavailSubmitting ? 'Enregistrement...' : (editingUnavail ? 'Mettre à jour' : 'Ajouter')}
        submitDisabled={unavailSubmitting}
        submitVariant={editingUnavail ? 'btn-warning' : 'btn-warning'}
      >
        <div className="row g-3">
          <div className="col-md-6">
            <FormField label="Date et heure de début" required error={unavailErrors.start_datetime}
              helpText="Date et heure de début de l'indisponibilité">
              <input type="datetime-local" className={`form-control ${unavailErrors.start_datetime ? 'is-invalid' : ''}`}
                value={unavailForm.start_datetime} onChange={(e) => setUnavailForm({ ...unavailForm, start_datetime: e.target.value })} />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Date et heure de fin" required error={unavailErrors.end_datetime}
              helpText="Date et heure de fin de l'indisponibilité">
              <input type="datetime-local" className={`form-control ${unavailErrors.end_datetime ? 'is-invalid' : ''}`}
                value={unavailForm.end_datetime} onChange={(e) => setUnavailForm({ ...unavailForm, end_datetime: e.target.value })} />
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Raison" required error={unavailErrors.reason}>
              <select className={`form-select ${unavailErrors.reason ? 'is-invalid' : ''}`}
                value={unavailForm.reason} onChange={(e) => setUnavailForm({ ...unavailForm, reason: e.target.value })}>
                {REASON_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="col-md-6">
            <FormField label="Description" error={unavailErrors.description}
              helpText="Informations complémentaires (optionnel)">
              <textarea className={`form-control ${unavailErrors.description ? 'is-invalid' : ''}`}
                value={unavailForm.description} onChange={(e) => setUnavailForm({ ...unavailForm, description: e.target.value })}
                rows="3" placeholder="Décrivez la raison..." />
            </FormField>
          </div>
          <div className="col-md-6">
            <div className="form-check form-switch mt-4">
              <input className="form-check-input" type="checkbox" id="is_recurring"
                checked={unavailForm.is_recurring} onChange={(e) => {
                  setUnavailForm({ ...unavailForm, is_recurring: e.target.checked });
                  if (!e.target.checked) setUnavailForm({ ...unavailForm, recurrence_rule: '' });
                }} />
              <label className="form-check-label fw-semibold" htmlFor="is_recurring">
                Récurrent
                {unavailForm.is_recurring ? (
                  <span className="text-info ms-1">↻</span>
                ) : ''}
              </label>
            </div>
          </div>
          <div className="col-md-6">
            <FormField label="Règle de récurrence" error={unavailErrors.recurrence_rule}
              helpText="Ex: FREQ=WEEKLY;BYDAY=MO,WE,FR">
              <input type="text" className={`form-control ${unavailErrors.recurrence_rule ? 'is-invalid' : ''}`}
                value={unavailForm.recurrence_rule}
                onChange={(e) => setUnavailForm({ ...unavailForm, recurrence_rule: e.target.value })}
                disabled={!unavailForm.is_recurring}
                placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR" />
            </FormField>
          </div>
        </div>
        {unavailErrors.non_field_errors && (
          <div className="alert alert-danger mt-2">
            {Array.isArray(unavailErrors.non_field_errors) ? unavailErrors.non_field_errors.join(' | ') : unavailErrors.non_field_errors}
          </div>
        )}
      </Modal>
    </div>
  );
}
