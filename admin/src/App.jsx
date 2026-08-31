import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const BRAND = "#6D4AFF";

const EMPTY_FORM = {
  id: null,
  title: "",
  department: "",
  location: "",
  employment_type: "",
  description: "",
  skills: "",
  apply_url: "",
  is_active: true,
};

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Centered>Loading…</Centered>;
  return session ? <Dashboard session={session} /> : <Login />;
}

function Centered({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", color: "#64748B" }}>
      {children}
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FE", fontFamily: "system-ui, sans-serif" }}>
      <form onSubmit={submit} style={{ background: "#fff", padding: 36, borderRadius: 16, boxShadow: "0 8px 30px -12px rgba(15,23,42,.15)", width: 340 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: "#0F172A" }}>AIFAGen Admin</h1>
        <p style={{ fontSize: 13, color: "#64748B", marginBottom: 24 }}>Sign in to manage internal job postings.</p>
        <Field label="Email">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} autoComplete="username" />
        </Field>
        <Field label="Password">
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} autoComplete="current-password" />
        </Field>
        {error && <p style={{ color: "#DC2626", fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button type="submit" disabled={busy} style={buttonStyle}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 16 }}>
          Accounts are created in Supabase Auth directly and must also be added to
          the <code>admins</code> table — there is no self-signup here.
        </p>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #DDE3EE",
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: "11px 16px",
  background: BRAND,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

function Dashboard({ session }) {
  const [jobs, setJobs] = useState(null); // null = loading
  const [error, setError] = useState("");
  const [notAdmin, setNotAdmin] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    setError("");
    const { data, error } = await supabase
      .from("internal_jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setJobs([]);
      return;
    }
    setJobs(data);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditing(false);
  };

  const startEdit = (job) => {
    setForm({
      id: job.id,
      title: job.title || "",
      department: job.department || "",
      location: job.location || "",
      employment_type: job.employment_type || "",
      description: job.description || "",
      skills: (job.skills || []).join(", "),
      apply_url: job.apply_url || "",
      is_active: job.is_active,
    });
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotAdmin(false);

    const row = {
      title: form.title.trim(),
      department: form.department.trim() || null,
      location: form.location.trim() || null,
      employment_type: form.employment_type.trim() || null,
      description: form.description.trim(),
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      apply_url: form.apply_url.trim() || null,
      is_active: form.is_active,
    };

    let res;
    if (form.id) {
      res = await supabase.from("internal_jobs").update(row).eq("id", form.id);
    } else {
      res = await supabase
        .from("internal_jobs")
        .insert({ ...row, created_by: session.user.id });
    }

    setSaving(false);
    if (res.error) {
      // RLS silently returns 0 rows rather than a permission error on some
      // paths — a permission-denied message here means the signed-in user
      // has no row in public.admins yet.
      if (/row-level security|permission denied/i.test(res.error.message)) {
        setNotAdmin(true);
      } else {
        setError(res.error.message);
      }
      return;
    }
    resetForm();
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this posting permanently?")) return;
    const { error } = await supabase.from("internal_jobs").delete().eq("id", id);
    if (error) setError(error.message);
    else load();
  };

  const toggleActive = async (job) => {
    const { error } = await supabase
      .from("internal_jobs")
      .update({ is_active: !job.is_active })
      .eq("id", job.id);
    if (error) setError(error.message);
    else load();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FE", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #E8ECF5", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", margin: 0 }}>AIFAGen Admin</h1>
          <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>{session.user.email}</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} style={{ ...buttonStyle, width: "auto", background: "#fff", color: "#475569", border: "1px solid #DDE3EE" }}>
          Sign out
        </button>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
        {notAdmin && (
          <Banner tone="warn">
            Your account is signed in but isn't in the <code>admins</code> table, so writes are
            blocked. Add a row for <code>{session.user.id}</code> in <code>public.admins</code>{" "}
            via the Supabase SQL editor.
          </Banner>
        )}
        {error && <Banner tone="error">{error}</Banner>}

        <section style={{ background: "#fff", border: "1px solid #E8ECF5", borderRadius: 14, padding: 24, marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginTop: 0 }}>
            {editing ? "Edit posting" : "New internal job posting"}
          </h2>
          <form onSubmit={submit}>
            <Row>
              <Field label="Title *">
                <input required style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label="Department">
                <input style={inputStyle} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </Field>
            </Row>
            <Row>
              <Field label="Location">
                <input style={inputStyle} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </Field>
              <Field label="Employment type">
                <input style={inputStyle} placeholder="Full-time, Contract…" value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })} />
              </Field>
            </Row>
            <Field label="Description *">
              <textarea required rows={7} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Row>
              <Field label="Skills (comma-separated)">
                <input style={inputStyle} placeholder="React, Node.js, SQL" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
              </Field>
              <Field label="Apply URL">
                <input style={inputStyle} placeholder="https:// or mailto:" value={form.apply_url} onChange={(e) => setForm({ ...form, apply_url: e.target.value })} />
              </Field>
            </Row>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, fontSize: 13, color: "#334155" }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Visible on the site (active)
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" disabled={saving} style={{ ...buttonStyle, width: "auto", padding: "10px 22px" }}>
                {saving ? "Saving…" : editing ? "Save changes" : "Post job"}
              </button>
              {editing && (
                <button type="button" onClick={resetForm} style={{ ...buttonStyle, width: "auto", padding: "10px 22px", background: "#fff", color: "#475569", border: "1px solid #DDE3EE" }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
            Postings {jobs ? `(${jobs.length})` : ""}
          </h2>
          {jobs === null && <p style={{ color: "#94A3B8" }}>Loading…</p>}
          {jobs?.length === 0 && <p style={{ color: "#94A3B8" }}>No internal postings yet.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {jobs?.map((job) => (
              <div key={job.id} style={{ background: "#fff", border: "1px solid #E8ECF5", borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong style={{ fontSize: 14, color: "#0F172A" }}>{job.title}</strong>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: job.is_active ? "#ECFDF5" : "#F1F5F9", color: job.is_active ? "#059669" : "#94A3B8" }}>
                      {job.is_active ? "Active" : "Hidden"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 2 }}>
                    {[job.department, job.location, job.employment_type].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => toggleActive(job)} style={smallBtn}>{job.is_active ? "Hide" : "Show"}</button>
                  <button onClick={() => startEdit(job)} style={smallBtn}>Edit</button>
                  <button onClick={() => remove(job.id)} style={{ ...smallBtn, color: "#DC2626", borderColor: "#FCA5A5" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: "flex", gap: 16 }}>
    {Array.isArray(children) ? children.map((c, i) => <div key={i} style={{ flex: 1 }}>{c}</div>) : children}
  </div>;
}

function Banner({ tone, children }) {
  const styles = {
    warn: { background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" },
    error: { background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" },
  }[tone];
  return <div style={{ ...styles, borderRadius: 10, padding: "12px 16px", fontSize: 13, marginBottom: 20 }}>{children}</div>;
}

const smallBtn = {
  padding: "6px 12px",
  fontSize: 12.5,
  fontWeight: 600,
  border: "1px solid #DDE3EE",
  borderRadius: 7,
  background: "#fff",
  color: "#334155",
  cursor: "pointer",
};
