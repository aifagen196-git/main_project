import { useState, useEffect } from "react";
import {
  Menu,
  X,
  ArrowRight,
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
