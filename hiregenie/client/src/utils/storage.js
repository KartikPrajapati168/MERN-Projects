// central place for all localStorage reads/writes.
// no backend here, so this file is basically our "database".
// everything logs to console so you can see it live in DevTools.

export const KEYS = {
  USERS: "hiregenie_users",
  JOBS: "hiregenie_jobs",
  APPLICATIONS: "hiregenie_applications",
  CURRENT_USER: "hiregenie_current_user", // logged-in session (kept in localStorage so refresh doesn't log you out)
};

export function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    const data = raw !== null ? JSON.parse(raw) : fallback;
    console.log(`[localStorage] READ "${key}" ->`, data);
    return data;
  } catch (err) {
    console.error(`[localStorage] failed to read "${key}"`, err);
    return fallback;
  }
}

export function writeStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
  console.log(`[localStorage] WRITE "${key}" ->`, data);
}

export function removeStorage(key) {
  localStorage.removeItem(key);
  console.log(`[localStorage] REMOVE "${key}"`);
}

// quick unique id generator since we don't have MongoDB ObjectIds
export function genId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
