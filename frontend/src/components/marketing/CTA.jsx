import { ArrowRight } from "lucide-react";

export default function CTA({ enter }) {
  return (
    <section className="max-w-6xl mx-auto px-5 pb-16">
      <div className="rounded-3xl bg-brand-grad px-8 py-10 flex flex-col md:flex-row md:items-center gap-6 text-white">
        <div>
          <h3 className="font-display text-2xl md:text-3xl font-extrabold">
            Your dream role is closer than you think.
          </h3>

          <p className="text-white/85 mt-2">
            Join AIFAGen today and take the first step toward the career you
            deserve.
          </p>
        </div>

        <button
          onClick={enter}
          className="md:ml-auto shrink-0 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold brand hover:bg-white/90"
        >
          Get Your Career Plan
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}