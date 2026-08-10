// pages/PaymentCancel.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="container py-5 text-center">
      <div className="card border-0 shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
        <div className="card-body p-5">
          <div className="text-warning mb-4">
            <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '5rem' }}></i>
          </div>
          <h2 className="mb-3">Paiement annulé</h2>
          <p className="text-muted">
            Votre paiement a été annulé. Aucun montant n'a été débité.
          </p>
          <button 
            className="btn btn-primary mt-3"
            onClick={() => navigate('/invoices')}
          >
            <i className="bi bi-receipt me-2"></i>
            Retour aux factures
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;