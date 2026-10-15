import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { KEYS, readStorage } from "../utils/storage";

export default function JobDetail({ user }) {
  const { id } = useParams(); // useParams: read the :id from the route
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const jobs = readStorage(KEYS.JOBS, []);
    const found = jobs.find((j) => j._id === id);
    console.log("[JobDetail] looking up job id:", id, "-> found:", found);
    setJob(found || null);
    setLoading(false);
  }, [id]);

  if (loading) return <p className="empty-state">Loading job...</p>;
  if (!job) return <p className="empty-state">Job not found.</p>;

  return (
    <div className="page-container narrow">
      <div className="card job-detail">
        <h1>{job.title}</h1>
        <p className="job-meta">
          {job.company} • {job.location} • {job.experience} • {job.salary}
        </p>

        <div className="skill-tags">
          {job.skills.map((s) => (
            <span key={s} className="skill-tag">{s}</span>
          ))}
        </div>

        <h3>Job Description</h3>
        <p className="description">{job.description}</p>

        {user?.role === "candidate" ? (
          <Link to={`/apply/${job._id}`} className="btn-primary btn-link-block">
            Apply Now
          </Link>
        ) : !user ? (
          <Link to="/login" className="btn-primary btn-link-block">
            Login to Apply
          </Link>
        ) : (
          <p className="note">Recruiters cannot apply to jobs.</p>
        )}
      </div>
    </div>
  );
}
