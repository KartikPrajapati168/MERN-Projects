import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { KEYS, readStorage } from "../utils/storage";

export default function RecruiterDashboard({ user }) {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);

  // grab this recruiter's jobs and applications for them
  useEffect(() => {
    const allJobs = readStorage(KEYS.JOBS, []);
    const allApplications = readStorage(KEYS.APPLICATIONS, []);

    const myJobs = allJobs.filter((j) => j.postedBy === user.id);
    const myJobIds = myJobs.map((j) => j._id);
    const myApplications = allApplications.filter((a) => myJobIds.includes(a.jobId));

    console.log("[RecruiterDashboard] my jobs:", myJobs);
    console.log("[RecruiterDashboard] applications for my jobs:", myApplications);

    setJobs(myJobs);
    setApplications(myApplications);
  }, [user]);

  // derive the stat counts, only recalculated when jobs/applications change
  const stats = useMemo(() => {
    return {
      totalJobs: jobs.length,
      totalApplications: applications.length,
      shortlisted: applications.filter((a) => a.status === "Shortlisted").length,
      offered: applications.filter((a) => a.status === "Offered").length,
      rejected: applications.filter((a) => a.status === "Rejected").length,
      pending: applications.filter((a) => a.status === "Applied").length,
    };
  }, [jobs, applications]);

  return (
    <div className="page-container">
      <h1>Welcome, {user.name}</h1>
      <p className="subtitle">{user.company} • Recruiter Overview</p>

      <div className="stats-row wrap">
        <div className="stat-card"><span className="stat-num">{stats.totalJobs}</span><span>Jobs Posted</span></div>
        <div className="stat-card"><span className="stat-num">{stats.totalApplications}</span><span>Applications</span></div>
        <div className="stat-card"><span className="stat-num">{stats.pending}</span><span>Pending Review</span></div>
        <div className="stat-card"><span className="stat-num">{stats.shortlisted}</span><span>Shortlisted</span></div>
        <div className="stat-card"><span className="stat-num">{stats.offered}</span><span>Offers Sent</span></div>
        <div className="stat-card"><span className="stat-num">{stats.rejected}</span><span>Rejected</span></div>
      </div>

      <div className="dashboard-actions">
        <Link to="/recruiter/post-job" className="btn-primary btn-link-block">Post a New Job</Link>
        <Link to="/recruiter/applicants" className="btn-link-block secondary">View Applicants</Link>
      </div>

      <h3 className="section-title">Your Job Postings</h3>
      {jobs.length === 0 && <p className="empty-state">You haven't posted any jobs yet.</p>}

      <div className="application-list">
        {jobs.map((job) => {
          const jobApplicationCount = applications.filter((a) => a.jobId === job._id).length;
          return (
            <div key={job._id} className="card application-row">
              <div>
                <h4>{job.title}</h4>
                <p className="job-meta">{job.location} • {job.salary}</p>
              </div>
              <span className="status-badge status-blue">{jobApplicationCount} applicants</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
