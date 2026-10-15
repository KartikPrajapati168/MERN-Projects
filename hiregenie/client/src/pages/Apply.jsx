import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { KEYS, readStorage, writeStorage, genId } from "../utils/storage";

export default function Apply({ user }) {
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

  // save the draft as they type, so a refresh doesn't lose it.
  // sessionStorage clears when the tab closes, unlike localStorage.
  useEffect(() => {
    sessionStorage.setItem(`draft-cover-${jobId}`, coverNote);
  }, [coverNote, jobId]);

  const handleFileChange = () => {
    const file = fileInputRef.current.files[0];
    setFileName(file ? file.name : "");
    console.log("[Apply] resume file selected:", file?.name);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const file = fileInputRef.current.files[0];
    if (!file) {
      setError("Please select a resume file (PDF/DOC/DOCX)");
      return;
    }

    const applications = readStorage(KEYS.APPLICATIONS, []);
    const alreadyApplied = applications.some(
      (a) => a.jobId === jobId && a.candidateId === user.id
    );
    if (alreadyApplied) {
      setError("You already applied to this job");
      return;
    }

    setLoading(true);
    console.log("[Apply] submitting application for job:", jobId);

    setTimeout(() => {
      // no backend to actually store the file, so we just keep the file name
      const newApplication = {
        _id: genId(),
        jobId,
        candidateId: user.id,
        resumeFileName: file.name,
        coverNote,
        status: "Applied",
        appliedAt: new Date().toISOString(),
      };

      writeStorage(KEYS.APPLICATIONS, [...applications, newApplication]);
      console.log("[Apply] application saved:", newApplication);

      sessionStorage.removeItem(`draft-cover-${jobId}`);
      setSuccess(true);
      setLoading(false);
      setTimeout(() => navigate("/dashboard"), 1200);
    }, 400);
  };

  if (success) {
    return (
      <div className="page-container narrow">
        <p className="alert-success">Application submitted! Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page-container narrow">
      <form className="card auth-form" onSubmit={handleSubmit}>
        <h2>Apply for this role</h2>
        {error && <div className="alert-error">{error}</div>}

        <label>Resume (PDF/DOC/DOCX)</label>
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
