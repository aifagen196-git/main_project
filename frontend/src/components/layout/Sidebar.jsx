import { NAV } from "../../data/constants";
import { bBrandSm } from "../../styles/buttonStyles";
import { PLAN_LABEL, isPaidPlan } from "../../utils/plan";
import { CreditCard, HelpCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Sidebar({ open, setOpen, exit, plan }) {
  const paid = isPaidPlan(plan);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={
          "fixed z-40 inset-y-0 left-0 w-64 bg-white border-r border-slate-100 flex flex-col transition-transform lg:static lg:translate-x-0 " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        {/* Logo */}
        <button
          onClick={exit}
          className="flex items-center gap-3 px-5 h-16 border-b border-slate-100 shrink-0"
        >
          <img src="/logo.png" alt="AIFAGen" className="h-10 w-10 object-contain" />
          <span className="font-display text-xl font-extrabold text-slate-900">AIFAGen</span>
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scroll px-3 py-4 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = location.pathname === `/${n.id}`;
            return (
              <button
                key={n.id}
                onClick={() => {
  navigate(`/${n.id}`);
  setOpen(false);
}}
                className={
                  "w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition " +
                  (active ? "bg-brand-50 brand" : "text-slate-500 hover:bg-slate-50")
                }
              >
                <Icon size={18} className={active ? "brand" : "text-slate-400"} />
                {n.label}
              </button>
            );
          })}
{/*
<button
  onClick={() => {
    navigate("/billing");
    setOpen(false);
  }}
  className={
    "w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition " +
    (
      location.pathname === "/billing"
        ? "bg-brand-50 brand"
        : "text-slate-500 hover:bg-slate-50"
    )
  }
>
  <CreditCard
    size={18}
    className={
      location.pathname === "/billing"
        ? "brand"
        : "text-slate-400"
    }
  />
  Billing
</button>
*/}
        <div className="pt-2 mt-2 border-t border-slate-100">
          <button className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50">
            <HelpCircle size={18} className="text-slate-400" />
            Help & Support
          </button>
        </div>
      </nav>

      {/* Plan card */}
      <div className="p-3 shrink-0">
        <div className="rounded-2xl bg-brand-50 p-4">
          <div className="text-xs font-bold brand">Current plan</div>

          <div className="font-display font-extrabold brand">
            {PLAN_LABEL[plan] || "Free"}
          </div>

          {paid ? (
            <>
              <p className="text-xs text-slate-500 mt-1">
                Manage your subscription and invoices.
              </p>

              {/* OPTIONAL: comment this too if you want NO billing access */}
              {/*
              <button
                onClick={() => navigate("/billing")}
                className={bBrandSm + " w-full mt-3"}
              >
                Manage plan
              </button>
              */}
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 mt-1">
                Unlock unlimited AI, resume optimization and more.
              </p>

              <button
                onClick={() => navigate("/pricing")}
                className={bBrandSm + " w-full mt-3"}
              >
                Upgrade Now
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  </>
);
}