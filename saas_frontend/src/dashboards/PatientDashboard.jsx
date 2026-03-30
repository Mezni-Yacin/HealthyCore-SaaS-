// src/dashboards/PatientDashboard.jsx
export default function PatientDashboard() {
  return (
    <div className="container py-4">
      <h2 className="h3 fw-bold text-primary mb-4">Mon espace santé</h2>

      <div className="row g-4">
        <div className="col-12 col-md-6">
          <div className="card border-primary shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title text-primary">Prochain rendez-vous</h5>
              <p className="fs-5 mt-2">Mer. 4 mars – 11:30 Dr. Amine</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card border-success shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title text-success">Dernière ordonnance</h5>
              <p className="fs-5 mt-2">15 fév. 2026 – Valable jusqu'au 15/05</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-muted">
        Historique, documents, rappels, prise de RDV...
      </p>
    </div>
  );
}