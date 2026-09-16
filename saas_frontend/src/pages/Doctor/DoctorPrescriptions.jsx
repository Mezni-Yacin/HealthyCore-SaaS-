import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const cardStyle = { borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };
const iconBox = (color) => ({ width: '48px', height: '48px', borderRadius: '12px', background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' });

const getStatusBadge = (status) => {
  const map = {
    pending: 'bg-warning-subtle text-warning',
    dispensed: 'bg-success-subtle text-success',
    cancelled: 'bg-danger-subtle text-danger',
    partially_dispensed: 'bg-info-subtle text-info'
  };
  return map[status] || 'bg-secondary-subtle text-secondary';
};

export default function DoctorPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ patient: '', notes: '' });
  const [items, setItems] = useState([]);

  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState([]);
  const [currentItem, setCurrentItem] = useState({ medication: '', name: '', dosage_instruction: '', quantity_prescribed: 1 });

  const fetchPrescriptions = useCallback(() => {
    setLoading(true);
    api.get('/pharmacy/doctor/prescriptions/')
      .then(r => setPrescriptions(r.data || []))
      .catch(() => setMessage({ type: 'danger', text: 'Erreur de chargement des ordonnances.' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  const openModal = async () => {
    setForm({ patient: '', notes: '' });
    setItems([]);
    setMedSearch('');
    setMedResults([]);
    setCurrentItem({ medication: '', name: '', dosage_instruction: '', quantity_prescribed: 1 });
    
    try {
      const res = await api.get('/pharmacy/doctor/patients/'); 
      setPatients(res.data || []);
    } catch (err) {
      console.error("Erreur lors du chargement des patients", err);
      setPatients([]);
    }
    
    setShowModal(true);
  };

  const handleMedSearch = (val) => {
    setMedSearch(val);
    if (val.length > 2) {
      api.get(`/pharmacy/pharmacist/medications/?search=${val}`)
        .then(r => setMedResults(r.data || []))
        .catch(() => setMedResults([]));
    } else {
      setMedResults([]);
    }
  };

  const selectMedication = (med) => {
    setCurrentItem({ 
      ...currentItem, 
      medication: med.id, 
      name: `${med.name} ${med.dosage}` 
    });
    setMedSearch(`${med.name} ${med.dosage}`);
    setMedResults([]);
  };

  const addItemToList = () => {
    if (!currentItem.medication || !currentItem.dosage_instruction) {
      setMessage({ type: 'danger', text: "Veuillez sélectionner un médicament et indiquer la posologie." });
      return;
    }
    setItems([...items, currentItem]);
    setCurrentItem({ medication: '', name: '', dosage_instruction: '', quantity_prescribed: 1 });
    setMedSearch('');
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient || items.length === 0) {
      setMessage({ type: 'danger', text: "Veuillez sélectionner un patient et ajouter au moins un médicament." });
      return;
    }

    setSaving(true);
    
    // ✅ FIX CRUCIAL : On mappe les items pour n'envoyer que ce que le backend Django attend
    const payload = {
      patient: form.patient,
      notes: form.notes,
      items: items.map(item => ({
        medication: item.medication, // ID du médicament
        dosage_instruction: item.dosage_instruction,
        quantity_prescribed: Number(item.quantity_prescribed)
      }))
    };

    api.post('/pharmacy/doctor/prescriptions/', payload)
      .then(() => {
        setMessage({ type: 'success', text: 'Ordonnance envoyée à la pharmacie avec succès !' });
        setShowModal(false);
        fetchPrescriptions();
      })
      .catch(err => {
        const msg = err.response?.data?.detail || "Erreur lors de la création de l'ordonnance. Vérifiez les champs.";
        setMessage({ type: 'danger', text: msg });
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1"><i className="bi bi-file-earmark-medical me-2 text-primary"></i>Ordonnances Numériques</h2>
          <p className="text-muted mb-0">Émettez des ordonnances envoyées directement aux pharmacies.</p>
        </div>
        <button className="btn btn-primary px-4 py-2 rounded-3" onClick={openModal}>
          <i className="bi bi-plus-lg me-2"></i> Nouvelle Ordonnance
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type} alert-dismissible fade show`} style={{borderRadius: '12px'}}>
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      <div className="card" style={cardStyle}>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="mt-2 text-muted">Chargement des ordonnances...</p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-file-earmark-text text-muted" style={{fontSize: '3rem'}}></i>
              <p className="mt-3 text-muted">Aucune ordonnance émise pour le moment.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="text-uppercase text-muted" style={{fontSize: '0.75rem'}}>
                    <th className="ps-4">Date</th>
                    <th>Patient</th>
                    <th>Médicaments prescrits</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map(pres => (
                    <tr key={pres.id}>
                      <td className="ps-4 text-muted small text-nowrap">{new Date(pres.prescription_date).toLocaleDateString('fr-FR')}</td>
                      <td className="fw-bold text-dark">{pres.patient_name}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {pres.items?.map((item, i) => (
                            <span key={i} className="badge bg-light text-dark border px-2 py-1">
                              {item.medication_name} <small className="text-muted">({item.dosage_instruction})</small>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td><span className={`badge ${getStatusBadge(pres.status)} px-3 py-2`}>{pres.status_display || pres.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{borderRadius: '16px', border: 'none'}}>
              <div className="modal-header bg-primary text-white" style={{borderRadius: '16px 16px 0 0'}}>
                <h5 className="modal-title fw-bold"><i className="bi bi-file-earmark-plus me-2"></i>Nouvelle Ordonnance</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)} disabled={saving}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  
                  <h6 className="text-uppercase text-muted fw-bold mb-3" style={{fontSize: '0.8rem'}}><i className="bi bi-info-circle me-2"></i>Contexte</h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Patient <span className="text-danger">*</span></label>
                      <select className="form-select" required value={form.patient} onChange={e => setForm({...form, patient: e.target.value})}>
                        <option value="">-- Sélectionner un patient --</option>
                        {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Notes (Optionnel)</label>
                      <input type="text" className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Ex: À renouveler 1 fois" />
                    </div>
                  </div>

                  <h6 className="text-uppercase text-muted fw-bold mb-3" style={{fontSize: '0.8rem'}}><i className="bi bi-capsule me-2"></i>Médicaments</h6>

                  <div className="bg-light p-3 rounded-3 mb-4 border">
                    <label className="form-label small fw-bold">Rechercher un médicament</label>
                    <input 
                      type="text" 
                      className="form-control mb-2" 
                      placeholder="Nom du médicament (ex: Doliprane)..." 
                      value={medSearch}
                      onChange={(e) => handleMedSearch(e.target.value)}
                      disabled={!!currentItem.medication}
                    />
                    {medResults.length > 0 && !currentItem.medication && (
                      <div className="list-group shadow-sm" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {medResults.map(med => (
                          <button type="button" key={med.id} className="list-group-item list-group-item-action py-2" onClick={() => selectMedication(med)}>
                            <strong>{med.name} {med.dosage}</strong> <small className="text-muted">({med.active_ingredient})</small>
                          </button>
                        ))}
                      </div>
                    )}

                    {currentItem.medication && (
                      <div className="alert alert-success py-2 small mb-0 d-flex justify-content-between align-items-center mt-2">
                        <span><i className="bi bi-check-circle me-1"></i>Sélectionné : <strong>{currentItem.name}</strong></span>
                        <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => { setCurrentItem({ medication: '', name: '', dosage_instruction: '', quantity_prescribed: 1 }); setMedSearch(''); }}>Changer</button>
                      </div>
                    )}

                    <div className="row g-2 mt-2 align-items-end">
                      <div className="col-md-6">
                        <label className="form-label small">Posologie <span className="text-danger">*</span></label>
                        <input type="text" className="form-control" placeholder="Ex: 1 comprimé matin et soir" value={currentItem.dosage_instruction} onChange={e => setCurrentItem({...currentItem, dosage_instruction: e.target.value})} disabled={!currentItem.medication} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small">Qté</label>
                        <input type="number" min="1" className="form-control" value={currentItem.quantity_prescribed} onChange={e => setCurrentItem({...currentItem, quantity_prescribed: e.target.value})} disabled={!currentItem.medication} />
                      </div>
                      <div className="col-md-3">
                        <button type="button" className="btn btn-outline-primary w-100 rounded-3" onClick={addItemToList} disabled={!currentItem.medication}>
                          <i className="bi bi-plus-lg me-1"></i> Ajouter
                        </button>
                      </div>
                    </div>
                  </div>

                  {items.length > 0 ? (
                    <div className="mb-3">
                      <h6 className="text-uppercase text-muted fw-bold mb-3" style={{fontSize: '0.8rem'}}>Liste des médicaments ({items.length})</h6>
                      <div className="d-flex flex-column gap-2">
                        {items.map((item, index) => (
                          <div key={index} className="d-flex justify-content-between align-items-center p-3 border-0 bg-light rounded-3">
                            <div>
                              <h6 className="mb-0 fw-bold text-dark">{item.name}</h6>
                              <small className="text-muted">{item.dosage_instruction} · Qté: {item.quantity_prescribed}</small>
                            </div>
                            <button type="button" className="btn btn-sm btn-outline-danger rounded-3 px-2" onClick={() => removeItem(index)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted">
                      <i className="bi bi-inbox fs-2 d-block mb-2 opacity-50"></i>
                      <p className="small mb-0">Aucun médicament ajouté pour le moment.</p>
                    </div>
                  )}

                </div>
                <div className="modal-footer border-top-0 p-4">
                  <button type="button" className="btn btn-light px-4 rounded-3" onClick={() => setShowModal(false)} disabled={saving}>Annuler</button>
                  <button type="submit" className="btn btn-primary px-4 rounded-3" disabled={saving || items.length === 0}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Envoi...</> : <><i className="bi bi-send me-1"></i> Envoyer l'ordonnance</>}
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