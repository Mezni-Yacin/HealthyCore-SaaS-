import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

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
      // ✅ Utilisation de la route dédiée aux patients
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
      alert("Veuillez sélectionner un médicament et indiquer la posologie.");
      return;
    }
    setItems([...items, currentItem]);
    setCurrentItem({ medication: '', name: '', dosage_instruction: '', quantity_prescribed: 1 });
    setMedSearch('');
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.patient || items.length === 0) {
      alert("Veuillez sélectionner un patient et ajouter au moins un médicament.");
      return;
    }

    setSaving(true);
    const payload = { ...form, items };

    api.post('/pharmacy/doctor/prescriptions/', payload)
      .then(() => {
        setMessage({ type: 'success', text: 'Ordonnance envoyée à la pharmacie avec succès !' });
        setShowModal(false);
        fetchPrescriptions();
      })
      .catch(err => {
        const msg = err.response?.data?.detail || "Erreur lors de la création de l'ordonnance.";
        setMessage({ type: 'danger', text: msg });
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1"><i className="bi bi-file-earmark-medical me-2 text-primary"></i>Ordonnances Numériques</h2>
          <p className="text-muted mb-0">Émettez des ordonnances directement envoyées aux pharmacies.</p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <i className="bi bi-plus-lg me-1"></i> Nouvelle Ordonnance
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type} alert-dismissible fade show`}>
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Médicaments prescrits</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-4 text-muted">Aucune ordonnance émise.</td></tr>
                  ) : prescriptions.map(pres => (
                    <tr key={pres.id}>
                      <td className="small text-nowrap">{new Date(pres.prescription_date).toLocaleDateString('fr-FR')}</td>
                      <td className="fw-semibold">{pres.patient_name}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {pres.items?.map((item, i) => (
                            <span key={i} className="badge bg-light text-dark border">
                              {item.medication_name} <small className="text-muted">({item.dosage_instruction})</small>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td><span className={`badge bg-${pres.status === 'pending' ? 'warning text-dark' : 'success'}`}>{pres.status_display}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-file-earmark-plus me-2"></i>Nouvelle Ordonnance</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label">Patient <span className="text-danger">*</span></label>
                      {/* ✅ CORRIGÉ ICI : p.name au lieu de p.first_name */}
                      <select className="form-select" required value={form.patient} onChange={e => setForm({...form, patient: e.target.value})}>
                        <option value="">-- Sélectionner un patient --</option>
                        {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Notes (Optionnel)</label>
                      <input type="text" className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Ex: À renouveler 1 fois" />
                    </div>
                  </div>

                  <h6 className="fw-bold mb-3">Médicaments prescrits</h6>

                  <div className="card bg-light p-3 mb-3">
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
                      <div className="list-group" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {medResults.map(med => (
                          <button type="button" key={med.id} className="list-group-item list-group-item-action py-2" onClick={() => selectMedication(med)}>
                            <strong>{med.name} {med.dosage}</strong> <small className="text-muted">({med.active_ingredient})</small>
                          </button>
                        ))}
                      </div>
                    )}

                    {currentItem.medication && (
                      <div className="alert alert-success py-2 small mb-0 d-flex justify-content-between align-items-center">
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
                        <button type="button" className="btn btn-outline-primary w-100" onClick={addItemToList} disabled={!currentItem.medication}>
                          <i className="bi bi-plus-lg me-1"></i> Ajouter
                        </button>
                      </div>
                    </div>
                  </div>

                  {items.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th>Médicament</th>
                            <th>Posologie</th>
                            <th className="text-center">Qté</th>
                            <th className="text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => (
                            <tr key={index}>
                              <td className="fw-semibold">{item.name}</td>
                              <td>{item.dosage_instruction}</td>
                              <td className="text-center">{item.quantity_prescribed}</td>
                              <td className="text-center">
                                <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => removeItem(index)}>
                                  <i className="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted small text-center">Aucun médicament ajouté pour le moment.</p>
                  )}

                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || items.length === 0}>
                    {saving ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-send me-1"></i> Envoyer l'ordonnance</>}
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