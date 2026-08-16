import { useEffect, useState, useMemo } from "react";
import { KEYS, readStorage } from "../utils/storage";
import JobCard from "../components/JobCard";

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // load jobs once on mount
  useEffect(() => {
    const data = readStorage(KEYS.JOBS, []);
    console.log("[JobList] loaded jobs from localStorage:", data);
    setJobs(data);
  }, []);

  // only re-filter when jobs or the search term actually change
  const filteredJobs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(term) ||
        job.company.toLowerCase().includes(term) ||
        job.skills.some((s) => s.toLowerCase().includes(term))
    );
  }, [jobs, searchTerm]);

  return (
    <div className="page-container">
      <div className="hero">
        <h1>Find your next role</h1>
        <p>AI-powered job matching and instant resume feedback — all in one place.</p>
        <input
          className="search-bar"
          placeholder="Search by title, company or skill..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredJobs.length === 0 && (
        <p className="empty-state">No jobs found. Try a different search.</p>
      )}

      <div className="job-grid">
        {filteredJobs.map((job) => (
          <JobCard key={job._id} job={job} />
        ))}
      </div>
    </div>
  );
}
