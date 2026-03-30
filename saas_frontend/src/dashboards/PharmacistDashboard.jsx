// src/dashboards/PharmacistDashboard.jsx
export default function PharmacistDashboard() {
  return (
    <div className="container py-4">
      <h2 className="h3 fw-bold text-primary mb-4">Espace Pharmacien</h2>

      <div className="row g-4">
        <div className="col-12 col-md-4">
          <div className="card border-success shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title text-success">Ordonnances aujourd'hui</h5>
              <p className="display-4 fw-bold text-success mb-0">31</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-danger shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title text-danger">Stock critique</h5>
              <p className="display-4 fw-bold text-danger mb-0">4</p>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-primary shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title text-primary">Remboursements CNAM</h5>
              <p className="display-4 fw-bold text-primary mb-0">19</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-muted">
        Ordonnances, stock, facturation, interactions médecins...
      </p>
    </div>
  );
}