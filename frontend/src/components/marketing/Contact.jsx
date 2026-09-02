import { useState, useEffect } from "react";
import {
  Menu,
  X,
  Globe,
  MapPin,
  Mail,
  Phone,
  ArrowRight,
  Linkedin,
  Twitter,
  Instagram,
} from "lucide-react";

const OFFICES = [
  [
    "Hyderabad",
    "India \u2022 Headquarters",
    "Info@aifagenlabs.com",
    // No separate India line \u2014 the US number below is the only published one.
    "",
  ],
  [
    "New Jersey",
    "USA \u2022 North America",
    "Hr@aifagenlabs.com",
    "+1 (475) 224-0417",
  ],
];

export default function Contact({ home, enter, go }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const navLinks = ["Home", "Services", "About", "Contact"];

  const NAV_ROUTES = {
    Services: "services",
    About: "about",
    Contact: "contact",
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
            <img
              src="/logo.png"
              alt="AIFAGen Labs"
              className="h-8 w-8 object-contain"
            />
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
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-slate-900">
            Get in Touch
          </h1>
          <p className="text-lg text-slate-500 mt-5 max-w-2xl mx-auto">
            Have questions? We're here to help. Reach out to us through any
            channel below.
          </p>
        </div>
      </section>

      {/* OFFICES + FORM */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-20 grid lg:grid-cols-2 gap-10">
        {/* Left: offices */}
        <div>
          <h2 className="font-display text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Globe className="brand" size={28} />
            Our Offices
          </h2>

          {/* Map panel */}
          <div className="relative mt-6 h-64 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden">
            {/* curved dotted connector */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d="M 22 68 C 40 44, 62 44, 78 56"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="0.5"
                strokeDasharray="2 2"
                strokeLinecap="round"
              />
            </svg>

            {/* Hyderabad pin (lower-left) */}
            <div className="absolute left-[12%] top-[62%] flex flex-col items-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-lg">
                <MapPin size={20} />
              </div>
              <span className="text-sm font-semibold text-slate-700 mt-2 whitespace-nowrap">
                Hyderabad
              </span>
            </div>

            {/* New Jersey pin (upper-right) */}
            <div className="absolute right-[14%] top-[46%] flex flex-col items-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-lg">
                <MapPin size={20} />
              </div>
              <span className="text-sm font-semibold text-slate-700 mt-2 whitespace-nowrap">
                New Jersey
              </span>
            </div>
          </div>

          {/* Office cards */}
          <div className="space-y-5 mt-6">
            {OFFICES.map(([city, region, email, phone], i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div className="font-display text-2xl font-extrabold text-slate-900">
                      {city}
                    </div>
                    <div className="text-slate-500 text-sm">{region}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-slate-400" />
                    {email}
                  </div>
                  {phone && (
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-slate-400" />
                      {phone}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: form */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
          <h2 className="font-display text-3xl font-extrabold text-slate-900">
            Send us a message
          </h2>

          <div className="mt-8 space-y-6">
            <div>
              <label className="font-semibold text-slate-900 text-sm">
                Your Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-brand transition"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-900 text-sm">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="john@example.com"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-brand transition"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-900 text-sm">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="How can we help?"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-brand transition"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-900 text-sm">
                Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={5}
                placeholder="Tell us about your inquiry..."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-brand transition resize-none"
              />
            </div>
            <button
              onClick={(e) => e.preventDefault()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-white btn-brand transition shadow-sm"
            >
              Send Message <ArrowRight size={18} />
            </button>
          </div>
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
                [
                  Linkedin,
                  "LinkedIn",
                  "https://www.linkedin.com/company/aifagenlabs/",
                ],
                [Twitter, "Twitter", "https://x.com/aifagenlabs"],
                [Instagram, "Instagram", "https://www.instagram.com/aifagen_labs?igsh=Y3hqcWJoZWgxMDU0"],
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
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-brand-500 hover:text-white hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {[
            [
              "Company",
              ["About Us", "Careers", "Collaborate", "Terms & Conditions"],
            ],
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
                          Careers: "caseStudies",
                          Services: "services",
                          Contact: "contact",
                          Collaborate: "collaborate",
                          Partners: "partners",
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
