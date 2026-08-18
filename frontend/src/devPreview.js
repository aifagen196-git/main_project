/**
 * Dev-only preview mode — lets the signed-in UI be opened and reviewed with no
 * Supabase session and no backend, by stubbing the auth hooks and answering
 * API calls from in-memory fixtures.
 *
 * Enable by adding `?preview` to the URL, e.g. http://localhost:5173/?preview
 *
 * SAFETY: the flag is `false` unless `import.meta.env.DEV` is true. Vite
 * replaces that with a literal `false` in a production build, so every branch
 * below — and the fixture data itself — is dead-code eliminated from `npm run
 * build` output. This cannot weaken auth in a deployed app.
 */

export const DEV_PREVIEW =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("preview");

export const PREVIEW_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "preview@aifagenlabs.com",
  user_metadata: { full_name: "Aarav Mehta" },
};

// `?preview` signs in as a subscribed user so every page is reachable.
// `?preview=free` / `?preview=none` instead exercises the paywalled state.
const PREVIEW_PLAN = DEV_PREVIEW
  ? new URLSearchParams(window.location.search).get("preview") || "professional"
  : "professional";

export const PREVIEW_PROFILE = {
  id: PREVIEW_USER.id,
  email: "preview@aifagenlabs.com",
  full_name: "Aarav Mehta",
  headline: "Senior Product Designer",
  location: "Hyderabad, India",
  plan: PREVIEW_PLAN === "none" ? "none" : PREVIEW_PLAN,
  subscription_status:
    PREVIEW_PLAN === "none" || PREVIEW_PLAN === "free" ? "inactive" : "active",
};

// Mirrors the sample set in the v3 design so the preview can be compared
// side-by-side with the mockup.
const JOBS = [
  { id: "job-1", title: "Senior Product Designer", company: "Stripe", location: "Remote (US)", salary: "$140K–$180K", skills: ["Product Design", "Figma", "User Research"], match_score: 95, featured: true, posted_date: "2026-08-08", employment_type: "Full-time", is_remote_us: true, min_years: 7, role_family: "design", apply_url: "https://example.com/apply/1" },
  { id: "job-2", title: "Machine Learning Engineer", company: "Anthropic", location: "San Francisco, CA (Hybrid)", salary: "$190K–$240K", skills: ["PyTorch", "LLMs", "Python"], match_score: 92, posted_date: "2026-08-09", employment_type: "Full-time", is_remote_us: false, min_years: 5, role_family: "engineering", apply_url: "https://example.com/apply/2" },
  { id: "job-3", title: "Frontend Engineer", company: "Vercel", location: "Remote (US)", salary: "$150K–$185K", skills: ["React", "TypeScript", "Next.js"], match_score: 89, posted_date: "2026-08-07", employment_type: "Full-time", is_remote_us: true, min_years: 4, role_family: "engineering", apply_url: "https://example.com/apply/3" },
  { id: "job-4", title: "Supply Chain Analyst", company: "Nestlé", location: "Arlington, VA", salary: "$95K–$120K", skills: ["S&OP", "Demand Planning", "SQL"], match_score: 84, posted_date: "2026-08-06", employment_type: "Full-time", is_remote_us: false, min_years: 3, role_family: "operations", apply_url: "https://example.com/apply/4" },
  { id: "job-5", title: "Data Engineer", company: "Snowflake", location: "Remote (US)", salary: "$160K–$200K", skills: ["dbt", "Airflow", "SQL"], match_score: 81, posted_date: "2026-08-05", employment_type: "Full-time", is_remote_us: true, min_years: 6, role_family: "engineering", apply_url: "https://example.com/apply/5" },
  { id: "job-6", title: "Product Manager", company: "Notion", location: "New York, NY (Hybrid)", salary: "$155K–$190K", skills: ["Roadmapping", "Analytics"], match_score: 74, posted_date: "2026-08-04", employment_type: "Full-time", is_remote_us: false, min_years: 8, role_family: "product", apply_url: "https://example.com/apply/6" },
  { id: "job-7", title: "Site Reliability Engineer", company: "Cloudflare", location: "Austin, TX", salary: "$145K–$180K", skills: ["Kubernetes", "Go", "Terraform"], match_score: 68, posted_date: "2026-08-03", employment_type: "Full-time", is_remote_us: false, min_years: 10, role_family: "engineering", apply_url: "https://example.com/apply/7" },
  { id: "job-8", title: "Security Engineer", company: "Okta", location: "Remote (US)", salary: "$150K–$185K", skills: ["AppSec", "Threat Modeling"], match_score: 61, posted_date: "2026-08-02", employment_type: "Full-time", is_remote_us: true, min_years: 5, role_family: "engineering", apply_url: "https://example.com/apply/8" },
  { id: "job-9", title: "UX Researcher", company: "Spotify", location: "Remote (US)", salary: "$120K–$150K", skills: ["Usability Testing", "Interviews"], match_score: 52, posted_date: "2026-08-01", employment_type: "Full-time", is_remote_us: true, min_years: 2, role_family: "design", apply_url: "https://example.com/apply/9" },
  { id: "job-10", title: "QA Automation Engineer", company: "Atlassian", location: "Remote (US)", salary: "$115K–$140K", skills: ["Playwright", "CI"], match_score: 44, posted_date: "2026-07-30", employment_type: "Full-time", is_remote_us: true, min_years: 2, role_family: "engineering", apply_url: "https://example.com/apply/10" },
];

