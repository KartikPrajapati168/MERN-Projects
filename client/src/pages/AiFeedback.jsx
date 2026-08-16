import { useState } from "react";
import api from "../utils/api";

export default function AiFeedback() {
  const [resumeText, setResumeText] = useState("");
  const [jobSkills, setJobSkills] = useState("");
  const [feedback, setFeedback] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!resumeText.trim() || resumeText.trim().length < 30) {
      setError("Paste at least a few lines of your resume text");
      return false;
    }
    if (!jobSkills.trim()) {
      setError("Enter the required job skills, comma separated");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFeedback("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await api.post("/ai/resume-feedback", { resumeText, jobSkills });
      setFeedback(res.data.feedback);
      setSource(res.data.source);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container narrow">
      <div className="card auth-form">
        <h2>AI Resume Feedback</h2>
        <p className="subtitle">Paste your resume text and the job's required skills to get an instant ATS-style review.</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert-error">{error}</div>}

          <label>Resume Text</label>
          <textarea
            rows={7}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume content here..."
          />

          <label>Required Job Skills (comma separated)</label>
          <input
            value={jobSkills}
            onChange={(e) => setJobSkills(e.target.value)}
            placeholder="e.g. React, Node.js, MongoDB, Docker"
          />

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Analyzing with AI..." : "Get AI Feedback"}
          </button>
        </form>

        {feedback && (
          <div className="ai-result">
            <div className="ai-result-header">
              <h4>Feedback</h4>
              <span className="note">{source === "gemini" ? "Powered by Gemini" : "Offline analysis"}</span>
            </div>
            <pre>{feedback}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
