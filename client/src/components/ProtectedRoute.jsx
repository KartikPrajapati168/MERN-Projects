import { Navigate } from "react-router-dom";

// props: user (object|null), allowedRole (string, optional), children
export default function ProtectedRoute({ user, allowedRole, children }) {
  const token = localStorage.getItem("token");

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
