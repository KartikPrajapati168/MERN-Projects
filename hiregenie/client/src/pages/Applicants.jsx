import { useEffect, useState, useMemo } from "react";
import { KEYS, readStorage, writeStorage } from "../utils/storage";
import ApplicantCard from "../components/ApplicantCard";

export default function Applicants({ user }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");

  // load this recruiter's jobs
  useEffect(() => {
    const allJobs = readStorage(KEYS.JOBS, []);
    const mine = allJobs.filter((j) => j.postedBy === user.id);
    console.log("[Applicants] recruiter's jobs:", mine);
    setJobs(mine);
    if (mine.length) setSelectedJobId(mine[0]._id);
  }, [user]);

  // refetch applicants whenever the selected job changes
  useEffect(() => {
    if (!selectedJobId) return;
    const allApplications = readStorage(KEYS.APPLICATIONS, []);
    const allUsers = readStorage(KEYS.USERS, []);

    const forThisJob = allApplications
      .filter((a) => a.jobId === selectedJobId)
      .map((a) => ({ ...a, candidate: allUsers.find((u) => u.id === a.candidateId) }));

    console.log("[Applicants] applications for job", selectedJobId, ":", forThisJob);
    setApplications(forThisJob);
  }, [selectedJobId]);

  const handleStatusChange = (applicationId, newStatus) => {
    const allApplications = readStorage(KEYS.APPLICATIONS, []);
    const updated = allApplications.map((a) =>
      a._id === applicationId ? { ...a, status: newStatus } : a
    );
    writeStorage(KEYS.APPLICATIONS, updated);
    console.log("[Applicants] updated status for", applicationId, "->", newStatus);

    setApplications((prev) =>
      prev.map((a) => (a._id === applicationId ? { ...a, status: newStatus } : a))
    );
  };

  // only recompute when the list or the filter changes
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

      {selectedJobId && filteredApplications.length === 0 && (
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
