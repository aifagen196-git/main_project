import { useState, useEffect } from "react";
import {
  Target,
  MessageSquare,
  Zap,
  Users,
  Rocket,
  Languages,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

const TABS = [
  [MessageSquare, "Research"],
  [Zap, "Prototypes"],
  [Users, "Partners"],
  [Rocket, "Launch 2027"],
];

const RESEARCH = [
  [Languages, "Advanced Language Models", "Pushing the boundaries of natural language understanding and generation."],
  [Cpu, "Edge AI Computing", "Bringing powerful AI capabilities to resource-constrained devices."],
  [Users, "Multi-Agent Systems", "Developing frameworks for coordinated AI agent collaboration."],
  [CheckCircle2, "Explainable AI", "Making AI decisions transparent and interpretable for humans."],
];

export default function InnovationLabs({ home, enter, go }) {
  const [tab, setTab] = useState("Research");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="font-body text-slate-800 bg-white">
      <SiteHeader home={home} go={go} onCta={enter} active="innovation" />

      {/* HERO */}
      <section className="hero-bg">
        <div className="max-w-4xl mx-auto px-5 py-20 md:py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 brand text-sm font-bold px-4 py-1.5">
            <Target size={15} />
            Research &amp; Development
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-slate-900 mt-6">
            Innovation Labs
          </h1>
          <p className="text-lg text-slate-500 mt-5 max-w-2xl mx-auto">
            Where imagination meets intelligence. Explore our cutting-edge
            research, prototypes, and the roadmap to 2027.
          </p>

          {/* Tab bar */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {TABS.map(([Icon, label]) => (
              <button
                key={label}
                onClick={() => setTab(label)}
                className={
                  "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition " +
                  (tab === label
                    ? "text-white btn-brand shadow-sm"
                    : "text-slate-600 bg-white border border-slate-200 hover:bg-slate-50")
                }
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* RESEARCH */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        {tab === "Research" ? (
          <>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
                Pioneering AI Research
              </h2>
              <p className="text-slate-500 mt-3">
                Our research teams are pushing the boundaries of what's possible
                with AI, focusing on areas that will shape the future of
                technology.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mt-12">
              {RESEARCH.map(([Icon, title, body], i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 lift"
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
          </>
        ) : tab === "Prototypes" ? (
          <>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
                Active Prototypes
              </h2>
              <p className="text-slate-500 mt-3">
                From concept to reality. These prototypes represent our latest
                innovations in various stages of development.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mt-12">
              {[
                ["AIFA Voice", "Testing", "Voice-first AI assistant with emotional intelligence."],
                ["Vision Analytics Pro", "Beta", "Real-time video analysis for enterprise security."],
                ["DocuMind", "Alpha", "Intelligent document processing and extraction."],
                ["FlowBuilder", "Development", "No-code AI workflow automation platform."],
              ].map(([name, stage, body], i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 lift"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-display text-2xl font-extrabold text-slate-900">
                      {name}
                    </h3>
                    <span className="shrink-0 rounded-full bg-brand-50 brand text-xs font-bold px-3 py-1.5">
                      {stage}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-4 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </>
        ) : tab === "Partners" ? (
          <>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
                Our Partner Ecosystem
              </h2>
              <p className="text-slate-500 mt-3">
                Collaboration is at the heart of innovation. We work with leading
                institutions and organizations worldwide.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              {[
                ["15+", "University Partners", "Research Partnerships"],
                ["30+", "Enterprise Collaborators", "Industry Partnerships"],
                ["50+", "Startup Ecosystem", "Startups Partnerships"],
              ].map(([count, title, sub], i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-center lift"
                >
                  <div className="num text-xl font-bold brand">{count}</div>
                  <h3 className="font-display text-2xl font-extrabold text-slate-900 mt-3">
                    {title}
                  </h3>
                  <p className="text-slate-500 mt-3">{sub}</p>
                </div>
              ))}
            </div>
          </>
        ) : tab === "Launch 2027" ? (
          <>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
                Roadmap to 2027
              </h2>
              <p className="text-slate-500 mt-3">
                Our journey to launching AIFAG and LifeOS as the next generation
                of AI ecosystems.
              </p>
            </div>
            <div className="relative mt-12 pl-6 md:pl-8">
              <div className="absolute left-1.5 md:left-2.5 top-2 bottom-2 w-1 rounded bg-brand-100" />
              <div className="space-y-6">
                {[
                  ["Q1 2025", "MVP Website + Chatbot Alpha", "completed"],
                  ["Q2 2025", "Collaboration Portal Beta", "completed"],
                  ["Q4 2025", "Product Demo Launch", "upcoming"],
                  ["Q1 2027", "Full Interactive Site v2", "upcoming"],
                  ["Q2 2027", "Global Campaign & Public Release", "upcoming"],
                ].map(([q, title, status], i) => (
                  <div key={i} className="relative">
                    <span className="absolute -left-6 md:-left-8 top-7 h-3.5 w-3.5 rounded-full bg-brand border-2 border-white shadow" />
                    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
                      <div className="text-sm font-bold brand">{q}</div>
                      <h3 className="font-display text-xl md:text-2xl font-extrabold text-slate-900 mt-1.5">
                        {title}
                      </h3>
                      <div className="mt-4 flex justify-end">
                        <span
                          className={
                            "rounded-full text-xs font-bold px-3 py-1.5 " +
                            (status === "completed"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-500")
                          }
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-slate-500 py-10">
            <h2 className="font-display text-2xl font-extrabold text-slate-900">
              {tab}
            </h2>
            <p className="mt-3">Content coming soon.</p>
          </div>
        )}
      </section>

      <SiteFooter go={go} />
    </div>
  );
}
