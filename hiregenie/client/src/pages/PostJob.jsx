import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KEYS, readStorage, writeStorage, genId } from "../utils/storage";

export default function PostJob({ user }) {
  const [formData, setFormData] = useState({
    title: "",
    company: user.company || "",
    location: "",
    experience: "",
    salary: "",
    skills: "",
    description: "",
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      if (!formData[key].trim()) newErrors[key] = "This field is required";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess(false);
    if (!validate()) return;

    setLoading(true);
    setTimeout(() => {
      const jobs = readStorage(KEYS.JOBS, []);
      const newJob = {
        _id: genId(),
        ...formData,
        skills: formData.skills.split(",").map((s) => s.trim()).filter(Boolean),
        postedBy: user.id,
      };

      writeStorage(KEYS.JOBS, [...jobs, newJob]);
      console.log("[PostJob] new job posted:", newJob);

      setSuccess(true);
      setLoading(false);
      setTimeout(() => navigate("/"), 1000);
    }, 400);
  };

  return (
    <div className="page-container narrow">
      <form className="card auth-form" onSubmit={handleSubmit} noValidate>
        <h2>Post a new job</h2>

        {success && <div className="alert-success">Job posted! Redirecting...</div>}

        {[
          ["title", "Job Title", "e.g. Frontend Developer"],
          ["company", "Company", "e.g. Acme Pvt Ltd"],
          ["location", "Location", "e.g. Ahmedabad"],
          ["experience", "Experience", "e.g. 0-2 Years"],
          ["salary", "Salary", "e.g. 4-7 LPA"],
          ["skills", "Skills (comma separated)", "e.g. React, Node.js, MongoDB"],
        ].map(([name, label, placeholder]) => (
          <div key={name}>
            <label>{label}</label>
            <input name={name} value={formData[name]} onChange={handleChange} placeholder={placeholder} />
            {errors[name] && <span className="field-error">{errors[name]}</span>}
          </div>
        ))}

        <label>Job Description</label>
        <textarea
          name="description"
          rows={5}
          value={formData.description}
          onChange={handleChange}
          placeholder="Role responsibilities, requirements..."
        />
        {errors.description && <span className="field-error">{errors.description}</span>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Posting..." : "Post Job"}
        </button>
      </form>
    </div>
  );
}
