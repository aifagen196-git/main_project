import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "./hooks/useAuth";
import AuthScreen from "./components/AuthScreen";
import { useProfile } from "./hooks/useProfile";
import { signOut } from "./services/auth";
import { DEV_PREVIEW } from "./devPreview";
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

// Theming (fonts, brand colors, .card/.num/.btn-brand) now lives in
// tailwind.config.js + index.css, the single source of truth — this used to
// duplicate all of it inline with different values (Sora instead of
// Bricolage Grotesque, a solid .btn-brand instead of the gradient, a
// different .bg-brand-grad), and since this block renders after Tailwind's
// utilities in the DOM, its versions were silently winning every collision.
// What's left here is everything Tailwind's config doesn't cover.
const CSS = `
.font-body{font-family:'Plus Jakarta Sans',ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.page-bg{background:#f6f6fb}
.hero-bg{background:radial-gradient(900px 500px at 80% 0%,rgba(124,91,255,.10),transparent 60%),radial-gradient(700px 400px at 60% 40%,rgba(244,114,182,.06),transparent 60%),#f8f8fc}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.fadeUp{animation:fadeUp .6s cubic-bezier(.2,.7,.2,1) both}
@keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
.floaty{animation:floaty 6s ease-in-out infinite}
.scroll::-webkit-scrollbar{width:8px;height:8px}
.scroll::-webkit-scrollbar-thumb{background:#cdd2e0;border-radius:9px}
*{scrollbar-width:thin;scrollbar-color:#cdd2e0 transparent}
.lift{transition:transform .2s}.lift:hover{transform:translateY(-2px)}

/* ---------------------------------------------------------------------------
   v3 landing design system. Keyframes and hover states ported verbatim from
   the AIFAGen v3 design spec. Static properties live inline on the elements;
   only things inline styles can't express (:hover, ::after, keyframes) are
   here. Everything degrades under prefers-reduced-motion via the guard at the
   bottom of this block.
   ------------------------------------------------------------------------ */
@keyframes riseIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
@keyframes v3FadeIn{from{opacity:0}to{opacity:1}}
@keyframes sweep{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes sheen{0%{transform:translateX(-120%) skewX(-18deg)}100%{transform:translateX(320%) skewX(-18deg)}}
@keyframes drift{0%{transform:translate(0,0) scale(1)}33%{transform:translate(3%,-4%) scale(1.06)}66%{transform:translate(-3%,3%) scale(.97)}100%{transform:translate(0,0) scale(1)}}
@keyframes pop{0%{opacity:0;transform:translateY(10px) scale(.94)}60%{transform:translateY(-3px) scale(1.02)}100%{opacity:1;transform:none}}
@keyframes wordIn{0%{opacity:0;transform:translateY(.16em)}100%{opacity:1;transform:none}}
@keyframes wordInB{0%{opacity:0;transform:translateY(.16em)}100%{opacity:1;transform:none}}
@keyframes pulseRing{0%{box-shadow:0 0 0 0 rgba(109,74,255,.34)}70%{box-shadow:0 0 0 12px rgba(109,74,255,0)}100%{box-shadow:0 0 0 0 rgba(109,74,255,0)}}
@keyframes auroraA{0%,100%{transform:translate(0,0) scale(1);opacity:.5}50%{transform:translate(6%,-8%) scale(1.18);opacity:.85}}
@keyframes auroraB{0%,100%{transform:translate(0,0) scale(1.1);opacity:.45}50%{transform:translate(-7%,6%) scale(.92);opacity:.75}}
@keyframes lineDraw{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes cardFlip{0%{opacity:0;transform:perspective(900px) rotateY(-100deg)}60%{opacity:1}100%{opacity:1;transform:perspective(900px) rotateY(0)}}

.v3-navlink{transition:color .18s}
.v3-navlink:hover{color:#0F172A}
.v3-btn-outline{transition:background .18s,border-color .18s}
.v3-btn-outline:hover{background:#fff;border-color:#0F172A}
.v3-btn-dark{transition:transform .2s cubic-bezier(.2,.7,.2,1),background .2s}
.v3-btn-dark:hover{background:#6D4AFF;transform:translateY(-2px)}
.v3-btn-hero::after{content:'';position:absolute;top:0;bottom:0;left:0;width:70px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);animation:sheen 3.4s cubic-bezier(.3,.6,.3,1) 1.4s infinite}
.v3-btn-light{transition:transform .2s cubic-bezier(.2,.7,.2,1)}
.v3-btn-light:hover{transform:translateY(-2px)}
.v3-feedrow{transition:background .2s}
.v3-feedrow:hover{background:#F6F8FF}
[data-feature-card]{transition:background .25s}
[data-feature-card]:hover{background:#FBFCFF}
[data-feature-card]:hover [data-feature-chip]{transform:scale(1.08) rotate(-5deg)}
.v3-footlink{transition:color .18s}
.v3-footlink:hover{color:#0F172A}
.v3-input:focus{border-color:#6D4AFF!important;box-shadow:0 0 0 3px rgba(109,74,255,.12)}
.v3-search:focus{background:#fff!important;border-color:#6D4AFF!important;box-shadow:0 0 0 3px rgba(109,74,255,.1)}
.v3-navbtn{transition:background .22s,color .22s}
.v3-navbtn[data-active-nav="0"]:hover{background:#F8F9FE}
.v3-softbtn{transition:background .18s}
.v3-softbtn:hover{background:#F8F9FE}
.v3-dangerbtn{transition:background .18s}
.v3-dangerbtn:hover{background:#FFF0F3}
.v3-iconbtn{transition:border-color .2s}
.v3-iconbtn:hover{border-color:#0F172A}

.v3-card{transition:transform .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s}
.v3-card:hover{transform:translateY(-3px);box-shadow:0 18px 40px -26px rgba(15,23,42,.28)}
.v3-matchrow{transition:border-color .2s,background .2s,transform .2s cubic-bezier(.2,.7,.2,1)}
.v3-matchrow:hover{border-color:#DDE3EE;background:#FBFCFF;transform:translateX(3px)}
.v3-trackerbtn{transition:background .2s,border-color .2s}
.v3-trackerbtn:hover{background:#fff;border-color:#0F172A}
.v3-jobcard{transition:transform .24s cubic-bezier(.2,.7,.2,1),box-shadow .24s,border-color .24s}
.v3-jobcard:hover{transform:translateY(-3px);box-shadow:0 22px 46px -28px rgba(15,23,42,.3);border-color:#DDE3EE}
.v3-ddrow:hover{background:#F3F6FD!important}
.v3-approw{transition:transform .22s cubic-bezier(.2,.7,.2,1),box-shadow .22s}
.v3-approw:hover{transform:translateY(-2px);box-shadow:0 18px 40px -28px rgba(15,23,42,.3)}
.v3-removebtn:hover{background:#FFF0F3;color:#F43F5E}
.v3-field:focus{background:#fff!important;border-color:#6D4AFF!important}
.v3-savedcard{transition:transform .24s cubic-bezier(.2,.7,.2,1),box-shadow .24s}
.v3-savedcard:hover{transform:translateY(-4px);box-shadow:0 24px 48px -28px rgba(15,23,42,.3)}
.v3-applybtn:hover{background:#6D4AFF!important}
.v3-removecard:hover{border-color:#F43F5E!important;color:#F43F5E!important}
.v3-dangerzone:hover{background:#FFF0F3!important}
.v3-backlink:hover{color:#0F172A!important}
/* Settings: the profile card spans both rail columns once there's room. */
@media (min-width:760px){.v3-settings-wide{grid-column:span 2}}
@media (max-width:759px){.v3-settings-wide{grid-column:auto!important}}
@keyframes ddIn{from{opacity:0;transform:translateY(-6px) scaleY(.96)}to{opacity:1;transform:translateY(0) scaleY(1)}}
@keyframes expand{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
@keyframes shimmer{0%{background-position:-460px 0}100%{background-position:460px 0}}
@keyframes barGrow{from{transform:scaleY(.06)}to{transform:scaleY(1)}}

/* Dashboard grids. Stats stay two-up, the main row splits to a wide primary
   column plus a rail at 1180px, and suggestions go 1 → 2 → 3 across. */
[data-dashgrid]{display:grid;gap:16px;min-width:0}
[data-dashgrid="stats"]{grid-template-columns:1fr 1fr;gap:14px}
[data-dashgrid="main"]{grid-template-columns:1fr}
[data-dashgrid="sugg"]{grid-template-columns:1fr}
@media (max-width:560px){[data-dashgrid="stats"]{grid-template-columns:1fr}}
@media (min-width:760px){
  [data-dashgrid="sugg"]{grid-template-columns:1fr 1fr}
  [data-dashgrid="sugg"] > *:last-child{grid-column:1 / -1}
}
@media (min-width:1180px){
  [data-dashgrid="main"]{grid-template-columns:minmax(0,1.65fr) minmax(300px,1fr)}
  [data-dashgrid="sugg"]{grid-template-columns:repeat(3,minmax(0,1fr))}
  [data-dashgrid="sugg"] > *:last-child{grid-column:auto}
}

/* App shell: the sidebar is a static column on wide screens and a slide-over
   drawer below 1024px, matching the spec's [data-r="sidebar"] behaviour. */
@media (max-width:1023px){
  .v3-sidebar{position:fixed!important;top:0;left:0;bottom:0;z-index:60;transform:translateX(-102%);transition:transform .34s cubic-bezier(.2,.7,.2,1)}
  .v3-sidebar[data-open="1"]{transform:none!important}
}
@media (min-width:1024px){
  .v3-scrim{display:none!important}
}

@media (max-width:1023px){
  .v3-narrowhide{display:none!important}
}
@media (min-width:1024px){
  .v3-burger{display:none!important}
}
@media (max-width:480px){
  .v3-hdrbtns{gap:6px!important}
  .v3-hdrbtns button{padding:9px 12px!important;font-size:12.5px!important}
}
@media (prefers-reduced-motion:reduce){
  *{animation-duration:.001s!important;animation-iteration-count:1!important}
}
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

// NOTE: a `callClaude()` helper used to live here that POSTed straight to
// api.anthropic.com from the browser. It was dead code and unauthenticated, so
// it always failed — but leaving it invited someone to "fix" it by adding an
// API key, which would ship that key in the public JS bundle. All model calls
// belong on the backend (backend/src/services/ai/*), which holds the keys.

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

/* ===================== v3 LANDING =====================
   Exact port of the "AIFAGen v3" design. Palette, type ramp, spacing and
   motion are taken verbatim from the spec, so static properties are written
   inline rather than as Tailwind utilities — the spec leans on clamp() and
   precise hex values that don't map cleanly onto the token scale. Hover and
   keyframe rules live in the CSS block at the top of this file.
   ==================================================== */

const V3 = {
  brand: "#6D4AFF",
  ochre: "#F59E0B",
  clay: "#F43F5E",
  track: "#EDF0F8",
  ink: "#0F172A",
  page: "#F8F9FE",
  line: "#E8ECF5",
  lineSoft: "#EFF2FA",
  lineMid: "#DDE3EE",
  body: "#475569",
  muted: "#64748B",
  faint: "#94A3B8",
  display: "'Bricolage Grotesque',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const v3Kicker = (color) => ({
  fontFamily: V3.mono,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color,
});

const v3Score = (score) =>
  score >= 80 ? V3.brand : score >= 60 ? V3.ochre : V3.clay;

// Eased 0→1 ramp that drives the match rings filling on first paint.
function useRamp(duration = 1050) {
  const [t, setT] = useState(prefersReducedMotion() ? 1 : 0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // rAF is throttled to zero in a backgrounded or non-compositing tab, which
    // would otherwise leave every ring drawn at 0. Land on the final value
    // regardless once the ramp should have finished.
    const settle = setTimeout(() => setT(1), duration + 150);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [duration]);
  return t;
}

// Fraction of the page scrolled, for the progress bar pinned to the viewport top.
function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? Math.min(1, window.scrollY / h) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return p;
}

// Staggers a container's direct children in as it enters the viewport.
// "flip" swings cards around their Y axis; "stagger" is a softer pop.
function useRevealChildren(mode = "stagger") {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    const kids = Array.from(el.children);
    kids.forEach((k) => {
      k.style.opacity = "0";
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          kids.forEach((k, i) => {
            k.style.animation =
              mode === "flip"
                ? `cardFlip .7s cubic-bezier(.2,.7,.2,1) ${i * 110}ms both`
                : `pop .6s cubic-bezier(.2,.7,.2,1) ${i * 90}ms both`;
          });
          io.unobserve(e.target);
        });
      },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);
  return ref;
}

function V3Logo({ size = 34, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, flexShrink: 0 }}>
      <img
        src="/logo.png"
        alt="AIFAGen"
        style={{ height: size, width: size, objectFit: "contain" }}
      />
      {children}
    </div>
  );
}

function MarketingNav({ enter }) {
  const [open, setOpen] = useState(false);
  const scrollTo = (e, id) => {
    e.preventDefault();
    setOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 74,
      behavior: "smooth",
    });
  };
  const LINKS = [
    ["Features", "features"],
    ["How it works", "how-it-works"],
    ["FAQ", "faq"],
  ];
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "rgba(248,249,254,.86)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: `1px solid ${V3.line}`,
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 clamp(16px,4vw,24px)",
          height: 74,
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <V3Logo size={34}>
          <span
            style={{
              fontFamily: V3.display,
              fontSize: "clamp(19px,3vw,23px)",
              fontWeight: 700,
              letterSpacing: "-.03em",
              whiteSpace: "nowrap",
              color: V3.ink,
            }}
          >
            AIFAGen
          </span>
        </V3Logo>

        <nav
          className="v3-narrowhide"
          style={{ display: "flex", alignItems: "center", gap: 26, marginLeft: 18 }}
        >
          {LINKS.map(([label, id]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => scrollTo(e, id)}
              className="v3-navlink"
              style={{ fontSize: 14, fontWeight: 600, color: V3.body }}
            >
              {label}
            </a>
          ))}
        </nav>

        <div
          className="v3-hdrbtns"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={enter}
            className="v3-btn-outline"
            style={{
              background: "transparent",
              border: `1px solid ${V3.lineMid}`,
              borderRadius: 11,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 700,
              color: V3.ink,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Login
          </button>
          <button
            onClick={enter}
            className="v3-btn-dark"
            style={{
              background: V3.ink,
              border: "none",
              borderRadius: 11,
              padding: "11px 19px",
              fontSize: 14,
              fontWeight: 700,
              color: V3.page,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Get your career plan
          </button>
          <button
            className="v3-burger"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            style={{
              display: "inline-flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 4,
              background: "transparent",
              border: `1px solid ${V3.lineMid}`,
              borderRadius: 10,
              padding: 10,
              cursor: "pointer",
              width: 38,
              height: 38,
            }}
          >
            <span style={{ display: "block", width: 16, height: 1.8, background: V3.ink, margin: "0 auto" }} />
            <span style={{ display: "block", width: 16, height: 1.8, background: V3.ink, margin: "0 auto" }} />
          </button>
        </div>
      </div>

      {open && (
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "8px 16px 16px",
            borderTop: `1px solid ${V3.line}`,
            background: "#fff",
          }}
        >
          {LINKS.map(([label, id], i) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => scrollTo(e, id)}
              style={{
                padding: "12px 6px",
                fontSize: 15,
                fontWeight: 600,
                color: V3.ink,
                borderBottom: i < LINKS.length - 1 ? `1px solid ${V3.lineSoft}` : "none",
              }}
            >
              {label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

function RotatingWord({ words, interval = 2600 }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setI((v) => (v + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span
      key={i}
      style={{
        display: "inline-block",
        animation: prefersReducedMotion()
          ? "none"
          : `${i % 2 ? "wordInB" : "wordIn"} .5s cubic-bezier(.2,.7,.2,1) both`,
      }}
    >
      {words[i]}
    </span>
  );
}

const HERO_ROWS = [
  { initial: "S", title: "Senior Product Designer", meta: "Stripe · Remote (US)", score: 95 },
  { initial: "A", title: "Machine Learning Engineer", meta: "Anthropic · San Francisco, CA (Hybrid)", score: 92 },
  { initial: "V", title: "Frontend Engineer", meta: "Vercel · Remote (US)", score: 89 },
];

const PLACED_AT = [
  "Stripe", "Anthropic", "Vercel", "Notion", "Snowflake",
  "Cloudflare", "Okta", "Spotify", "Atlassian",
];

function HeroFeedCard({ t }) {
  const [tilt, setTilt] = useState(null);
  const onMove = (e) => {
    if (prefersReducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((e.clientY - r.top) / r.height - 0.5) * -7,
      y: ((e.clientX - r.left) / r.width - 0.5) * 9,
    });
  };
  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={() => setTilt(null)}
      style={{
        position: "relative",
        perspective: 1100,
        animation: "riseIn .9s cubic-bezier(.2,.7,.2,1) .15s both",
      }}
    >
      <div
        style={{
          background: "#fff",
          border: `1px solid ${V3.line}`,
          borderRadius: 22,
          boxShadow:
            "0 1px 2px rgba(15,23,42,.04),0 30px 70px -40px rgba(15,23,42,.3)",
          overflow: "hidden",
          transform: tilt
            ? `rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg) translateZ(0)`
            : "none",
          transition: tilt
            ? "transform .12s ease-out"
            : "transform .5s cubic-bezier(.2,.7,.2,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 20px",
            borderBottom: `1px solid ${V3.lineSoft}`,
          }}
        >
          <span style={{ ...v3Kicker(V3.faint), letterSpacing: ".14em" }}>
            Live match feed
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: V3.mono,
              fontSize: 11,
              fontWeight: 700,
              color: V3.brand,
            }}
          >
            resume parsed ✓
          </span>
        </div>

        <div style={{ padding: 8 }}>
          {HERO_ROWS.map((row) => (
            <div
              key={row.title}
              className="v3-feedrow"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "15px 14px",
                borderRadius: 15,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "#F3F6FD",
                  border: `1px solid ${V3.line}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: V3.display,
                  fontSize: 17,
                  fontWeight: 700,
                  color: V3.ink,
                  flexShrink: 0,
                }}
              >
                {row.initial}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: V3.ink,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.title}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: V3.muted,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.meta}
                </div>
              </div>
              <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: `conic-gradient(${v3Score(row.score)} ${(
                      row.score * 3.6 * t
                    ).toFixed(1)}deg, ${V3.track} 0)`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 5,
                    borderRadius: "50%",
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: V3.mono,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "-.02em",
                    color: v3Score(row.score),
                  }}
                >
                  {Math.round(row.score * t)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 20px",
            borderTop: `1px solid ${V3.lineSoft}`,
            background: "#FBFCFF",
          }}
        >
          <span style={{ fontSize: 12.5, color: V3.muted }}>
            Ranked against 12 signals from your resume
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: V3.mono,
              fontSize: 11,
              fontWeight: 700,
              color: V3.ink,
            }}
          >
            +128 more
          </span>
        </div>
      </div>

      <div
        className="v3-narrowhide"
        style={{
          position: "absolute",
          right: 22,
          top: -24,
          background: V3.ink,
          color: V3.page,
          borderRadius: 14,
          padding: "12px 18px",
          boxShadow: "0 20px 40px -22px rgba(15,23,42,.5)",
          animation: "floaty 6.5s ease-in-out infinite",
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontFamily: V3.mono,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "#A8B3C4",
          }}
        >
          ATS score
        </div>
        <div
          style={{
            fontFamily: V3.mono,
            fontSize: 26,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          88%
        </div>
      </div>
    </div>
  );
}

