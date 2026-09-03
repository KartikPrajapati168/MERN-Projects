import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import JobList from "./pages/JobList";
import JobDetail from "./pages/JobDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Apply from "./pages/Apply";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import PostJob from "./pages/PostJob";
import Applicants from "./pages/Applicants";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import AiFeedback from "./pages/AiFeedback";
import NotFound from "./pages/NotFound";

import { KEYS, readStorage } from "./utils/storage";
import { seedJobsIfEmpty } from "./utils/seed";

export default function App() {
  // keep user logged in across refresh
  const [user, setUser] = useState(() => readStorage(KEYS.CURRENT_USER, null));

  // add a few demo jobs the first time the app runs
  useEffect(() => {
    seedJobsIfEmpty();
  }, []);

  return (
    <>
      <Navbar user={user} onLogout={() => setUser(null)} />

      <Routes>
        <Route path="/" element={<JobList />} />
        <Route path="/jobs/:id" element={<JobDetail user={user} />} />
        <Route path="/login" element={<Login onLogin={setUser} />} />
        <Route path="/signup" element={<Signup onLogin={setUser} />} />

        <Route
          path="/apply/:jobId"
          element={
            <ProtectedRoute user={user} allowedRole="candidate">
              <Apply user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user} allowedRole="candidate">
              <Dashboard user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user} allowedRole="candidate">
              <Profile user={user} onUpdateUser={setUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-feedback"
          element={
            <ProtectedRoute user={user} allowedRole="candidate">
              <AiFeedback />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/dashboard"
          element={
            <ProtectedRoute user={user} allowedRole="recruiter">
              <RecruiterDashboard user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/post-job"
          element={
            <ProtectedRoute user={user} allowedRole="recruiter">
              <PostJob user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/applicants"
          element={
            <ProtectedRoute user={user} allowedRole="recruiter">
              <Applicants user={user} />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
