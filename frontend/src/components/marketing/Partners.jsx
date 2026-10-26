import { useEffect } from "react";
import {
  Star,
  ArrowRight,
} from "lucide-react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

export default function Partners({ home, enter, go }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="font-body text-slate-800 bg-white">
      <SiteHeader home={home} go={go} onCta={enter} active="partners" />

      {/* HERO */}
      <section className="hero-bg">
        <div className="max-w-4xl mx-auto px-5 py-24 md:py-32 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 brand text-sm font-bold px-4 py-1.5">
            <Star size={15} />
            Partner Program
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-extrabold text-slate-900 mt-8">
            Grow <span className="brand">Together</span>
          </h1>
          <p className="text-lg text-slate-500 mt-6 max-w-2xl mx-auto">
            Join our partner ecosystem and unlock new opportunities in the AI
            revolution.
          </p>
          <button
            onClick={enter}
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-brand-grad px-8 py-4 text-base font-bold text-white hover:opacity-90 transition shadow-sm"
          >
            Become a Partner <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <SiteFooter go={go} />
    </div>
  );
}