function Marketing({ enter, go }) {
  const [faq, setFaq] = useState(0);
  const t = useRamp();
  const scroll = useScrollProgress();
  const featuresRef = useRevealChildren("flip");
  const stepsRef = useRevealChildren("stagger");
  const faqRef = useRevealChildren("stagger");

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

  const FEATURE_CARDS = [
    { icon: Target, color: V3.brand, t: "Smart Job Matching", d: "AI finds the most relevant jobs based on your skills, experience, and career goals." },
    { icon: FileText, color: V3.ochre, t: "Resume Optimization", d: "Get AI-powered suggestions to improve your resume and pass ATS scans." },
    { icon: MessageSquare, color: V3.clay, t: "Interview Preparation", d: "Practice with role-specific questions and get expert AI feedback." },
    { icon: Zap, color: "#334155", t: "Application Accelerator", d: "Apply smarter and faster with AI-generated cover letters and tailored applications." },
  ];

  const STEP_CARDS = [
    { t: "Create Your Profile", d: "Add your experience and career preferences." },
    { t: "AI Finds Best Matches", d: "We scan thousands of jobs to find the perfect ones for you." },
    { t: "Optimize & Apply", d: "AI optimizes your resume and creates tailored applications." },
    { t: "Get Interviews", d: "Stand out, get noticed, and land more interviews." },
  ];

  const FOOTER_COLS = [
    { title: "Company", links: ["About Us", "Innovation Labs", "Case Studies", "Careers"] },
    { title: "Solutions", links: ["Services", "Products", "AIFAG Suite", "LifeOS"] },
    { title: "Connect", links: ["Contact", "Collaborate", "Partners", "Privacy Policy", "Terms & Conditions"] },
  ];

  const h2Style = {
    fontFamily: V3.display,
    fontSize: "clamp(30px,3.6vw,46px)",
    lineHeight: 1.05,
    letterSpacing: "-.035em",
    fontWeight: 700,
    margin: "16px 0 0",
  };

  return (
    <div className="font-body" style={{ background: V3.page, color: V3.ink }}>
      {/* Scroll progress */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: 60,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(scroll * 100).toFixed(2)}%`,
            background: `linear-gradient(90deg,${V3.brand},${V3.ochre})`,
            transition: "width .1s linear",
          }}
        />
      </div>

      <MarketingNav enter={enter} />

      {/* ---------------- HERO ---------------- */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 50% 50%,rgba(109,74,255,.16),rgba(109,74,255,0) 68%)",
            animation: "drift 22s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: -160,
            left: -120,
            width: 460,
            height: 460,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 50% 50%,rgba(168,121,42,.14),rgba(168,121,42,0) 68%)",
            animation: "drift 28s ease-in-out -8s infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            maxWidth: 1180,
            margin: "0 auto",
            padding: "clamp(44px,6vw,86px) 24px clamp(40px,5vw,64px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))",
            gap: "clamp(36px,5vw,64px)",
            alignItems: "center",
          }}
        >
          <div style={{ animation: "riseIn .8s cubic-bezier(.2,.7,.2,1) both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 22 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: V3.brand,
                  animation: "blink 2.4s ease-in-out infinite",
                }}
              />
              <span style={v3Kicker(V3.muted)}>AI career engine</span>
            </div>

            <h1
              style={{
                fontFamily: V3.display,
                fontSize: "clamp(42px,6.2vw,74px)",
                lineHeight: 0.96,
                letterSpacing: "-.04em",
                fontWeight: 700,
                margin: 0,
                color: V3.ink,
              }}
            >
              Stop Applying.
              <br />
              <span style={{ color: V3.brand, position: "relative", display: "inline-block" }}>
                Start Getting{" "}
                <RotatingWord words={["Interviews", "Offers", "Callbacks", "Hired"]} />.
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: ".06em",
                    height: 5,
                    background: V3.brand,
                    opacity: 0.18,
                    transformOrigin: "left",
                    animation: "sweep 1s cubic-bezier(.2,.7,.2,1) .55s both",
                  }}
                />
              </span>
            </h1>

            <p
              style={{
                margin: "24px 0 0",
                fontSize: "clamp(16px,1.5vw,19px)",
                lineHeight: 1.55,
                color: V3.body,
                maxWidth: "30em",
              }}
            >
              AIFAGen uses AI to find the right opportunities, optimize your
              profile, and help you move faster through the hiring process.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
              <button
                onClick={enter}
                className="v3-btn-dark v3-btn-hero"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  whiteSpace: "nowrap",
                  background: V3.ink,
                  border: "none",
                  borderRadius: 13,
                  padding: "16px 26px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: V3.page,
                  cursor: "pointer",
                  animation: "pulseRing 3.4s ease-out 1.4s infinite",
                }}
              >
                Get Your Career Plan <span style={{ fontSize: 17 }}>→</span>
              </button>
              <a
                href="#how-it-works"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  whiteSpace: "nowrap",
                  background: "#fff",
                  border: `1px solid ${V3.lineMid}`,
                  borderRadius: 13,
                  padding: "16px 24px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: V3.ink,
                }}
              >
                See how it works
              </a>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 34 }}>
              <div style={{ display: "flex" }}>
                {[V3.brand, V3.clay, V3.ochre, V3.ink].map((c, i) => (
                  <span
                    key={c}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      border: `2px solid ${V3.page}`,
                      background: c,
                      marginLeft: i === 0 ? 0 : -11,
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.4 }}>
                <div style={{ fontWeight: 700, color: V3.ink }}>
                  Join 50,000+ job seekers
                </div>
                <div style={{ color: V3.muted }}>who are getting hired faster</div>
              </div>
            </div>
          </div>

          <HeroFeedCard t={t} />
        </div>
      </section>

      {/* ---------------- MARQUEE ---------------- */}
      <div
        style={{
          borderTop: `1px solid ${V3.line}`,
          borderBottom: `1px solid ${V3.line}`,
          background: "#F2F5FC",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            gap: 26,
          }}
        >
          <span
            style={{
              flexShrink: 0,
              ...v3Kicker(V3.faint),
              letterSpacing: ".14em",
            }}
          >
            Candidates placed at
          </span>
          <div
            style={{
              position: "relative",
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              maskImage:
                "linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)",
              WebkitMaskImage:
                "linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent)",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "max-content",
                gap: 44,
                animation: "marquee 26s linear infinite",
              }}
            >
              {[...PLACED_AT, ...PLACED_AT].map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  style={{
                    fontFamily: V3.display,
                    fontSize: 17,
                    fontWeight: 600,
                    letterSpacing: "-.02em",
                    color: V3.body,
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- FEATURES ---------------- */}
      <section
        id="features"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "clamp(56px,7vw,96px) 24px",
        }}
      >
        <div style={{ maxWidth: "34em" }}>
          <span style={v3Kicker(V3.brand)}>Powered by AI. Built for you.</span>
          <h2 style={{ ...h2Style, color: V3.ink }}>
            Everything you need to stand out and land your dream role.
          </h2>
        </div>
        <div
          ref={featuresRef}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(238px,1fr))",
            gap: 1,
            marginTop: 52,
            background: V3.line,
            border: `1px solid ${V3.line}`,
            borderRadius: 20,
            overflow: "hidden",
            perspective: 1200,
          }}
        >
          {FEATURE_CARDS.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.t}
                data-feature-card="1"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background: "#fff",
                  padding: "30px 26px 34px",
                  transformStyle: "preserve-3d",
                }}
              >
                <div
                  style={{
                    fontFamily: V3.mono,
                    fontSize: 11,
                    fontWeight: 700,
                    color: V3.faint,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  data-feature-chip="1"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    marginTop: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform .5s cubic-bezier(.34,1.4,.4,1)",
                    background: f.color,
                    opacity: 0.92,
                  }}
                >
                  <Icon size={18} color="#fff" strokeWidth={2} />
                </div>
                <h3
                  style={{
                    fontFamily: V3.display,
                    fontSize: 19,
                    fontWeight: 700,
                    letterSpacing: "-.02em",
                    margin: "20px 0 0",
                    color: V3.ink,
                  }}
                >
                  {f.t}
                </h3>
                <p
                  style={{
                    margin: "9px 0 0",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: V3.muted,
                  }}
                >
                  {f.d}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section
        id="how-it-works"
        style={{
          position: "relative",
          overflow: "hidden",
          background: V3.ink,
          color: V3.page,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-30%",
            left: "-10%",
            width: "60%",
            height: "150%",
            background:
              "radial-gradient(ellipse at center,rgba(109,74,255,.5),rgba(109,74,255,0) 62%)",
            filter: "blur(22px)",
            animation: "auroraA 18s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "-40%",
            right: "-8%",
            width: "55%",
            height: "150%",
            background:
              "radial-gradient(ellipse at center,rgba(168,121,42,.38),rgba(168,121,42,0) 62%)",
            filter: "blur(26px)",
            animation: "auroraB 24s ease-in-out -6s infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            maxWidth: 1180,
            margin: "0 auto",
            padding: "clamp(56px,7vw,96px) 24px",
          }}
        >
          <span style={v3Kicker(V3.faint)}>Simple. Fast. Effective.</span>
          <h2 style={{ ...h2Style, maxWidth: "22em" }}>How AIFAGen Works</h2>
          <div
            ref={stepsRef}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 34,
              marginTop: 56,
            }}
          >
            {STEP_CARDS.map((s, i) => (
              <div key={s.t}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span
                    style={{
                      fontFamily: V3.mono,
                      fontSize: 40,
                      fontWeight: 700,
                      color: V3.page,
                      lineHeight: 1,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      height: 1,
                      background: `linear-gradient(90deg,${V3.brand},#1E293B)`,
                      transformOrigin: "left",
                      animation: "lineDraw 1.1s cubic-bezier(.2,.7,.2,1) both",
                    }}
                  />
                </div>
                <h3
                  style={{
                    fontFamily: V3.display,
                    fontSize: 19,
                    fontWeight: 700,
                    letterSpacing: "-.02em",
                    margin: "22px 0 0",
                  }}
                >
                  {s.t}
                </h3>
                <p
                  style={{
                    margin: "9px 0 0",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: V3.faint,
                  }}
                >
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section
        id="faq"
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "clamp(56px,7vw,96px) 24px",
        }}
      >
        <h2
          style={{
            fontFamily: V3.display,
            fontSize: "clamp(28px,3.2vw,40px)",
            lineHeight: 1.05,
            letterSpacing: "-.035em",
            fontWeight: 700,
            margin: 0,
            color: V3.ink,
          }}
        >
          Frequently asked questions
        </h2>
        <div
          ref={faqRef}
          style={{ marginTop: 34, borderTop: `1px solid ${V3.line}` }}
        >
          {FAQS.map((f, i) => (
            <div key={f.q} style={{ borderBottom: `1px solid ${V3.line}` }}>
              <button
                onClick={() => setFaq((p) => (p === i ? -1 : i))}
                aria-expanded={faq === i}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "22px 4px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontFamily: V3.display,
                    fontSize: 17,
                    fontWeight: 600,
                    letterSpacing: "-.02em",
                    color: V3.ink,
                  }}
                >
                  {f.q}
                </span>
                <span
                  style={{
                    fontFamily: V3.mono,
                    fontSize: 18,
                    fontWeight: 700,
                    color: V3.brand,
                    transition: "transform .3s cubic-bezier(.2,.7,.2,1)",
                    transform: faq === i ? "rotate(45deg)" : "none",
                  }}
                >
                  +
                </span>
              </button>
              {faq === i && (
                <p
                  style={{
                    margin: 0,
                    padding: "0 44px 24px 4px",
                    fontSize: 14.5,
                    lineHeight: 1.65,
                    color: V3.muted,
                    animation: "v3FadeIn .3s ease both",
                  }}
                >
                  {f.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 24px clamp(56px,7vw,96px)",
        }}
      >
        <div
          style={{
            background: V3.brand,
            color: V3.page,
            borderRadius: 24,
            padding: "clamp(34px,4vw,56px)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 26,
          }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <h3
              style={{
                fontFamily: V3.display,
                fontSize: "clamp(26px,3vw,38px)",
                lineHeight: 1.06,
                letterSpacing: "-.035em",
                fontWeight: 700,
                margin: 0,
              }}
            >
              Your dream role is closer than you think.
            </h3>
            <p
              style={{
                margin: "14px 0 0",
                fontSize: 16,
                lineHeight: 1.55,
                color: "rgba(248,249,254,.82)",
                maxWidth: "34em",
              }}
            >
              Join AIFAGen today and take the first step toward the career you
              deserve.
            </p>
          </div>
          <button
            onClick={enter}
            className="v3-btn-light"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: V3.page,
              border: "none",
              borderRadius: 13,
              padding: "17px 27px",
              fontSize: 15,
              fontWeight: 700,
              color: V3.ink,
              cursor: "pointer",
            }}
          >
            Get Your Career Plan <span style={{ fontSize: 17 }}>→</span>
          </button>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer style={{ background: "#fff", borderTop: `1px solid ${V3.line}` }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "44px 24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
            gap: 36,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img
                src="/logo.png"
                alt="AIFAGen Labs"
                style={{ height: 32, width: 32, objectFit: "contain" }}
              />
              <span
                style={{
                  fontFamily: V3.display,
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-.02em",
                  color: V3.ink,
                }}
              >
                AIFAGen <span style={{ color: V3.brand }}>Labs</span>
              </span>
            </div>
            <p
              style={{
                margin: "14px 0 0",
                fontSize: 13.5,
                lineHeight: 1.6,
                color: V3.muted,
                maxWidth: "24em",
              }}
            >
              Building Intelligent Ecosystems for the Future. AI for All
              Generations.
            </p>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <div
                style={{
                  ...v3Kicker(V3.faint),
                  letterSpacing: ".14em",
                }}
              >
                {col.title}
              </div>
              <ul
                style={{
                  listStyle: "none",
                  margin: "16px 0 0",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        const p = FOOTER_ROUTES[l];
                        if (p) go?.(p);
                      }}
                      className="v3-footlink"
                      style={{ fontSize: 13.5, color: V3.body }}
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${V3.line}` }}>
          <div
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              padding: "20px 24px",
              display: "flex",
              flexWrap: "wrap",
              gap: "12px 26px",
              fontSize: 13,
              color: V3.muted,
            }}
          >
            <span>Global Operations</span>
            <a href="mailto:pmo@aifagenlabs.com" className="v3-footlink" style={{ color: V3.muted }}>
              pmo@aifagenlabs.com
            </a>
            <a href="tel:+919390693114" className="v3-footlink" style={{ color: V3.muted }}>
              +91 93906 93114
            </a>
            <a href="tel:+14752240417" className="v3-footlink" style={{ color: V3.muted }}>
              +1 (475) 224-0417
            </a>
            <span>Hyderabad, India</span>
            <span>USA: New Jersey</span>
            <span style={{ marginLeft: "auto", color: V3.faint }}>
              © 2025 AIFAGen Labs Pvt. Ltd. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ===================== ROOT ===================== */
export default function AIFAGen() {
  const [mode, setMode] = useState(() =>
    // ?preview opens straight into the signed-in app (see src/devPreview.js).
    DEV_PREVIEW ? "app" : localStorage.getItem("mode") || "marketing",
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
