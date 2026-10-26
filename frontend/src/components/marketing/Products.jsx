import { useState, useEffect } from "react";
import {
  Zap,
  Smile,
  Wrench,
  Settings,
  GitBranch,
  Share2,
  Shield,
  CircleDot,
  Briefcase,
  CheckCircle2,
  Heart,
  ListTodo,
  DollarSign,
  Users,
  BookOpen,
} from "lucide-react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

const STEPS = [
  [Wrench, "Step 1", "Connect", "Integrate with your existing systems and data sources seamlessly."],
  [Settings, "Step 2", "Configure", "Customize AI agents to match your specific business workflows."],
  [Zap, "Step 3", "Deploy", "Launch intelligent automation across your organization instantly."],
];

const CAPABILITIES = [
  [GitBranch, "Multi-Agent Orchestration", "Coordinate multiple AI agents working together on complex tasks."],
  [Share2, "Enterprise Integration", "Connect with 200+ enterprise tools and platforms out of the box."],
  [Zap, "Real-time Processing", "Process and respond to events in milliseconds, not minutes."],
  [Shield, "Enterprise Security", "SOC 2 compliant with end-to-end encryption and access controls."],
];

const WORKFLOWS = [
  ["Sales Report Automation", "Collect sales data, analyze trends, generate report, email to team"],
  ["Customer Support Triage", "Monitor tickets, categorize urgency, assign to agents, send updates"],
  ["Content Pipeline", "Research topics, generate drafts, review quality, schedule posts"],
];

const LIFEOS_FEATURES = [
  [Briefcase, "Smart Planning", "AI-powered scheduling that adapts to your priorities and energy levels."],
  [CheckCircle2, "Goal Tracking", "Set, track, and achieve your goals with intelligent progress monitoring."],
  [Heart, "Wellness Integration", "Balance work and life with health-aware recommendations."],
  [ListTodo, "Task Intelligence", "Smart task prioritization and delegation suggestions."],
  [DollarSign, "Financial Insights", "Track spending and receive personalized financial guidance."],
  [Users, "Relationship Manager", "Never miss important dates or follow-ups with your network."],
];

const LIFEOS_FOCUS = [
  [Zap, "Career"],
  [Heart, "Health"],
  [BookOpen, "Learning"],
  [DollarSign, "Finance"],
];

