# HireGenie AI — Frontend-only (React + localStorage)

No backend, no MongoDB server — this version is **pure React**. All data (users, jobs,
applications) is saved in the browser's `localStorage`, so it works completely offline
except for the AI resume feedback, which calls Google's Gemini API directly from the browser.

## Why no MongoDB?

A browser cannot connect to a MongoDB database directly and safely — that always requires
a backend server in between (Node/Express, etc). Since the goal here is a pure frontend
project, `localStorage` is used as the "database" instead. This is perfect for demonstrating
React concepts and still gives you working, persistent data across page refreshes.

## Setup

```bash
cd client
npm install
cp .env.example .env
```

Edit `.env` and add your free Gemini key (from https://aistudio.google.com/app/apikey):
```
VITE_GEMINI_API_KEY=your_key_here
```

Run:
```bash
npm run dev
```
Open `http://localhost:5173`.

> Note: since there's no backend, the Gemini API key is visible in the browser (DevTools).
> That's fine for a local college demo — never do this in a real production app.

## Full page list (for review)

| # | Page | Route | Access | Key concepts |
|---|---|---|---|---|
| 1 | Job List (Home) | `/` | Public | useEffect, useMemo, useState, JobCard props |
| 2 | Job Detail | `/jobs/:id` | Public | useParams, useEffect |
| 3 | Login | `/login` | Public | useState, form validation |
| 4 | Signup | `/signup` | Public | useState, useRef, form validation |
| 5 | Apply | `/apply/:jobId` | Candidate | useRef (file input), sessionStorage draft |
| 6 | Candidate Dashboard | `/dashboard` | Candidate | useEffect, localStorage read |
| 7 | Profile | `/profile` | Candidate | useState, useRef, form validation, localStorage update |
| 8 | AI Resume Feedback | `/ai-feedback` | Candidate | real Gemini API call, fallback logic |
| 9 | Recruiter Dashboard | `/recruiter/dashboard` | Recruiter | useEffect, useMemo (stats) |
| 10 | Post Job | `/recruiter/post-job` | Recruiter | useState, form validation |
| 11 | Applicants | `/recruiter/applicants` | Recruiter | useEffect, useMemo, ApplicantCard props |
| 12 | 404 Not Found | `*` (any unmatched route) | Public | React Router catch-all route |

Plus shared components used everywhere: `Navbar` (props, sessionStorage), `JobCard` (props),
`ApplicantCard` (props), `ProtectedRoute` (route guarding based on login + role).

## Test flow (do this once, end to end)

1. Sign up as a **recruiter** → auto logged in → lands nowhere special, check "Dashboard" in navbar
2. "Dashboard" → see stats (all 0 initially) → "Post a New Job" → fill form → submit
3. Back on Recruiter Dashboard → stats update, your job listed
4. Logout → sign up as a **candidate**
5. "Profile" → fill in education/skills/GitHub/LinkedIn → save (test a bad URL to see validation)
6. Home page → search for your job → open it → "Apply Now"
7. Select a resume file (only the filename is saved, no backend to store the real file) → submit
8. "Dashboard" → see the application with status "Applied"
9. "AI Resume Check" → paste resume text + required skills → get real Gemini feedback
10. Logout → login as the recruiter → "Applicants" → change status → "Dashboard" → stats update
11. Logout → login as candidate → "Dashboard" → see updated status
12. Try a random URL like `/xyz` → see the 404 page

Open DevTools (F12) → **Console** while doing this — every localStorage read/write is
logged there so you can see exactly what's happening.

## Concepts demonstrated (for review)

| Concept | Where |
|---|---|
| useState | Login, Signup, PostJob, JobList (search), Apply |
| useRef | Signup (focus first invalid field), Apply (file input) |
| useMemo | JobList (filtered jobs), Applicants (filtered applications) |
| useEffect | JobList, JobDetail, Dashboard, Applicants, App (seeding jobs) |
| Components + Props | JobCard, ApplicantCard, Navbar, ProtectedRoute |
| React Router | BrowserRouter, Routes, useParams, useNavigate, useLocation |
| localStorage | users, jobs, applications, current session — all persisted data |
| sessionStorage | last visited page (Navbar), cover note draft (Apply) — clears when tab closes |
| Form validation | Login, Signup, PostJob, Apply (manual JS validation, no library) |

## How data flows (explain this in review)

- `src/utils/storage.js` — central helper with `readStorage()` / `writeStorage()`,
  every call logs to console
- `src/utils/seed.js` — inserts 3 sample jobs on first load if none exist
- Each page reads/writes localStorage directly through these helpers
  (this is standing in for what would normally be `axios` calls to a backend)

## Known limitations (mention as "future scope" in review)

- Resume files: only the file **name** is stored, not the actual file content
  (would need a backend + file storage for that)
- Passwords are stored in plain text in localStorage (fine for a demo, never in production)
- Data is per-browser — clearing browser storage wipes everything
