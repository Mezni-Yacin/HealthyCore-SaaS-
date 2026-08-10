import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function PharmacistDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pharmacyName, setPharmacyName] = useState('Pharmacie');
  const [loading, setLoading] = useState(true);
  
  const [hasPharmacy, setHasPharmacy] = useState(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({ name: '', address: '', city: '', phone_number: '', email: '' });
  const [saving, setSaving] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const pharmaRes = await api.get('/pharmacy/pharmacist/my-pharmacy/');
      if (pharmaRes.status === 200) {
        setHasPharmacy(true);
        setPharmacyName(pharmaRes.data.name);
        try {
          const statsRes = await api.get('/pharmacy/pharmacist/stats/');
          setStats(statsRes.data);
        } catch (err) {}
      }
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        setHasPharmacy(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openSetupModal = async () => {
    try {
      const res = await api.get('/pharmacy/pharmacist/cities/');
      setCities(res.data || []);
    } catch {}
    setShowSetupModal(true);
  };

  const handleCreatePharmacy = (e) => {
    e.preventDefault();
    setSaving(true);

    api.post('/pharmacy/pharmacist/create-pharmacy/', form)
      .then(() => {
        setShowSetupModal(false);
        setHasPharmacy(true);
        fetchDashboardData(); 
      })
      .catch(err => {
        // ✅ Afficher l'erreur exacte de Django
        const errors = err.response?.data;
        let msg = "Erreur lors de la création. Vérifiez les champs :\n";
        if (errors) {
            for (const key in errors) {
                msg += `- ${key}: ${errors[key]}\n`;
            }
        }
        alert(msg);
      })
      .finally(() => setSaving(false));
  };

  if (!loading && hasPharmacy === false) {
    return (
      <div className="container-fluid py-5" style={{ background: '#f8fafc', minHeight: '100vh' }}>
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card border-0 shadow-sm text-center p-5" style={{ borderRadius: 16 }}>
              <i className="bi bi-shop text-primary" style={{ fontSize: '4rem' }}></i>
              <h4 className="mt-3">Bienvenue dans votre espace</h4>
              <p className="text-muted mb-4">Pour commencer, vous devez enregistrer votre officine.</p>
              <button className="btn btn-primary btn-lg" onClick={openSetupModal}>
                <i className="bi bi-plus-circle me-2"></i>Créer ma pharmacie
              </button>
            </div>
          </div>
        </div>

        {showSetupModal && (
          <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title"><i className="bi bi-shop me-2"></i>Créer ma Pharmacie</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowSetupModal(false)}></button>
                </div>
                <form onSubmit={handleCreatePharmacy}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Nom de la pharmacie <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Pharmacie Centrale" />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Adresse <span className="text-danger">*</span></label>
                      <textarea className="form-control" required rows="2" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="10 Avenue Habib Bourguiba..." />
                    </div>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Ville <span className="text-danger">*</span></label>
                        <select className="form-select" required value={form.city} onChange={e => setForm({...form, city: e.target.value})}>
                          <option value="">-- Sélectionner --</option>
                          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Téléphone <span className="text-danger">*</span></label>
                        <input type="tel" className="form-control" required value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} placeholder="+216 XX XXX XXX" />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="contact@pharma.tn" />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowSetupModal(false)}>Annuler</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? <span className="spinner-border spinner-border-sm"></span> : 'Créer et Démarrer'}
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

  const statCards = [
    { label: 'Revenus Totaux', value: stats ? `${Number(stats.total_revenue).toFixed(3)} TND` : '0.000', icon: 'bi-cash-coin', gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', shadow: 'rgba(5, 150, 105, 0.3)' },
    { label: 'Ventes du Jour', value: stats?.today_sales_count ?? 0, icon: 'bi-bag-check', gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', shadow: 'rgba(37, 99, 235, 0.3)' },
    { label: 'Ordonnances en Attente', value: stats?.pending_prescriptions ?? 0, icon: 'bi-file-earmark-medical', gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', shadow: 'rgba(217, 119, 6, 0.3)' },
    { label: 'Alertes Stock Bas', value: stats?.low_stock_items ?? 0, icon: 'bi-exclamation-triangle', gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', shadow: 'rgba(220, 38, 38, 0.3)' },
  ];

  return (
    <div className="container-fluid py-4" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div className="mb-4">
        <h2 className="fw-bold mb-1 d-flex align-items-center"><i className="bi bi-prescription2 me-2 text-primary"></i>Tableau de Bord</h2>
        <p className="text-muted mb-0">Bienvenue sur l'espace de gestion de <strong className="text-dark">{pharmacyName}</strong></p>
      </div>

      <div className="row g-4 mb-4">
        {statCards.map((card, index) => (
          <div key={index} className="col-xl-3 col-md-6">
            <div className="card border-0 h-100" style={{ background: card.gradient, borderRadius: 16, boxShadow: `0 10px 25px -5px ${card.shadow}` }}>
              <div className="card-body d-flex align-items-center p-4 text-white">
                <div className="flex-grow-1">
                  <div className="text-white-50 small fw-semibold text-uppercase mb-2" style={{ letterSpacing: '0.5px' }}>{card.label}</div>
                  {loading ? <div className="spinner-border spinner-border-sm text-white"></div> : <h3 className="mb-0 fw-bold" style={{ fontSize: '1.75rem' }}>{card.value}</h3>}
                </div>
                <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 60, height: 60, background: 'rgba(255,255,255,0.2)' }}>
                  <i className={`bi ${card.icon}`} style={{ fontSize: '1.8rem' }}></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-12">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
            <div className="card-header bg-white border-0 py-3"><h5 className="mb-0 fw-bold"><i className="bi bi-lightning-fill text-primary me-2"></i>Actions Rapides</h5></div>
            <div className="card-body d-grid gap-3 col-lg-6 mx-auto">
              <button className="btn btn-lg d-flex align-items-center justify-content-between py-3 px-4 border-0 text-white" style={{ borderRadius: 12, background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }} onClick={() => navigate('/pharmacy-pos')}>
                <span className="d-flex align-items-center fw-semibold"><i className="bi bi-cart-plus me-3" style={{ fontSize: '1.2rem' }}></i>Ouvrir la Caisse</span>
                <i className="bi bi-arrow-right-circle"></i>
              </button>
              <button className="btn btn-lg d-flex align-items-center justify-content-between py-3 px-4 border-0 text-white" style={{ borderRadius: 12, background: 'linear-gradient(135deg, #475569, #64748b)' }} onClick={() => navigate('/pharmacy-stock')}>
                <span className="d-flex align-items-center fw-semibold"><i className="bi bi-box-seam me-3" style={{ fontSize: '1.2rem' }}></i>Gérer le Stock</span>
                <i className="bi bi-arrow-right-circle"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}