const RESUME = {
  id: "resume-1",
  file_name: "Aarav-Mehta-Resume.pdf",
  created_at: "2026-08-10T09:00:00Z",
  extracted_skills: ["Product Design", "Design Systems", "Figma", "User Research", "Prototyping"],
  profile: {
    skills: ["Product Design", "Design Systems", "Figma", "User Research", "Prototyping"],
    years_experience: 7,
  },
  ai_analysis: {
    resume_score: 82,
    ats_score: 88,
    experience_level: "Senior",
    summary:
      "Seven years of product design across fintech and developer tools, with design-systems ownership stated explicitly and quantified outcomes in three of five roles.",
    skills_found: ["Product Design", "Design Systems", "Figma", "User Research", "Accessibility"],
    skills_missing: ["A/B Testing", "Product Analytics"],
    recommendations: [
      "The two earliest roles describe responsibilities rather than results. Add one metric each.",
      "Add \"A/B Testing\" and \"Product Analytics\" — both appear in 60% of your target postings.",
      "Education sits above experience. For seven years in, flip the order.",
    ],
  },
};

// Mutable so toggling save / adding an application behaves realistically.
const state = {
  saved: ["job-3", "job-5"],
  applications: [
    { id: "app-1", company: "Stripe", role: "Senior Product Designer", status: "applied", match_score: 95, applied_at: "2026-08-12T10:00:00Z", job_id: "job-1" },
    { id: "app-2", company: "Anthropic", role: "Machine Learning Engineer", status: "applied", match_score: 92, applied_at: "2026-08-09T10:00:00Z", job_id: "job-2" },
    { id: "app-3", company: "Vercel", role: "Frontend Engineer", status: "applied", match_score: 89, applied_at: "2026-08-07T10:00:00Z", job_id: "job-3" },
    { id: "app-4", company: "Notion", role: "Product Manager", status: "interviewing", match_score: 74, applied_at: "2026-08-12T10:00:00Z", job_id: "job-6" },
    { id: "app-5", company: "Snowflake", role: "Data Engineer", status: "interviewing", match_score: 81, applied_at: "2026-08-10T10:00:00Z", job_id: "job-5" },
    { id: "app-6", company: "Cloudflare", role: "Site Reliability Engineer", status: "assessment", match_score: 68, applied_at: "2026-08-08T10:00:00Z", job_id: "job-7" },
    { id: "app-7", company: "Okta", role: "Security Engineer", status: "assessment", match_score: 61, applied_at: "2026-08-06T10:00:00Z", job_id: "job-8" },
    { id: "app-8", company: "Nestlé", role: "Supply Chain Analyst", status: "offer", match_score: 84, applied_at: "2026-08-03T10:00:00Z", job_id: "job-4" },
    { id: "app-9", company: "Spotify", role: "UX Researcher", status: "rejected", match_score: 52, applied_at: "2026-07-28T10:00:00Z", job_id: "job-9" },
  ],
};

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

/**
 * Answers an apiRequest() call from fixtures. Returns `undefined` for paths
 * with no fixture, which the caller treats as "not handled".
 */
export async function previewApi(path, method = "GET", body) {
  await delay();
  const [route] = path.split("?");
  const query = new URLSearchParams(path.split("?")[1] || "");

  if (route === "/api/profile") {
    if (method === "PATCH") {
      Object.assign(PREVIEW_PROFILE, body || {});
    }
    return { profile: PREVIEW_PROFILE };
  }

  if (route === "/api/jobs/matches") return { jobs: JOBS };

  if (route === "/api/jobs/search") {
    const q = (query.get("q") || "").toLowerCase();
    return {
      jobs: q
        ? JOBS.filter((j) =>
            `${j.title} ${j.company} ${j.skills.join(" ")}`.toLowerCase().includes(q),
          )
        : JOBS,
    };
  }

  if (route === "/api/saved-jobs/ids") return { ids: state.saved };
  if (route === "/api/saved-jobs") {
    if (method === "POST") {
      const id = body?.job_id;
      if (id && !state.saved.includes(id)) state.saved.push(id);
      return { saved: true };
    }
    return { jobs: JOBS.filter((j) => state.saved.includes(j.id)) };
  }
  if (route.startsWith("/api/saved-jobs/") && method === "DELETE") {
    const id = route.split("/").pop();
    state.saved = state.saved.filter((x) => x !== id);
    return { saved: false };
  }

  if (route === "/api/applications") {
    if (method === "POST") {
      const application = {
        id: `app-${Date.now()}`,
        status: "applied",
        applied_at: new Date().toISOString(),
        ...body,
      };
      state.applications.unshift(application);
      return { application };
    }
    return { applications: state.applications };
  }
  if (route.startsWith("/api/applications/")) {
    const id = route.split("/").pop();
    if (method === "DELETE") {
      state.applications = state.applications.filter((a) => a.id !== id);
      return {};
    }
    const application = state.applications.find((a) => a.id === id);
    if (application && body?.status) application.status = body.status;
    return { application };
  }

  if (route === "/api/resumes") return { resumes: [RESUME] };
  if (route === "/api/resumes/latest") return { resume: RESUME };
  if (route.endsWith("/analyze")) return { analysis: RESUME.ai_analysis };
  if (route.endsWith("/improve")) {
    return {
      improvement: {
        summary: RESUME.ai_analysis.summary,
        bullets: RESUME.ai_analysis.recommendations,
      },
    };
  }

  return undefined;
}
