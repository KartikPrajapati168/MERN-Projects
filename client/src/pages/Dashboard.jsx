import { useEffect, useState } from "react";
import api from "../utils/api";

export default function Dashboard() {
  // localStorage: user persists across page refresh / browser restart
  const user = JSON.parse(localStorage.getItem("user"));
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/applications/mine")
      .then((res) => setApplications(res.data.applications))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const statusColor = {
    Applied: "gray",
    Shortlisted: "blue",
    Offered: "green",
    Rejected: "red",
  };

  return (
    <div className="page-container">
      <h1>Welcome, {user?.name}</h1>
      <p className="subtitle">Track all your job applications here.</p>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-num">{applications.length}</span>
          <span>Applied</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">
            {applications.filter((a) => a.status === "Shortlisted").length}
          </span>
          <span>Shortlisted</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">
            {applications.filter((a) => a.status === "Offered").length}
          </span>
          <span>Offers</span>
        </div>
      </div>

      {loading && <p className="empty-state">Loading applications...</p>}
      {!loading && applications.length === 0 && (
        <p className="empty-state">You haven't applied to any jobs yet. Go find one!</p>
      )}

      <div className="application-list">
        {applications.map((app) => (
          <div key={app._id} className="card application-row">
            <div>
              <h4>{app.job?.title}</h4>
              <p className="job-meta">{app.job?.company} • {app.job?.location}</p>
            </div>
            <span className={`status-badge status-${statusColor[app.status]}`}>{app.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
