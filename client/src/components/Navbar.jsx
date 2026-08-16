import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

// props: user (object or null), onLogout (function)
export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // sessionStorage demo: remember the last visited page for THIS TAB only.
  // Close the tab and reopen -> this resets (unlike localStorage).
  useEffect(() => {
    sessionStorage.setItem("lastVisitedPage", location.pathname);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
            <Link to="/ai-feedback">AI Resume Check</Link>
          </>
        )}

        {user && user.role === "recruiter" && (
          <>
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
