import { useState } from "react";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// used when the Gemini call fails (no key, network down, quota hit, etc)
function fallbackFeedback(resumeText, jobSkills) {
  const skillsList = jobSkills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const resumeLower = resumeText.toLowerCase();
  const missing = skillsList.filter((skill) => !resumeLower.includes(skill));
  const matched = skillsList.length - missing.length;
  const score = skillsList.length ? Math.round((matched / skillsList.length) * 100) : 50;

  return (
    `ATS Match Score: ${score}/100\n\n` +
    `Matched skills: ${matched}/${skillsList.length}\n\n` +
    `Missing skills: ${missing.length ? missing.join(", ") : "None"}\n\n` +
    `Suggestion: Add the missing skills above to your resume with real project examples.`
  );
}

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
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const prompt =
      `You are an ATS (Applicant Tracking System) resume screener.\n` +
      `Resume text:\n${resumeText}\n\nRequired job skills: ${jobSkills}\n\n` +
      `Give: 1) an ATS match score out of 100, 2) missing skills, ` +
      `3) two short improvement suggestions. Keep it under 120 words, plain text, no markdown.`;

    console.log("[AiFeedback] calling Gemini with prompt:", prompt);

    try {
      if (!apiKey) throw new Error("No Gemini API key configured (VITE_GEMINI_API_KEY missing)");

      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });

      if (!response.ok) throw new Error(`Gemini responded with ${response.status}`);

      const data = await response.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiText) throw new Error("Empty response from Gemini");

      console.log("[AiFeedback] Gemini response:", aiText);
      setFeedback(aiText);
      setSource("gemini");
    } catch (err) {
      console.warn("[AiFeedback] Gemini call failed, using fallback:", err.message);
      setFeedback(fallbackFeedback(resumeText, jobSkills));
      setSource("fallback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container narrow">
      <div className="card auth-form">
        <h2>AI Resume Feedback</h2>
        <p className="subtitle">
          Paste your resume text and the job's required skills to get an instant ATS-style review.
        </p>

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
