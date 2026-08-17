import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import JobMatches from "../../pages/JobMatches";
import Applications from "../../pages/Applications";
import Resume from "../../pages/Resume";
import SavedJobs from "../../pages/SavedJobs";

// Recharts-heavy pages — lazy-loaded so recharts is split out of the main bundle.
const Dashboard = lazy(() => import("../../pages/Dashboard"));
const InterviewPrep = lazy(() => import("../../pages/InterviewPrep"));
const Analytics = lazy(() => import("../../pages/Analytics"));
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

  const plan = profile?.plan || "free";

  return (
    <div className="font-body" style={{ background: "#F8F9FE", color: "#0F172A" }}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar
          open={open}
          setOpen={setOpen}
          exit={exit}
          plan={plan}
          counts={{ saved: saved.length }}
        />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <Topbar profile={profile} setOpen={setOpen} exit={exit} />

          <main
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

                <Route path="/applications" element={<Applications />} />

                <Route
                  path="/resume"
                  element={<Resume profile={profile} plan={plan} />}
                />

                <Route path="/prep" element={<InterviewPrep />} />

                <Route path="/analytics" element={<Analytics plan={plan} />} />

                <Route
                  path="/saved"
                  element={<SavedJobs saved={saved} toggle={toggle} />}
                />

                <Route
                  path="/settings"
                  element={<SettingsView profile={profile} />}
                />

                <Route
                  path="/pricing"
                  element={<Pricing profile={profile} refresh={refresh} />}
                />

                <Route
                  path="/billing"
                  element={<Billing profile={profile} />}
                />
              </Routes>
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
