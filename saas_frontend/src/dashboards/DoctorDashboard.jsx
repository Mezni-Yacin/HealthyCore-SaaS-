// src/dashboards/DoctorDashboard.jsx
export default function DoctorDashboard() {
  return (
    <div className="container py-4">
      <h2 className="h3 fw-bold text-primary mb-4">Espace Médecin</h2>

      <div className="row g-4">
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card border-primary shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title">Rendez-vous aujourd'hui</h5>
              <p className="display-5 fw-bold text-primary mb-0">11</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-4">
          <div className="card border-success shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title">Patients à voir</h5>
              <p className="display-5 fw-bold text-success mb-0">7</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-4">
          <div className="card border-warning shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title">Ordonnances en attente</h5>
              <p className="display-5 fw-bold text-warning mb-0">5</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-muted">
        Agenda, dossiers patients, ordonnances, téléconsultation...
      </p>
    </div>
  );
}