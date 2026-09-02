import { useState, useEffect } from "react";
import {
  Menu,
  X,
  Smile,
  Eye,
  Heart,
  Users,
  Zap,
  MapPin,
  ArrowRight,
  Linkedin,
  Instagram,
  Twitter,
  Mail,
  Globe,
  Phone,
} from "lucide-react";

const VALUES = [
  [Heart, "Human-Centric", "AI that empowers people, not replaces them."],
  [Smile, "Results-Driven", "Focused on measurable business outcomes."],
  [Users, "Collaborative", "Partnership approach to every project."],
  [Zap, "Innovation-First", "Always pushing the boundaries of what's possible."],
];

const JOURNEY = [
  ["2024", "Company Founded", "AIFAGen Labs established with vision for accessible AI."],
  ["Q1 2025", "MVP Launch", "Website and chatbot alpha released to public."],
  ["Q2 2025", "Partnerships", "Collaboration portal opens for strategic partners."],
  ["Q4 2025", "Product Preview", "First demos of AIFAG and LifeOS showcased."],
  ["Q1 2027", "Platform Beta", "Full interactive platform v2 with AI-driven features."],
  ["Q2 2027", "Global Launch", "AIFAG & LifeOS released to the world."],
];

export default function AboutPage({ home, enter, go }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollToId = (e, id) => {
    e.preventDefault();
    setOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const navLinks = [
    ["Home", "home"],
    ["Services", "page:services"],
    ["About", "top"],
    ["Contact", "page:contact"],
  ];

  const handleNav = (e, target) => {
    e.preventDefault();
    setOpen(false);
    if (target === "home") return home?.();
    if (target === "top") return window.scrollTo({ top: 0, behavior: "smooth" });
    if (target.startsWith("page:")) return go?.(target.slice(5));
    scrollToId(e, target);
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
            {navLinks.map(([label, target]) => (
              <a
                key={label}
                href="#"
                onClick={(e) => handleNav(e, target)}
                className={
                  "text-sm font-semibold transition " +
                  (label === "About"
                    ? "text-slate-900 border-b-2 border-brand pb-0.5"
                    : "text-slate-600 hover:text-slate-900")
                }
              >
                {label}
              </a>
            ))}
          </nav>

          <button
            onClick={(e) => handleNav(e, "join")}
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
            {navLinks.map(([label, target]) => (
              <a
                key={label}
                href="#"
                onClick={(e) => handleNav(e, target)}
                className="block text-sm font-semibold text-slate-700 py-1"
              >
                {label}
              </a>
            ))}
            <button
              onClick={(e) => handleNav(e, "join")}
              className="w-full mt-2 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white btn-brand"
            >
              Collaborate
            </button>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="hero-bg">
        <div className="max-w-4xl mx-auto px-5 py-20 md:py-28 text-center">
          <span className="inline-block rounded-full bg-brand-50 brand text-sm font-bold px-4 py-1.5">
            Est. 2027
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-slate-900 mt-6">
            Building the Future of AI
          </h1>
          <p className="text-lg text-slate-500 mt-5 max-w-2xl mx-auto">
            We're on a mission to make AI accessible, meaningful, and scalable —
            from startups to global enterprises. Join us as we build toward our
            2027 vision.
          </p>
        </div>
      </section>

      {/* OUR STORY */}
      <section className="max-w-3xl mx-auto px-5 py-16 md:py-20">
        <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
          Our Story
        </h2>
        <div className="mt-8 space-y-5 text-slate-500 leading-relaxed">
          <p>
            AIFAGen Labs was founded in 2025 with a simple yet powerful belief:
            AI should be for everyone — not just large tech companies.
          </p>
          <p>
            We identified a gap between advanced AI research and practical
            business adoption. Our goal is to bridge that gap with intuitive,
            scalable, and human-centric AI platforms.
          </p>
          <p>
            Our philosophy is{" "}
            <span className="font-bold text-slate-900">AI for All Generations</span>{" "}
            — empowering startups, enterprises, and individuals alike.
          </p>
          <p>
            We are building toward our 2027 vision with platforms such as{" "}
            <span className="font-bold text-slate-900">AIFAG</span> and{" "}
            <span className="font-bold text-slate-900">LifeOS</span>.
          </p>
        </div>
      </section>

      {/* MISSION / VISION */}
      <section className="bg-brand-50">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-20 grid md:grid-cols-2 gap-6">
          {[
            [Smile, "Our Mission",
              "Deliver next-generation, human-centric AI solutions that transform businesses and empower individuals by enhancing human capabilities."],
            [Eye, "Our Vision",
              "Make AI accessible, meaningful, and scalable — from startups to global enterprises."],
          ].map(([Icon, title, body], i) => (
            <div
              key={i}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8"
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
      </section>

      {/* OUR VALUES */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <div className="text-center">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
            Our Values
          </h2>
          <p className="text-slate-500 mt-3">
            The principles that guide everything we do.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {VALUES.map(([Icon, title, body], i) => (
            <div
              key={i}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 text-center lift"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
                <Icon size={22} />
              </div>
              <h3 className="font-bold text-slate-900 mt-5">{title}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* JOURNEY */}
      <section className="bg-brand-50">
        <div className="max-w-4xl mx-auto px-5 py-16 md:py-20">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
              Our Journey to 2027
            </h2>
            <p className="text-slate-500 mt-3">
              Building the future, one milestone at a time.
            </p>
          </div>

          <div className="relative mt-12 pl-8 md:pl-24">
            {/* vertical line */}
            <div className="absolute left-2 md:left-16 top-2 bottom-2 w-0.5 bg-brand/40" />
            <div className="space-y-6">
              {JOURNEY.map(([when, title, body], i) => (
                <div key={i} className="relative">
                  {/* dot */}
                  <div className="absolute -left-[26px] md:-left-[34px] top-6 h-3 w-3 rounded-full bg-brand ring-4 ring-brand-50" />
                  {/* badge */}
                  <span className="absolute -left-8 md:-left-24 top-5 inline-flex items-center justify-center rounded-lg bg-brand text-white text-xs font-bold px-2.5 py-1 md:w-16">
                    {when}
                  </span>
                  <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
                    <h3 className="font-display text-xl font-extrabold text-slate-900">
                      {title}
                    </h3>
                    <p className="text-slate-500 mt-2">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="max-w-3xl mx-auto px-5 py-16 md:py-20 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
          Leadership & Team
        </h2>
        <p className="text-slate-500 mt-4 leading-relaxed">
          AIFAGen Labs is led by a multidisciplinary team of AI engineers,
          researchers, and product builders focused on responsible and scalable
          AI innovation.
        </p>
      </section>

      {/* GLOBAL PRESENCE */}
      <section className="bg-brand-50">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
              Global Presence
            </h2>
            <p className="text-slate-500 mt-3">
              Operating across two continents to serve clients worldwide.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            {[
              ["Hyderabad", "India"],
              ["New Jersey", "USA"],
            ].map(([city, country], i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 flex items-center gap-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white shrink-0">
                  <MapPin size={22} />
                </div>
                <div>
                  <div className="font-display text-2xl font-extrabold text-slate-900">
                    {city}
                  </div>
                  <div className="text-slate-500">{country}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JOIN OUR MISSION */}
      <section id="join" className="max-w-4xl mx-auto px-5 py-20 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
          Join Our Mission
        </h2>
        <p className="text-slate-500 mt-4 max-w-xl mx-auto">
          Whether you're looking to transform your business or join our team,
          we'd love to hear from you.
        </p>
        <button
          onClick={enter}
          className="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white btn-brand transition shadow-sm"
        >
          Partner With Us <ArrowRight size={18} />
        </button>
      </section>

      {/* FOOTER */}
      <footer className="relative bg-slate-900 overflow-hidden">
        {/* Dark footer with a brand-purple glow — a deliberate contrast
            block against the white page above, not just a bordered
            continuation of it. */}
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
