// src/dashboards/LabStaffDashboard.jsx
export default function LabStaffDashboard() {
  return (
    <div className="container py-4">
      <h2 className="h3 fw-bold text-primary mb-4">Laboratoire</h2>

      <div className="row g-4">
        <div className="col-12 col-md-4">
          <div className="card border-info shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title text-info">Analyses en cours</h5>
              <p className="display-4 fw-bold text-info mb-0">22</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-danger shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title text-danger">Résultats à valider</h5>
              <p className="display-4 fw-bold text-danger mb-0">7</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-warning shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title text-warning">Urgents aujourd'hui</h5>
              <p className="display-4 fw-bold text-warning mb-0">3</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-muted">
        Liste analyses, résultats, communication médecins...
      </p>
    </div>
  );
}