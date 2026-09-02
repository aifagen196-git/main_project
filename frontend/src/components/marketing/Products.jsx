import { useState, useEffect } from "react";
import {
  Menu,
  X,
  Zap,
  Smile,
  Wrench,
  Settings,
  GitBranch,
  Share2,
  Shield,
  CircleDot,
  Briefcase,
  CheckCircle2,
  Heart,
  ListTodo,
  DollarSign,
  Users,
  BookOpen,
  Linkedin,
  Instagram,
  Twitter,
  Mail,
  Globe,
  Phone,
  MapPin,
} from "lucide-react";

const STEPS = [
  [Wrench, "Step 1", "Connect", "Integrate with your existing systems and data sources seamlessly."],
  [Settings, "Step 2", "Configure", "Customize AI agents to match your specific business workflows."],
  [Zap, "Step 3", "Deploy", "Launch intelligent automation across your organization instantly."],
];

const CAPABILITIES = [
  [GitBranch, "Multi-Agent Orchestration", "Coordinate multiple AI agents working together on complex tasks."],
  [Share2, "Enterprise Integration", "Connect with 200+ enterprise tools and platforms out of the box."],
  [Zap, "Real-time Processing", "Process and respond to events in milliseconds, not minutes."],
  [Shield, "Enterprise Security", "SOC 2 compliant with end-to-end encryption and access controls."],
];

const WORKFLOWS = [
  ["Sales Report Automation", "Collect sales data, analyze trends, generate report, email to team"],
  ["Customer Support Triage", "Monitor tickets, categorize urgency, assign to agents, send updates"],
  ["Content Pipeline", "Research topics, generate drafts, review quality, schedule posts"],
];

const LIFEOS_FEATURES = [
  [Briefcase, "Smart Planning", "AI-powered scheduling that adapts to your priorities and energy levels."],
  [CheckCircle2, "Goal Tracking", "Set, track, and achieve your goals with intelligent progress monitoring."],
  [Heart, "Wellness Integration", "Balance work and life with health-aware recommendations."],
  [ListTodo, "Task Intelligence", "Smart task prioritization and delegation suggestions."],
  [DollarSign, "Financial Insights", "Track spending and receive personalized financial guidance."],
  [Users, "Relationship Manager", "Never miss important dates or follow-ups with your network."],
];

const LIFEOS_FOCUS = [
  [Zap, "Career"],
  [Heart, "Health"],
  [BookOpen, "Learning"],
  [DollarSign, "Finance"],
];

