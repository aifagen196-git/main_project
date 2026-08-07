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
  ArrowRight,
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

  const navLinks = ["Home", "Services", "Products", "Innovation Labs", "Case Studies", "About"];

  const NAV_ROUTES = {
    "Services": "services",
    "Products": "products",
    "Innovation Labs": "innovation",
    "Case Studies": "caseStudies",
    "About": "about",
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-[#6d4aff] transition"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          {[
            ["Company", ["About Us", "Innovation Labs", "Case Studies", "Careers"]],
            ["Solutions", ["Services", "Products", "AIFAG Suite", "LifeOS"]],
            [
              "Connect",
              ["Contact", "Collaborate", "Partners", "Privacy Policy", "Terms & Conditions"],
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
                        const routes = {
                          "About Us": "about",
                          "Innovation Labs": "innovation",
                          "Case Studies": "caseStudies",
                          "Careers": "caseStudies",
                          "Services": "services",
                          "Products": "products",
                          "AIFAG Suite": "products",
                          "LifeOS": "products",
                          "Contact": "contact",
                          "Collaborate": "collaborate",
                          "Partners": "partners",
                          "Privacy Policy": "privacy",
                          "Terms & Conditions": "terms",
                        };
                        if (routes[l]) go?.(routes[l]);
                        else home?.();
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
