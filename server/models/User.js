const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["candidate", "recruiter"], default: "candidate" },
    company: { type: String, default: "" }, // used only for recruiters
    skills: { type: [String], default: [] }, // used only for candidates
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