export default function Products({ home, enter, go }) {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState("AIFAG");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const navLinks = ["Home", "Services", "About", "Contact"];

  const NAV_ROUTES = {
    "Services": "services",
    "About": "about",
    "Contact": "contact",
  };

  const handleNav = (e, label) => {
    e.preventDefault();
    setOpen(false);
    if (label === "Home") {
      home?.();
      return;
    }
    if (NAV_ROUTES[label]) {
      go?.(NAV_ROUTES[label]);
    } else {
      home?.();
    }
  };

  return (
    <div className="font-body text-slate-800 bg-white">
      {/* NAV */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-3">
          <button onClick={home} className="flex items-center gap-2">
            <img src="/logo.png" alt="AIFAGen Labs" className="h-8 w-8 object-contain" />
            <span className="font-display text-xl font-extrabold text-slate-900 leading-none">
              AIFAGen <span className="brand">Labs</span>
            </span>
          </button>

          <nav className="hidden lg:flex items-center gap-6 mx-auto">
            {navLinks.map((label) => (
              <a
                key={label}
                href="#"
                onClick={(e) => handleNav(e, label)}
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                {label}
              </a>
            ))}
          </nav>

          <button
            onClick={enter}
            className="hidden lg:inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white btn-brand transition shadow-sm ml-auto"
          >
            Collaborate
          </button>

          <button
            className="lg:hidden ml-auto text-slate-600"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>

        {open && (
          <div className="lg:hidden border-t border-slate-100 px-5 py-3 space-y-2">
            {navLinks.map((label) => (
              <a
                key={label}
                href="#"
                onClick={(e) => handleNav(e, label)}
                className="block text-sm font-semibold text-slate-700 py-1"
              >
                {label}
              </a>
            ))}
            <button
              onClick={enter}
              className="w-full mt-2 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white btn-brand"
            >
              Collaborate
            </button>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="hero-bg">
        <div className="max-w-4xl mx-auto px-5 py-20 md:py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 brand text-sm font-bold px-4 py-1.5">
            <Zap size={15} />
            Launching 2027
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-slate-900 mt-6">
            Our Flagship Products
          </h1>
          <p className="text-lg text-slate-500 mt-5 max-w-2xl mx-auto">
            Two revolutionary AI ecosystems designed to transform how enterprises
            operate and individuals live.
          </p>

          {/* Product toggle */}
          <div className="mt-10 inline-flex rounded-2xl bg-slate-100 p-1.5">
            {["AIFAG", "LifeOS"].map((p) => (
              <button
                key={p}
                onClick={() => setProduct(p)}
                className={
                  "rounded-xl px-8 py-2.5 text-sm font-bold transition " +
                  (product === p ? "text-white btn-brand shadow-sm" : "text-slate-600")
                }
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </section>

      {product === "AIFAG" ? (
        <>
          {/* AIFAG INTRO */}
          <section className="max-w-6xl mx-auto px-5 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-block rounded-full border border-brand brand text-sm font-semibold px-4 py-1.5">
                AI for All Generations
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-extrabold text-slate-900 mt-6">
                AIFAG
              </h2>
              <p className="text-lg text-slate-500 mt-5">
                From learner to founder, everyone can create AI agents to make
                life easier.
              </p>
              <p className="text-slate-500 mt-5 leading-relaxed">
                Build intelligent agents without coding. Showcase your creations
                to potential employers. Companies discover talent through their
                agent portfolios and make hiring decisions based on real
                capabilities.
              </p>
              <button
                onClick={enter}
                className="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white btn-brand transition shadow-sm"
              >
                Request Early Access
              </button>
            </div>

            <div className="relative flex items-center justify-center h-80">
              <div className="absolute h-72 w-72 rounded-full border border-brand/10" />
              <div className="absolute h-56 w-56 rounded-full border border-brand/20" />
              <div className="absolute h-40 w-40 rounded-full border border-brand/30" />
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-brand text-white shadow-lg">
                <Smile size={56} />
              </div>
            </div>
          </section>

          {/* THREE STEPS */}
          <section className="bg-brand-50">
            <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
                Three Steps to Intelligent Automation
              </h2>
              <div className="grid md:grid-cols-3 gap-6 mt-12">
                {STEPS.map(([Icon, step, title, body], i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-center"
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
                      <Icon size={26} />
                    </div>
                    <div className="brand font-bold text-sm mt-5">{step}</div>
                    <h3 className="font-display text-2xl font-extrabold text-slate-900 mt-1">
                      {title}
                    </h3>
                    <p className="text-slate-500 mt-3">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CAPABILITIES */}
          <section className="max-w-6xl mx-auto px-5 py-16 md:py-20">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
              Enterprise-Grade Capabilities
            </h2>
            <div className="grid md:grid-cols-2 gap-6 mt-12">
              {CAPABILITIES.map(([Icon, title, body], i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 flex gap-5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 shrink-0">
                    <Icon size={22} className="text-[#6d4aff]" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-extrabold text-slate-900">
                      {title}
                    </h3>
                    <p className="text-slate-500 mt-2 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SEE AIFAG IN ACTION */}
          <section className="bg-brand-50">
            <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
              <div className="text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-white brand text-sm font-bold px-4 py-1.5 border border-slate-200">
                  <CircleDot size={15} />
                  Interactive Demo
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 mt-6">
                  See AIFAG in Action
                </h2>
                <p className="text-slate-500 mt-3">
                  Watch how multiple AI agents collaborate to complete complex
                  workflows
                </p>
              </div>

              <div className="mt-10">
                <div className="font-bold text-slate-900 mb-4">
                  Select a workflow to simulate:
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {WORKFLOWS.map(([title, body], i) => (
                    <button
                      key={i}
                      onClick={enter}
                      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-left hover:border-brand transition"
                    >
                      <h3 className="font-display text-2xl font-extrabold text-slate-900">
                        {title}
                      </h3>
                      <p className="text-slate-500 mt-3 leading-relaxed">{body}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* LIFEOS INTRO */}
          <section className="max-w-6xl mx-auto px-5 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-block rounded-full border border-brand brand text-sm font-semibold px-4 py-1.5">
                Personal AI Operating System
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-extrabold text-slate-900 mt-6">
                LifeOS
              </h2>
              <p className="text-slate-500 mt-5 leading-relaxed">
                Your intelligent life companion. LifeOS learns your habits,
                understands your goals, and helps you optimize every aspect of
                your personal and professional life.
              </p>
              <button
                onClick={enter}
                className="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white btn-brand transition shadow-sm"
              >
                Join Beta Waitlist
              </button>
            </div>

            {/* Today's Focus card */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand text-white">
                  <Briefcase size={26} />
                </div>
                <div>
                  <div className="font-display text-2xl font-extrabold text-slate-900">
                    Today's Focus
                  </div>
                  <div className="text-slate-500">3 priorities identified</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-slate-500 text-sm">Energy Level</div>
                  <div className="font-display text-2xl font-extrabold text-slate-900 mt-2">
                    87%
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-slate-500 text-sm">Goals Progress</div>
                  <div className="font-display text-2xl font-extrabold text-slate-900 mt-2">
                    12/15
                  </div>
                </div>
              </div>

              <p className="text-slate-600 mt-6 leading-relaxed">
                "Based on your schedule, I recommend tackling the presentation
                before lunch when your focus peaks."
              </p>
              <div className="brand font-semibold mt-4">— Your AI Assistant</div>
            </div>
          </section>

          {/* PERSONAL AI SUITE */}
          <section className="bg-brand-50">
            <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
                Your Personal AI Suite
              </h2>
              <div className="grid md:grid-cols-3 gap-6 mt-12">
                {LIFEOS_FEATURES.map(([Icon, title, body], i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                      <Icon size={22} className="text-[#6d4aff]" />
                    </div>
                    <h3 className="font-display text-xl font-extrabold text-slate-900 mt-6">
                      {title}
                    </h3>
                    <p className="text-slate-500 mt-3 leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* EXPERIENCE LIFEOS */}
          <section className="max-w-6xl mx-auto px-5 py-16 md:py-20">
            <div className="text-center">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
                Experience LifeOS
              </h2>
              <p className="text-slate-500 mt-3">
                Create your personalized dashboard and see AI-powered insights in
                real-time
              </p>
            </div>

            <div className="mt-10">
              <div className="font-bold text-slate-900 text-center mb-6">
                Select your focus areas:
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {LIFEOS_FOCUS.map(([Icon, label], i) => (
                  <button
                    key={i}
                    onClick={enter}
                    className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 flex flex-col items-center gap-4 hover:border-brand transition"
                  >
                    <Icon size={28} className="text-[#6d4aff]" />
                    <span className="font-bold text-slate-900">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* FOOTER */}
      <footer className="relative bg-white overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[36rem] rounded-full bg-brand-500/25 blur-3xl"
        />

        {/* Main columns */}
        <div className="relative max-w-6xl mx-auto px-5 py-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
                <img src="/logo.png" alt="AIFAGen Labs" className="h-6 w-6 invert" />
              </div>
              <span className="font-display text-lg font-extrabold text-white">
                AIFAGen <span className="text-brand-400">Labs</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-4 max-w-xs leading-relaxed">
              Building Intelligent Ecosystems for the Future. AI for All
              Generations.
            </p>
            <div className="flex items-center gap-2.5 mt-5">
              {[
                [Linkedin, "LinkedIn", "https://www.linkedin.com/company/aifagenlabs/"],
                [Twitter, "Twitter", "https://x.com/aifagenlabs"],
                [Instagram, "Instagram", "https://www.instagram.com/aifagen_labs?igsh=Y3hqcWJoZWgxMDU0"],
                [Mail, "Email", "mailto:pmo@aifagenlabs.com"],
              ].map(([Icon, label, href], i) => (
                <a
                  key={i}
                  href={href}
                  aria-label={label}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  onClick={href === "#" ? (e) => e.preventDefault() : undefined}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-brand-500 hover:text-white hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {[
            ["Company", ["About Us", "Careers", "Collaborate", "Terms & Conditions"]],
            ["Connect", ["Services", "Partners", "Privacy Policy", "Contact"]],
          ].map((col, i) => (
            <div key={i}>
              <div className="font-bold text-white text-sm">
                {col[0]}
                <span className="block mt-2 h-0.5 w-6 rounded-full bg-brand-500" />
              </div>
              <ul className="mt-4 space-y-2.5">
                {col[1].map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        const routes = {
                          "About Us": "about",
                          "Careers": "caseStudies",
                          "Services": "services",
                          "Contact": "contact",
                          "Collaborate": "collaborate",
                          "Partners": "partners",
                          "Privacy Policy": "privacy",
                          "Terms & Conditions": "terms",
                        };
                        if (routes[l]) go?.(routes[l]);
                        else home?.();
                      }}
                      className="group inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-300 transition-colors"
                    >
                      <span className="h-1 w-1 rounded-full bg-brand-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact + locations bar */}
        <div className="relative border-t border-white/10 bg-black/20">
          <div className="max-w-6xl mx-auto px-5 py-6 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
                <Globe size={13} className="text-brand-400" />
                Global Operations
              </span>
              <a
                href="mailto:pmo@aifagenlabs.com"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 hover:border-brand-400/50 hover:text-white transition"
              >
                <Mail size={13} className="text-brand-400" />
                pmo@aifagenlabs.com
              </a>
              <a
                href="tel:+14752240417"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 hover:border-brand-400/50 hover:text-white transition"
              >
                <Phone size={13} className="text-brand-400" />
                +1 (475) 224-0417
              </a>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
                <MapPin size={13} className="text-brand-400" />
                Hyderabad, India
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
                <MapPin size={13} className="text-brand-400" />
                USA: New Jersey
              </span>
            </div>
            <div className="text-xs text-slate-500 lg:ml-auto">
              © 2025 AIFAGen Labs Pvt. Ltd. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
