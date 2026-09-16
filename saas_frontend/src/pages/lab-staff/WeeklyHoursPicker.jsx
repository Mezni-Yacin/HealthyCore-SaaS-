import React from 'react';

const DAYS = [
    { key: 'lundi', label: 'Lundi' }, { key: 'mardi', label: 'Mardi' }, { key: 'mercredi', label: 'Mercredi' },
    { key: 'jeudi', label: 'Jeudi' }, { key: 'vendredi', label: 'Vendredi' }, { key: 'samedi', label: 'Samedi' }, { key: 'dimanche', label: 'Dimanche' },
];

const safeJsonParse = (str, fallback = {}) => {
    try { return JSON.parse(str || '{}'); } catch (e) { return fallback; }
};

export default function WeeklyHoursPicker({ value, onChange, label }) {
    const parsed = safeJsonParse(typeof value === 'string' ? value : null, {});
    const daysState = DAYS.map(day => {
        const raw = parsed[day.key];
        if (raw && typeof raw === 'string' && raw.includes('-')) {
            const [start, end] = raw.split('-').map(s => s.trim());
            return { ...day, enabled: true, start, end };
        }
        if (raw && typeof raw === 'object') {
            return { ...day, enabled: true, start: raw.start || '08:00', end: raw.end || '17:00' };
        }
        return { ...day, enabled: false, start: '08:00', end: '17:00' };
    });

    const toggleDay = (index) => {
        const updated = [...daysState];
        updated[index] = { ...updated[index], enabled: !updated[index].enabled };
        convertAndSend(updated);
    };

    const changeTime = (index, field, val) => {
        const updated = [...daysState];
        updated[index] = { ...updated[index], [field]: val };
        convertAndSend(updated);
    };

    const convertAndSend = (days) => {
        const json = {};
        days.forEach(d => { if (d.enabled) json[d.key] = `${d.start}-${d.end}`; });
        onChange(JSON.stringify(json));
    };

    const enabledCount = daysState.filter(d => d.enabled).length;

    return (
        <div className="mb-3">
            <label className="form-label fw-bold text-secondary">{label}</label>
            <div className="card border">
                <div className="card-body p-0">
                    <table className="table table-sm mb-0 align-middle">
                        <thead className="table-light"><tr><th style={{ width: '40px' }}></th><th>Jour</th><th style={{ width: '140px' }}>Début</th><th style={{ width: '140px' }}>Fin</th></tr></thead>
                        <tbody>
                            {daysState.map((day, idx) => (
                                <tr key={day.key} className={!day.enabled ? 'table-secondary opacity-50' : ''}>
                                    <td className="text-center">
                                        <div className="form-check form-switch m-0">
                                            <input className="form-check-input" type="checkbox" checked={day.enabled} onChange={() => toggleDay(idx)} id={`${label}-${day.key}`} />
                                        </div>
                                    </td>
                                    <td><label className="form-check-label fw-semibold mb-0" htmlFor={`${label}-${day.key}`}>{day.label}</label></td>
                                    <td><input type="time" className="form-control form-control-sm" value={day.start} onChange={e => changeTime(idx, 'start', e.target.value)} disabled={!day.enabled} /></td>
                                    <td><input type="time" className="form-control form-control-sm" value={day.end} onChange={e => changeTime(idx, 'end', e.target.value)} disabled={!day.enabled} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className={`card-footer small py-2 ${enabledCount > 0 ? 'text-success' : 'text-muted'}`}>
                    <i className={`bi ${enabledCount > 0 ? 'bi-check-circle' : 'bi-info-circle'} me-1`}></i>
                    {enabledCount > 0 ? `${enabledCount} jour${enabledCount > 1 ? 's' : ''} configuré${enabledCount > 1 ? 's' : ''}` : 'Aucun jour sélectionné'}
                </div>
            </div>
        </div>
    );
}