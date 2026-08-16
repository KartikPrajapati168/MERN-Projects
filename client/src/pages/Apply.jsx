import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function Apply() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const fileInputRef = useRef(null); // useRef: direct access to the file input DOM node
  const [fileName, setFileName] = useState("");
  const [coverNote, setCoverNote] = useState(
    () => sessionStorage.getItem(`draft-cover-${jobId}`) || ""
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // sessionStorage: auto-save the cover note draft as the user types,
  // so it survives an accidental refresh but clears when the tab is closed
  useEffect(() => {
    sessionStorage.setItem(`draft-cover-${jobId}`, coverNote);
  }, [coverNote, jobId]);

  const handleFileChange = () => {
    const file = fileInputRef.current.files[0];
    setFileName(file ? file.name : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const file = fileInputRef.current.files[0];
    if (!file) {
      setError("Please select a resume file (PDF/DOC/DOCX)");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("coverNote", coverNote);

    setLoading(true);
    try {
      await api.post(`/applications/${jobId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      sessionStorage.removeItem(`draft-cover-${jobId}`);
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <div className="page-container narrow"><p className="alert-success">Application submitted! Redirecting to your dashboard...</p></div>;
  }

  return (
    <div className="page-container narrow">
      <form className="card auth-form" onSubmit={handleSubmit}>
        <h2>Apply for this role</h2>
        {error && <div className="alert-error">{error}</div>}

        <label>Resume (PDF/DOC/DOCX, max 5MB)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
        />
        {fileName && <p className="note">Selected: {fileName}</p>}

        <label>Cover Note (optional)</label>
        <textarea
          rows={5}
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
          placeholder="Why are you a good fit for this role?"
        />

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Submitting..." : "Submit Application"}
        </button>
      </form>
    </div>
  );
}
