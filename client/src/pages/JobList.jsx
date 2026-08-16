import { useEffect, useState, useMemo } from "react";
import api from "../utils/api";
import JobCard from "../components/JobCard";

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    api
      .get("/jobs")
      .then((res) => setJobs(res.data.jobs))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // useMemo: only recompute the filtered list when jobs or searchTerm change,
  // not on every render (e.g. not when unrelated state in this component changes)
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
        <p>AI-powered job matching, coding assessments and interviews — all in one place.</p>
        <input
          className="search-bar"
          placeholder="Search by title, company or skill..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading && <p className="empty-state">Loading jobs...</p>}
      {!loading && filteredJobs.length === 0 && (
        <p className="empty-state">No jobs found. Try a different search, or check back later.</p>
      )}

      <div className="job-grid">
        {filteredJobs.map((job) => (
          <JobCard key={job._id} job={job} />
        ))}
      </div>
    </div>
  );
}
