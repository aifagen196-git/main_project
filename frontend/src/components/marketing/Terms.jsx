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

export default function Terms({ home, enter, go }) {
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
          AIFAGen Labs Terms &amp; Conditions
        </h1>

        <H>1. Overview</H>
        <P>
          AIFAGen Labs provides IT staffing, job marketing, resume engineering,
          and interview support services for job seekers.
        </P>
        <P>By using our services, you agree to these Terms and Conditions.</P>

        <H>2. Services</H>
        <P>Our services may include:</P>
        <List
          items={[
            "Resume engineering",
            "Job application marketing",
            "Interview preparation",
            "Client payroll placement support",
            "Technical screening",
          ]}
        />
        <P>
          We do not guarantee job placement but commit to strategic job marketing
          efforts.
        </P>

        <H>3. SMS Terms of Service</H>
        <P>
          By opting into SMS communication via web forms or other methods, you
          agree to receive text messages from AIFAGen Labs regarding:
        </P>
        <List
          items={[
            "Job updates",
            "Application status",
            "Interview scheduling",
            "Service notifications",
          ]}
        />
        <P>Message frequency varies.</P>
        <P>Message and data rates may apply.</P>
        <P>
          To opt out, reply <span className="font-bold text-slate-900">STOP</span>{" "}
          at any time.
        </P>
        <P>
          For assistance, reply{" "}
          <span className="font-bold text-slate-900">HELP</span> or contact:
        </P>
        <div className="mt-4 space-y-2 text-slate-600">
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-slate-400" />
            <a href="mailto:pmo@aifagenlabs.com" className="brand hover:underline">
              pmo@aifagenlabs.com
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-slate-400" />
            <a href="tel:+17322539043" className="brand hover:underline">
              +1 732-253-9043
            </a>
          </div>
        </div>

        <H>4. User Responsibilities</H>
        <P>You agree that:</P>
        <List
          items={[
            "Information provided is accurate and truthful",
            "You are legally authorized to work in your stated visa category",
            "You will not misuse our services",
          ]}
        />

        <H>5. Payments (If Applicable)</H>
        <P>If enrolled in paid job marketing packages:</P>
        <List
          items={[
            "Fees must be paid in advance",
            "Fees are non-refundable unless explicitly agreed in writing",
          ]}
        />

        <H>6. Limitation of Liability</H>
        <P>AIFAGen Labs is not liable for:</P>
        <List
          items={[
            "Hiring decisions made by client companies",
            "Delays in job offers",
            "Market-related employment conditions",
          ]}
        />

        <H>7. Intellectual Property</H>
        <P>
          All website content, branding, and service materials belong to AIFAGen
          Labs and may not be copied without permission.
        </P>

        <H>8. Modifications</H>
        <P>
          We reserve the right to modify these terms at any time. Continued use of
          services indicates acceptance of updated terms.
        </P>

        <H>9. Contact Information</H>
        <P>AIFAGen Labs</P>
        <div className="mt-4 space-y-2 text-slate-600">
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-slate-400" />
            <a href="mailto:pmo@aifagenlabs.com" className="brand hover:underline">
              pmo@aifagenlabs.com
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-slate-400" />
            <a href="tel:+17322539043" className="brand hover:underline">
              +1 732-253-9043
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-slate-400" />
            <a
              href="https://www.aifagenlabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="brand hover:underline"
            >
              https://www.aifagenlabs.com
            </a>
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