export default function Products({ home, enter, go }) {
  const [product, setProduct] = useState("AIFAG");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="font-body text-slate-800 bg-white">
      <SiteHeader home={home} go={go} onCta={enter} active="products" />

      {/* HERO */}
      <section className="hero-bg">
        <div className="max-w-4xl mx-auto px-5 py-20 md:py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 brand text-sm font-bold px-4 py-1.5">
            <Zap size={15} />
            Launching 2027
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-slate-900 mt-6">
            Our Flagship Products
          </h1>
          <p className="text-lg text-slate-500 mt-5 max-w-2xl mx-auto">
            Two revolutionary AI ecosystems designed to transform how enterprises
            operate and individuals live.
          </p>

          {/* Product toggle */}
          <div className="mt-10 inline-flex rounded-2xl bg-slate-100 p-1.5">
            {["AIFAG", "LifeOS"].map((p) => (
              <button
                key={p}
                onClick={() => setProduct(p)}
                className={
                  "rounded-xl px-8 py-2.5 text-sm font-bold transition " +
                  (product === p ? "text-white btn-brand shadow-sm" : "text-slate-600")
                }
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </section>

      {product === "AIFAG" ? (
        <>
          {/* AIFAG INTRO */}
          <section className="max-w-6xl mx-auto px-5 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-block rounded-full border border-brand brand text-sm font-semibold px-4 py-1.5">
                AI for All Generations
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-extrabold text-slate-900 mt-6">
                AIFAG
              </h2>
              <p className="text-lg text-slate-500 mt-5">
                From learner to founder, everyone can create AI agents to make
                life easier.
              </p>
              <p className="text-slate-500 mt-5 leading-relaxed">
                Build intelligent agents without coding. Showcase your creations
                to potential employers. Companies discover talent through their
                agent portfolios and make hiring decisions based on real
                capabilities.
              </p>
              <button
                onClick={enter}
                className="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white btn-brand transition shadow-sm"
              >
                Request Early Access
              </button>
            </div>

            <div className="relative flex items-center justify-center h-80">
              <div className="absolute h-72 w-72 rounded-full border border-brand/10" />
              <div className="absolute h-56 w-56 rounded-full border border-brand/20" />
              <div className="absolute h-40 w-40 rounded-full border border-brand/30" />
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-brand text-white shadow-lg">
                <Smile size={56} />
              </div>
            </div>
          </section>

          {/* THREE STEPS */}
          <section className="bg-brand-50">
            <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
                Three Steps to Intelligent Automation
              </h2>
              <div className="grid md:grid-cols-3 gap-6 mt-12">
                {STEPS.map(([Icon, step, title, body], i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-center"
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
                      <Icon size={26} />
                    </div>
                    <div className="brand font-bold text-sm mt-5">{step}</div>
                    <h3 className="font-display text-2xl font-extrabold text-slate-900 mt-1">
                      {title}
                    </h3>
                    <p className="text-slate-500 mt-3">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CAPABILITIES */}
          <section className="max-w-6xl mx-auto px-5 py-16 md:py-20">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
              Enterprise-Grade Capabilities
            </h2>
            <div className="grid md:grid-cols-2 gap-6 mt-12">
              {CAPABILITIES.map(([Icon, title, body], i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 flex gap-5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 shrink-0">
                    <Icon size={22} className="text-[#6d4aff]" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-extrabold text-slate-900">
                      {title}
                    </h3>
                    <p className="text-slate-500 mt-2 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SEE AIFAG IN ACTION */}
          <section className="bg-brand-50">
            <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
              <div className="text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-white brand text-sm font-bold px-4 py-1.5 border border-slate-200">
                  <CircleDot size={15} />
                  Interactive Demo
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 mt-6">
                  See AIFAG in Action
                </h2>
                <p className="text-slate-500 mt-3">
                  Watch how multiple AI agents collaborate to complete complex
                  workflows
                </p>
              </div>

              <div className="mt-10">
                <div className="font-bold text-slate-900 mb-4">
                  Select a workflow to simulate:
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {WORKFLOWS.map(([title, body], i) => (
                    <button
                      key={i}
                      onClick={enter}
                      className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-left hover:border-brand transition"
                    >
                      <h3 className="font-display text-2xl font-extrabold text-slate-900">
                        {title}
                      </h3>
                      <p className="text-slate-500 mt-3 leading-relaxed">{body}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* LIFEOS INTRO */}
          <section className="max-w-6xl mx-auto px-5 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-block rounded-full border border-brand brand text-sm font-semibold px-4 py-1.5">
                Personal AI Operating System
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-extrabold text-slate-900 mt-6">
                LifeOS
              </h2>
              <p className="text-slate-500 mt-5 leading-relaxed">
                Your intelligent life companion. LifeOS learns your habits,
                understands your goals, and helps you optimize every aspect of
                your personal and professional life.
              </p>
              <button
                onClick={enter}
                className="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white btn-brand transition shadow-sm"
              >
                Join Beta Waitlist
              </button>
            </div>

            {/* Today's Focus card */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand text-white">
                  <Briefcase size={26} />
                </div>
                <div>
                  <div className="font-display text-2xl font-extrabold text-slate-900">
                    Today's Focus
                  </div>
                  <div className="text-slate-500">3 priorities identified</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-slate-500 text-sm">Energy Level</div>
                  <div className="font-display text-2xl font-extrabold text-slate-900 mt-2">
                    87%
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-slate-500 text-sm">Goals Progress</div>
                  <div className="font-display text-2xl font-extrabold text-slate-900 mt-2">
                    12/15
                  </div>
                </div>
              </div>

              <p className="text-slate-600 mt-6 leading-relaxed">
                "Based on your schedule, I recommend tackling the presentation
                before lunch when your focus peaks."
              </p>
              <div className="brand font-semibold mt-4">— Your AI Assistant</div>
            </div>
          </section>

          {/* PERSONAL AI SUITE */}
          <section className="bg-brand-50">
            <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
                Your Personal AI Suite
              </h2>
              <div className="grid md:grid-cols-3 gap-6 mt-12">
                {LIFEOS_FEATURES.map(([Icon, title, body], i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                      <Icon size={22} className="text-[#6d4aff]" />
                    </div>
                    <h3 className="font-display text-xl font-extrabold text-slate-900 mt-6">
                      {title}
                    </h3>
                    <p className="text-slate-500 mt-3 leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* EXPERIENCE LIFEOS */}
          <section className="max-w-6xl mx-auto px-5 py-16 md:py-20">
            <div className="text-center">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
                Experience LifeOS
              </h2>
              <p className="text-slate-500 mt-3">
                Create your personalized dashboard and see AI-powered insights in
                real-time
              </p>
            </div>

            <div className="mt-10">
              <div className="font-bold text-slate-900 text-center mb-6">
                Select your focus areas:
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {LIFEOS_FOCUS.map(([Icon, label], i) => (
                  <button
                    key={i}
                    onClick={enter}
                    className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 flex flex-col items-center gap-4 hover:border-brand transition"
                  >
                    <Icon size={28} className="text-[#6d4aff]" />
                    <span className="font-bold text-slate-900">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <SiteFooter go={go} />
    </div>
  );
}
