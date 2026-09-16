import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const cardStyle = { borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };

/* ══════════════════ Helpers ══════════════════ */
const fmt = (a) => a != null ? Number(a).toLocaleString('fr-FR', { minimumFractionDigits: 3 }) + ' TND' : '0.000 TND';

const STATUS_MAP = {
  paid: 'bg-success-subtle text-success', overdue: 'bg-danger-subtle text-danger', 
  pending: 'bg-warning-subtle text-warning', cancelled: 'bg-secondary-subtle text-secondary', 
  draft: 'bg-info-subtle text-info', partially_paid: 'bg-warning-subtle text-warning',
};

const STATUS_LABELS = {
  paid: 'Payée', overdue: 'En retard', pending: 'En attente',
  cancelled: 'Annulée', draft: 'Brouillon', partially_paid: 'Partiellement payée',
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Espèces' }, { value: 'check', label: 'Chèque' },
  { value: 'card', label: 'Carte Bancaire' }, { value: 'transfer', label: 'Virement' },
  { value: 'cnam', label: 'CNAM' }, { value: 'insurance', label: 'Assurance' },
  { value: 'online', label: 'Paiement en ligne' },
];

const calcTotal = (subtotal, tax, discount, cnam, insurance) => {
  const s = parseFloat(subtotal) || 0;
  const t = parseFloat(tax) || 0;
  const d = parseFloat(discount) || 0;
  const c = parseFloat(cnam) || 0;
  const i = parseFloat(insurance) || 0;
  return Math.max(0, (s + t - d) - c - i).toFixed(3);
};

