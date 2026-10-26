import { useEffect } from "react";
import {
  Globe,
  MapPin,
  Mail,
  Phone,
  ArrowRight,
} from "lucide-react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { PHONE } from "../../data/site";

const OFFICES = [
  [
    "Hyderabad",
    "India \u2022 Headquarters",
    "Info@aifagenlabs.com",
    // No separate India line \u2014 the US number below is the only published one.
    "",
  ],
  [
    "New Jersey",
    "USA \u2022 North America",
    "Hr@aifagenlabs.com",
    PHONE,
  ],
];

export default function Contact({ home, enter, go }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="font-body text-slate-800 bg-white">
      <SiteHeader home={home} go={go} onCta={enter} active="contact" />

      {/* HERO */}
      <section className="hero-bg">
        <div className="max-w-4xl mx-auto px-5 py-20 md:py-24 text-center">
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-slate-900">
            Get in Touch
          </h1>
          <p className="text-lg text-slate-500 mt-5 max-w-2xl mx-auto">
            Have questions? We're here to help. Reach out to us through any
            channel below.
          </p>
        </div>
      </section>

      {/* OFFICES + FORM */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-20 grid lg:grid-cols-2 gap-10">
        {/* Left: offices */}
        <div>
          <h2 className="font-display text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Globe className="brand" size={28} />
            Our Offices
          </h2>

          {/* Map panel */}
          <div className="relative mt-6 h-64 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden">
            {/* curved dotted connector */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d="M 22 68 C 40 44, 62 44, 78 56"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="0.5"
                strokeDasharray="2 2"
                strokeLinecap="round"
              />
            </svg>

            {/* Hyderabad pin (lower-left) */}
            <div className="absolute left-[12%] top-[62%] flex flex-col items-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-lg">
                <MapPin size={20} />
              </div>
              <span className="text-sm font-semibold text-slate-700 mt-2 whitespace-nowrap">
                Hyderabad
              </span>
            </div>

            {/* New Jersey pin (upper-right) */}
            <div className="absolute right-[14%] top-[46%] flex flex-col items-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-lg">
                <MapPin size={20} />
              </div>
              <span className="text-sm font-semibold text-slate-700 mt-2 whitespace-nowrap">
                New Jersey
              </span>
            </div>
          </div>

          {/* Office cards */}
          <div className="space-y-5 mt-6">
            {OFFICES.map(([city, region, email, phone], i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div className="font-display text-2xl font-extrabold text-slate-900">
                      {city}
                    </div>
                    <div className="text-slate-500 text-sm">{region}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-slate-400" />
                    {email}
                  </div>
                  {phone && (
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-slate-400" />
                      {phone}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: form */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
          <h2 className="font-display text-3xl font-extrabold text-slate-900">
            Send us a message
          </h2>

          <div className="mt-8 space-y-6">
            <div>
              <label className="font-semibold text-slate-900 text-sm">
                Your Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-brand transition"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-900 text-sm">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="john@example.com"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-brand transition"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-900 text-sm">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="How can we help?"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-brand transition"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-900 text-sm">
                Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={5}
                placeholder="Tell us about your inquiry..."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-brand transition resize-none"
              />
            </div>
            <button
              onClick={(e) => e.preventDefault()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-white btn-brand transition shadow-sm"
            >
              Send Message <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <SiteFooter go={go} />
    </div>
  );
}
