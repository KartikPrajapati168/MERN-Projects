# HireGenie AI — Phase 1 MVP

MERN stack recruitment platform. Real Gemini AI resume feedback (with offline fallback).

## Folder structure
```
hiregenie/
  server/   -> Node + Express + MongoDB backend
  client/   -> React + Vite frontend
```

## 1. Backend setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGO_URI` → get free cluster at https://cloud.mongodb.com, copy connection string
- `JWT_SECRET` → any random long string
- `GEMINI_API_KEY` → get free key at https://aistudio.google.com/app/apikey

Run:
```bash
npm run dev
```
Backend runs on `http://localhost:5000`. Test it: open `http://localhost:5000/api/health` in browser.

## 2. Frontend setup

```bash
cd client
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

## 3. Test flow (do this once, end to end)

1. Sign up as a **recruiter** (select role toggle) → auto logged in
2. Go to "Post Job" → fill form → submit
3. Logout → sign up as a **candidate**
4. Go to home page → search/find the job → open it → "Apply Now"
5. Upload a resume file (PDF/DOC/DOCX) → submit
6. Go to "Dashboard" → see the application with status "Applied"
7. Go to "AI Resume Check" → paste resume text + required skills → get real Gemini feedback
8. Logout → login back as the recruiter → go to "Applicants" → change status → logout → login as candidate → see updated status on dashboard

## Concepts demonstrated (for review)

| Concept | Where |
|---|---|
| useState | Login, Signup, PostJob, JobList (search), Apply |
| useRef | Signup (focus first invalid field), Apply (file input) |
| useMemo | JobList (filtered jobs), Applicants (filtered applications) |
| useEffect | JobList, JobDetail, Dashboard, Applicants (data fetching) |
| Components + Props | JobCard, ApplicantCard, Navbar, ProtectedRoute |
| React Router | BrowserRouter, Routes, useParams, useNavigate, useLocation |
| localStorage | JWT token + user object (persists across refresh) |
| sessionStorage | last visited page (Navbar), cover note draft (Apply) — clears when tab closes |
| Form validation | Login, Signup, PostJob, Apply (manual JS validation, no library) |

## Notes
- If `GEMINI_API_KEY` is missing/invalid or quota runs out, `/api/ai/resume-feedback`
  automatically falls back to a rule-based ATS score so the demo never breaks.
- Resume files are stored in `server/uploads/` and served statically.
- This is Phase 1 (core platform). Live video interview, AI proctoring, and the
  coding round editor are planned for Phase 2/3.
