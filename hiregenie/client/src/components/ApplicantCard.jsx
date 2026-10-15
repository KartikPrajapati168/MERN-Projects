// props: application (object), onStatusChange (function)
export default function ApplicantCard({ application, onStatusChange }) {
  const { candidate, resumeFileName, coverNote, status, _id } = application;

  return (
    <div className="card applicant-card">
      <div>
        <h4>{candidate?.name}</h4>
        <p className="job-meta">{candidate?.email}</p>
        {resumeFileName && <p className="note">📄 {resumeFileName}</p>}
        {coverNote && <p className="note">"{coverNote}"</p>}
      </div>

      <div className="applicant-actions">
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
