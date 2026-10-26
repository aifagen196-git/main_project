import { useState, useEffect } from "react";
import {
  Target,
  DownloadCloud,
  Eye,
  MessageCircle,
  Gauge,
  Cloud,
  ChevronDown,
  Check,
} from "lucide-react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

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
  const [active, setActive] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="font-body text-slate-800 bg-white">
      <SiteHeader home={home} go={go} onCta={enter} active="services" />

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

      <SiteFooter go={go} />
    </div>
  );
}
