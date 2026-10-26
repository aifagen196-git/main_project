import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import AuthScreen from "./components/AuthScreen";
import ResetPasswordScreen from "./components/ResetPasswordScreen";
import { auth } from "./lib/authClient";
import { useProfile } from "./hooks/useProfile";
import { signOut } from "./services/auth";
import { DEV_PREVIEW } from "./devPreview";
import AppShell from "./components/layout/AppShell";
import Pricing from "./pages/Pricing";
import AboutPage from "./components/marketing/AboutPage";
import InnovationLabs from "./components/marketing/InnovationLabs";
import CaseStudies from "./components/marketing/CaseStudies";
import Services from "./components/marketing/Services";
import Products from "./components/marketing/Products";
import Contact from "./components/marketing/Contact";
import Collaborate from "./components/marketing/Collaborate";
import Partners from "./components/marketing/Partners";
import PrivacyPolicy from "./components/marketing/PrivacyPolicy";
import Terms from "./components/marketing/Terms";
import { isSubscribed } from "./utils/plan";
import LandingPage from "./components/landing/LandingPage";
import { Loader2 } from "lucide-react";

// The app's root: decides between the marketing site, sign-in, password
// reset, the plan picker and the signed-in app. The landing page lives in
// components/landing/, the other marketing pages in components/marketing/.

// Read synchronously at load: the auth client strips the recovery tokens from
// the URL once it has parsed them (lib/authClient.js consumeUrlSession).
const RECOVERY_AT_LOAD =
  /(^|[#&])type=recovery(&|$)/.test(window.location.hash) ||
  new URLSearchParams(window.location.search).has("recovery");

// The legal pages answer at their own URLs (aifagenlabs.com/privacy, /terms):
// payment and SMS providers ask for a link that opens the policy itself. The
// rest of the marketing site stays on "/".
const LEGAL_PAGES = { "/privacy": "privacy", "/privacy-policy": "privacy", "/terms": "terms" };
const legalPageAt = (path) => LEGAL_PAGES[path.replace(/\/+$/, "")] || null;

// Inner marketing pages by id (the landing page is the default).
const MARKETING_PAGES = {
  about: AboutPage,
  innovation: InnovationLabs,
  caseStudies: CaseStudies,
  services: Services,
  products: Products,
  contact: Contact,
  collaborate: Collaborate,
  partners: Partners,
  privacy: PrivacyPolicy,
  terms: Terms,
};

/* ===================== ROOT ===================== */
export default function AIFAGen() {
  const [recovering, setRecovering] = useState(RECOVERY_AT_LOAD);
  useEffect(() => {
    return auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
    });
  }, []);
  const endRecovery = (toApp) => {
    setRecovering(false);
    window.history.replaceState({}, "", window.location.pathname);
    if (toApp) setMode("app");
  };

  const [mode, setMode] = useState(() =>
    // ?preview opens straight into the signed-in app (see src/devPreview.js).
    DEV_PREVIEW
      ? "app"
      : legalPageAt(window.location.pathname)
      ? "marketing"
      : localStorage.getItem("mode") || "marketing",
  );
  const [marketingPage, setMarketingPage] = useState(
    () => legalPageAt(window.location.pathname) || "home",
  );

  // Leaving a legal page opened from its link: drop /privacy or /terms from
  // the address bar so a reload doesn't reopen it.
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (mode !== "marketing") return;
    if (legalPageAt(location.pathname) && legalPageAt(location.pathname) !== marketingPage) {
      navigate("/", { replace: true });
    }
  }, [mode, marketingPage, location.pathname, navigate]);

  const { user, loading } = useAuth();

  // Only a logged-IN user's "app" mode should survive a reload or a new tab.
  // Persisting "app" while logged out is what trapped users on the login
  // screen — every new tab reopened login with no way back. For logged-out
  // users we clear the flag, so a fresh tab always defaults to the landing page.
  useEffect(() => {
    if (user && mode === "app") localStorage.setItem("mode", "app");
    else localStorage.removeItem("mode");
  }, [mode, user]);

  // Detect logout (was authenticated, now isn't) and return to the landing
  // page. We can't bounce every logged-out user to marketing — clicking
  // "Get Started" from the landing page intentionally shows the login screen
  // with user still null — so we only redirect on the authenticated→null edge.
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (prevUserRef.current && !user) {
      localStorage.removeItem("view");
      setMarketingPage("home");
      setMode("marketing");
    }
    prevUserRef.current = user;
  }, [user]);

  const {
    profile,
    loading: profileLoading,
    refresh,
    error: profileError,
  } = useProfile(user);

  // Navigate to a marketing page; if already on it, scroll to top so the click responds.
  const goTo = (p) => {
    if (p === marketingPage) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setMarketingPage(p);
    }
  };

  const Splash = ({ text }) => (
    <div className="page-bg min-h-screen flex flex-col items-center justify-center gap-3 text-slate-500">
      <Loader2 size={28} className="animate-spin brand" />
      <span className="text-sm font-semibold">{text}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="font-body">
        <Splash text="Loading…" />
      </div>
    );
  }

  if (recovering) {
    return (
      <div className="font-body">
        <ResetPasswordScreen
          hasSession={!!user}
          onDone={() => endRecovery(true)}
          onCancel={() => endRecovery(false)}
        />
      </div>
    );
  }

  const MarketingPage = MARKETING_PAGES[marketingPage];

  return (
    <div className="font-body">
      {mode === "marketing" ? (
        MarketingPage ? (
          <MarketingPage
            home={() => setMarketingPage("home")}
            enter={() => setMode("app")}
            go={goTo}
          />
        ) : (
          <LandingPage enter={() => setMode("app")} go={goTo} />
        )
      ) : !user ? (
        <AuthScreen
          onBack={() => {
            setMarketingPage("home");
            setMode("marketing");
          }}
        />
      ) : profileError && !profile ? (
        // A failed profile fetch previously fell through to the loading splash
        // and stuck there forever (no retry path). Surface it instead.
        <div className="page-bg min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <h2 className="font-display text-xl font-bold text-slate-900">
            Couldn't load your account
          </h2>
          <p className="text-sm text-slate-500 max-w-sm">{profileError}</p>
          <div className="flex gap-3">
            <button
              onClick={() => refresh()}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Retry
            </button>
            <button
              onClick={() => signOut().catch(() => {})}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      ) : profileLoading || !profile ? (
        <Splash text="Loading your account…" />
      ) : !isSubscribed(profile) ? (
        // New / lapsed user → must pick a plan (or start the free trial)
        // before entering the app.
        <Pricing profile={profile} refresh={refresh} onboarding />
      ) : (
        <AppShell
          profile={profile}
          refresh={refresh}
          exit={() => {
            localStorage.removeItem("mode");
            localStorage.removeItem("view");
            setMode("marketing");
          }}
        />
      )}
    </div>
  );
}
