import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Récupérer les paramètres envoyés par Stripe
    const sessionId = searchParams.get('session_id');
    const invoiceId = searchParams.get('invoice');

    const timer = setTimeout(() => {
      // Rediriger vers les factures EN TRANSMETTANT les paramètres
      if (sessionId && invoiceId) {
        navigate(`/invoices?session_id=${sessionId}&invoice=${invoiceId}`);
      } else {
        navigate('/invoices');
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [navigate, searchParams]);

  return (
    <div className="container py-5 text-center">
      <div className="card border-0 shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
        <div className="card-body p-5">
          <div className="text-success mb-4">
            <i className="bi bi-check-circle-fill" style={{ fontSize: '5rem' }}></i>
          </div>
          <h2 className="mb-3">Paiement réussi !</h2>
          <p className="text-muted">
            Votre paiement a été traité avec succès. Mise à jour de votre facture en cours...
          </p>
          <div className="spinner-border text-primary mt-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;