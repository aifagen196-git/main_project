import { useState, useEffect } from "react";
import {
  User,
  TrendingUp,
} from "lucide-react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

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
  const [filter, setFilter] = useState("All Cases");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const shown = filter === "All Cases" ? CASES : CASES.filter((c) => c[0] === filter);

  return (
    <div className="font-body text-slate-800 bg-white">
      <SiteHeader home={home} go={go} onCta={enter} active="caseStudies" />

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

      <SiteFooter go={go} />
    </div>
  );
}