const handleDownloadPdf = async (inv, role = 'doctor') => {
  try {
    const res = await api.get(`/billing/${role}/invoices/${inv.id}/pdf/`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Facture_${inv.invoice_number || inv.id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Erreur PDF', err);
    alert('Impossible de télécharger le PDF.');
  }
};

/* ══════════════════ Composant principal ══════════════════ */
export default function DoctorInvoices() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [payTarget, setPayTarget] = useState(null);

  const [patientsList, setPatientsList] = useState([]);
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [apptLoading, setApptLoading] = useState(false);
  const [apptSearch, setApptSearch] = useState('');
  const [createError, setCreateError] = useState('');
  
  const [createForm, setCreateForm] = useState({
    patient: '', appointment: '', patient_name: '', subtotal: '', tax_amount: '',
    discount_amount: '0', cnam_contribution: '0', insurance_contribution: '0',
    due_date: '', payment_method: '', notes: '',
  });

  const [payForm, setPayForm] = useState({ amount: '', payment_method: '', transaction_id: '', notes: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  /* ════════════ Fetch ════════════ */
  const fetchAll = useCallback(() => {
    api.get('/billing/doctor/stats/').then(r => setStats(r.data)).catch(() => {});
    setLoading(true);
    api.get('/billing/doctor/invoices/', { params: { page: 1, page_size: 50 } })
      .then(r => { const d = r.data; setInvoices(Array.isArray(d) ? d : d.results || []); })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ════════════ Create ════════════ */
  const openCreate = () => {
    setCreateForm({ 
      patient: '', appointment: '', patient_name: '', subtotal: '', tax_amount: '', 
      discount_amount: '0', cnam_contribution: '0', insurance_contribution: '0',
      due_date: '', payment_method: '', notes: '' 
    });
    setCreateError(''); 
    setApptSearch(''); 
    setShowCreate(true);
    
    api.get('/appointments/doctor/patients-dropdown/')
      .then(r => setPatientsList(r.data || []))
      .catch(() => setPatientsList([]));

    setApptLoading(true);
    api.get('/appointments/doctor/', { params: { page_size: 200, ordering: '-start_time' } })
      .then(r => setAppointmentsList(r.data.results || r.data || []))
      .catch(() => setAppointmentsList([]))
      .finally(() => setApptLoading(false));
  };

  const handlePatientSelect = (patientId) => {
    const pat = patientsList.find(p => String(p.id) === String(patientId));
    setCreateForm(prev => ({ 
      ...prev, 
      patient: patientId,
      patient_name: pat ? pat.full_name : '',
      appointment: '' 
    }));
  };

  const handleApptSelect = (apptId) => {
    const appt = appointmentsList.find(a => String(a.id) === String(apptId));
    if (appt) {
      setCreateForm(prev => ({ 
        ...prev, 
        appointment: appt.id, 
        patient: appt.patient || '',
        patient_name: appt.patient_name || `${appt.patient_first_name || ''} ${appt.patient_last_name || ''}`.trim() 
      }));
    } else {
      setCreateForm(prev => ({ ...prev, appointment: '' }));
    }
  };

  const computedTotal = calcTotal(
    createForm.subtotal, createForm.tax_amount, createForm.discount_amount, 
    createForm.cnam_contribution, createForm.insurance_contribution
  );

  const handleCreate = (e) => {
    e.preventDefault(); 
    setCreateError(''); 
    setCreateLoading(true);
    
    const payload = {
      patient: createForm.patient || undefined,
      appointment: createForm.appointment || undefined,
      subtotal: createForm.subtotal || undefined,
      tax_amount: createForm.tax_amount || undefined,
      discount_amount: createForm.discount_amount || undefined,
      cnam_contribution: createForm.cnam_contribution || undefined,
      insurance_contribution: createForm.insurance_contribution || undefined,
      due_date: createForm.due_date || undefined,
      payment_method: createForm.payment_method || undefined,
      notes: createForm.notes || undefined
    };
    
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    api.post('/billing/doctor/invoices/', payload)
      .then(() => { setShowCreate(false); fetchAll(); })
      .catch(err => { 
        if (err.response?.data) { 
          const d = err.response.data; 
          setCreateError(typeof d === 'object' ? Object.values(d).flat().join(' | ') : String(d)); 
        } else setCreateError('Erreur réseau.'); 
      })
      .finally(() => setCreateLoading(false));
  };

  /* ════════════ Actions ════════════ */
  const handleValidate = (inv) => { 
    if (!window.confirm('Valider la facture ' + inv.invoice_number + ' ?')) return; 
    api.post(`/billing/doctor/invoices/${inv.id}/validate/`).then(() => fetchAll()).catch(() => {}); 
  };
  
  const handleDelete = (inv) => { 
    if (!window.confirm('Supprimer la facture ' + inv.invoice_number + ' ?')) return; 
    api.delete(`/billing/doctor/invoices/${inv.id}/`).then(() => { setShowDetail(false); fetchAll(); }).catch(() => {}); 
  };
  
  const openPay = (inv) => { 
    setPayTarget(inv); 
    setPayForm({ amount: inv.remaining_amount || '', payment_method: '', transaction_id: '', notes: '' }); 
    setShowPay(true); 
  };
  
  const handlePay = (e) => {
    e.preventDefault(); 
    if (!payTarget) return; 
    setPayLoading(true);
    const payload = {}; 
    Object.entries(payForm).forEach(([k, v]) => { if (v !== '') payload[k] = v; });
    api.post(`/billing/doctor/invoices/${payTarget.id}/pay/`, payload)
      .then(() => { setShowPay(false); setPayTarget(null); fetchAll(); })
      .catch(() => {})
      .finally(() => setPayLoading(false));
  };

  const filteredAppointments = appointmentsList.filter(a => {
    if (!apptSearch) return true; 
    const q = apptSearch.toLowerCase();
    const name = (a.patient_name || `${a.patient_first_name || ''} ${a.patient_last_name || ''}`).toLowerCase();
    const reason = (a.reason || a.notes || a.motif || '').toLowerCase();
    return name.includes(q) || reason.includes(q) || String(a.id).includes(q);
  });

  /* ════════════ RENDER ════════════ */
  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1"><i className="bi bi-receipt me-2 text-primary"></i>Mes Factures</h2>
          <p className="text-muted mb-0">Gestion de la facturation de vos consultations</p>
        </div>
        <button className="btn btn-primary px-4 py-2 rounded-3" onClick={openCreate}>
          <i className="bi bi-plus-lg me-2"></i>Nouvelle facture
        </button>
      </div>

      {stats && (
        <div className="row g-3 mb-4">
          {[
            { label: 'Total factures', val: stats.total_invoices || 0, color: 'primary', icon: 'bi-receipt' },
            { label: 'Revenus', val: fmt(stats.total_revenue), color: 'success', icon: 'bi-cash-stack' },
            { label: 'En attente', val: fmt(stats.total_pending_amount), color: 'warning', icon: 'bi-clock' },
            { label: 'Impayées', val: stats.overdue_count || 0, color: 'danger', icon: 'bi-exclamation-triangle' }
          ].map((s, i) => (
            <div key={i} className="col-md-3 col-6">
              <div className="card h-100 p-3" style={cardStyle}>
                <div className="d-flex align-items-center gap-3">
                  <div className={`bg-${s.color} bg-opacity-10 text-${s.color} rounded-3 d-flex align-items-center justify-content-center`} style={{ width: '48px', height: '48px' }}>
                    <i className={`bi ${s.icon} fs-4`}></i>
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold">{s.val}</h5>
                    <small className="text-muted">{s.label}</small>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={cardStyle}>
        <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold"><i className="bi bi-list-ul me-2 text-primary"></i>Liste des factures</h6>
          <button className="btn btn-outline-primary btn-sm rounded-3 px-3" onClick={fetchAll}><i className="bi bi-arrow-clockwise me-1"></i>Actualiser</button>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-5 text-muted"><i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>Aucune facture pour le moment</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="text-uppercase text-muted" style={{fontSize: '0.75rem'}}>
                    <th className="ps-4">N° Facture</th><th>Patient</th><th>Montant</th><th>Payé</th><th>Reste</th><th>Statut</th><th>Date</th><th className="pe-4 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="ps-4 fw-bold text-primary">{inv.invoice_number || `#${inv.id}`}</td>
                      <td className="fw-semibold">{inv.patient_name || '-'}</td>
                      <td className="fw-bold">{fmt(inv.total_amount)}</td>
                      <td className="text-success">{fmt(inv.total_paid)}</td>
                      <td className="text-danger">{fmt(inv.remaining_amount)}</td>
                      <td><span className={`badge ${STATUS_MAP[inv.status] || 'bg-secondary-subtle text-secondary'} px-3 py-2`}>{inv.status_display || STATUS_LABELS[inv.status] || inv.status}</span></td>
                      <td className="text-muted small">{inv.issue_date || '-'}</td>
                      <td className="pe-4 text-end">
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-primary rounded-3 px-2" onClick={() => { setSelected(inv); setShowDetail(true); }} title="Détails"><i className="bi bi-eye"></i></button>
                          {!inv.is_validated && (<button className="btn btn-outline-success rounded-3 px-2" onClick={() => handleValidate(inv)} title="Valider"><i className="bi bi-check-lg"></i></button>)}
                          <button className="btn btn-outline-info rounded-3 px-2" onClick={() => openPay(inv)} title="Paiement"><i className="bi bi-credit-card"></i></button>
                          <button className="btn btn-dark rounded-3 px-2" onClick={() => handleDownloadPdf(inv, 'doctor')} title="Télécharger PDF"><i className="bi bi-file-earmark-pdf-fill"></i></button>
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

      {/* ══════ MODAL DÉTAIL ══════ */}
      {showDetail && selected && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={(e) => e.target === e.currentTarget && setShowDetail(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '16px', border: 'none' }}>
              <div className="modal-header bg-primary text-white" style={{ borderRadius: '16px 16px 0 0' }}>
                <h5 className="modal-title fw-bold"><i className="bi bi-receipt me-2"></i>{selected.invoice_number || `#${selected.id}`}</h5>
                <span className={`badge ${STATUS_MAP[selected.status] || 'bg-secondary-subtle text-secondary'} px-3 py-2 ms-2`}>{selected.status_display || selected.status}</span>
                <button type="button" className="btn-close btn-close-white ms-auto" onClick={() => setShowDetail(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="bg-light p-3 rounded-3 h-100">
                      <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Patient</small>
                      <p className="fw-bold mb-0 fs-5">{selected.patient_name || '-'}</p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="bg-primary bg-opacity-10 p-3 rounded-3 h-100">
                      <small className="text-muted d-block text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Montant total</small>
                      <p className="fw-bold mb-0 text-primary fs-4">{fmt(selected.total_amount)}</p>
                    </div>
                  </div>
                </div>
                <div className="row g-3 mb-4">
                  {[{ label: 'Sous-total', val: fmt(selected.subtotal), cls: 'text-dark' },{ label: 'Total payé', val: fmt(selected.total_paid), cls: 'text-success' },{ label: 'Reste à payer', val: fmt(selected.remaining_amount), cls: 'text-danger' }].map((c, i) => (
                    <div key={i} className="col-4"><div className="card border text-center p-2" style={cardStyle}><small className="text-muted">{c.label}</small><div className={`fw-bold ${c.cls}`}>{c.val}</div></div></div>
                  ))}
                </div>
                {selected.payments && selected.payments.length > 0 && (
                  <div className="mt-4">
                    <h6 className="fw-bold mb-2"><i className="bi bi-clock-history me-2"></i>Historique des paiements</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead className="table-light"><tr><th>Montant</th><th>Méthode</th><th>Date</th><th>Statut</th></tr></thead>
                        <tbody>
                          {selected.payments.map(p => (
                            <tr key={p.id}>
                              <td className="fw-bold">{fmt(p.amount)}</td>
                              <td>{p.payment_method_display || p.payment_method}</td>
                              <td className="text-muted">{p.payment_date || '-'}</td>
                              <td><span className={`badge ${STATUS_MAP[p.status] || 'bg-secondary-subtle text-secondary'} px-2 py-1`}>{p.status_display || p.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer border-top-0 p-4">
                <button className="btn btn-light px-4 rounded-3" onClick={() => setShowDetail(false)}>Fermer</button>
                <button className="btn btn-dark px-4 rounded-3" onClick={() => handleDownloadPdf(selected, 'doctor')}><i className="bi bi-file-earmark-pdf-fill me-1"></i>PDF</button>
                {!selected.is_validated && (<button className="btn btn-success px-4 rounded-3" onClick={() => { handleValidate(selected); setShowDetail(false); }}><i className="bi bi-check-lg me-1"></i>Valider</button>)}
                <button className="btn btn-outline-danger px-4 rounded-3" onClick={() => handleDelete(selected)}><i className="bi bi-trash me-1"></i>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ MODAL CRÉATION ══════ */}
      {showCreate && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '16px', border: 'none' }}>
              <div className="modal-header bg-primary text-white" style={{ borderRadius: '16px 16px 0 0' }}>
                <h5 className="modal-title fw-bold"><i className="bi bi-plus-lg me-2"></i>Nouvelle Facture</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreate(false)} disabled={createLoading}></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body p-4">
                  
                  <h6 className="text-uppercase text-muted fw-bold mb-3" style={{fontSize: '0.8rem'}}><i className="bi bi-person me-2"></i>Patient & Rendez-vous</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Patient <span className="text-danger">*</span></label>
                      <select className="form-select" required value={createForm.patient} onChange={e => handlePatientSelect(e.target.value)}>
                        <option value="">-- Sélectionner un patient --</option>
                        {patientsList.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Méthode de paiement</label>
                      <select className="form-select" value={createForm.payment_method} onChange={e => setCreateForm(p => ({ ...p, payment_method: e.target.value }))}>
                        <option value="">-- Sélectionner --</option>
                        {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">Lier à un rendez-vous (Optionnel)</label>
                    <input type="text" className="form-control mb-2" placeholder="Rechercher par nom pour filtrer les RDV..." value={apptSearch} onChange={e => setApptSearch(e.target.value)} />
                    {apptLoading ? (
                      <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary"></div></div>
                    ) : (
                      <select className="form-select" size="3" value={createForm.appointment} onChange={e => handleApptSelect(e.target.value)} style={{ cursor: 'pointer', borderRadius: '12px' }}>
                        <option value="">-- Aucun rendez-vous lié --</option>
                                                {filteredAppointments.map(a => {
                          const pName = a.patient_name || `${a.patient_first_name || ''} ${a.patient_last_name || ''}`.trim();
                          
                          // ✅ CORRIGÉ : On cherche 'date_time' en priorité
                          const dateValue = a.date_time || a.start_time || a.date;
                          let dateStr = 'Date inconnue';
                          
                          if (dateValue) {
                            const d = new Date(dateValue);
                            if (!isNaN(d.getTime())) {
                              dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            }
                          }

                          return (
                            <option key={a.id} value={a.id}>
                              {pName} — {dateStr}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>

                  {createError && (
                    <div className="alert alert-danger d-flex align-items-center mt-3" role="alert" style={{borderRadius: '12px'}}>
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      <div>{createError}</div>
                    </div>
                  )}

                  <h6 className="text-uppercase text-muted fw-bold mb-3 mt-4" style={{fontSize: '0.8rem'}}><i className="bi bi-calculator me-2"></i>Montants (TND)</h6>
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Sous-total <span className="text-danger">*</span></label>
                      <input type="number" step="0.001" min="0" className="form-control" required placeholder="0.000" value={createForm.subtotal} onChange={e => setCreateForm(p => ({ ...p, subtotal: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Taxe</label>
                      <input type="number" step="0.001" min="0" className="form-control" placeholder="0.000" value={createForm.tax_amount} onChange={e => setCreateForm(p => ({ ...p, tax_amount: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Remise</label>
                      <input type="number" step="0.001" min="0" className="form-control" placeholder="0.000" value={createForm.discount_amount} onChange={e => setCreateForm(p => ({ ...p, discount_amount: e.target.value }))} />
                    </div>
                  </div>
                  
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">CNAM</label>
                      <input type="number" step="0.001" min="0" className="form-control" placeholder="0.000" value={createForm.cnam_contribution} onChange={e => setCreateForm(p => ({ ...p, cnam_contribution: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Assurance</label>
                      <input type="number" step="0.001" min="0" className="form-control" placeholder="0.000" value={createForm.insurance_contribution} onChange={e => setCreateForm(p => ({ ...p, insurance_contribution: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Total calculé</label>
                      <div className="form-control bg-primary bg-opacity-10 fw-bold text-primary d-flex align-items-center" style={{ fontSize: '1.1rem', borderRadius: '8px' }}>{computedTotal} TND</div>
                    </div>
                  </div>

                  <h6 className="text-uppercase text-muted fw-bold mb-3" style={{fontSize: '0.8rem'}}><i className="bi bi-sliders me-2"></i>Détails</h6>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Échéance</label>
                      <input type="date" className="form-control" value={createForm.due_date} onChange={e => setCreateForm(p => ({ ...p, due_date: e.target.value }))} />
                      <small className="text-muted">Par défaut : 30 jours si vide</small>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Notes</label>
                    <input type="text" className="form-control" placeholder="Notes internes (optionnel)" value={createForm.notes} onChange={e => setCreateForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                  
                  <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                    <button type="button" className="btn btn-light px-4 rounded-3" onClick={() => setShowCreate(false)} disabled={createLoading}>Annuler</button>
                    <button type="submit" className="btn btn-primary px-4 rounded-3" disabled={createLoading || !createForm.patient || !createForm.subtotal}>
                      {createLoading ? (<><span className="spinner-border spinner-border-sm me-1"></span>Création...</>) : (<><i className="bi bi-plus-lg me-1"></i>Créer la facture</>)}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════ MODAL PAIEMENT ══════ */}
      {showPay && payTarget && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={(e) => e.target === e.currentTarget && setShowPay(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '16px', border: 'none' }}>
              <div className="modal-header bg-success text-white" style={{ borderRadius: '16px 16px 0 0' }}>
                <h5 className="modal-title fw-bold"><i className="bi bi-credit-card me-2"></i>Enregistrer un paiement</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPay(false)} disabled={payLoading}></button>
              </div>
              <form onSubmit={handlePay}>
                <div className="modal-body p-4">
                  <div className="alert alert-light border d-flex justify-content-between align-items-center mb-4 rounded-3">
                    <span className="text-muted">Facture <strong className="text-dark">{payTarget.invoice_number || `#${payTarget.id}`}</strong></span>
                    <span>Reste : <strong className="text-danger fs-5">{fmt(payTarget.remaining_amount)}</strong></span>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Montant (TND) <span className="text-danger">*</span></label>
                    <input type="number" step="0.001" min="0.001" className="form-control" required value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Méthode <span className="text-danger">*</span></label>
                    <select className="form-select" required value={payForm.payment_method} onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}>
                      <option value="">-- Sélectionner --</option>
                      {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">N° Transaction</label>
                    <input type="text" className="form-control" placeholder="Optionnel" value={payForm.transaction_id} onChange={e => setPayForm(p => ({ ...p, transaction_id: e.target.value }))} />
                  </div>
                </div>
                <div className="modal-footer border-top-0 p-4">
                  <button type="button" className="btn btn-light px-4 rounded-3" onClick={() => setShowPay(false)} disabled={payLoading}>Annuler</button>
                  <button type="submit" className="btn btn-success px-4 rounded-3" disabled={payLoading}>
                    {payLoading ? (<><span className="spinner-border spinner-border-sm me-1"></span>...</>) : <><i className="bi bi-check-lg me-1"></i>Enregistrer</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}