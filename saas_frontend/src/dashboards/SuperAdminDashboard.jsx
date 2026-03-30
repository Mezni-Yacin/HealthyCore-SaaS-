// src/dashboards/SuperAdminDashboard.jsx
export default function SuperAdminDashboard() {
  return (
    <div className="container py-4">
      <h2 className="h3 fw-bold text-primary mb-4">Super Administrateur</h2>

      <div className="row g-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-primary shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title text-primary">Utilisateurs totaux</h5>
              <p className="display-4 fw-bold text-primary mb-0">248</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-info shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title text-info">Cabinets actifs</h5>
              <p className="display-4 fw-bold text-info mb-0">37</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-success shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title text-success">Abonnements premium</h5>
              <p className="display-4 fw-bold text-success mb-0">14</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card border-warning shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title text-warning">Signalements en attente</h5>
              <p className="display-4 fw-bold text-warning mb-0">3</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-muted fst-italic">
        Gestion globale de la plateforme – stats, utilisateurs, plans, audits...
      </p>
    </div>
  );
}