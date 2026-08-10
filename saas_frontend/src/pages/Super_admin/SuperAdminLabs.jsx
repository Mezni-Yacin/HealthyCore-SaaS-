import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const SuperAdminLabs = () => {
  const [labs, setLabs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', city: '', phone_number: '', email: '', is_active: true });

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/laboratories/superadmin/labs/'),
      api.get('/laboratories/superadmin/stats/')
    ]).then(([labsRes, statsRes]) => {
      setLabs(labsRes.data);
      setStats(statsRes.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLab) {
        await api.patch(`/laboratories/superadmin/labs/${editingLab.id}/`, form);
      } else {
        await api.post('/laboratories/superadmin/labs/', form);
      }
      setShowModal(false);
      setEditingLab(null);
      fetchData();
    } catch (err) {
      alert("Erreur lors de l'enregistrement.");
    }
  };

  const openEdit = (lab) => {
    setEditingLab(lab);
    setForm({ name: lab.name, address: lab.address, city: lab.city, phone_number: lab.phone_number, email: lab.email, is_active: lab.is_active });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer ce laboratoire ?")) {
      await api.delete(`/laboratories/superadmin/labs/${id}/`);
      fetchData();
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4><i className="bi bi-hospital me-2"></i>Gestion des Laboratoires</h4>
        <button className="btn btn-primary" onClick={() => { setEditingLab(null); setForm({ name: '', address: '', city: '', phone_number: '', email: '', is_active: true }); setShowModal(true); }}>
          <i className="bi bi-plus-circle me-1"></i> Ajouter
        </button>
      </div>

      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-3"><div className="card border-0 shadow-sm p-3"><h6 className="text-muted small">Total Labs</h6><h3 className="mb-0">{stats.total_labs}</h3></div></div>
          <div className="col-md-3"><div className="card border-0 shadow-sm p-3"><h6 className="text-muted small">Types d'Analyses</h6><h3 className="mb-0">{stats.total_tests}</h3></div></div>
          <div className="col-md-3"><div className="card border-0 shadow-sm p-3"><h6 className="text-muted small">Total Demandes</h6><h3 className="mb-0">{stats.total_requests}</h3></div></div>
          <div className="col-md-3"><div className="card border-0 shadow-sm p-3 text-success"><h6 className="text-muted small">Revenus (Mois)</h6><h3 className="mb-0">{parseFloat(stats.month_revenue).toFixed(3)} TND</h3></div></div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? <div className="text-center py-5"><div className="spinner-border"></div></div> : (
            <table className="table table-hover mb-0">
              <thead className="table-light"><tr><th>Nom</th><th>Ville</th><th>Téléphone</th><th>CNAM</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {labs.map(lab => (
                  <tr key={lab.id}>
                    <td className="fw-semibold">{lab.name}</td>
                    <td>{lab.city_name || '-'}</td>
                    <td>{lab.phone_number}</td>
                    <td>{lab.cnam_affiliated ? <span className="badge bg-success">Oui</span> : <span className="badge bg-secondary">Non</span>}</td>
                    <td><span className={`badge bg-${lab.is_active ? 'success' : 'danger'}`}>{lab.is_active ? 'Actif' : 'Inactif'}</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(lab)}><i className="bi bi-pencil"></i></button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(lab.id)}><i className="bi bi-trash"></i></button>
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
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingLab ? 'Modifier' : 'Ajouter'} un Laboratoire</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Nom *</label>
                    <input type="text" className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Adresse *</label>
                    <textarea className="form-control" required value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}></textarea>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">ID Ville *</label>
                      <input type="number" className="form-control" required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Ex: 1" />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Téléphone *</label>
                      <input type="text" className="form-control" required value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} placeholder="+216XXXXXXXX" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email *</label>
                    <input type="email" className="form-control" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                    <label className="form-check-label">Laboratoire Actif</label>
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

export default SuperAdminLabs;