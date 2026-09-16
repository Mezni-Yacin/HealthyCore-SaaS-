import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export default function PharmacistPOS() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  // États IA
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState(null);

  const fetchStock = useCallback(() => {
    setLoading(true);
    api.get('/pharmacy/pharmacist/stock/')
      .then(r => setStock(r.data || []))
      .catch(() => setMessage({ type: 'danger', text: 'Erreur de chargement du stock.' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const filteredStock = stock.filter(s =>
    s.medication_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.medication_dosage?.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item) => {
    const existing = cart.find(c => c.medication_id === item.medication);
    if (existing) {
      if (existing.quantity < item.quantity) {
        setCart(cart.map(c =>
          c.medication_id === item.medication
            ? { ...c, quantity: c.quantity + 1 }
            : c
        ));
      } else {
        setMessage({ type: 'warning', text: `Stock maximum atteint pour ${item.medication_name}.` });
      }
    } else {
      if (item.quantity > 0) {
        setCart([
          ...cart,
          {
            medication_id: item.medication,
            name: `${item.medication_name} ${item.medication_dosage}`,
            quantity: 1,
            unit_price: parseFloat(item.selling_price),
            max_stock: item.quantity
          }
        ]);
      }
    }
    // Reset les conseils IA quand le panier change
    setAiAdvice(null);
  };

  const updateQty = (medId, newQty) => {
    setCart(cart.map(c => {
      if (c.medication_id === medId) {
        const qty = Math.max(1, Math.min(newQty, c.max_stock));
        return { ...c, quantity: qty };
      }
      return c;
    }));
    setAiAdvice(null);
  };

  const removeFromCart = (medId) => {
    setCart(cart.filter(c => c.medication_id !== medId));
    setAiAdvice(null);
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  // ========== AGENT IA ==========
  const handleAskCartAI = async () => {
    if (cart.length === 0) return;

    setAiLoading(true);
    setAiAdvice(null);

    try {
      const res = await api.post('/ai/pharmacy-advisor/', {
        medications: cart.map(item => ({
          name: item.name,
          dosage: '',
          form: '',
          dosage_instruction: '',
          quantity: item.quantity
        })),
        context: 'dispensation'
      });
      setAiAdvice(res.data);
    } catch (err) {
      setMessage({
        type: 'danger',
        text: err.response?.data?.error || "Erreur lors de l'analyse IA."
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setProcessing(true);
    setMessage(null);

    const payload = {
      payment_method: paymentMethod,
      items: cart.map(c => ({
        medication_id: c.medication_id,
        quantity: c.quantity,
        unit_price: c.unit_price.toFixed(3)
      }))
    };

    api.post('/pharmacy/pharmacist/create-sale/', payload)
      .then(() => {
        setMessage({ type: 'success', text: 'Vente encaissée avec succès !' });
        setCart([]);
        setAiAdvice(null);
        fetchStock();
      })
      .catch(err => {
        setMessage({
          type: 'danger',
          text: err.response?.data?.detail || "Erreur lors de la vente."
        });
      })
      .finally(() => setProcessing(false));
  };

  return (
    <div className="container-fluid py-4" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div className="mb-4">
        <h2 className="fw-bold mb-1">
          <i className="bi bi-cart-plus me-2 text-primary"></i>
          Point de Vente (Caisse)
        </h2>
        <p className="text-muted mb-0">Recherchez un médicament et ajoutez-le au panier.</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type} alert-dismissible fade show`}>
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      <div className="row g-4">
        {/* ========== LISTE DES MÉDICAMENTS ========== */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
            <div className="card-header bg-white p-3">
              <div className="input-group">
                <span className="input-group-text bg-light border-0">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-0 bg-light"
                  placeholder="Rechercher un médicament..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="card-body p-0" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary"></div>
                </div>
              ) : filteredStock.length === 0 ? (
                <div className="text-center py-5 text-muted">Aucun médicament trouvé.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Médicament</th>
                        <th className="text-center">Stock</th>
                        <th className="text-end">Prix Vente</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStock.map(item => (
                        <tr
                          key={item.id}
                          className={item.quantity === 0 ? 'table-secondary opacity-50' : ''}
                        >
                          <td>
                            <div className="fw-bold">
                              {item.medication_name}{' '}
                              <span className="text-muted small">({item.medication_dosage})</span>
                            </div>
                            <small className={`text-${item.is_expired ? 'danger' : 'muted'}`}>
                              {item.is_expired
                                ? 'Périmé'
                                : `Exp: ${new Date(item.expiry_date).toLocaleDateString('fr-FR')}`}
                            </small>
                          </td>
                          <td className="text-center">
                            <span
                              className={`badge bg-${item.quantity <= 10 ? 'danger' : 'light text-dark'}`}
                            >
                              {item.quantity}
                            </span>
                          </td>
                          <td className="text-end fw-bold">
                            {Number(item.selling_price).toFixed(3)} TND
                          </td>
                          <td className="text-center">
                            <button
                              className="btn btn-sm btn-primary"
                              disabled={item.quantity === 0 || item.is_expired}
                              onClick={() => addToCart(item)}
                            >
                              <i className="bi bi-plus-lg"></i> Ajouter
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
        </div>

        {/* ========== PANIER + IA ========== */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm sticky-top" style={{ top: '20px', borderRadius: 16 }}>
            <div className="card-header bg-primary text-white py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-cart3 me-2"></i>Panier
              </h5>
              {cart.length > 0 && (
                <button
                  className="btn btn-sm btn-light"
                  onClick={() => {
                    setCart([]);
                    setAiAdvice(null);
                  }}
                >
                  Vider
                </button>
              )}
            </div>

            <div className="card-body p-0" style={{ maxHeight: '35vh', overflowY: 'auto' }}>
              {cart.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-basket fs-1 d-block mb-2"></i>
                  Panier vide
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {cart.map(item => (
                    <li key={item.medication_id} className="list-group-item p-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="fw-semibold small">{item.name}</span>
                        <button
                          className="btn btn-sm btn-link text-danger p-0"
                          onClick={() => removeFromCart(item.medication_id)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="input-group input-group-sm" style={{ width: '120px' }}>
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => updateQty(item.medication_id, item.quantity - 1)}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            className="form-control text-center"
                            value={item.quantity}
                            readOnly
                          />
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => updateQty(item.medication_id, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        <span className="fw-bold">
                          {(item.quantity * item.unit_price).toFixed(3)} TND
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ========== SECTION IA ========== */}
            {cart.length > 0 && (
              <div className="p-3 border-top bg-light">
                <button
                  className="btn btn-outline-primary btn-sm w-100 mb-2"
                  onClick={handleAskCartAI}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Analyse IA...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-stars me-2"></i>
                      Conseils IA sur ce panier
                    </>
                  )}
                </button>

                {aiAdvice && (
                  <div className="alert alert-light border small mb-0">
                    {aiAdvice.interactions && (
                      <div className="text-warning mb-2">
                        <strong>
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          Interactions :
                        </strong>{' '}
                        {aiAdvice.interactions}
                      </div>
                    )}
                    <div style={{ whiteSpace: 'pre-line' }}>
                      <strong>Conseils patient :</strong>
                      <br />
                      {aiAdvice.patient_advice}
                    </div>
                    {aiAdvice.precautions && (
                      <div className="mt-2" style={{ whiteSpace: 'pre-line' }}>
                        <strong>Précautions :</strong>
                        <br />
                        {aiAdvice.precautions}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========== TOTAL + PAIEMENT ========== */}
            <div className="card-footer bg-white p-3">
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted">
                  Méthode de paiement
                </label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Espèces</option>
                  <option value="card">Carte Bancaire</option>
                  <option value="cnam">CNAM</option>
                  <option value="insurance">Assurance</option>
                </select>
              </div>

              <div className="d-flex justify-content-between mb-3">
                <span className="fw-bold">Total :</span>
                <span className="fw-bold text-primary fs-4">
                  {totalAmount.toFixed(3)} TND
                </span>
              </div>

              <button
                className="btn btn-success btn-lg w-100"
                disabled={cart.length === 0 || processing}
                onClick={handleCheckout}
              >
                {processing ? (
                  <span className="spinner-border spinner-border-sm"></span>
                ) : (
                  <>
                    <i className="bi bi-check2-circle me-2"></i>
                    Encaisser
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}