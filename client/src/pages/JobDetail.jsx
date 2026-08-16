import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../utils/api";

export default function JobDetail({ user }) {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/jobs/${id}`)
      .then((res) => setJob(res.data.job))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
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
