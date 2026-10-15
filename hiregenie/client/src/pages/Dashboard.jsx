import { useEffect, useState } from "react";
import { KEYS, readStorage } from "../utils/storage";

export default function Dashboard({ user }) {
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const allApplications = readStorage(KEYS.APPLICATIONS, []);
    const allJobs = readStorage(KEYS.JOBS, []);

    // attach job details to each application manually (no backend join here)
    const mine = allApplications
      .filter((a) => a.candidateId === user.id)
      .map((a) => ({ ...a, job: allJobs.find((j) => j._id === a.jobId) }));

    console.log("[Dashboard] applications for", user.name, ":", mine);
    setApplications(mine);
  }, [user]);

  const statusColor = {
    Applied: "gray",
    Shortlisted: "blue",
    Offered: "green",
    Rejected: "red",
  };

  return (
    <div className="page-container">
      <h1>Welcome, {user.name}</h1>
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

      {applications.length === 0 && (
        <p className="empty-state">You haven't applied to any jobs yet. Go find one!</p>
      )}

      <div className="application-list">
        {applications.map((app) => (
          <div key={app._id} className="card application-row">
            <div>
              <h4>{app.job?.title || "Job no longer available"}</h4>
              <p className="job-meta">{app.job?.company} • {app.job?.location}</p>
            </div>
            <span className={`status-badge status-${statusColor[app.status]}`}>{app.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
