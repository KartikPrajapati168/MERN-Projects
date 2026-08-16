const express = require("express");
const Job = require("../models/Job");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/jobs  -> list all jobs (public)
router.get("/", async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/jobs/mine -> jobs posted by the logged-in recruiter
router.get("/mine", requireAuth, requireRole("recruiter"), async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/jobs/:id -> single job detail (public)
router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/jobs -> recruiter posts a job
router.post("/", requireAuth, requireRole("recruiter"), async (req, res) => {
  try {
    const { title, company, location, experience, salary, skills, description } = req.body;
    if (!title || !company || !location || !experience || !salary || !skills || !description) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const job = await Job.create({
      title,
      company,
      location,
      experience,
      salary,
      skills: Array.isArray(skills) ? skills : skills.split(",").map((s) => s.trim()),
      description,
      postedBy: req.user.id,
    });

    res.status(201).json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
