import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function PharmacistPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  // États IA
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState(null);

  useEffect(() => {
    api.get('/pharmacy/pharmacist/prescriptions/')
      .then(r => setPrescriptions(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAskAI = async () => {
    if (!selectedPrescription?.items?.length) return;

    setAiLoading(true);
    setAiAdvice(null);

    try {
      const res = await api.post('/ai/pharmacy-advisor/', {
        medications: selectedPrescription.items.map(item => ({
          name: item.medication_name,
          dosage: item.medication_dosage,
          form: '',
          dosage_instruction: item.dosage_instruction || '',
          quantity: item.quantity_prescribed
        })),
        context: 'prescription'
      });
      setAiAdvice(res.data);
    } catch (err) {
      alert(err.response?.data?.error || "Erreur lors de l'analyse IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedPrescription(null);
    setAiAdvice(null);
  };

  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">
          <i className="bi bi-prescription2 me-2 text-primary"></i>
          Ordonnances Reçues
        </h2>
        <p className="text-muted mb-0">Ordonnances en attente de délivrance.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
            </div>
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
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">
                        Aucune ordonnance en attente.
                      </td>
                    </tr>
                  ) : (
                    prescriptions.map(pres => (
                      <tr key={pres.id}>
                        <td className="small">
                          {new Date(pres.prescription_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="fw-semibold">{pres.patient_name}</td>
                        <td>{pres.doctor_name}</td>
                        <td>
                          <span className="badge bg-warning text-dark">
                            {pres.status_display}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => {
                              setSelectedPrescription(pres);
                              setAiAdvice(null);
                            }}
                          >
                            <i className="bi bi-eye me-1"></i>Voir détails
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL ORDONNANCE + IA */}
      {selectedPrescription && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow" style={{ borderRadius: '16px' }}>
              <div
                className="modal-header bg-primary text-white"
                style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}
              >
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-file-earmark-medical me-2"></i>
                  Ordonnance
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={closeModal}
                ></button>
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

                <h6 className="fw-bold mt-3 mb-2">Médicaments prescrits :</h6>
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
                          <td className="fw-semibold">
                            {item.medication_name}{' '}
                            <small className="text-muted">({item.medication_dosage})</small>
                          </td>
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

                {/* ========== BOUTON IA ========== */}
                <div className="d-flex justify-content-between align-items-center mt-4 p-3 bg-light rounded border">
                  <div>
                    <h6 className="mb-1 fw-bold">
                      <i className="bi bi-stars text-primary me-2"></i>
                      Assistant IA Pharmacien
                    </h6>
                    <small className="text-muted">
                      Vérifie les interactions et génère des conseils patient.
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={handleAskAI}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Analyse...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-magic me-2"></i>
                        Analyser avec l'IA
                      </>
                    )}
                  </button>
                </div>

                {/* ========== RÉSULTAT IA ========== */}
                {aiAdvice && (
                  <div className="card border-primary mt-3 shadow-sm">
                    <div className="card-header bg-primary bg-opacity-10 text-primary fw-bold py-2">
                      <i className="bi bi-stars me-2"></i>
                      Conseil IA
                    </div>
                    <div className="card-body">
                      {aiAdvice.interactions && (
                        <div className="alert alert-warning py-2">
                          <strong>
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            Interactions :
                          </strong>{' '}
                          {aiAdvice.interactions}
                        </div>
                      )}

                      <h6 className="fw-bold">Conseils patient</h6>
                      <p style={{ whiteSpace: 'pre-line' }} className="mb-3">
                        {aiAdvice.patient_advice}
                      </p>

                      <h6 className="fw-bold">Précautions</h6>
                      <p style={{ whiteSpace: 'pre-line' }} className="mb-3">
                        {aiAdvice.precautions}
                      </p>

                      <div className="p-2 bg-light rounded small text-muted">
                        <strong>Résumé pharmacien :</strong> {aiAdvice.summary}
                      </div>

                      <div className="mt-3 text-center small text-muted">
                        <i className="bi bi-shield-exclamation me-1"></i>
                        Généré par IA à titre indicatif. Vérifiez toujours les informations.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}