import { useEffect } from "react";
import {
  Smile,
  Eye,
  Heart,
  Users,
  Zap,
  MapPin,
  ArrowRight,
} from "lucide-react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

const VALUES = [
  [Heart, "Human-Centric", "AI that empowers people, not replaces them."],
  [Smile, "Results-Driven", "Focused on measurable business outcomes."],
  [Users, "Collaborative", "Partnership approach to every project."],
  [Zap, "Innovation-First", "Always pushing the boundaries of what's possible."],
];

const JOURNEY = [
  ["2024", "Company Founded", "AIFAGen Labs established with vision for accessible AI."],
  ["Q1 2025", "MVP Launch", "Website and chatbot alpha released to public."],
  ["Q2 2025", "Partnerships", "Collaboration portal opens for strategic partners."],
  ["Q4 2025", "Product Preview", "First demos of AIFAG and LifeOS showcased."],
  ["Q1 2027", "Platform Beta", "Full interactive platform v2 with AI-driven features."],
  ["Q2 2027", "Global Launch", "AIFAG & LifeOS released to the world."],
];

export default function AboutPage({ home, enter, go }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // The "Collaborate" button on this page scrolls to its own join section.
  const toJoin = () => {
    const el = document.getElementById("join");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: "smooth" });
  };

  return (
    <div className="font-body text-slate-800 bg-white">
      <SiteHeader home={home} go={go} onCta={toJoin} active="about" />

      {/* HERO */}
      <section className="hero-bg">
        <div className="max-w-4xl mx-auto px-5 py-20 md:py-28 text-center">
          <span className="inline-block rounded-full bg-brand-50 brand text-sm font-bold px-4 py-1.5">
            Est. 2027
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-slate-900 mt-6">
            Building the Future of AI
          </h1>
          <p className="text-lg text-slate-500 mt-5 max-w-2xl mx-auto">
            We're on a mission to make AI accessible, meaningful, and scalable —
            from startups to global enterprises. Join us as we build toward our
            2027 vision.
          </p>
        </div>
      </section>

      {/* OUR STORY */}
      <section className="max-w-3xl mx-auto px-5 py-16 md:py-20">
        <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
          Our Story
        </h2>
        <div className="mt-8 space-y-5 text-slate-500 leading-relaxed">
          <p>
            AIFAGen Labs was founded in 2025 with a simple yet powerful belief:
            AI should be for everyone — not just large tech companies.
          </p>
          <p>
            We identified a gap between advanced AI research and practical
            business adoption. Our goal is to bridge that gap with intuitive,
            scalable, and human-centric AI platforms.
          </p>
          <p>
            Our philosophy is{" "}
            <span className="font-bold text-slate-900">AI for All Generations</span>{" "}
            — empowering startups, enterprises, and individuals alike.
          </p>
          <p>
            We are building toward our 2027 vision with platforms such as{" "}
            <span className="font-bold text-slate-900">AIFAG</span> and{" "}
            <span className="font-bold text-slate-900">LifeOS</span>.
          </p>
        </div>
      </section>

      {/* MISSION / VISION */}
      <section className="bg-brand-50">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-20 grid md:grid-cols-2 gap-6">
          {[
            [Smile, "Our Mission",
              "Deliver next-generation, human-centric AI solutions that transform businesses and empower individuals by enhancing human capabilities."],
            [Eye, "Our Vision",
              "Make AI accessible, meaningful, and scalable — from startups to global enterprises."],
          ].map(([Icon, title, body], i) => (
            <div
              key={i}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8"
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
      </section>

      {/* OUR VALUES */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <div className="text-center">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
            Our Values
          </h2>
          <p className="text-slate-500 mt-3">
            The principles that guide everything we do.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {VALUES.map(([Icon, title, body], i) => (
            <div
              key={i}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 text-center lift"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
                <Icon size={22} />
              </div>
              <h3 className="font-bold text-slate-900 mt-5">{title}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* JOURNEY */}
      <section className="bg-brand-50">
        <div className="max-w-4xl mx-auto px-5 py-16 md:py-20">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
              Our Journey to 2027
            </h2>
            <p className="text-slate-500 mt-3">
              Building the future, one milestone at a time.
            </p>
          </div>

          <div className="relative mt-12 pl-8 md:pl-24">
            {/* vertical line */}
            <div className="absolute left-2 md:left-16 top-2 bottom-2 w-0.5 bg-brand/40" />
            <div className="space-y-6">
              {JOURNEY.map(([when, title, body], i) => (
                <div key={i} className="relative">
                  {/* dot */}
                  <div className="absolute -left-[26px] md:-left-[34px] top-6 h-3 w-3 rounded-full bg-brand ring-4 ring-brand-50" />
                  {/* badge */}
                  <span className="absolute -left-8 md:-left-24 top-5 inline-flex items-center justify-center rounded-lg bg-brand text-white text-xs font-bold px-2.5 py-1 md:w-16">
                    {when}
                  </span>
                  <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
                    <h3 className="font-display text-xl font-extrabold text-slate-900">
                      {title}
                    </h3>
                    <p className="text-slate-500 mt-2">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="max-w-3xl mx-auto px-5 py-16 md:py-20 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
          Leadership & Team
        </h2>
        <p className="text-slate-500 mt-4 leading-relaxed">
          AIFAGen Labs is led by a multidisciplinary team of AI engineers,
          researchers, and product builders focused on responsible and scalable
          AI innovation.
        </p>
      </section>

      {/* GLOBAL PRESENCE */}
      <section className="bg-brand-50">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
              Global Presence
            </h2>
            <p className="text-slate-500 mt-3">
              Operating across two continents to serve clients worldwide.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            {[
              ["Hyderabad", "India"],
              ["New Jersey", "USA"],
            ].map(([city, country], i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 flex items-center gap-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white shrink-0">
                  <MapPin size={22} />
                </div>
                <div>
                  <div className="font-display text-2xl font-extrabold text-slate-900">
                    {city}
                  </div>
                  <div className="text-slate-500">{country}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JOIN OUR MISSION */}
      <section id="join" className="max-w-4xl mx-auto px-5 py-20 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
          Join Our Mission
        </h2>
        <p className="text-slate-500 mt-4 max-w-xl mx-auto">
          Whether you're looking to transform your business or join our team,
          we'd love to hear from you.
        </p>
        <button
          onClick={enter}
          className="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white btn-brand transition shadow-sm"
        >
          Partner With Us <ArrowRight size={18} />
        </button>
      </section>

      <SiteFooter go={go} />
    </div>
  );
}
