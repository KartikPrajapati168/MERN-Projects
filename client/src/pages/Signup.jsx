import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api";

export default function Signup({ onLogin }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "candidate",
    company: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // useRef demo: focus the very first field that has an error
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!emailRegex.test(formData.email)) newErrors.email = "Enter a valid email";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    if (formData.role === "recruiter" && !formData.company.trim())
      newErrors.company = "Company name is required for recruiters";

    setErrors(newErrors);

    // Focus first invalid field
    if (newErrors.name) nameRef.current?.focus();
    else if (newErrors.email) emailRef.current?.focus();
    else if (newErrors.password) passwordRef.current?.focus();

    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await api.post("/auth/signup", formData);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onLogin(res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setServerError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-form" onSubmit={handleSubmit} noValidate>
        <h2>Create your account</h2>
        <p className="subtitle">Join HireGenie AI as a candidate or recruiter</p>

        {serverError && <div className="alert-error">{serverError}</div>}

        <div className="role-toggle">
          <button
            type="button"
            className={formData.role === "candidate" ? "active" : ""}
            onClick={() => setFormData({ ...formData, role: "candidate" })}
          >
            Candidate
          </button>
          <button
            type="button"
            className={formData.role === "recruiter" ? "active" : ""}
            onClick={() => setFormData({ ...formData, role: "recruiter" })}
          >
            Recruiter
          </button>
        </div>

        <label>Full Name</label>
        <input ref={nameRef} name="name" value={formData.name} onChange={handleChange} placeholder="Jane Doe" />
        {errors.name && <span className="field-error">{errors.name}</span>}

        <label>Email</label>
        <input
          ref={emailRef}
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
        />
        {errors.email && <span className="field-error">{errors.email}</span>}

        <label>Password</label>
        <input
          ref={passwordRef}
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="At least 6 characters"
        />
        {errors.password && <span className="field-error">{errors.password}</span>}

        {formData.role === "recruiter" && (
          <>
            <label>Company Name</label>
            <input name="company" value={formData.company} onChange={handleChange} placeholder="Acme Pvt Ltd" />
            {errors.company && <span className="field-error">{errors.company}</span>}
          </>
        )}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        <p className="switch-auth">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
