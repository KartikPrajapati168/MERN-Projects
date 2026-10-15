import { Link } from "react-router-dom";

// props: job (object)
export default function JobCard({ job }) {
  return (
    <div className="card job-card">
      <div className="job-card-top">
        <h3>{job.title}</h3>
        <span className="salary-tag">{job.salary}</span>
      </div>
      <p className="job-meta">
        {job.company} • {job.location} • {job.experience}
      </p>
      <div className="skill-tags">
        {job.skills.slice(0, 4).map((skill) => (
          <span key={skill} className="skill-tag">
            {skill}
          </span>
        ))}
      </div>
      <Link to={`/jobs/${job._id}`} className="btn-link">
        View Details →
      </Link>
    </div>
  );
}
