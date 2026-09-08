import { useState, useEffect } from "react";
import {
  Menu,
  X,
  Target,
  DownloadCloud,
  Eye,
  MessageCircle,
  Gauge,
  Cloud,
  ChevronDown,
  Check,
  Linkedin,
  Instagram,
  Twitter,
  Mail,
  Globe,
  Phone,
  MapPin,
} from "lucide-react";

const SERVICES = [
  {
    icon: Target,
    title: "Generative AI Solutions",
    tag: "Create. Generate. Transform.",
    desc: "Harness the power of large language models, image generation, and creative AI to revolutionize your content creation, product development, and customer experiences.",
    deliver: [
      "Custom LLM fine-tuning & deployment",
      "AI-powered content generation",
      "Code generation & assistance",
      "Creative asset production",
      "Document summarization & analysis",
    ],
    useCases: [
      "Marketing automation",
      "Product descriptions",
      "Customer support chatbots",
      "Code review",
    ],
  },
  {
    icon: DownloadCloud,
    title: "Intelligent Automation",
    tag: "Work smarter, not harder.",
    desc: "Transform manual processes into intelligent, self-optimizing workflows. Our automation solutions learn and adapt, continuously improving efficiency.",
    deliver: [
      "Robotic Process Automation (RPA)",
      "Intelligent document processing",
      "Workflow orchestration",
      "Decision automation engines",
      "Integration with existing systems",
    ],
    useCases: [
      "Invoice processing",
      "HR onboarding",
      "Supply chain optimization",
      "Quality control",
    ],
  },
  {
    icon: Eye,
    title: "Computer Vision",
    tag: "See what others can't.",
    desc: "Extract actionable insights from images and video with advanced visual AI systems for real-world applications.",
    deliver: [
      "Object detection & recognition",
      "Image classification & analysis",
      "Video processing & tracking",
      "Document understanding",
      "Real-time visual monitoring",
    ],
    useCases: [
      "Manufacturing QA",
      "Retail analytics",
      "Security monitoring",
      "Medical imaging",
    ],
  },
  {
    icon: MessageCircle,
    title: "Conversational AI",
    tag: "Talk. Understand. Engage.",
    desc: "Build intelligent chatbots and voice assistants that understand context and deliver personalized interactions.",
    deliver: [
      "Conversational AI platforms",
      "Voice assistant development",
      "Intent recognition & NLU",
      "Multi-language support",
      "Context-aware responses",
    ],
    useCases: [
      "Customer service",
      "Sales assistance",
      "Virtual concierge",
      "Technical support",
    ],
  },
  {
    icon: Gauge,
    title: "Predictive Analytics",
    tag: "Forecast the future.",
    desc: "Make data-driven decisions with confidence. Our predictive models analyze historical patterns to forecast trends and identify opportunities.",
    deliver: [
      "Demand forecasting",
      "Customer churn prediction",
      "Risk assessment models",
      "Anomaly detection",
      "Real-time dashboards",
    ],
    useCases: [
      "Inventory planning",
      "Financial forecasting",
      "Fraud detection",
      "Maintenance prediction",
    ],
  },
  {
    icon: Cloud,
    title: "SaaS Consulting",
    tag: "Build. Scale. Succeed.",
    desc: "End-to-end guidance for building, scaling, and optimizing your AI-powered SaaS products from concept to market leadership.",
    deliver: [
      "Product strategy & roadmap",
      "Architecture & tech stack selection",
      "Go-to-market strategy",
      "Scaling & infrastructure planning",
      "Monetization & pricing models",
    ],
    useCases: [
      "Startup MVP development",
      "Enterprise transformation",
      "Product-market fit",
      "Tech stack modernization",
    ],
  },
];

export default function Services({ home, enter, go }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

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
                  (label === "Services"
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
            AI Solutions That Deliver
          </h1>
          <p className="text-lg text-slate-500 mt-5 max-w-2xl mx-auto">
            From generative AI to predictive analytics, we offer comprehensive
            solutions designed to transform your business operations.
          </p>
        </div>
      </section>

      {/* SERVICES ACCORDION */}
      <section className="max-w-4xl mx-auto px-5 py-16 md:py-20 space-y-4">
        {SERVICES.map((s, i) => {
          const Icon = s.icon;
          const isOpen = active === i;
          return (
            <div
              key={i}
              className={
                "rounded-2xl border bg-white shadow-sm overflow-hidden transition " +
                (isOpen ? "border-brand" : "border-slate-200")
              }
            >
              <button
                onClick={() => setActive(isOpen ? -1 : i)}
                className="w-full flex items-center gap-4 p-6 text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white shrink-0">
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl md:text-2xl font-extrabold text-slate-900">
                    {s.title}
                  </h3>
                  <p className="text-slate-500">{s.tag}</p>
                </div>
                <ChevronDown
                  size={22}
                  className={"brand transition " + (isOpen ? "rotate-180" : "")}
                />
              </button>

              {isOpen && (
                <div className="px-6 pb-8 border-t border-slate-100 pt-6">
                  {s.desc ? (
                    <>
                      <p className="text-slate-500 leading-relaxed">{s.desc}</p>
                      <div className="grid md:grid-cols-2 gap-8 mt-8">
                        <div>
                          <div className="font-bold text-slate-900">
                            What We Deliver
                          </div>
                          <ul className="mt-4 space-y-3">
                            {s.deliver.map((d) => (
                              <li key={d} className="flex items-start gap-3">
                                <Check size={18} className="brand mt-0.5 shrink-0" />
                                <span className="text-slate-600">{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">Use Cases</div>
                          <div className="mt-4 flex flex-wrap gap-3">
                            {s.useCases.map((u) => (
                              <span
                                key={u}
                                className="rounded-full bg-slate-100 text-slate-700 text-sm font-medium px-4 py-2"
                              >
                                {u}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-500">
                      Talk to our team to learn how {s.title} can work for your
                      business.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
