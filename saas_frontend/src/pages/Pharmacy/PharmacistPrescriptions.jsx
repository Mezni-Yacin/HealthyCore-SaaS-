import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function PharmacistPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  useEffect(() => {
    api.get('/pharmacy/pharmacist/prescriptions/')
      .then(r => setPrescriptions(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <h2 className="fw-bold mb-1"><i className="bi bi-prescription2 me-2 text-primary"></i>Ordonnances Reçues</h2>
        <p className="text-muted mb-0">Ordonnances en attente de délivrance.</p>
      </div>

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
                    <th>Médecin</th>
                    <th>Statut</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-4 text-muted">Aucune ordonnance en attente.</td></tr>
                  ) : prescriptions.map(pres => (
                    <tr key={pres.id}>
                      <td className="small">{new Date(pres.prescription_date).toLocaleDateString('fr-FR')}</td>
                      <td className="fw-semibold">{pres.patient_name}</td>
                      <td>{pres.doctor_name}</td>
                      <td><span className="badge bg-warning text-dark">{pres.status_display}</span></td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedPrescription(pres)}>
                          <i className="bi bi-eye me-1"></i>Voir détails
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

      {selectedPrescription && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-file-earmark-medical me-2"></i>Ordonnance</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedPrescription(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Patient</p>
                    <h6 className="fw-bold">{selectedPrescription.patient_name}</h6>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-1 text-muted small">Prescrit par</p>
                    <h6 className="fw-bold">Dr. {selectedPrescription.doctor_name}</h6>
                  </div>
                </div>

                <h6 className="fw-bold mt-4 mb-2">Médicaments prescrits :</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th>Médicament</th>
                        <th>Posologie</th>
                        <th className="text-center">Qté</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPrescription.items.map(item => (
                        <tr key={item.id}>
                          <td className="fw-semibold">{item.medication_name} <small className="text-muted">({item.medication_dosage})</small></td>
                          <td>{item.dosage_instruction}</td>
                          <td className="text-center">{item.quantity_prescribed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedPrescription.notes && (
                  <div className="alert alert-light border mt-3">
                    <strong>Notes du médecin :</strong> {selectedPrescription.notes}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedPrescription(null)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}