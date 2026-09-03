import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="page-container narrow">
      <div className="card" style={{ textAlign: "center" }}>
        <h1>404</h1>
        <p className="subtitle">Page not found. It might have been moved or never existed.</p>
        <Link to="/" className="btn-primary btn-link-block">Back to Jobs</Link>
      </div>
    </div>
  );
}
