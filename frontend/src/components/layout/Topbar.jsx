import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  CreditCard,
  FileText,
  Menu,
  Search,
  Settings,
} from "lucide-react";
import Pill from "../ui/Pill";
import { PLAN_LABEL, isPaidPlan } from "../../utils/plan";

export default function Topbar({ profile, setOpen }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [cardOpen, setCardOpen] = useState(false);
  const cardRef = useRef(null);

  // Close the profile card on click-outside or Escape.
  useEffect(() => {
    if (!cardOpen) return;
    const onDown = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) setCardOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setCardOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [cardOpen]);

  function submitSearch(e) {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/matches?q=${encodeURIComponent(q)}` : "/matches");
  }

  function go(path) {
    setCardOpen(false);
    navigate(path);
  }

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const plan = profile?.plan || "free";

  const menuItem =
    "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition";

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/85 backdrop-blur border-b border-slate-100 flex items-center gap-3 px-4 sm:px-6">
      <button
        className="lg:hidden text-slate-500"
        onClick={() => setOpen(true)}
        aria-label="Menu"
      >
        <Menu />
      </button>

      <form onSubmit={submitSearch} className="relative hidden sm:block ml-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search jobs, companies..."
          className="w-56 lg:w-80 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm outline-none focus:bg-white focus:border-brand transition"
        />
      </form>

      <div className="ml-auto flex items-center gap-3">
        <button
          className="relative rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand" />
        </button>

        <div className="relative" ref={cardRef}>
          <button
            onClick={() => setCardOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-slate-50 transition"
            aria-label="Profile menu"
            aria-expanded={cardOpen}
          >
            <div className="h-9 w-9 rounded-full bg-brand-grad flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
            <span className="hidden sm:block text-sm font-semibold text-slate-800">
              {profile?.full_name || "Loading..."}
            </span>
            <ChevronDown
              size={14}
              className={
                "hidden sm:block text-slate-400 transition-transform " +
                (cardOpen ? "rotate-180" : "")
              }
            />
          </button>

          {cardOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60 p-2 z-30">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <div className="h-11 w-11 rounded-full bg-brand-grad flex items-center justify-center text-white font-bold shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-sm truncate">
                    {profile?.full_name || "User"}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {profile?.email || ""}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-xs font-semibold text-slate-500">Plan</span>
                <Pill
                  className={
                    isPaidPlan(plan)
                      ? "bg-brand-50 brand"
                      : "bg-slate-100 text-slate-600"
                  }
                >
                  {PLAN_LABEL[plan] || plan}
                </Pill>
              </div>

              <div className="h-px bg-slate-100 my-1" />

              <button onClick={() => go("/settings")} className={menuItem}>
                <Settings size={16} /> Profile & Settings
              </button>
              <button onClick={() => go("/resume")} className={menuItem}>
                <FileText size={16} /> My Resume
              </button>
              <button
                onClick={() => go(isPaidPlan(plan) ? "/billing" : "/pricing")}
                className={menuItem}
              >
                <CreditCard size={16} />{" "}
                {isPaidPlan(plan) ? "Billing" : "Upgrade plan"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
