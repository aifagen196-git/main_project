import { useState } from "react";
import Card from "../components/common/Card";
import SectionTitle from "../components/common/SectionTitle";
import Pill from "../components/ui/Pill";
import { signOut } from "../services/auth";
import { updateProfile } from "../services/profile";
import { PLAN_LABEL, isPaidPlan } from "../utils/plan";

import {
  Crown,
  LogOut,
  Check,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-brand transition";

const bOutlineSm =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60";

const bBrandSm =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60";

export default function SettingsView({ profile }) {
  const navigate = useNavigate();
  const setView = (view) => navigate(`/${view}`);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    headline: profile?.headline || "",
    location: profile?.location || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const upd = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  async function handleLogout() {
    try {
      await signOut();
    } catch (e) {
      console.error(e);
    }
  }

  async function save() {
    setErr("");
    setSaving(true);
    try {
      await updateProfile(profile.id, form);
      setSaved(true);
    } catch (e) {
      setErr(e.message || "Could not save changes.");
    }
    setSaving(false);
  }

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const plan = profile?.plan || "free";
  const paid = isPaidPlan(plan);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-3xl font-extrabold text-slate-900">Settings</h2>

      <div className="space-y-5">
        <Card className="p-6">
          <SectionTitle
            title="Profile Settings"
            sub="Manage your personal information and public profile."
          />

          <div className="flex items-center gap-4 mb-5">
            <div className="h-16 w-16 rounded-full bg-brand-grad flex items-center justify-center text-white text-xl font-bold shrink-0">
              {initials}
            </div>
            <div>
              <div className="font-bold text-slate-900">{profile?.full_name || "User"}</div>
              <div className="text-sm text-slate-500">{PLAN_LABEL[plan]} Plan</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600">Full Name</label>
              <input
                className={inputCls + " mt-1.5"}
                value={form.full_name}
                onChange={(e) => upd("full_name", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Email</label>
              <input className={inputCls + " mt-1.5"} defaultValue={profile?.email || ""} disabled />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Location</label>
              <input
                className={inputCls + " mt-1.5"}
                placeholder="Enter location"
                value={form.location}
                onChange={(e) => upd("location", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Headline</label>
              <input
                className={inputCls + " mt-1.5"}
                placeholder="Enter professional headline"
                value={form.headline}
                onChange={(e) => upd("headline", e.target.value)}
              />
            </div>
          </div>

          {err && <p className="text-sm text-rose-600 mt-3">{err}</p>}

          <div className="flex justify-end items-center gap-3 mt-5">
            {saved && (
              <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                <Check size={15} /> Saved
              </span>
            )}
            <button onClick={save} disabled={saving} className={bBrandSm}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Save Changes
            </button>
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle title="Subscription" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Crown size={20} className={paid ? "text-amber-500" : "text-slate-400"} />
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {PLAN_LABEL[plan]} Plan
                <Pill className="bg-emerald-50 text-emerald-700">
                  {profile?.subscription_status || "active"}
                </Pill>
              </div>
              <div className="text-xs text-slate-500">Current subscription plan</div>
            </div>
            <button onClick={() => setView(paid ? "billing" : "pricing")} className={bBrandSm}>
              {paid ? "Manage" : "Upgrade"} <ArrowRight size={14} />
            </button>
          </div>
        </Card>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-100"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );
}
