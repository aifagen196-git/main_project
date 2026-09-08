import { useState, useEffect } from "react";
import {
  Menu,
  X,
  Linkedin,
  Instagram,
  Twitter,
  Mail,
  Globe,
  Phone,
  MapPin,
} from "lucide-react";

export default function PrivacyPolicy({ home, enter, go }) {
  const [open, setOpen] = useState(false);

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

  const H = ({ children }) => (
    <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 mt-12">
      {children}
    </h2>
  );
  const P = ({ children }) => (
    <p className="text-slate-600 leading-relaxed mt-4">{children}</p>
  );
  const List = ({ items }) => (
    <ul className="mt-4 space-y-2 list-disc pl-6 text-slate-600">
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </ul>
  );

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

      {/* CONTENT */}
      <section className="max-w-3xl mx-auto px-5 py-16 md:py-20">
        <h1 className="font-display text-4xl md:text-5xl font-extrabold text-slate-900">
          AIFAGen Labs Privacy Policy
        </h1>

        <H>1. Introduction</H>
        <P>
          AIFAGen Labs ("Company," "we," "our," or "us") is committed to
          protecting your privacy. This Privacy Policy explains how we collect,
          use, and safeguard your information when you use our website and
          services, including SMS communications.
        </P>

        <H>2. Information We Collect</H>
        <P>We may collect the following information:</P>
        <List
          items={[
            "Full Name",
            "Email Address",
            "Phone Number",
            "Resume / Employment Information",
            "Visa Status (if applicable)",
            "LinkedIn Profile",
            "Technical Skills & Work Experience",
            "Any information voluntarily submitted via forms",
          ]}
        />

        <H>3. How We Use Your Information</H>
        <P>We use collected information to:</P>
        <List
          items={[
            "Provide IT staffing and job marketing services",
            "Contact you regarding job opportunities",
            "Send service-related SMS and email updates",
            "Schedule interviews and screening calls",
            "Improve our services",
            "Maintain compliance with legal requirements",
          ]}
        />

        <H>4. SMS Communication &amp; Consent</H>
        <P>
          By submitting your phone number through our website forms, you consent
          to receive SMS messages from AIFAGen Labs related to:
        </P>
        <List
          items={[
            "Job opportunities",
            "Application updates",
            "Interview scheduling",
            "Service notifications",
          ]}
        />
        <P>Message frequency may vary.</P>
        <P>Message and data rates may apply.</P>
        <P>
          You can opt out at any time by replying{" "}
          <span className="font-bold text-slate-900">STOP</span>.
        </P>
        <P>
          For assistance, reply{" "}
          <span className="font-bold text-slate-900">HELP</span> or contact us
          at:
        </P>
        <div className="mt-4 space-y-2 text-slate-600">
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-slate-400" />
            Email:{" "}
            <a href="mailto:pmo@aifagenlabs.com" className="brand hover:underline">
              pmo@aifagenlabs.com
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-slate-400" />
            Phone:{" "}
            <a href="tel:+17322539043" className="brand hover:underline">
              +1 732-253-9043
            </a>
          </div>
        </div>

        <H>5. Data Sharing</H>
        <P>
          We do <span className="font-bold text-slate-900">NOT</span> sell, rent,
          or trade your personal information.
        </P>
        <P>We may share your information only:</P>
        <List
          items={[
            "With verified client companies for job placement",
            "With payroll partners (if placed)",
            "When required by law",
          ]}
        />

        <H>6. Data Security</H>
        <P>
          We implement industry-standard security measures to protect your
          information from unauthorized access, misuse, or disclosure.
        </P>

        <H>7. Your Rights</H>
        <P>You may:</P>
        <List
          items={[
            "Request access to your data",
            "Request correction or deletion",
            "Withdraw SMS consent anytime",
          ]}
        />
        <P>
          To exercise your rights, contact us at{" "}
          <a href="mailto:pmo@aifagenlabs.com" className="brand hover:underline">
            pmo@aifagenlabs.com
          </a>
        </P>

        <H>8. Updates to This Policy</H>
        <P>
          We may update this Privacy Policy periodically. Updates will be posted
          on this page with a revised effective date.
        </P>
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
