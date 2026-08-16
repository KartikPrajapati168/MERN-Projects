const express = require("express");
const Application = require("../models/Application");
const Job = require("../models/Job");
const { requireAuth, requireRole } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// POST /api/applications/:jobId -> candidate applies with resume file
router.post(
  "/:jobId",
  requireAuth,
  requireRole("candidate"),
  upload.single("resume"),
  async (req, res) => {
    try {
      const job = await Job.findById(req.params.jobId);
      if (!job) return res.status(404).json({ success: false, message: "Job not found" });
      if (!req.file) return res.status(400).json({ success: false, message: "Resume file is required" });

      const already = await Application.findOne({ job: job._id, candidate: req.user.id });
      if (already) {
        return res.status(400).json({ success: false, message: "You already applied to this job" });
      }

      const application = await Application.create({
        job: job._id,
        candidate: req.user.id,
        resumeUrl: `/uploads/${req.file.filename}`,
        coverNote: req.body.coverNote || "",
      });

      res.status(201).json({ success: true, application });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/applications/mine -> candidate's own applications
router.get("/mine", requireAuth, requireRole("candidate"), async (req, res) => {
  try {
    const applications = await Application.find({ candidate: req.user.id })
      .populate("job", "title company location")
      .sort({ createdAt: -1 });
    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/applications/job/:jobId -> recruiter sees applicants for their job
router.get("/job/:jobId", requireAuth, requireRole("recruiter"), async (req, res) => {
  try {
    const applications = await Application.find({ job: req.params.jobId })
      .populate("candidate", "name email skills")
      .sort({ createdAt: -1 });
    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/applications/:id/status -> recruiter updates status
router.patch("/:id/status", requireAuth, requireRole("recruiter"), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["Applied", "Shortlisted", "Rejected", "Offered"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const application = await Application.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ success: true, application });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
