// src/dashboards/AdminDashboard.jsx
export default function AdminDashboard() {
  return (
    <div className="container py-4">
      <h2 className="h3 fw-bold text-primary mb-4">Administrateur</h2>

      <div className="row g-4">
        <div className="col-12 col-md-4">
          <div className="card border-primary shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title text-primary">Cabinets à valider</h5>
              <p className="display-5 fw-bold text-primary mb-0">9</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-info shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title text-info">Médecins en attente</h5>
              <p className="display-5 fw-bold text-info mb-0">12</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-danger shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title text-danger">Plaintes récentes</h5>
              <p className="display-5 fw-bold text-danger mb-0">4</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-muted">
        Gestion des cabinets, médecins, secrétaires, modération...
      </p>
    </div>
  );
}