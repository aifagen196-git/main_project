import { useState } from "react";
import Card from "../components/common/Card";
import SectionTitle from "../components/common/SectionTitle";
import Pill from "../components/ui/Pill";
import { PLAN_LABEL, isPaidPlan } from "../utils/plan";
import { openBillingPortal } from "../services/subscription";
import { Rocket, Crown, Star, BadgeCheck, Loader2, CreditCard, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const bBrand =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white btn-brand transition shadow-sm disabled:opacity-60";
const bOutline =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition disabled:opacity-60";

const STATUS_STYLE = {
  active: "bg-emerald-50 text-emerald-700",
  trialing: "bg-brand-50 brand",
  past_due: "bg-amber-50 text-amber-700",
  canceled: "bg-slate-100 text-slate-600",
  inactive: "bg-slate-100 text-slate-600",
};

export default function Billing({ profile }) {
  const navigate = useNavigate();
  const setView = (view) => navigate(`/${view}`);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const plan = profile?.plan || "none";
  const status = profile?.subscription_status || "inactive";
  const paid = isPaidPlan(plan);
  const Icon = plan === "career_accelerator" ? Crown : plan === "professional" ? Rocket : Star;

  const renew = profile?.current_period_end
    ? new Date(profile.current_period_end).toLocaleDateString(undefined, {
        month: "short", day: "numeric", year: "numeric",
      })
    : null;

  async function manage() {
    setErr("");
    setBusy(true);
    try {
      await openBillingPortal(); // redirects to Stripe
    } catch (e) {
      setErr(e.message || "Could not open the billing portal.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-extrabold text-slate-900">Subscription & Billing</h2>
        <p className="text-slate-500 mt-1">Manage your plan, payment method and invoices.</p>
      </div>

      <Card className="p-6 text-white relative overflow-hidden bg-brand-grad">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
          <div>
            <Pill className="bg-white/20 text-white">
              <BadgeCheck size={13} /> {status === "trialing" ? "Trial active" : status === "active" ? "Active" : status}
            </Pill>
            <div className="mt-2 font-display text-3xl font-extrabold flex items-center gap-2">
              <Icon size={26} /> {PLAN_LABEL[plan]} {plan !== "none" && "Plan"}
            </div>
            {profile?.billing_cycle && (
              <p className="text-white/85 mt-1 capitalize">{profile.billing_cycle} billing</p>
            )}
          </div>
          {renew && (
            <div className="sm:text-right">
              <div className="text-sm text-white/80">
                {status === "canceled" ? "Access until" : "Renews on"}
              </div>
              <div className="num text-2xl font-extrabold">{renew}</div>
            </div>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-2 relative">
          {paid ? (
            <button onClick={manage} disabled={busy} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold brand hover:bg-white/90 disabled:opacity-60 inline-flex items-center gap-2">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              Manage subscription
            </button>
          ) : (
            <button onClick={() => setView("pricing")} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold brand hover:bg-white/90 inline-flex items-center gap-2">
              Upgrade plan <ArrowRight size={16} />
            </button>
          )}
        </div>
      </Card>

      {err && (
        <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">{err}</div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-xs text-slate-400 font-semibold">Current plan</div>
          <div className="font-display text-lg font-bold text-slate-900 mt-1">{PLAN_LABEL[plan]}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-slate-400 font-semibold">Status</div>
          <div className="mt-1">
            <Pill className={STATUS_STYLE[status] || "bg-slate-100 text-slate-600"}>{status}</Pill>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-slate-400 font-semibold">Billing cycle</div>
          <div className="font-display text-lg font-bold text-slate-900 mt-1 capitalize">
            {profile?.billing_cycle || "—"}
          </div>
        </Card>
      </div>

      {paid && (
        <Card className="p-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <div className="font-bold text-slate-900">Invoices & payment method</div>
            <p className="text-sm text-slate-500">View invoices, update your card, or cancel — all in the secure Stripe portal.</p>
          </div>
          <button onClick={manage} disabled={busy} className={bOutline + " sm:ml-auto"}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            Open billing portal
          </button>
        </Card>
      )}

      {!paid && (
        <Card className="p-6 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: "linear-gradient(135deg,#f3efff,#fdf2f8)" }}>
          <div>
            <div className="font-bold text-slate-900">Unlock more with a paid plan</div>
            <p className="text-sm text-slate-500">Unlimited AI matches, resume optimization, cover letters and more.</p>
          </div>
          <button onClick={() => setView("pricing")} className={bBrand + " sm:ml-auto"}>
            See plans <ArrowRight size={16} />
          </button>
        </Card>
      )}
    </div>
  );
}
