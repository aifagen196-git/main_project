import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "./hooks/useAuth";
import AuthScreen from "./components/AuthScreen";
import { useProfile } from "./hooks/useProfile";
import { signOut } from "./services/auth";
import AppShell from "./components/layout/AppShell";
import Card from "./components/common/Card";
import Pricing from "./pages/Pricing";
import { isSubscribed } from "./utils/plan";
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
import {
  Sparkles,
  Briefcase,
  FileText,
  MessageSquare,
  Zap,
  Search,
  Upload,
  Pencil,
  CheckCircle2,
  Check,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Menu,
  X,
  Bell,
  LayoutDashboard,
  Bookmark,
  BookmarkCheck,
  MapPin,
  Clock,
  TrendingUp,
  Calendar,
  Target,
  Trophy,
  Eye,
  Send,
  Loader2,
  CreditCard,
  Settings as SettingsIcon,
  Shield,
  Lock,
  Globe,
  Linkedin,
  Instagram,
  Twitter,
  Github,
  Phone,
  Download,
  Plus,
  Star,
  Crown,
  Rocket,
  BarChart3,
  Mail,
  Wand2,
  CircleDollarSign,
  BadgeCheck,
  GraduationCap,
  Mic,
  HelpCircle,
  LogOut,
} from "lucide-react";

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sora:wght@600;700;800&family=JetBrains+Mono:wght@600;700&display=swap');
.font-body{font-family:'Plus Jakarta Sans',ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.font-display{font-family:'Sora','Plus Jakarta Sans',sans-serif;letter-spacing:-.02em}
.num{font-family:'JetBrains Mono',monospace;font-feature-settings:"tnum"}
.brand{color:#6d4aff}
.bg-brand{background:#6d4aff}
.bg-brand-50{background:#f3efff}
.bg-brand-100{background:#e7e0ff}
.border-brand{border-color:#6d4aff}
.bg-brand-grad{background:linear-gradient(135deg,#7b5bff,#5a2fe6)}
.btn-brand{background:#6d4aff;color:#fff}
.btn-brand:hover{background:#5a2fe6}
.page-bg{background:#f6f6fb}
.hero-bg{background:radial-gradient(900px 500px at 80% 0%,rgba(124,91,255,.10),transparent 60%),radial-gradient(700px 400px at 60% 40%,rgba(244,114,182,.06),transparent 60%),#f8f8fc}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.fadeUp{animation:fadeUp .6s cubic-bezier(.2,.7,.2,1) both}
@keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
.floaty{animation:floaty 6s ease-in-out infinite}
.card{transition:transform .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s,border-color .25s}
.card:hover{transform:translateY(-3px);box-shadow:0 20px 45px -22px rgba(40,20,90,.30)}
.scroll::-webkit-scrollbar{width:8px;height:8px}
.scroll::-webkit-scrollbar-thumb{background:#cdd2e0;border-radius:9px}
*{scrollbar-width:thin;scrollbar-color:#cdd2e0 transparent}
.lift{transition:transform .2s}.lift:hover{transform:translateY(-2px)}
`;

const bBrand =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white btn-brand transition shadow-sm";
const bBrandSm =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white btn-brand transition";
const bOutline =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition";
const bOutlineSm =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition";
const bGhostSm =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold brand bg-brand-50 hover:bg-brand-100 transition";
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-brand transition";

const FEATURES = [
  {
    icon: Target,
    tint: "violet",
    t: "Smart Job Matching",
    d: "AI finds the most relevant jobs based on your skills, experience, and career goals.",
  },
  {
    icon: FileText,
    tint: "emerald",
    t: "Resume Optimization",
    d: "Get AI-powered suggestions to improve your resume and pass ATS scans.",
  },
  {
    icon: MessageSquare,
    tint: "rose",
    t: "Interview Preparation",
    d: "Practice with role-specific questions and get expert AI feedback.",
  },
  {
    icon: Zap,
    tint: "sky",
    t: "Application Accelerator",
    d: "Apply smarter and faster with AI-generated cover letters and tailored applications.",
  },
];
const STEPS = [
  {
    icon: Upload,
    t: "Create Your Profile",
    d: "Add your experience and career preferences.",
  },
  {
    icon: Search,
    t: "AI Finds Best Matches",
    d: "We scan thousands of jobs to find the perfect ones for you.",
  },
  {
    icon: Pencil,
    t: "Optimize & Apply",
    d: "AI optimizes your resume and creates tailored applications.",
  },
  {
    icon: CheckCircle2,
    t: "Get Interviews",
    d: "Stand out, get noticed, and land more interviews.",
  },
];
const PLANS = [
  {
    name: "Free",
    price: 0,
    tagline: "Get started and explore AIFAGen.",
    cta: "Get Started Free",
    popular: false,
    features: [
      "AI Job Matching (5 / day)",
      "Resume Analysis",
      "Basic Interview Prep",
      "Application Tracking",
      "Career Insights",
    ],
  },
  {
    name: "Professional",
    price: 19,
    tagline: "Everything you need to get more interviews.",
    cta: "Start 7-Day Free Trial",
    popular: true,
    features: [
      "Unlimited AI Job Matches",
      "AI Resume Optimization",
      "Advanced Interview Prep",
      "AI Cover Letter Generator",
      "Application Tracking & Analytics",
      "Priority Support",
    ],
  },
  {
    name: "Career Accelerator",
    price: 49,
    tagline: "For serious professionals who want faster results.",
    cta: "Start 7-Day Free Trial",
    popular: false,
    features: [
      "AI Application Automation",
      "Personalized Career Roadmap",
      "Salary Insights & Negotiation",
      "Dedicated Career Coach (AI)",
      "Early Access to New Features",
    ],
  },
];
const FAQS = [
  {
    q: "Can I change my plan later?",
    a: "Yes — upgrade, downgrade, or cancel anytime from your billing settings. Changes take effect at your next cycle.",
  },
  {
    q: "Is there a free trial?",
    a: "Paid plans include a 7-day free trial. No credit card required to start.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major cards via Stripe, plus regional methods. Annual billing saves 20%.",
  },
];

const LOGOS = {
  S: "#0f172a",
  G: "#3b82f6",
  A: "#f43f5e",
  M: "#0ea5e9",
  N: "#0f172a",
  Sp: "#22c55e",
  Am: "#f59e0b",
  Ca: "#8b5cf6",
  U: "#0f172a",
  I: "#2563eb",
};
const JOBS = [
  {
    id: 1,
    t: "Senior Product Designer",
    c: "Stripe",
    lg: "S",
    remote: "Remote",
    type: "Full-time",
    pay: "$140K–$180K",
    tags: ["Product Design", "Figma", "User Research", "Prototyping"],
    match: 95,
    featured: true,
  },
  {
    id: 2,
    t: "Product Designer",
    c: "Google",
    lg: "G",
    remote: "Remote",
    type: "Full-time",
    pay: "$120K–$160K",
    tags: ["Product Design", "UX Design", "Figma"],
    match: 92,
  },
  {
    id: 3,
    t: "UX Designer",
    c: "Airbnb",
    lg: "A",
    remote: "Remote",
    type: "Full-time",
    pay: "$110K–$140K",
    tags: ["UX Design", "User Research", "Figma"],
    match: 89,
  },
  {
    id: 4,
    t: "Product Designer II",
    c: "Microsoft",
    lg: "M",
    remote: "Redmond, WA (Hybrid)",
    type: "Full-time",
    pay: "$115K–$150K",
    tags: ["Product Design", "Design Systems", "Figma"],
    match: 87,
  },
  {
    id: 5,
    t: "UX Researcher",
    c: "Spotify",
    lg: "Sp",
    remote: "Remote",
    type: "Full-time",
    pay: "$100K–$130K",
    tags: ["User Research", "Usability Testing"],
    match: 84,
  },
  {
    id: 6,
    t: "Product Designer",
    c: "Notion",
    lg: "N",
    remote: "Remote",
    type: "Full-time",
    pay: "$120K–$155K",
    tags: ["Product Design", "Design Systems"],
    match: 81,
  },
];
const STAT_TINT = {
  violet: { bg: "bg-brand-50", fg: "brand" },
  emerald: { bg: "bg-emerald-50", fg: "text-emerald-600" },
  rose: { bg: "bg-rose-50", fg: "text-rose-600" },
  sky: { bg: "bg-sky-50", fg: "text-sky-600" },
  amber: { bg: "bg-amber-50", fg: "text-amber-600" },
};
const DASH_STATS = [
  {
    t: "Job Matches",
    v: "128",
    d: "24 new matches",
    icon: Briefcase,
    tint: "violet",
  },
  { t: "Applications", v: "34", d: "8 this week", icon: Send, tint: "emerald" },
  {
    t: "Interviews",
    v: "5",
    d: "2 this week",
    icon: MessageSquare,
    tint: "rose",
  },
  { t: "Offers", v: "2", d: "Keep it up!", icon: BadgeCheck, tint: "sky" },
];
const OUTCOME = [
  { n: "Applied", v: 24, c: "#6d4aff" },
  { n: "Interviewing", v: 8, c: "#f43f5e" },
  { n: "Assessment", v: 5, c: "#f59e0b" },
  { n: "Offered", v: 2, c: "#22c55e" },
  { n: "Rejected", v: 10, c: "#cbd5e1" },
];
const TASKS = [
  {
    t: "Prepare for Google interview",
    s: "Product Designer · In 2 days",
    icon: Calendar,
  },
  { t: "Optimize resume for UX roles", s: "High impact", icon: FileText },
  { t: "Follow up with Airbnb", s: "Applied 5 days ago", icon: Mail },
  { t: "Complete skills assessment", s: "Due in 3 days", icon: Target },
];
const APP_COLS = [
  {
    k: "Applied",
    dot: "bg-brand",
    items: [
      {
        c: "Stripe",
        lg: "S",
        r: "Senior Product Designer",
        w: "2 days ago",
        m: 95,
      },
      { c: "Google", lg: "G", r: "Product Designer", w: "5 days ago", m: 92 },
      { c: "Airbnb", lg: "A", r: "UX Designer", w: "1 week ago", m: 89 },
    ],
  },
  {
    k: "Interviewing",
    dot: "bg-amber-400",
    items: [
      { c: "Microsoft", lg: "M", r: "Product Designer", w: "Round 1", m: 88 },
      { c: "Notion", lg: "N", r: "UX Researcher", w: "Round 2", m: 85 },
      { c: "Canva", lg: "Ca", r: "Product Designer", w: "Take Home", m: 83 },
    ],
  },
  {
    k: "Assessment",
    dot: "bg-sky-400",
    items: [
      { c: "Amazon", lg: "Am", r: "Product Designer", w: "Take Home", m: 80 },
      { c: "Spotify", lg: "Sp", r: "UX Designer", w: "Skills Test", m: 78 },
    ],
  },
  {
    k: "Offer",
    dot: "bg-emerald-500",
    items: [
      {
        c: "Linear",
        lg: "I",
        r: "Senior Product Designer",
        w: "Offer received",
        m: 95,
      },
      {
        c: "Figma",
        lg: "U",
        r: "Product Designer",
        w: "Offer received",
        m: 92,
      },
    ],
  },
  {
    k: "Rejected",
    dot: "bg-rose-400",
    items: [
      { c: "Twitter", lg: "G", r: "UX Designer", w: "Closed", m: 0 },
      { c: "Pinterest", lg: "A", r: "Product Designer", w: "Closed", m: 0 },
    ],
  },
];
const APP_STATS = [
  {
    t: "Applications",
    v: "39",
    d: "12 this month",
    icon: FileText,
    tint: "violet",
  },
  {
    t: "Interviewing",
    v: "8",
    d: "3 this month",
    icon: MessageSquare,
    tint: "amber",
  },
  { t: "Offers", v: "2", d: "1 this month", icon: BadgeCheck, tint: "emerald" },
  {
    t: "Response Rate",
    v: "26%",
    d: "8% this month",
    icon: TrendingUp,
    tint: "sky",
  },
  {
    t: "Avg. Response",
    v: "6.4d",
    d: "1.2d faster",
    icon: Clock,
    tint: "violet",
  },
];
const TREND = [
  { d: "May 1", a: 2, i: 1 },
  { d: "May 6", a: 9, i: 2 },
  { d: "May 11", a: 16, i: 4 },
  { d: "May 16", a: 24, i: 6 },
  { d: "May 21", a: 33, i: 9 },
  { d: "May 26", a: 42, i: 11 },
  { d: "May 31", a: 48, i: 12 },
];
const ANA_STATS = [
  {
    t: "Applications",
    v: "48",
    d: "20% vs last",
    icon: FileText,
    tint: "violet",
  },
  {
    t: "Response Rate",
    v: "27%",
    d: "6% vs last",
    icon: Mail,
    tint: "emerald",
  },
  { t: "Interviews", v: "12", d: "33% vs last", icon: Calendar, tint: "amber" },
  { t: "Offers", v: "3", d: "50% vs last", icon: BadgeCheck, tint: "sky" },
  {
    t: "Avg. Response",
    v: "6.4d",
    d: "1.2d faster",
    icon: Clock,
    tint: "violet",
  },
];
const SOURCES = [
  ["AIFAGen Matches", 42],
  ["LinkedIn", 25],
  ["Careers Page", 15],
  ["Referral", 10],
  ["Other", 8],
];
const CATS = [
  ["Product Design", 5],
  ["UX/UI Design", 4],
  ["Product Management", 2],
  ["User Research", 1],
];
const RESUME_BREAK = [
  ["Impact", 85],
  ["Skills", 80],
  ["Experience", 88],
  ["Presentation", 82],
];
const SKILLS_FOUND = [
  "Product Design",
  "Figma",
  "UI/UX Design",
  "User Research",
  "Prototyping",
  "Wireframing",
  "Design Systems",
];
const SKILLS_ADD = ["User Analytics", "A/B Testing", "Frontend Basics"];
const PREP_STATS = [
  { t: "Mock Interviews", v: "6", d: "2 this week", icon: Mic, tint: "violet" },
  { t: "Avg. Score", v: "78%", d: "8% vs last", icon: Target, tint: "amber" },
  {
    t: "Questions",
    v: "142",
    d: "24 this week",
    icon: HelpCircle,
    tint: "emerald",
  },
  { t: "Confidence", v: "High", d: "Improving", icon: TrendingUp, tint: "sky" },
];
const PREP_SKILLS = [
  ["Product Design", 85],
  ["UX Research", 72],
  ["Design Systems", 65],
  ["User Testing", 60],
  ["Figma", 80],
];
const PERF = [
  { x: "Apr 29", v: 62 },
  { x: "May 6", v: 58 },
  { x: "May 13", v: 66 },
  { x: "May 20", v: 74 },
  { x: "May 27", v: 78 },
];

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "matches", label: "Job Matches", icon: Briefcase },
  { id: "applications", label: "Applications", icon: FileText },
  { id: "resume", label: "Resume", icon: FileText },
  { id: "prep", label: "Interview Prep", icon: MessageSquare },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "saved", label: "Saved Jobs", icon: Bookmark },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

console.log("AIFAGen rendered");
async function callClaude(prompt, system) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error("api");
  const data = await res.json();
  return (data.content || [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

function Mark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="mk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7b5bff" />
          <stop offset="1" stopColor="#5a2fe6" />
        </linearGradient>
      </defs>
      <path
        d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z"
        fill="url(#mk)"
      />
    </svg>
  );
}
function Switch({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={
        (on ? "bg-brand" : "bg-slate-300") +
        " relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
      }
    >
      <span
        className={
          (on ? "translate-x-6" : "translate-x-1") +
          " inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
        }
      />
    </button>
  );
}

function MarketingNav({ enter }) {
  const [open, setOpen] = useState(false);
  const links = ["Features", "How It Works", "FAQ"];
  const SECTION_IDS = {
    Features: "features",
    "How It Works": "how-it-works",
    FAQ: "faq",
  };
  const scrollTo = (e, label) => {
    e.preventDefault();
    setOpen(false);
    const el = document.getElementById(SECTION_IDS[label]);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 64; // sticky header height
    window.scrollTo({ top, behavior: "smooth" });
  };
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-3 relative">
        <button onClick={enter} className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="AIFAGen"
            className="h-8 w-8 object-contain"
          />{" "}
          <span className="font-display text-2xl font-extrabold text-slate-900 leading-none">
            AIFAGen
          </span>
          {/* <span className="font-display text-lg font-extrabold text-slate-900">
            AIFAGen
          </span> */}
        </button>
        <nav className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
          {links.map((l) => (
            <a
              key={l}
              href={`#${SECTION_IDS[l]}`}
              onClick={(e) => scrollTo(e, l)}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              {l}
              {l === "Resources" && <ChevronDown size={14} />}
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3 ml-auto">
          <button onClick={enter} className={bOutline}>
            {" "}
            Login{" "}
          </button>
        </div>
        <button
          className="md:hidden ml-auto text-slate-600"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-slate-100 px-5 py-3 space-y-2">
          {links.map((l) => (
            <a
              key={l}
              href={`#${SECTION_IDS[l]}`}
              onClick={(e) => scrollTo(e, l)}
              className="block text-sm font-semibold text-slate-700 py-1"
            >
              {l}
            </a>
          ))}
          <button onClick={enter} className={bBrand}>
            Get Your Career Plan
          </button>
        </div>
      )}
    </header>
  );
}
function HeroCard({ icon: Icon, tint, t, d, className, style }) {
  const map = {
    violet: "bg-brand-50 brand",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div
      className={
        "absolute rounded-2xl bg-white border border-slate-100 shadow-xl p-4 w-64 " +
        className
      }
      style={style}
    >
      <div className="flex items-center gap-3">
        <div
          className={
            "flex h-10 w-10 items-center justify-center rounded-xl " + map[tint]
          }
        >
          <Icon size={20} />
        </div>
        <div>
          <div className="font-bold text-slate-900 text-sm">{t}</div>
          <div className="text-xs text-slate-500">{d}</div>
        </div>
      </div>
    </div>
  );
}
function Marketing({ enter, go }) {
  const [faq, setFaq] = useState(0);
  const FOOTER_ROUTES = {
    "About Us": "about",
    "Innovation Labs": "innovation",
    "Case Studies": "caseStudies",
    Careers: "caseStudies",
    Services: "services",
    Products: "products",
    "AIFAG Suite": "products",
    LifeOS: "products",
    Contact: "contact",
    Collaborate: "collaborate",
    Partners: "partners",
    "Privacy Policy": "privacy",
    "Terms & Conditions": "terms",
  };
  return (
    <div className="font-body text-slate-800">
      <MarketingNav enter={enter} />
      {/* HERO */}
      <section className="hero-bg">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div className="fadeUp">
            <h1
              className="font-display text-4xl md:text-6xl font-extrabold text-slate-900"
              style={{ lineHeight: 1.05 }}
            >
              Stop Applying.
              <br />
              <span className="brand">Start Getting Interviews.</span>
            </h1>
            <p className="mt-5 text-lg text-slate-500 max-w-md">
              AIFAGen uses AI to find the right opportunities, optimize your
              profile, and help you move faster through the hiring process.
            </p>
            <button
              onClick={enter}
              className={bBrand + " mt-7 text-base px-6 py-3.5"}
            >
              Get Your Career Plan <ArrowRight size={18} />
            </button>
            <div className="mt-7 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["#6d4aff", "#f43f5e", "#22c55e", "#0ea5e9"].map((c, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-white"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="text-sm">
                <div className="font-bold text-slate-900">
                  Join 50,000+ job seekers
                </div>
                <div className="text-slate-500">
                  who are getting hired faster
                </div>
              </div>
            </div>
          </div>
          {/* Mobile: simple stacked cards. Desktop: floating illustration. */}
          <div className="grid gap-3 md:hidden">
            {[
              [
                Briefcase,
                "violet",
                "AI Job Matching",
                "Find roles that fit you best",
              ],
              [
                FileText,
                "emerald",
                "Resume Optimization",
                "Improve your chances",
              ],
              [
                TrendingUp,
                "rose",
                "Interview Preparation",
                "Practice and ace interviews",
              ],
            ].map((c, i) => {
              const Icon = c[0];
              const map = {
                violet: "bg-brand-50 brand",
                emerald: "bg-emerald-50 text-emerald-600",
                rose: "bg-rose-50 text-rose-600",
              };
              return (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 flex items-center gap-3"
                >
                  <div
                    className={
                      "flex h-10 w-10 items-center justify-center rounded-xl shrink-0 " +
                      map[c[1]]
                    }
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {c[2]}
                    </div>
                    <div className="text-xs text-slate-500">{c[3]}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="relative h-96 hidden md:block">
            <div className="absolute right-0 top-4 h-72 w-72 rounded-full bg-brand-50 opacity-70" />
            <HeroCard
              icon={Briefcase}
              tint="violet"
              t="AI Job Matching"
              d="Find roles that fit you best"
              className="floaty"
              style={{ top: 0, right: 30, animationDelay: "0s" }}
            />
            <HeroCard
              icon={FileText}
              tint="emerald"
              t="Resume Optimization"
              d="Improve your chances"
              className="floaty"
              style={{ top: 120, right: 0, animationDelay: ".8s" }}
            />
            <HeroCard
              icon={TrendingUp}
              tint="rose"
              t="Interview Preparation"
              d="Practice and ace interviews"
              className="floaty"
              style={{ top: 240, right: 50, animationDelay: "1.4s" }}
            />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-bold tracking-widest brand">
            POWERED BY AI. BUILT FOR YOU.
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 mt-3">
            Everything you need to stand out and land your dream role.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {FEATURES.map((f, i) => {
            const Icon = f.icon,
              t = STAT_TINT[f.tint];
            return (
              <div key={i} className="text-center lift">
                <div
                  className={
                    "inline-flex h-14 w-14 items-center justify-center rounded-2xl " +
                    t.bg
                  }
                >
                  <Icon size={26} className={t.fg} />
                </div>
                <h3 className="font-bold text-slate-900 mt-4">{f.t}</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  {f.d}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-brand-50">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
          <div className="text-center">
            <p className="text-xs font-bold tracking-widest brand">
              SIMPLE. FAST. EFFECTIVE.
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 mt-3">
              How AIFAGen Works
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="text-center relative">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md relative">
                    <Icon size={28} className="brand" />
                    <span className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mt-5">{s.t}</h3>
                  <p className="text-sm text-slate-500 mt-2">{s.d}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="resources" className="max-w-6xl mx-auto px-5 py-16 md:py-24">
        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-16">
          <h3 className="font-display text-2xl font-extrabold text-slate-900 text-center mb-6">
            Frequently Asked Questions
          </h3>
          {FAQS.map((f, i) => (
            <div key={i} className="border-b border-slate-100">
              <button
                onClick={() => setFaq(faq === i ? -1 : i)}
                className="w-full flex items-center gap-3 py-4 text-left"
              >
                <Plus
                  size={18}
                  className={
                    "brand transition " + (faq === i ? "rotate-45" : "")
                  }
                />
                <span className="font-semibold text-slate-800">{f.q}</span>
                <ChevronDown
                  size={18}
                  className={
                    "ml-auto text-slate-400 transition " +
                    (faq === i ? "rotate-180" : "")
                  }
                />
              </button>
              {faq === i && (
                <p className="text-sm text-slate-500 pb-4 pl-8">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 pb-16">
        <div className="rounded-3xl bg-brand-grad px-8 py-10 flex flex-col md:flex-row md:items-center gap-6 text-white">
          <div>
            <h3 className="font-display text-2xl md:text-3xl font-extrabold">
              Your dream role is closer than you think.
            </h3>
            <p className="text-white/85 mt-2">
              Join AIFAGen today and take the first step toward the career you
              deserve.
            </p>
          </div>
          <button
            onClick={enter}
            className="md:ml-auto shrink-0 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold brand hover:bg-white/90"
          >
            Get Your Career Plan <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200">
        {/* Newsletter band */}
        <div className="border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row md:items-center gap-6">
            <div>
              <h3 className="font-display text-2xl font-extrabold text-slate-900">
                Stay ahead with AI insights
              </h3>
              <p className="text-slate-500 mt-2">
                Get the latest on AI innovations delivered to your inbox.
              </p>
            </div>
            <div className="md:ml-auto flex w-full max-w-md gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-brand transition"
              />
              <button
                onClick={(e) => e.preventDefault()}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-brand-grad px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition"
              >
                Subscribe <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Main columns */}
        <div className="max-w-6xl mx-auto px-5 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="AIFAGen Labs" className="h-8 w-8" />
              <span className="font-display font-extrabold text-slate-900">
                AIFAGen <span className="brand">Labs</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-3 max-w-xs">
              Building Intelligent Ecosystems for the Future. AI for All
              Generations.
            </p>
            <div className="flex items-center gap-3 mt-5">
              {[
                [
                  Linkedin,
                  "LinkedIn",
                  "https://www.linkedin.com/company/aifagenlabs/",
                ],
                [Twitter, "Twitter", "https://x.com/aifagenlabs"],
                [
                  Instagram,
                  "Instagram",
                  "https://www.instagram.com/aifagen_labs?igsh=Y3hqcWJoZWgxMDU0",
                ],
                [Mail, "Email", "mailto:pmo@aifagenlabs.com"],
              ].map(([Icon, label, href], i) => (
                <a
                  key={i}
                  href={href}
                  aria-label={label}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    href.startsWith("http") ? "noopener noreferrer" : undefined
                  }
                  onClick={href === "#" ? (e) => e.preventDefault() : undefined}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-[#6d4aff] transition"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          {[
            [
              "Company",
              ["About Us", "Innovation Labs", "Case Studies", "Careers"],
            ],
            ["Solutions", ["Services", "Products", "AIFAG Suite", "LifeOS"]],
            [
              "Connect",
              [
                "Contact",
                "Collaborate",
                "Partners",
                "Privacy Policy",
                "Terms & Conditions",
              ],
            ],
          ].map((col, i) => (
            <div key={i}>
              <div className="font-bold text-slate-900 text-sm">{col[0]}</div>
              <ul className="mt-3 space-y-2">
                {col[1].map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        const p = FOOTER_ROUTES[l];
                        if (p) go?.(p);
                      }}
                      className="text-sm text-slate-500 hover:text-slate-800"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact + locations bar */}
        <div className="border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-5 py-6 flex flex-col lg:flex-row lg:items-start gap-4">
            <div className="text-sm text-slate-500 space-y-2">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="inline-flex items-center gap-2">
                  <Globe size={15} className="text-slate-400" />
                  Global Operations
                </span>
                <a
                  href="mailto:pmo@aifagenlabs.com"
                  className="inline-flex items-center gap-2 hover:text-slate-800 transition"
                >
                  <Mail size={15} className="text-slate-400" />
                  pmo@aifagenlabs.com
                </a>
                <a
                  href="tel:+919390693114"
                  className="inline-flex items-center gap-2 hover:text-slate-800 transition"
                >
                  <Phone size={15} className="text-slate-400" />
                  +91 93906 93114
                </a>
                <a
                  href="tel:+14752240417"
                  className="inline-flex items-center gap-2 hover:text-slate-800 transition"
                >
                  <Phone size={15} className="text-slate-400" />
                  +1 (475) 224-0417
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="inline-flex items-center gap-2">
                  <MapPin size={15} className="text-slate-400" />
                  Hyderabad, India
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin size={15} className="text-slate-400" />
                  USA: New Jersey
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-400 lg:ml-auto lg:text-right lg:pt-1">
              © 2025 AIFAGen Labs Pvt. Ltd. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ===================== ROOT ===================== */
export default function AIFAGen() {
  const [mode, setMode] = useState(
    () => localStorage.getItem("mode") || "marketing",
  );
  const [marketingPage, setMarketingPage] = useState("home");

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
  const [finalizing, setFinalizing] = useState(false);

  // Navigate to a marketing page; if already on it, scroll to top so the click responds.
  const goTo = (p) => {
    if (p === marketingPage) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setMarketingPage(p);
    }
  };

  // Handle the redirect back from Stripe Checkout.
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;

    // Always send the user into the app after a checkout attempt.
    setMode("app");

    if (checkout === "success") {
      // The webhook may take a moment; poll the profile until it's active.
      setFinalizing(true);
      let tries = 0;
      const timer = setInterval(async () => {
        tries += 1;
        const p = await refresh();
        if (isSubscribed(p) || tries >= 8) {
          clearInterval(timer);
          setFinalizing(false);
        }
      }, 2500);
    }
    // Clean the URL either way.
    window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const Splash = ({ text }) => (
    <div className="page-bg min-h-screen flex flex-col items-center justify-center gap-3 text-slate-500">
      <Loader2 size={28} className="animate-spin brand" />
      <span className="text-sm font-semibold">{text}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="font-body">
        <style>{CSS}</style>
        <Splash text="Loading…" />
      </div>
    );
  }

  return (
    <div className="font-body">
      <style>{CSS}</style>

      {mode === "marketing" ? (
        marketingPage === "about" ? (
          <AboutPage
            home={() => setMarketingPage("home")}
            enter={() => setMode("app")}
            go={goTo}
          />
        ) : marketingPage === "innovation" ? (
          <InnovationLabs
            home={() => setMarketingPage("home")}
            enter={() => setMode("app")}
            go={goTo}
          />
        ) : marketingPage === "caseStudies" ? (
          <CaseStudies
            home={() => setMarketingPage("home")}
            enter={() => setMode("app")}
            go={goTo}
          />
        ) : marketingPage === "services" ? (
          <Services
            home={() => setMarketingPage("home")}
            enter={() => setMode("app")}
            go={goTo}
          />
        ) : marketingPage === "products" ? (
          <Products
            home={() => setMarketingPage("home")}
            enter={() => setMode("app")}
            go={goTo}
          />
        ) : marketingPage === "contact" ? (
          <Contact
            home={() => setMarketingPage("home")}
            enter={() => setMode("app")}
            go={goTo}
          />
        ) : marketingPage === "collaborate" ? (
          <Collaborate
            home={() => setMarketingPage("home")}
            enter={() => setMode("app")}
            go={goTo}
          />
        ) : marketingPage === "partners" ? (
          <Partners
            home={() => setMarketingPage("home")}
            enter={() => setMode("app")}
            go={goTo}
          />
        ) : marketingPage === "privacy" ? (
          <PrivacyPolicy
            home={() => setMarketingPage("home")}
            enter={() => setMode("app")}
            go={goTo}
          />
        ) : marketingPage === "terms" ? (
          <Terms
            home={() => setMarketingPage("home")}
            enter={() => setMode("app")}
            go={goTo}
          />
        ) : (
          <Marketing enter={() => setMode("app")} go={goTo} />
        )
      ) : !user ? (
        <AuthScreen
          onBack={() => {
            setMarketingPage("home");
            setMode("marketing");
          }}
        />
      ) : finalizing ? (
        <Splash text="Confirming your subscription…" />
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
        // New / lapsed user → must pick a plan before entering the app.
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
