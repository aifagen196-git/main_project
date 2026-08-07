import { useState } from "react";
import Card from "../components/common/Card";
import { PLANS, isPaidPlan } from "../utils/plan";
import { startCheckout, selectFreePlan } from "../services/subscription";
import { signOut } from "../services/auth";
import {
  Star, CheckCircle2, Shield, CreditCard, Lock, HelpCircle, Loader2, LogOut,
} from "lucide-react";

const bBrand =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white btn-brand transition shadow-sm disabled:opacity-60";
const bOutline =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition disabled:opacity-60";

export default function Pricing({ profile, refresh, onboarding = false }) {
  const [cycle, setCycle] = useState("monthly");
  const [busy, setBusy] = useState(null); // plan id currently processing
  const [err, setErr] = useState("");
  const currentPlan = profile?.plan;

  async function choose(plan) {
    setErr("");
    setBusy(plan.id);
    try {
      if (plan.id === "free") {
        await selectFreePlan(profile.id);
      } else {
        await startCheckout(plan.id, cycle); // opens Razorpay, resolves on success
      }
      await refresh?.();
    } catch (e) {
      setErr(e.message || "Something went wrong. Please try again.");
      setBusy(null);
    }
  }

  const grid = (
    <>
      <div className="text-center">
        <p className="text-xs font-bold tracking-widest brand">PRICING</p>
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
          {onboarding ? "Choose your plan to get started" : "Plans & pricing"}
        </h2>
        <p className="text-slate-500 mt-3 max-w-lg mx-auto">
          {onboarding
            ? "Pick a plan to unlock your dashboard. Paid plans include a 7-day free trial — cancel anytime."
            : "Upgrade or downgrade anytime. Paid plans include a 7-day free trial."}
        </p>
      </div>

      {/* Billing cycle toggle */}
      <div className="mt-6 flex justify-center">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
          <button
            onClick={() => setCycle("monthly")}
            className={"px-4 py-1.5 rounded-lg text-sm font-semibold " + (cycle === "monthly" ? "btn-brand text-white" : "text-slate-500")}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("annual")}
            className={"px-4 py-1.5 rounded-lg text-sm font-semibold " + (cycle === "annual" ? "btn-brand text-white" : "text-slate-500")}
          >
            Annual <span className="text-xs">-20%</span>
          </button>
        </div>
      </div>

      {err && (
        <div className="mt-5 max-w-xl mx-auto rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
          {err}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mt-8 items-start">
        {PLANS.map((p) => {
          const price = cycle === "monthly" ? p.monthly : p.annual;
          const isCurrent = currentPlan === p.id;
          return (
            <Card
              key={p.id}
              className={"p-7 relative " + (p.popular ? "border-brand shadow-xl" : "")}
              style={p.popular ? { borderWidth: 2 } : undefined}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white flex items-center gap-1">
                  <Star size={12} /> Most Popular
                </span>
              )}
              <h3 className="font-display text-xl font-extrabold text-slate-900">{p.name}</h3>
              <p className="text-sm text-slate-500 mt-1 min-h-[2.5rem]">{p.tagline}</p>
              <div className="mt-3 flex items-end gap-1">
                <span className="num text-4xl font-extrabold text-slate-900">${price}</span>
                <span className="text-slate-400 mb-1.5">/month</span>
              </div>
              {cycle === "annual" && price > 0 && (
                <div className="text-xs text-emerald-600 font-semibold">Billed ${price * 12}/year</div>
              )}

              <button
                onClick={() => choose(p)}
                disabled={busy !== null || isCurrent}
                className={(p.popular ? bBrand : bOutline) + " w-full mt-5"}
              >
                {busy === p.id ? (
                  <><Loader2 size={16} className="animate-spin" /> Please wait…</>
                ) : isCurrent ? (
                  "Current plan"
                ) : isPaidPlan(p.id) ? (
                  p.cta
                ) : (
                  "Get Started Free"
                )}
              </button>

              <div className="mt-6 space-y-3">
                {p.features.map((f, k) => (
                  <div key={k} className="flex gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={18} className="brand shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* trust strip */}
      <div className="mt-10 rounded-2xl bg-brand-50 px-6 py-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          [Shield, "7-Day Free Trial", "Try all premium features risk-free."],
          [CreditCard, "Cancel Anytime", "No commitments. Cancel anytime."],
          [Lock, "Secure & Private", "Payments handled securely by Stripe."],
          [HelpCircle, "24/7 Support", "We're here to help you succeed."],
        ].map((x, i) => {
          const Icon = x[0];
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                <Icon size={20} className="brand" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">{x[1]}</div>
                <div className="text-xs text-slate-500">{x[2]}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  // Onboarding = full-screen gate with its own header. In-app = plain section.
  if (!onboarding) return <div className="space-y-2">{grid}</div>;

  return (
    <div className="page-bg min-h-screen">
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="AIFAGen" className="h-8 w-8 object-contain" />
            <span className="font-display text-lg font-extrabold text-slate-900">AIFAGen</span>
          </div>
          <button
            onClick={() => signOut()}
            className="ml-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-10 sm:py-14">
        {profile?.full_name && (
          <p className="text-center text-sm text-slate-500 mb-2">
            Welcome, {profile.full_name.split(" ")[0]} 👋
          </p>
        )}
        {grid}
      </main>
    </div>
  );
}
