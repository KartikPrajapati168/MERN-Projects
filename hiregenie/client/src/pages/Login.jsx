import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { KEYS, readStorage, writeStorage } from "../utils/storage";

export default function Login({ onLogin }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!emailRegex.test(formData.email)) newErrors.email = "Enter a valid email";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    console.log("[Login] attempting login for:", formData.email);

    // small delay so the loading state actually shows on screen
    setTimeout(() => {
      const users = readStorage(KEYS.USERS, []);
      const match = users.find(
        (u) => u.email === formData.email.toLowerCase() && u.password === formData.password
      );

      if (!match) {
        console.warn("[Login] failed: invalid credentials");
        setServerError("Invalid email or password");
        setLoading(false);
        return;
      }

      const { password, ...safeUser } = match; // never keep password in the session object
      writeStorage(KEYS.CURRENT_USER, safeUser);
      console.log("[Login] success, current user:", safeUser);

      onLogin(safeUser);
      setLoading(false);
      navigate("/dashboard");
    }, 400);
  };

  return (
    <div className="auth-page">
      <form className="card auth-form" onSubmit={handleSubmit} noValidate>
        <h2>Welcome back</h2>
        <p className="subtitle">Login to continue to HireGenie AI</p>

        {serverError && <div className="alert-error">{serverError}</div>}

        <label>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
        />
        {errors.email && <span className="field-error">{errors.email}</span>}

        <label>Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
        />
        {errors.password && <span className="field-error">{errors.password}</span>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="switch-auth">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
