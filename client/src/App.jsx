import { useState } from "react";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import JobList from "./pages/JobList";
import JobDetail from "./pages/JobDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Apply from "./pages/Apply";
import Dashboard from "./pages/Dashboard";
import PostJob from "./pages/PostJob";
import Applicants from "./pages/Applicants";
import AiFeedback from "./pages/AiFeedback";

export default function App() {
  // Initialize user state from localStorage so a page refresh keeps you logged in
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

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
              <Apply />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user} allowedRole="candidate">
              <Dashboard />
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
          path="/recruiter/post-job"
          element={
            <ProtectedRoute user={user} allowedRole="recruiter">
              <PostJob />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/applicants"
          element={
            <ProtectedRoute user={user} allowedRole="recruiter">
              <Applicants />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
