import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export default function PharmacistStock() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const [medications, setMedications] = useState([]);
  const [medSearch, setMedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    medication: '', quantity: '', buying_price: '', selling_price: '', batch_number: '', expiry_date: ''
  });

  // État pour la création d'un nouveau médicament
  const [newMed, setNewMed] = useState({ name: '', active_ingredient: '', dosage: '', form: 'tablet' });
  const [creatingMed, setCreatingMed] = useState(false);

  const fetchStock = useCallback(() => {
    setLoading(true);
    api.get('/pharmacy/pharmacist/stock/')
      .then(r => setStock(r.data || []))
      .catch(() => setMessage({ type: 'danger', text: 'Erreur de chargement.' }))
      .finally(() => setLoading(false));
  }, []);

  const fetchMedications = useCallback((search = '') => {
    api.get(`/pharmacy/pharmacist/medications/?search=${search}`)
      .then(r => setMedications(r.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const openModal = () => {
    setForm({ medication: '', quantity: '', buying_price: '', selling_price: '', batch_number: '', expiry_date: '' });
    setMedSearch('');
    setMedications([]);
    setNewMed({ name: '', active_ingredient: '', dosage: '', form: 'tablet' });
    setShowModal(true);
    setMessage(null);
  };

  const handleMedSearch = (val) => {
    setMedSearch(val);
    if (form.medication) {
      setForm(prev => ({ ...prev, medication: '' }));
    }
    if (val.length > 2) fetchMedications(val);
  };

  // ✅ Fonction pour créer un médicament s'il n'existe pas
  const handleCreateMedication = () => {
    if (!newMed.name || !newMed.dosage) {
      alert("Veuillez remplir au moins le nom et le dosage du nouveau médicament.");
      return;
    }

    setCreatingMed(true);
    api.post('/pharmacy/pharmacist/medications/', newMed)
      .then(res => {
        const createdMedId = res.data.id;
        setForm(prev => ({ ...prev, medication: createdMedId }));
        setMedSearch(`${newMed.name} ${newMed.dosage}`);
        setMedications([]);
        setMessage({ type: 'success', text: 'Médicament créé et sélectionné. Vous pouvez finaliser l\'ajout au stock.' });
      })
      .catch(err => {
        const errorData = err.response?.data;
        let msg = "Erreur création médicament. ";
        if (errorData) { for (const key in errorData) { msg += `${key}: ${errorData[key]} | `; } }
        setMessage({ type: 'danger', text: msg });
      })
      .finally(() => setCreatingMed(false));
  };

  const handleAddStock = (e) => {
    e.preventDefault();
    
    if (!form.medication) {
      alert("Veuillez sélectionner un médicament existant ou en créer un nouveau.");
      return;
    }

    setSaving(true);
    setMessage(null);

    api.post('/pharmacy/pharmacist/stock/', form)
      .then(() => {
        setShowModal(false);
        fetchStock();
        setMessage({ type: 'success', text: 'Médicament ajouté au stock avec succès.' });
      })
      .catch(err => {
        const errorData = err.response?.data;
        let msg = "Erreur lors de l'ajout au stock. ";
        if (errorData) { for (const key in errorData) { msg += `${key}: ${errorData[key]} | `; } }
        setMessage({ type: 'danger', text: msg });
      })
      .finally(() => setSaving(false));
  };

  const handleDelete = (id) => {
    if (window.confirm('Retirer ce médicament du stock ?')) {
      api.delete(`/pharmacy/pharmacist/stock/${id}/`)
        .then(() => fetchStock())
        .catch(() => alert('Erreur'));
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1"><i className="bi bi-box-seam me-2 text-primary"></i>Gestion du Stock</h2>
          <p className="text-muted mb-0">Inventaire des médicaments disponibles.</p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <i className="bi bi-plus-lg me-1"></i> Ajouter au stock
        </button>
      </div>

      {message && !showModal && (
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
                    <th>Médicament</th>
                    <th className="text-center">Quantité</th>
                    <th className="text-end">Prix Achat</th>
                    <th className="text-end">Prix Vente</th>
                    <th>Lot</th>
                    <th>Péremption</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-4 text-muted">Stock vide.</td></tr>
                  ) : stock.map(item => (
                    <tr key={item.id} className={item.is_expired ? 'table-danger' : (item.quantity <= 10 ? 'table-warning' : '')}>
                      <td className="fw-bold">{item.medication_name} <span className="text-muted small">({item.medication_dosage})</span></td>
                      <td className="text-center"><span className={`badge bg-${item.quantity <= 10 ? 'danger' : 'light text-dark'}`}>{item.quantity}</span></td>
                      <td className="text-end">{Number(item.buying_price).toFixed(3)} TND</td>
                      <td className="text-end fw-bold">{Number(item.selling_price).toFixed(3)} TND</td>
                      <td>{item.batch_number || '-'}</td>
                      <td className="small">{new Date(item.expiry_date).toLocaleDateString('fr-FR')}</td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.id)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
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
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-box-arrow-in-down me-2"></i>Ajouter au Stock</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleAddStock}>
                <div className="modal-body">
                  
                  {message && (
                    <div className={`alert alert-${message.type} py-2 small`}>{message.text}</div>
                  )}

                  {/* ZONE MÉDICAMENT (RECHERCHE OU CRÉATION) */}
                  <div className="mb-3">
                    <label className="form-label fw-bold">Médicament <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control mb-2" 
                      placeholder="Tapez 3 lettres pour chercher..." 
                      value={medSearch}
                      onChange={(e) => handleMedSearch(e.target.value)}
                      disabled={!!form.medication}
                    />

                    {/* Liste des résultats de recherche */}
                    {medications.length > 0 && !form.medication && (
                      <div className="list-group mb-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {medications.map(med => (
                          <button 
                            type="button" 
                            key={med.id} 
                            className="list-group-item list-group-item-action py-2"
                            onClick={() => { setForm(prev => ({...prev, medication: med.id})); setMedSearch(`${med.name} ${med.dosage}`); setMedications([]); }}
                          >
                            <strong>{med.name} {med.dosage}</strong> <small className="text-muted">({med.active_ingredient})</small>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Bloc de création si aucun résultat */}
                    {medSearch.length > 2 && medications.length === 0 && !form.medication && (
                      <div className="alert alert-light border p-3 mt-2">
                        <p className="mb-2 small text-muted">Aucun médicament trouvé. Créez-le ici :</p>
                        <div className="row g-2 align-items-end">
                          <div className="col-md-4">
                            <label className="form-label small mb-1">Nom</label>
                            <input type="text" className="form-control form-control-sm" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} placeholder="Ex: Paracétamol" />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small mb-1">Dosage</label>
                            <input type="text" className="form-control form-control-sm" value={newMed.dosage} onChange={e => setNewMed({...newMed, dosage: e.target.value})} placeholder="Ex: 500mg" />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small mb-1">Principe actif</label>
                            <input type="text" className="form-control form-control-sm" value={newMed.active_ingredient} onChange={e => setNewMed({...newMed, active_ingredient: e.target.value})} placeholder="Ex: Paracétamol" />
                          </div>
                          <div className="col-12 mt-2">
                            <button type="button" className="btn btn-sm btn-success" onClick={handleCreateMedication} disabled={creatingMed}>
                              {creatingMed ? 'Création...' : <><i className="bi bi-plus-lg me-1"></i>Créer ce médicament</>}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Indicateur de sélection */}
                    {form.medication ? (
                      <div className="alert alert-success py-2 small mt-2 d-flex justify-content-between align-items-center">
                        <span><i className="bi bi-check-circle me-1"></i>Médicament prêt à être ajouté</span>
                        <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => { setForm(prev => ({...prev, medication: ''})); setMedSearch(''); }}>Changer</button>
                      </div>
                    ) : (
                      medications.length === 0 && medSearch.length <= 2 && <small className="text-muted fst-italic">Cherchez un médicament existant ou tapez 3 lettres pour en créer un nouveau.</small>
                    )}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Quantité <span className="text-danger">*</span></label>
                      <input type="number" min="1" className="form-control" required value={form.quantity} onChange={e => setForm(prev => ({...prev, quantity: e.target.value}))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Prix d'achat (TND) <span className="text-danger">*</span></label>
                      <input type="number" step="0.001" min="0" className="form-control" required value={form.buying_price} onChange={e => setForm(prev => ({...prev, buying_price: e.target.value}))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Prix de vente (TND) <span className="text-danger">*</span></label>
                      <input type="number" step="0.001" min="0" className="form-control" required value={form.selling_price} onChange={e => setForm(prev => ({...prev, selling_price: e.target.value}))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Numéro de lot</label>
                      <input type="text" className="form-control" value={form.batch_number} onChange={e => setForm(prev => ({...prev, batch_number: e.target.value}))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date de péremption <span className="text-danger">*</span></label>
                      <input type="date" className="form-control" required value={form.expiry_date} onChange={e => setForm(prev => ({...prev, expiry_date: e.target.value}))} />
                    </div>
                  </div>

                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !form.medication}>
                    {saving ? <span className="spinner-border spinner-border-sm"></span> : 'Enregistrer dans le stock'}
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