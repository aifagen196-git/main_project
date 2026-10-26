import { useState, useEffect } from "react";
import {
  Smile,
  Building2,
  User,
  Lock,
  Users,
} from "lucide-react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

const ROLES = [
  [Smile, "Startup", "Early stage company looking for AI solutions"],
  [Building2, "Enterprise", "Established organization seeking transformation"],
  [User, "Individual", "Professional interested in AI tools"],
  [Lock, "Investor", "Looking to invest or partner"],
  [Users, "Strategic Partner", "Agency or consultant seeking collaboration"],
];

const REASONS = [
  ["Expert Team", "Work with AI specialists who have built solutions for Fortune 500 companies."],
  ["Tailored Solutions", "Custom AI implementations designed specifically for your unique needs."],
  ["Proven Track Record", "Join 50+ organizations that have transformed with our AI solutions."],
];

export default function Collaborate({ home, enter, go }) {
  const [role, setRole] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="font-body text-slate-800 bg-white">
      <SiteHeader home={home} go={go} onCta={enter} active="collaborate" />

      {/* HERO */}
      <section className="hero-bg">
        <div className="max-w-4xl mx-auto px-5 py-20 md:py-24 text-center">
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-slate-900">
            Let's Collaborate
          </h1>
          <p className="text-lg text-slate-500 mt-5 max-w-2xl mx-auto">
            Tell us about your project and let's explore how AI can transform your
            vision into reality.
          </p>
        </div>
      </section>

      {/* I AM A... */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
          I am a...
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {ROLES.map(([Icon, title, body], i) => (
            <button
              key={i}
              onClick={() => setRole(title)}
              className={
                "rounded-2xl bg-white border shadow-sm p-8 text-center transition " +
                (role === title ? "border-brand" : "border-slate-200 hover:border-brand")
              }
            >
              <Icon size={40} className="mx-auto text-[#6d4aff]" />
              <h3 className="font-display text-2xl font-extrabold text-slate-900 mt-5">
                {title}
              </h3>
              <p className="text-slate-500 mt-3">{body}</p>
            </button>
          ))}
        </div>

      </section>

      {/* WHY PARTNER */}
      <section className="bg-brand-50">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
            Why Partner With Us?
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {REASONS.map(([title, body], i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-center"
              >
                <h3 className="font-display text-2xl font-extrabold text-slate-900">
                  {title}
                </h3>
                <p className="text-slate-500 mt-4 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter go={go} />
    </div>
  );
}
