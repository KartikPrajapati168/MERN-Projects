import { KEYS, readStorage, writeStorage } from "./storage";

export function seedJobsIfEmpty() {
  const jobs = readStorage(KEYS.JOBS, []);
  if (jobs.length > 0) return;

  const seedJobs = [
    {
      _id: "seed-1",
      title: "Frontend Developer (React)",
      company: "Acme Pvt Ltd",
      location: "Ahmedabad",
      experience: "0-2 Years",
      salary: "4-7 LPA",
      skills: ["React", "JavaScript", "CSS", "Git"],
      description: "Build and maintain modern, responsive web interfaces using React and REST APIs.",
      postedBy: "seed-recruiter",
    },
    {
      _id: "seed-2",
      title: "Backend Developer (Node.js)",
      company: "TechNova Solutions",
      location: "Bangalore",
      experience: "1-3 Years",
      salary: "6-10 LPA",
      skills: ["Node.js", "Express", "MongoDB", "REST API"],
      description: "Design and build scalable backend APIs and services for a growing product.",
      postedBy: "seed-recruiter",
    },
    {
      _id: "seed-3",
      title: "Full Stack Developer",
      company: "InnovateX",
      location: "Remote",
      experience: "0-1 Years",
      salary: "3-6 LPA",
      skills: ["React", "Node.js", "MongoDB", "Docker"],
      description: "Work across the stack on a fast-growing SaaS product from day one.",
      postedBy: "seed-recruiter",
    },
  ];

  writeStorage(KEYS.JOBS, seedJobs);
  console.log("[seed] inserted sample jobs so JobList isn't empty on first load:", seedJobs);
}
