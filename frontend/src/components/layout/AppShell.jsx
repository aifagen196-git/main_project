import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import Sidebar from "./Sidebar";

import JobMatches from "../../pages/JobMatches";
import InternalJobs from "../../pages/InternalJobs";
import Applications from "../../pages/Applications";
import Resume from "../../pages/Resume";
import SavedJobs from "../../pages/SavedJobs";

// Recharts-heavy pages — lazy-loaded so recharts is split out of the main bundle.
const Dashboard = lazy(() => import("../../pages/Dashboard"));
// HIDDEN — kept out of the bundle entirely while the route is disabled.
// Restore alongside the /analytics route below. See data/constants.js.
// const Analytics = lazy(() => import("../../pages/Analytics"));
import SettingsView from "../../pages/SettingsView";
import Pricing from "../../pages/Pricing";
import Billing from "../../pages/Billing";

import { getSavedJobIds, toggleSavedJob } from "../../services/savedJobs";

export default function AppShell({ profile, refresh, exit }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    getSavedJobIds()
      .then(setSaved)
      .catch((e) => console.error("Failed to load saved jobs", e));
  }, []);

  const toggle = async (id) => {
    const isSaved = saved.includes(id);
    // Optimistic update, then persist; roll back on failure.
    setSaved((s) => (isSaved ? s.filter((x) => x !== id) : [...s, id]));
    try {
      await toggleSavedJob(id, isSaved);
    } catch (e) {
      console.error("Failed to toggle saved job", e);
      setSaved((s) => (isSaved ? [...s, id] : s.filter((x) => x !== id)));
    }
  };

  const plan = profile?.plan || "none";

  return (
    <div
      className="font-body"
      style={{
        background:
          "radial-gradient(1200px 600px at 100% -10%,rgba(109,74,255,.07),transparent 55%),radial-gradient(900px 500px at 0% 110%,rgba(245,158,11,.05),transparent 55%),#F8F9FE",
        color: "#0F172A",
      }}
    >
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar
          open={open}
          setOpen={setOpen}
          exit={exit}
          plan={plan}
          profile={profile}
          counts={{ saved: saved.length }}
        />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* The topbar used to carry the only control that opened the sidebar
              drawer below 1024px. With it gone, this floating button takes that
              job — it is hidden at >=1024px, where the sidebar is a static
              column (see .v3-burger in the v3 CSS block). */}
          <button
            className="v3-burger"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            style={{
              position: "fixed",
              top: 14,
              left: 14,
              zIndex: 50,
              display: "inline-flex",
              flexDirection: "column",
              gap: 4,
              background: "rgba(255,255,255,.92)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid #DDE3EE",
              borderRadius: 12,
              padding: 11,
              cursor: "pointer",
              boxShadow: "0 8px 24px -12px rgba(15,23,42,.28)",
            }}
          >
            <span style={{ display: "block", width: 16, height: 1.8, background: "#0F172A" }} />
            <span style={{ display: "block", width: 16, height: 1.8, background: "#0F172A" }} />
            <span style={{ display: "block", width: 11, height: 1.8, background: "#0F172A" }} />
          </button>

          <main
            className="v3-main"
            style={{
              flex: 1,
              padding: "clamp(22px,3.4vw,40px) clamp(16px,3vw,32px)",
            }}
          >
            <div style={{ maxWidth: 1180, margin: "0 auto" }}>
              <Suspense
                fallback={
                  <div className="flex justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-slate-400" />
                  </div>
                }
              >
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />

                <Route
                  path="/dashboard"
                  element={<Dashboard profile={profile} />}
                />

                <Route
                  path="/matches"
                  element={
                    <JobMatches saved={saved} toggle={toggle} plan={plan} />
                  }
                />

                <Route path="/internal-jobs" element={<InternalJobs />} />

                <Route path="/applications" element={<Applications />} />

                <Route
                  path="/resume"
                  element={<Resume profile={profile} plan={plan} />}
                />

                {/* HIDDEN — see the note on the Analytics NAV entry in
                    data/constants.js. The page and its endpoint still exist;
                    without this route /analytics falls through to the
                    catch-all below and redirects to the dashboard. */}
                {/* <Route path="/analytics" element={<Analytics plan={plan} />} /> */}

                <Route
                  path="/saved"
                  element={<SavedJobs saved={saved} toggle={toggle} />}
                />

                <Route
                  path="/settings"
                  element={<SettingsView profile={profile} refresh={refresh} />}
                />

                <Route
                  path="/pricing"
                  element={<Pricing profile={profile} refresh={refresh} />}
                />

                <Route
                  path="/billing"
                  element={<Billing profile={profile} />}
                />

                {/* Unknown path → dashboard. Without this, any URL that doesn't
                    match renders a blank main area with no way back except the
                    sidebar — including stale links to routes that have since
                    been removed (e.g. the old /prep screen). */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
