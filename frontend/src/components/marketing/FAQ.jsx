import { useState } from "react";
import { Plus, ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Can I change my plan later?",
    a: "Yes — upgrade, downgrade, or cancel anytime from your billing settings. Changes take effect at your next cycle.",
  },
  {
    q: "Is there a free trial?",
    a: "Paid plans include a 7-day free trial. No credit card required to start.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All major cards via Stripe, plus regional methods. Annual billing saves 20%.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <div className="max-w-2xl mx-auto mt-16">
      <h3 className="font-display text-2xl font-extrabold text-slate-900 text-center mb-6">
        Frequently Asked Questions
      </h3>

      {FAQS.map((f, i) => (
        <div key={i} className="border-b border-slate-100">
          <button
            onClick={() => setOpen(open === i ? -1 : i)}
            className="w-full flex items-center gap-3 py-4 text-left"
          >
            <Plus
              size={18}
              className={`brand transition ${
                open === i ? "rotate-45" : ""
              }`}
            />

            <span className="font-semibold text-slate-800">
              {f.q}
            </span>

            <ChevronDown
              size={18}
              className={`ml-auto text-slate-400 transition ${
                open === i ? "rotate-180" : ""
              }`}
            />
          </button>

          {open === i && (
            <p className="text-sm text-slate-500 pb-4 pl-8">
              {f.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}