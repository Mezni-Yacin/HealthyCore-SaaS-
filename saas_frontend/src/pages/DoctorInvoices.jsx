import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ══════════════════ Helpers ══════════════════ */

const fmt = (a) => a != null ? Number(a).toLocaleString('fr-FR', { minimumFractionDigits: 3 }) + ' TND' : '0.000 TND';

const STATUS_MAP = {
  paid: 'success', overdue: 'danger', pending: 'warning',
  cancelled: 'secondary', draft: 'info', partially_paid: 'warning text-dark',
};

const STATUS_LABELS = {
  paid: 'Payée', overdue: 'En retard', pending: 'En attente',
  cancelled: 'Annulée', draft: 'Brouillon', partially_paid: 'Partiellement payée',
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Espèces' },
  { value: 'check', label: 'Chèque' },
  { value: 'card', label: 'Carte Bancaire' },
  { value: 'transfer', label: 'Virement' },
  { value: 'cnam', label: 'CNAM' },
  { value: 'insurance', label: 'Assurance' },
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

/* ══════════════════ PDF Helper ══════════════════ */
const handleDownloadPdf = async (inv, role = 'doctor') => {
  try {
    const res = await api.get(`/billing/${role}/invoices/${inv.id}/pdf/`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Facture_${inv.invoice_number || inv.id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  } catch (err) {
    console.error("Erreur PDF", err);
    alert("Impossible de télécharger le PDF.");
  }
};

/* ══════════════════ Composant principal ══════════════════ */

const DoctorInvoices = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [payTarget, setPayTarget] = useState(null);

  // Create form
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [apptLoading, setApptLoading] = useState(false);
  const [apptSearch, setApptSearch] = useState('');
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    appointment: '', patient_name: '', subtotal: '', tax_amount: '',
    discount_amount: '0', cnam_contribution: '0', insurance_contribution: '0',
    due_date: '', payment_method: '', notes: '',
  });

  // Pay form
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
    setCreateForm({ appointment: '', patient_name: '', subtotal: '', tax_amount: '', discount_amount: '0', cnam_contribution: '0', insurance_contribution: '0', due_date: '', payment_method: '', notes: '' });
    setCreateError(''); setApptSearch(''); setShowCreate(true);
    setApptLoading(true);
    api.get('/appointments/doctor/', { params: { page_size: 200, ordering: '-start_time' } })
      .then(r => setAppointmentsList(r.data.results || r.data || []))
      .catch(() => setAppointmentsList([]))
      .finally(() => setApptLoading(false));
  };

  const handleApptSelect = (apptId) => {
    const appt = appointmentsList.find(a => String(a.id) === String(apptId));
    if (appt) {
      setCreateForm(p => ({ ...p, appointment: appt.id, patient_name: appt.patient_name || `${appt.patient_first_name || ''} ${appt.patient_last_name || ''}`.trim() }));
    } else {
      setCreateForm(p => ({ ...p, appointment: '', patient_name: '' }));
    }
  };

  const selectedAppt = appointmentsList.find(a => String(a.id) === String(createForm.appointment));
  const computedTotal = calcTotal(createForm.subtotal, createForm.tax_amount, createForm.discount_amount, createForm.cnam_contribution, createForm.insurance_contribution);

  const handleCreate = (e) => {
    e.preventDefault(); setCreateError(''); setCreateLoading(true);
    const payload = { appointment: createForm.appointment || undefined, subtotal: createForm.subtotal || undefined, tax_amount: createForm.tax_amount || undefined, discount_amount: createForm.discount_amount || undefined, cnam_contribution: createForm.cnam_contribution || undefined, insurance_contribution: createForm.insurance_contribution || undefined, due_date: createForm.due_date || undefined, payment_method: createForm.payment_method || undefined, notes: createForm.notes || undefined };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    api.post('/billing/doctor/invoices/', payload)
      .then(() => { setShowCreate(false); fetchAll(); })
      .catch(err => { if (err.response?.data) { const d = err.response.data; setCreateError(typeof d === 'object' ? Object.values(d).flat().join(' | ') : String(d)); } else setCreateError('Erreur réseau.'); })
      .finally(() => setCreateLoading(false));
  };

  /* ════════════ Actions ════════════ */
  const handleValidate = (inv) => { if (!window.confirm('Valider la facture ' + inv.invoice_number + ' ?')) return; api.post('/billing/doctor/invoices/' + inv.id + '/validate/').then(() => fetchAll()).catch(() => {}); };
  const handleDelete = (inv) => { if (!window.confirm('Supprimer la facture ' + inv.invoice_number + ' ?')) return; api.delete('/billing/doctor/invoices/' + inv.id + '/').then(() => { setShowDetail(false); fetchAll(); }).catch(() => {}); };
  
  const openPay = (inv) => { setPayTarget(inv); setPayForm({ amount: inv.remaining_amount || '', payment_method: '', transaction_id: '', notes: '' }); setShowPay(true); };
  const handlePay = (e) => {
    e.preventDefault(); if (!payTarget) return; setPayLoading(true);
    const payload = {}; Object.entries(payForm).forEach(([k, v]) => { if (v !== '') payload[k] = v; });
    api.post('/billing/doctor/invoices/' + payTarget.id + '/pay/', payload).then(() => { setShowPay(false); setPayTarget(null); fetchAll(); }).catch(() => {}).finally(() => setPayLoading(false));
  };

  const filteredAppointments = appointmentsList.filter(a => {
    if (!apptSearch) return true; const q = apptSearch.toLowerCase();
    const name = (a.patient_name || `${a.patient_first_name || ''} ${a.patient_last_name || ''}`).toLowerCase();
    const reason = (a.reason || a.notes || a.motif || '').toLowerCase();
    return name.includes(q) || reason.includes(q) || String(a.id).includes(q);
  });

  /* ════════════ RENDER ════════════ */
  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1"><i className="bi bi-receipt me-2 text-primary"></i>Mes Factures</h4>
          <p className="text-muted mb-0">Gestion de la facturation de vos consultations</p>
        </div>
        <button className="btn btn-primary mt-2 mt-md-0" onClick={openCreate}><i className="bi bi-plus-lg me-1"></i>Nouvelle facture</button>
      </div>

      {stats && (
        <div className="row g-3 mb-4">
          {[{ label: 'Total factures', value: stats.total_invoices || 0, color: '', icon: 'bi-receipt' },{ label: 'Revenus', value: fmt(stats.total_revenue), color: 'text-success', icon: 'bi-cash-stack' },{ label: 'En attente', value: fmt(stats.total_pending_amount), color: 'text-warning', icon: 'bi-clock' },{ label: 'Impayées', value: stats.overdue_count || 0, color: 'text-danger', icon: 'bi-exclamation-triangle' }].map((s, i) => (
            <div key={i} className="col-md-3 col-6"><div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="d-flex align-items-center justify-content-between"><div><div className="text-muted small">{s.label}</div><div className={'fw-bold fs-4 ' + s.color}>{s.value}</div></div><i className={'bi ' + s.icon + ' text-muted opacity-25 fs-2'}></i></div></div></div></div>
          ))}
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
          <h6 className="mb-0"><i className="bi bi-list-ul me-2"></i>Liste des factures</h6>
          <button className="btn btn-outline-primary btn-sm" onClick={fetchAll}><i className="bi bi-arrow-clockwise me-1"></i>Actualiser</button>
        </div>
        <div className="card-body p-0">
          {loading ? (<div className="text-center py-5"><div className="spinner-border text-primary"></div></div>) : invoices.length === 0 ? (<div className="text-center py-5 text-muted"><i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i><p>Aucune facture pour le moment</p></div>) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light"><tr><th>N° Facture</th><th>Patient</th><th>Montant</th><th>Payé</th><th>Reste</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="fw-semibold">{inv.invoice_number || '#' + inv.id}</td>
                      <td>{inv.patient_name || '-'}</td>
                      <td className="fw-bold">{fmt(inv.total_amount)}</td>
                      <td className="text-success">{fmt(inv.total_paid)}</td>
                      <td className="text-danger">{fmt(inv.remaining_amount)}</td>
                      <td><span className={'badge bg-' + (STATUS_MAP[inv.status] || 'secondary')}>{inv.status_display || STATUS_LABELS[inv.status] || inv.status}</span></td>
                      <td className="text-muted small">{inv.issue_date || '-'}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => { setSelected(inv); setShowDetail(true); }} title="Détails"><i className="bi bi-eye"></i></button>
                          {!inv.is_validated && (<button className="btn btn-sm btn-outline-success" onClick={() => handleValidate(inv)} title="Valider"><i className="bi bi-check-lg"></i></button>)}
                          <button className="btn btn-sm btn-outline-info" onClick={() => openPay(inv)} title="Paiement"><i className="bi bi-credit-card"></i></button>
                          {/* BOUTON PDF TABLEAU */}
                          <button className="btn btn-sm btn-dark" onClick={() => handleDownloadPdf(inv, 'doctor')} title="Télécharger PDF"><i className="bi bi-file-earmark-pdf-fill"></i></button>
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
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="bi bi-receipt me-2"></i>{selected.invoice_number || '#' + selected.id} <span className={'badge bg-' + (STATUS_MAP[selected.status] || 'secondary') + ' ms-2'}>{selected.status_display || selected.status}</span></h5>
                <button type="button" className="btn-close" onClick={() => setShowDetail(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6"><div className="card border"><div className="card-body"><small className="text-muted">Patient</small><p className="fw-bold mb-0">{selected.patient_name || '-'}</p></div></div></div>
                  <div className="col-md-6"><div className="card border"><div className="card-body"><small className="text-muted">Montant total</small><p className="fw-bold mb-0 text-primary fs-5">{fmt(selected.total_amount)}</p></div></div></div>
                </div>
                <div className="row g-3 mt-1">
                  {[{ label: 'Sous-total', val: fmt(selected.subtotal), cls: '' },{ label: 'Total payé', val: fmt(selected.total_paid), cls: 'text-success' },{ label: 'Reste à payer', val: fmt(selected.remaining_amount), cls: 'text-danger' }].map((c, i) => (
                    <div key={i} className="col-4"><div className="card border text-center"><div className="card-body"><small className="text-muted">{c.label}</small><div className={'fw-bold ' + c.cls}>{c.val}</div></div></div></div>
                  ))}
                </div>
                {selected.payments && selected.payments.length > 0 && (
                  <div className="mt-3"><h6><i className="bi bi-clock-history me-2"></i>Paiements ({selected.payments.length})</h6><div className="table-responsive"><table className="table table-sm"><thead><tr><th>Montant</th><th>Méthode</th><th>Date</th><th>Statut</th></tr></thead><tbody>{selected.payments.map(p => (<tr key={p.id}><td>{fmt(p.amount)}</td><td>{p.payment_method_display || p.payment_method}</td><td>{p.payment_date || '-'}</td><td><span className={'badge bg-' + (STATUS_MAP[p.status] || 'secondary')}>{p.status_display || p.status}</span></td></tr>))}</tbody></table></div></div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDetail(false)}>Fermer</button>
                {/* BOUTON PDF MODAL */}
                <button className="btn btn-dark" onClick={() => handleDownloadPdf(selected, 'doctor')}><i className="bi bi-file-earmark-pdf-fill me-1"></i>Télécharger PDF</button>
                {!selected.is_validated && (<button className="btn btn-success" onClick={() => { handleValidate(selected); setShowDetail(false); }}><i className="bi bi-check-lg me-1"></i>Valider</button>)}
                <button className="btn btn-outline-danger" onClick={() => handleDelete(selected)}><i className="bi bi-trash me-1"></i>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ MODAL CRÉATION ══════ */}
      {showCreate && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-plus-lg me-2"></i>Nouvelle Facture</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreate(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-4">
                  <label className="form-label fw-semibold"><i className="bi bi-calendar-check me-1"></i>Rendez-vous <span className="text-danger">*</span></label>
                  <input type="text" className="form-control mb-2" placeholder="Rechercher par nom du patient..." value={apptSearch} onChange={e => setApptSearch(e.target.value)} />
                  {apptLoading ? (<div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary"></div></div>) : (
                    <select className="form-select" size="5" value={createForm.appointment} onChange={e => handleApptSelect(e.target.value)} style={{ cursor: 'pointer' }}>
                      <option value="">-- Sélectionnez un rendez-vous --</option>
                      {filteredAppointments.map(a => { const pName = a.patient_name || `${a.patient_first_name || ''} ${a.patient_last_name || ''}`.trim(); const dateStr = a.date || a.start_time ? new Date(a.date || a.start_time).toLocaleDateString('fr-FR') : ''; const time = a.start_time || a.time_slot ? new Date(a.start_time || a.time_slot).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''; const reason = a.reason || a.notes || a.motif || 'Consultation'; return (<option key={a.id} value={a.id}>{pName} — {dateStr} {time} — {reason}</option>); })}
                    </select>
                  )}
                </div>

                {selectedAppt && (<div className="alert alert-light border mb-4"><div className="row g-2"><div className="col-sm-4"><small className="text-muted">Patient</small><div className="fw-semibold">{createForm.patient_name || '-'}</div></div><div className="col-sm-4"><small className="text-muted">Date & Heure</small><div className="fw-semibold">{selectedAppt.date || selectedAppt.start_time ? new Date(selectedAppt.date || selectedAppt.start_time).toLocaleDateString('fr-FR') : '-'} {selectedAppt.start_time ? new Date(selectedAppt.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</div></div><div className="col-sm-4"><small className="text-muted">Motif</small><div className="fw-semibold">{selectedAppt.reason || selectedAppt.notes || selectedAppt.motif || 'Consultation'}</div></div></div></div>)}

                {createError && (<div className="alert alert-danger d-flex align-items-center" role="alert"><i className="bi bi-exclamation-triangle-fill me-2"></i><div>{createError}</div></div>)}

                <form onSubmit={handleCreate}>
                  <h6 className="text-muted mb-3"><i className="bi bi-calculator me-1"></i>Montants</h6>
                  <div className="row g-3 mb-3">
                    <div className="col-md-4"><label className="form-label">Sous-total (TND) <span className="text-danger">*</span></label><input type="number" step="0.001" min="0" className="form-control" required placeholder="0.000" value={createForm.subtotal} onChange={e => setCreateForm(p => ({ ...p, subtotal: e.target.value }))} /></div>
                    <div className="col-md-4"><label className="form-label">Taxe (TND)</label><input type="number" step="0.001" min="0" className="form-control" placeholder="0.000" value={createForm.tax_amount} onChange={e => setCreateForm(p => ({ ...p, tax_amount: e.target.value }))} /></div>
                    <div className="col-md-4"><label className="form-label">Remise (TND)</label><input type="number" step="0.001" min="0" className="form-control" placeholder="0.000" value={createForm.discount_amount} onChange={e => setCreateForm(p => ({ ...p, discount_amount: e.target.value }))} /></div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-4"><label className="form-label">CNAM (TND)</label><input type="number" step="0.001" min="0" className="form-control" placeholder="0.000" value={createForm.cnam_contribution} onChange={e => setCreateForm(p => ({ ...p, cnam_contribution: e.target.value }))} /></div>
                    <div className="col-md-4"><label className="form-label">Assurance (TND)</label><input type="number" step="0.001" min="0" className="form-control" placeholder="0.000" value={createForm.insurance_contribution} onChange={e => setCreateForm(p => ({ ...p, insurance_contribution: e.target.value }))} /></div>
                    <div className="col-md-4"><label className="form-label">Total calculé</label><div className="form-control bg-primary bg-opacity-10 fw-bold text-primary" style={{ fontSize: '1.1rem' }}>{computedTotal} TND</div></div>
                  </div>
                  <h6 className="text-muted mb-3 mt-4"><i className="bi bi-sliders me-1"></i>Détails</h6>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6"><label className="form-label">Échéance</label><input type="date" className="form-control" value={createForm.due_date} onChange={e => setCreateForm(p => ({ ...p, due_date: e.target.value }))} /><small className="text-muted">Par défaut : 30 jours si vide</small></div>
                    <div className="col-md-6"><label className="form-label">Méthode de paiement</label><select className="form-select" value={createForm.payment_method} onChange={e => setCreateForm(p => ({ ...p, payment_method: e.target.value }))}><option value="">-- Sélectionner --</option>{PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
                  </div>
                  <div className="mb-3"><label className="form-label">Notes</label><input type="text" className="form-control" placeholder="Notes internes (optionnel)" value={createForm.notes} onChange={e => setCreateForm(p => ({ ...p, notes: e.target.value }))} /></div>
                  <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}><i className="bi bi-x-lg me-1"></i>Annuler</button>
                    <button type="submit" className="btn btn-primary" disabled={createLoading || !createForm.appointment || !createForm.subtotal}>{createLoading ? (<><span className="spinner-border spinner-border-sm me-1"></span>Création...</>) : (<><i className="bi bi-plus-lg me-1"></i>Créer la facture</>)}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ MODAL PAIEMENT ══════ */}
      {showPay && payTarget && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title"><i className="bi bi-credit-card me-2"></i>Enregistrer un paiement</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPay(false)}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-light mb-3"><div className="d-flex justify-content-between align-items-center"><span className="text-muted">Facture <strong>{payTarget.invoice_number || '#' + payTarget.id}</strong></span><span>Reste : <strong className="text-danger">{fmt(payTarget.remaining_amount)}</strong></span></div></div>
                <form onSubmit={handlePay}>
                  <div className="mb-3"><label className="form-label">Montant (TND) <span className="text-danger">*</span></label><input type="number" step="0.001" min="0.001" className="form-control" required value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} /></div>
                  <div className="mb-3"><label className="form-label">Méthode <span className="text-danger">*</span></label><select className="form-select" required value={payForm.payment_method} onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}><option value="">-- Sélectionner --</option>{PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
                  <div className="mb-3"><label className="form-label">N° Transaction</label><input type="text" className="form-control" placeholder="Optionnel" value={payForm.transaction_id} onChange={e => setPayForm(p => ({ ...p, transaction_id: e.target.value }))} /></div>
                  <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowPay(false)}>Annuler</button>
                    <button type="submit" className="btn btn-success" disabled={payLoading}>{payLoading ? (<><span className="spinner-border spinner-border-sm me-1"></span>...</>) : 'Enregistrer le paiement'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorInvoices;