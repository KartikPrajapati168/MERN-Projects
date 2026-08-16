const express = require("express");
const fetch = require("node-fetch");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Simple rule-based fallback so the demo NEVER breaks even if Gemini
// quota/network fails. This runs only if the real API call fails.
function fallbackFeedback(resumeText, jobSkills) {
  const skillsList = jobSkills
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const resumeLower = resumeText.toLowerCase();

  const missing = skillsList.filter((skill) => !resumeLower.includes(skill));
  const matched = skillsList.length - missing.length;
  const score = skillsList.length ? Math.round((matched / skillsList.length) * 100) : 50;

  return (
    `ATS Match Score: ${score}/100\n\n` +
    `Matched skills: ${matched}/${skillsList.length}\n\n` +
    `Missing skills: ${missing.length ? missing.join(", ") : "None"}\n\n` +
    `Suggestion: Add the missing skills above to your resume with real project examples to improve your match score.`
  );
}

// POST /api/ai/resume-feedback
router.post("/resume-feedback", requireAuth, async (req, res) => {
  const { resumeText, jobSkills } = req.body;

  if (!resumeText || !jobSkills) {
    return res.status(400).json({ success: false, message: "resumeText and jobSkills are required" });
  }

  const prompt =
    `You are an ATS (Applicant Tracking System) resume screener.\n` +
    `Resume text:\n${resumeText}\n\n` +
    `Required job skills: ${jobSkills}\n\n` +
    `Give: 1) an ATS match score out of 100, 2) list of missing skills, ` +
    `3) two short improvement suggestions. Keep the whole answer under 120 words, plain text, no markdown.`;

  try {
    if (!process.env.GEMINI_API_KEY) throw new Error("No Gemini API key configured");

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) throw new Error(`Gemini responded with ${response.status}`);

    const data = await response.json();
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) throw new Error("Empty response from Gemini");

    return res.json({ success: true, feedback: aiText, source: "gemini" });
  } catch (err) {
    console.error("Gemini call failed, using fallback:", err.message);
    return res.json({
      success: true,
      feedback: fallbackFeedback(resumeText, jobSkills),
      source: "fallback",
    });
  }
});

module.exports = router;
