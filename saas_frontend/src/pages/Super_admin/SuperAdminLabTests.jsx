import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const CATEGORIES = {
  hematology: 'Hématologie', biochemistry: 'Biochimie', microbiology: 'Microbiologie',
  immunology: 'Immunologie', hormones: 'Hormones', urinalysis: 'Analyse d\'urine', other: 'Autre'
};

const emptyForm = { name: '', code: '', category: 'biochemistry', description: '', turnaround_time: 24, price: '0.000', cnam_coverage: false, cnam_price: '0.000' };

const SuperAdminLabTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchTests = useCallback(() => {
    setLoading(true);
    api.get('/laboratories/superadmin/tests/').then(r => setTests(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/laboratories/superadmin/tests/${editing.id}/`, form);
      } else {
        await api.post('/laboratories/superadmin/tests/', form);
      }
      setShowModal(false);
      fetchTests();
    } catch (err) {
      alert(err.response?.data?.code?.[0] || "Erreur (vérifie si le code existe déjà).");
    }
  };

  const openEdit = (test) => {
    setEditing(test);
    setForm({ 
      name: test.name, code: test.code, category: test.category, description: test.description || '', 
      turnaround_time: test.turnaround_time, price: test.price, cnam_coverage: test.cnam_coverage, cnam_price: test.cnam_price 
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer cette analyse ?")) {
      await api.delete(`/laboratories/superadmin/tests/${id}/`);
      fetchTests();
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4><i className="bi bi-clipboard2-pulse me-2"></i>Catalogue d'Analyses</h4>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(emptyForm); setShowModal(true); }}>
          <i className="bi bi-plus-circle me-1"></i> Nouvelle Analyse
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? <div className="text-center py-5"><div className="spinner-border"></div></div> : (
            <table className="table table-hover mb-0">
              <thead className="table-light"><tr><th>Code</th><th>Nom</th><th>Catégorie</th><th>Délai (h)</th><th>Prix</th><th>CNAM</th><th>Actions</th></tr></thead>
              <tbody>
                {tests.map(t => (
                  <tr key={t.id}>
                    <td><span className="badge bg-light text-dark border">{t.code}</span></td>
                    <td className="fw-semibold">{t.name}</td>
                    <td><span className="badge bg-info">{CATEGORIES[t.category] || t.category}</span></td>
                    <td>{t.turnaround_time}h</td>
                    <td className="fw-bold">{parseFloat(t.price).toFixed(3)} TND</td>
                    <td>
                      {t.cnam_coverage ? <span className="text-success"><i className="bi bi-check-circle-fill"></i> ({parseFloat(t.cnam_price).toFixed(3)})</span> : <span className="text-secondary">Non</span>}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(t)}><i className="bi bi-pencil"></i></button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(t.id)}><i className="bi bi-trash"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Formulaire */}
      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Modifier' : 'Ajouter'} une Analyse</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Code *</label>
                      <input type="text" className="form-control" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="EX: NFS" />
                    </div>
                    <div className="col-md-8 mb-3">
                      <label className="form-label">Nom de l'analyse *</label>
                      <input type="text" className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Numération Formule Sanguine" />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Catégorie *</label>
                      <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                        {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Délai de rendu (Heures) *</label>
                      <input type="number" className="form-control" required value={form.turnaround_time} onChange={e => setForm({ ...form, turnaround_time: e.target.value })} />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Prix Patient (TND) *</label>
                      <input type="number" step="0.001" className="form-control" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Prix CNAM (TND)</label>
                      <input type="number" step="0.001" className="form-control" value={form.cnam_price} onChange={e => setForm({ ...form, cnam_price: e.target.value })} disabled={!form.cnam_coverage} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Instructions de préparation</label>
                    <textarea className="form-control" rows="2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="À jeun, pas de médicaments..."></textarea>
                  </div>
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" checked={form.cnam_coverage} onChange={e => setForm({ ...form, cnam_coverage: e.target.checked, cnam_price: e.target.checked ? form.cnam_price : '0.000' })} />
                    <label className="form-check-label">Prise en charge CNAM</label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminLabTests;