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
  ArrowRight,
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
