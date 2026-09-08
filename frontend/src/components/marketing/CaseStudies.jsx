import { useState, useEffect } from "react";
import {
  Menu,
  X,
  User,
  TrendingUp,
  Linkedin,
  Instagram,
  Twitter,
  Mail,
  Globe,
  Phone,
  MapPin,
} from "lucide-react";

const FILTERS = ["All Cases", "Healthcare", "Finance", "Retail", "Manufacturing", "Technology"];

const CASES = [
  ["Healthcare", "HealthFirst Systems", "Predictive Patient Analytics",
    "Late detection of critical conditions was leading to poor patient outcomes. Doctors needed to…", "+85%", "-40%"],
  ["Finance", "TechCorp Global", "AI-Powered Risk Assessment",
    "Manual risk analysis was taking weeks, creating bottlenecks in loan approvals and increasing…", "+92%", "-85%"],
  ["Retail", "RetailMax", "Smart Inventory Management",
    "Stockouts and overstock situations were costing millions annually. Manual forecasting couldn't…", "+78%", "-55%"],
  ["Manufacturing", "AutoManufacture Inc", "Quality Control Automation",
    "Manual quality inspection was slow, inconsistent, and missed defects. This led to recalls and…", "+96%", "-89%"],
  ["Technology", "TechSupport Pro", "Intelligent Customer Support",
    "Call center was overwhelmed with repetitive queries. Wait times exceeded 20 minutes and…", "+90%", "-60%"],
  ["Healthcare", "DiagnoAI Labs", "Medical Image Analysis",
    "Radiologists were spending hours analyzing medical images manually, leading to fatigue and…", "+94%", "-87%"],
  ["Finance", "SecureBank Corp", "Fraud Detection System",
    "Fraudulent transactions were costing millions annually. Traditional rule-based systems had high false positives and missed…", "+99%", "-75%"],
  ["Retail", "ShopFlow Systems", "Personalized Recommendation Engine",
    "Generic product recommendations resulted in low conversion rates. Customer engagement was…", "+68%", "+43%"],
];

export default function CaseStudies({ home, enter, go }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("All Cases");

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

  const shown = filter === "All Cases" ? CASES : CASES.filter((c) => c[0] === filter);

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
                  (label === "Case Studies"
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
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-slate-900">
            Success Stories
          </h1>
          <p className="text-lg text-slate-500 mt-5 max-w-2xl mx-auto">
            Real results from real partnerships. See how we've helped
            organizations transform with AI.
          </p>

          {/* Filter tabs */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "rounded-full px-5 py-2.5 text-sm font-semibold transition " +
                  (filter === f
                    ? "text-white btn-brand shadow-sm"
                    : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50")
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CASES GRID */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shown.map(([cat, company, title, desc, m1, m2], i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden lift flex flex-col"
            >
              <div className="relative h-40 bg-brand-50 flex items-center justify-center">
                <TrendingUp size={56} className="text-[#6d4aff] opacity-25" />
                <span className="absolute top-3 left-3 rounded-full bg-slate-900 text-white text-xs font-semibold px-3 py-1">
                  {cat}
                </span>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 brand font-semibold text-sm">
                  <User size={16} />
                  {company}
                </div>
                <h3 className="font-display text-xl font-extrabold text-slate-900 mt-2">
                  {title}
                </h3>
                <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                  {desc}
                </p>
                <div className="flex gap-3 mt-5 pt-2">
                  <span className="rounded-lg bg-brand-50 brand text-sm font-bold px-3 py-1.5">
                    {m1}
                  </span>
                  <span className="rounded-lg bg-brand-50 brand text-sm font-bold px-3 py-1.5">
                    {m2}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
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
