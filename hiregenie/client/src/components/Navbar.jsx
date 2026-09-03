import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { KEYS, removeStorage } from "../utils/storage";

// props: user (object or null), onLogout (function)
export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // track last page visited in THIS tab only — resets when tab closes,
  // which is the whole difference from localStorage
  useEffect(() => {
    sessionStorage.setItem("lastVisitedPage", location.pathname);
    console.log("[Navbar] sessionStorage lastVisitedPage ->", location.pathname);
  }, [location]);

  const handleLogout = () => {
    removeStorage(KEYS.CURRENT_USER);
    onLogout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        HireGenie <span>AI</span>
      </Link>

      <div className="nav-links">
        <Link to="/">Jobs</Link>

        {!user && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup" className="nav-cta">Sign Up</Link>
          </>
        )}

        {user && user.role === "candidate" && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/profile">Profile</Link>
            <Link to="/ai-feedback">AI Resume Check</Link>
          </>
        )}

        {user && user.role === "recruiter" && (
          <>
            <Link to="/recruiter/dashboard">Dashboard</Link>
            <Link to="/recruiter/post-job">Post Job</Link>
            <Link to="/recruiter/applicants">Applicants</Link>
          </>
        )}

        {user && (
          <button className="nav-cta ghost" onClick={handleLogout}>
            Logout ({user.name})
          </button>
        )}
      </div>
    </nav>
  );
}
