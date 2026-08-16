import { useEffect, useState, useMemo } from "react";
import api from "../utils/api";
import ApplicantCard from "../components/ApplicantCard";

export default function Applicants() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(false);

  // load recruiter's own jobs first
  useEffect(() => {
    api.get("/jobs/mine").then((res) => {
      setJobs(res.data.jobs);
      if (res.data.jobs.length) setSelectedJobId(res.data.jobs[0]._id);
    });
  }, []);

  // load applicants whenever the selected job changes
  useEffect(() => {
    if (!selectedJobId) return;
    setLoading(true);
    api
      .get(`/applications/job/${selectedJobId}`)
      .then((res) => setApplications(res.data.applications))
      .finally(() => setLoading(false));
  }, [selectedJobId]);

  const handleStatusChange = async (applicationId, newStatus) => {
    await api.patch(`/applications/${applicationId}/status`, { status: newStatus });
    setApplications((prev) =>
      prev.map((a) => (a._id === applicationId ? { ...a, status: newStatus } : a))
    );
  };

  // useMemo: recompute filtered list only when applications or statusFilter change
  const filteredApplications = useMemo(() => {
    if (statusFilter === "All") return applications;
    return applications.filter((a) => a.status === statusFilter);
  }, [applications, statusFilter]);

  return (
    <div className="page-container">
      <h1>Applicants</h1>

      {jobs.length === 0 && <p className="empty-state">You haven't posted any jobs yet.</p>}

      {jobs.length > 0 && (
        <div className="filters-row">
          <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>{job.title}</option>
            ))}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {["All", "Applied", "Shortlisted", "Rejected", "Offered"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {loading && <p className="empty-state">Loading applicants...</p>}
      {!loading && selectedJobId && filteredApplications.length === 0 && (
        <p className="empty-state">No applicants match this filter.</p>
      )}

      <div className="application-list">
        {filteredApplications.map((app) => (
          <ApplicantCard key={app._id} application={app} onStatusChange={handleStatusChange} />
        ))}
      </div>
    </div>
  );
}
