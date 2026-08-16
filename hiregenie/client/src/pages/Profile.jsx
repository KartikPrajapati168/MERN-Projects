import { useState, useRef } from "react";
import { KEYS, readStorage, writeStorage } from "../utils/storage";

export default function Profile({ user, onUpdateUser }) {
  const [formData, setFormData] = useState({
    name: user.name || "",
    education: user.education || "",
    skills: (user.skills || []).join(", "),
    github: user.github || "",
    linkedin: user.linkedin || "",
  });
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  const nameRef = useRef(null); // useRef: focus name field if left empty

  const validate = () => {
    const newErrors = {};
    const urlRegex = /^https?:\/\/.+/;

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.education.trim()) newErrors.education = "Education is required";
    if (!formData.skills.trim()) newErrors.skills = "Add at least one skill";
    if (formData.github && !urlRegex.test(formData.github))
      newErrors.github = "Enter a full URL starting with http:// or https://";
    if (formData.linkedin && !urlRegex.test(formData.linkedin))
      newErrors.linkedin = "Enter a full URL starting with http:// or https://";

    setErrors(newErrors);
    if (newErrors.name) nameRef.current?.focus();
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const updatedUser = {
      ...user,
      name: formData.name,
      education: formData.education,
      skills: formData.skills.split(",").map((s) => s.trim()).filter(Boolean),
      github: formData.github,
      linkedin: formData.linkedin,
    };

    // update inside the users list
    const users = readStorage(KEYS.USERS, []);
    const updatedUsers = users.map((u) => (u.id === user.id ? { ...u, ...updatedUser } : u));
    writeStorage(KEYS.USERS, updatedUsers);

    // also update the current session so it reflects right away
    writeStorage(KEYS.CURRENT_USER, updatedUser);
    console.log("[Profile] saved updated profile:", updatedUser);

    onUpdateUser(updatedUser);
    setSaved(true);
  };

  return (
    <div className="page-container narrow">
      <form className="card auth-form" onSubmit={handleSubmit} noValidate>
        <h2>Build your profile</h2>
        <p className="subtitle">Recruiters see this alongside your applications.</p>

        {saved && <div className="alert-success">Profile saved!</div>}

        <label>Full Name</label>
        <input ref={nameRef} name="name" value={formData.name} onChange={handleChange} />
        {errors.name && <span className="field-error">{errors.name}</span>}

        <label>Education</label>
        <input
          name="education"
          value={formData.education}
          onChange={handleChange}
          placeholder="e.g. B.Tech Computer Science, XYZ College"
        />
        {errors.education && <span className="field-error">{errors.education}</span>}

        <label>Skills (comma separated)</label>
        <input
          name="skills"
          value={formData.skills}
          onChange={handleChange}
          placeholder="e.g. React, Node.js, MongoDB"
        />
        {errors.skills && <span className="field-error">{errors.skills}</span>}

        <label>GitHub URL (optional)</label>
        <input name="github" value={formData.github} onChange={handleChange} placeholder="https://github.com/yourname" />
        {errors.github && <span className="field-error">{errors.github}</span>}

        <label>LinkedIn URL (optional)</label>
        <input name="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/yourname" />
        {errors.linkedin && <span className="field-error">{errors.linkedin}</span>}

        <button type="submit" className="btn-primary">Save Profile</button>
      </form>
    </div>
  );
}
