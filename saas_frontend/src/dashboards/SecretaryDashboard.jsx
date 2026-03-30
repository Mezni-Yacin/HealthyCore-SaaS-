// src/dashboards/SecretaryDashboard.jsx
export default function SecretaryDashboard() {
  return (
    <div className="container py-4">
      <h2 className="h3 fw-bold text-primary mb-4">Espace Secrétaire</h2>

      <div className="row g-4">
        <div className="col-12 col-md-6">
          <div className="card border-success shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title">Rendez-vous aujourd'hui</h5>
              <p className="display-4 fw-bold text-success mb-0">18</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card border-primary shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title">Patients en salle d'attente</h5>
              <p className="display-4 fw-bold text-primary mb-0">4</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-muted">
        Gestion agenda, accueil, rappels, facturation...
      </p>
    </div>
  );
}