import { useState, useEffect } from "react";
import {
  Menu,
  X,
  Target,
  MessageSquare,
  Zap,
  Users,
  Rocket,
  Languages,
  Cpu,
  CheckCircle2,
  Linkedin,
  Instagram,
  Twitter,
  Mail,
  Globe,
  Phone,
  MapPin,
} from "lucide-react";

const TABS = [
  [MessageSquare, "Research"],
  [Zap, "Prototypes"],
  [Users, "Partners"],
  [Rocket, "Launch 2027"],
];

const RESEARCH = [
  [Languages, "Advanced Language Models", "Pushing the boundaries of natural language understanding and generation."],
  [Cpu, "Edge AI Computing", "Bringing powerful AI capabilities to resource-constrained devices."],
  [Users, "Multi-Agent Systems", "Developing frameworks for coordinated AI agent collaboration."],
  [CheckCircle2, "Explainable AI", "Making AI decisions transparent and interpretable for humans."],
];

export default function InnovationLabs({ home, enter, go }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("Research");

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
                className={
                  "text-sm font-semibold transition " +
                  (label === "Innovation Labs"
                    ? "text-slate-900 border-b-2 border-brand pb-0.5"
                    : "text-slate-600 hover:text-slate-900")
                }
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
            <Target size={15} />
            Research &amp; Development
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-slate-900 mt-6">
            Innovation Labs
          </h1>
          <p className="text-lg text-slate-500 mt-5 max-w-2xl mx-auto">
            Where imagination meets intelligence. Explore our cutting-edge
            research, prototypes, and the roadmap to 2027.
          </p>

          {/* Tab bar */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {TABS.map(([Icon, label]) => (
              <button
                key={label}
                onClick={() => setTab(label)}
                className={
                  "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition " +
                  (tab === label
                    ? "text-white btn-brand shadow-sm"
                    : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50")
                }
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* RESEARCH */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        {tab === "Research" ? (
          <>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
                Pioneering AI Research
              </h2>
              <p className="text-slate-500 mt-3">
                Our research teams are pushing the boundaries of what's possible
                with AI, focusing on areas that will shape the future of
                technology.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mt-12">
              {RESEARCH.map(([Icon, title, body], i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 lift"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
                    <Icon size={24} />
                  </div>
                  <h3 className="font-display text-2xl font-extrabold text-slate-900 mt-6">
                    {title}
                  </h3>
                  <p className="text-slate-500 mt-3 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </>
        ) : tab === "Prototypes" ? (
          <>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
                Active Prototypes
              </h2>
              <p className="text-slate-500 mt-3">
                From concept to reality. These prototypes represent our latest
                innovations in various stages of development.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mt-12">
              {[
                ["AIFA Voice", "Testing", "Voice-first AI assistant with emotional intelligence."],
                ["Vision Analytics Pro", "Beta", "Real-time video analysis for enterprise security."],
                ["DocuMind", "Alpha", "Intelligent document processing and extraction."],
                ["FlowBuilder", "Development", "No-code AI workflow automation platform."],
              ].map(([name, stage, body], i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 lift"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-display text-2xl font-extrabold text-slate-900">
                      {name}
                    </h3>
                    <span className="shrink-0 rounded-full bg-brand-50 brand text-xs font-bold px-3 py-1.5">
                      {stage}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-4 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </>
        ) : tab === "Partners" ? (
          <>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
                Our Partner Ecosystem
              </h2>
              <p className="text-slate-500 mt-3">
                Collaboration is at the heart of innovation. We work with leading
                institutions and organizations worldwide.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              {[
                ["15+", "University Partners", "Research Partnerships"],
                ["30+", "Enterprise Collaborators", "Industry Partnerships"],
                ["50+", "Startup Ecosystem", "Startups Partnerships"],
              ].map(([count, title, sub], i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-center lift"
                >
                  <div className="num text-xl font-bold brand">{count}</div>
                  <h3 className="font-display text-2xl font-extrabold text-slate-900 mt-3">
                    {title}
                  </h3>
                  <p className="text-slate-500 mt-3">{sub}</p>
                </div>
              ))}
            </div>
          </>
        ) : tab === "Launch 2027" ? (
          <>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
                Roadmap to 2027
              </h2>
              <p className="text-slate-500 mt-3">
                Our journey to launching AIFAG and LifeOS as the next generation
                of AI ecosystems.
              </p>
            </div>
            <div className="relative mt-12 pl-6 md:pl-8">
              <div className="absolute left-1.5 md:left-2.5 top-2 bottom-2 w-1 rounded bg-brand-100" />
              <div className="space-y-6">
                {[
                  ["Q1 2025", "MVP Website + Chatbot Alpha", "completed"],
                  ["Q2 2025", "Collaboration Portal Beta", "completed"],
                  ["Q4 2025", "Product Demo Launch", "upcoming"],
                  ["Q1 2027", "Full Interactive Site v2", "upcoming"],
                  ["Q2 2027", "Global Campaign & Public Release", "upcoming"],
                ].map(([q, title, status], i) => (
                  <div key={i} className="relative">
                    <span className="absolute -left-6 md:-left-8 top-7 h-3.5 w-3.5 rounded-full bg-brand border-2 border-white shadow" />
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
                      <div className="text-sm font-bold brand">{q}</div>
                      <h3 className="font-display text-xl md:text-2xl font-extrabold text-slate-900 mt-1.5">
                        {title}
                      </h3>
                      <div className="mt-4 flex justify-end">
                        <span
                          className={
                            "rounded-full text-xs font-bold px-3 py-1.5 " +
                            (status === "completed"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-500")
                          }
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-slate-500 py-10">
            <h2 className="font-display text-2xl font-extrabold text-slate-900">
              {tab}
            </h2>
            <p className="mt-3">Content coming soon.</p>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="relative bg-slate-900 overflow-hidden">
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
