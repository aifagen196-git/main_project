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

  const navLinks = [
    "Home",
    "Services",
    "Products",
    "Innovation Labs",
    "Case Studies",
    "About",
  ];

  const NAV_ROUTES = {
    Services: "services",
    Products: "products",
    "Innovation Labs": "innovation",
    "Case Studies": "caseStudies",
    About: "about",
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

      {/* WHATSAPP CONNECT */}
      <section className="max-w-6xl mx-auto px-5 pb-16 md:pb-20">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-6 text-center md:text-left">
          <div className="flex h-14 w-14 mx-auto md:mx-0 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/10">
            <svg
              viewBox="0 0 24 24"
              width="30"
              height="30"
              fill="#25D366"
              aria-hidden
            >
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.15c-1.53 0-3.03-.41-4.34-1.19l-.31-.18-3.12.82.83-3.04-.2-.32a8.16 8.16 0 01-1.26-4.33c0-4.54 3.7-8.23 8.24-8.23 4.54 0 8.23 3.69 8.23 8.23 0 4.54-3.69 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29z" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900">
              Let's Connect via WhatsApp
            </h2>
            <p className="text-slate-500 mt-2 max-w-xl">
              Chat with our team directly on WhatsApp for quick answers about
              our services, products, and how we can help.
            </p>
          </div>
          <a
            href="https://wa.me/918978939314?text=Hi%2C%20I%27m%20interested%20in%20AIFAGen.I%20would%20like%20to%20connect%3F"
            target="_blank"
            rel="noopener noreferrer"
            className="md:ml-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-bold text-white bg-[#25D366] hover:bg-[#1eb955] transition shadow-sm"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.15c-1.53 0-3.03-.41-4.34-1.19l-.31-.18-3.12.82.83-3.04-.2-.32a8.16 8.16 0 01-1.26-4.33c0-4.54 3.7-8.23 8.24-8.23 4.54 0 8.23 3.69 8.23 8.23 0 4.54-3.69 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29z" />
            </svg>
            Chat on WhatsApp
          </a>
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
                        const routes = {
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
