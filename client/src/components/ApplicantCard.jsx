// props: application (object), onStatusChange (function)
export default function ApplicantCard({ application, onStatusChange }) {
  const { candidate, resumeUrl, status, _id } = application;

  return (
    <div className="card applicant-card">
      <div>
        <h4>{candidate?.name}</h4>
        <p className="job-meta">{candidate?.email}</p>
        <div className="skill-tags">
          {(candidate?.skills || []).map((s) => (
            <span key={s} className="skill-tag">{s}</span>
          ))}
        </div>
      </div>

      <div className="applicant-actions">
        <a href={`http://localhost:5000${resumeUrl}`} target="_blank" rel="noreferrer" className="btn-link">
          View Resume
        </a>
        <select value={status} onChange={(e) => onStatusChange(_id, e.target.value)}>
          <option>Applied</option>
          <option>Shortlisted</option>
          <option>Rejected</option>
          <option>Offered</option>
        </select>
      </div>
    </div>
  );
}
