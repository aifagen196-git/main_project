import { useEffect, useState } from "react";
import Card from "../components/common/Card";
import SectionTitle from "../components/common/SectionTitle";

import { matchHex } from "../utils/matchHex";
import {
  getApplications,
  addApplication,
  updateApplicationStatus,
  deleteApplication,
  APPLICATION_STATUSES,
} from "../services/applications";

import { Plus, Loader2, Trash2 } from "lucide-react";

const COLS = [
  { k: "applied", label: "Applied", dot: "bg-brand", hex: "#6d4aff" },
  { k: "interviewing", label: "Interviewing", dot: "bg-amber-400", hex: "#f59e0b" },
  { k: "assessment", label: "Assessment", dot: "bg-sky-400", hex: "#0ea5e9" },
  { k: "offer", label: "Offer", dot: "bg-emerald-500", hex: "#22c55e" },
  { k: "rejected", label: "Rejected", dot: "bg-rose-500", hex: "#ef4444" },
];

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-brand transition";

export default function Applications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ company: "", role: "", status: "applied" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getApplications()
      .then(setApps)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) return;
    setSaving(true);
    setErr("");
    try {
      const created = await addApplication(form);
      setApps((a) => [created, ...a]);
      setForm({ company: "", role: "", status: "applied" });
      setShowAdd(false);
    } catch (e) {
      setErr(e.message);
    }
    setSaving(false);
  }

  async function moveStatus(id, status) {
    const prev = apps;
    setApps((a) => a.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      await updateApplicationStatus(id, status);
    } catch (e) {
      console.error(e);
      setApps(prev);
    }
  }

  async function remove(id) {
    const prev = apps;
    setApps((a) => a.filter((x) => x.id !== id));
    try {
      await deleteApplication(id);
    } catch (e) {
      console.error(e);
      setApps(prev);
    }
  }

  const byStatus = (s) => apps.filter((a) => a.status === s);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-extrabold text-slate-900">
            Application Tracker
          </h2>
          <p className="text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">
              Track every application.
            </span>{" "}
            Stay organized. Get more offers.
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
        >
          <Plus size={16} /> Add Application
        </button>
      </div>

      {showAdd && (
        <Card className="p-5">
          <form onSubmit={handleAdd} className="grid sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-slate-600">Company</label>
              <input
                className={inputCls + " mt-1.5"}
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="Acme Inc."
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Role</label>
              <input
                className={inputCls + " mt-1.5"}
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="Backend Engineer"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Status</label>
              <select
                className={inputCls + " mt-1.5"}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Add
            </button>
          </form>
          {err && <p className="text-sm text-rose-600 mt-2">{err}</p>}
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {COLS.map((col) => (
          <Card key={col.k} className="p-4 text-center">
            <div className="num text-2xl font-extrabold" style={{ color: col.hex }}>
              {byStatus(col.k).length}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1">{col.label}</div>
          </Card>
        ))}
      </div>

      {loading ? (
        <Card className="p-12 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-slate-400" />
        </Card>
      ) : apps.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-semibold text-slate-700">No applications yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Add your first application to start tracking.
          </p>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto scroll pb-2">
          {COLS.map((col) => (
            <div key={col.k} className="w-72 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={"h-2.5 w-2.5 rounded-full " + col.dot} />
                  <span className="font-semibold text-slate-700 text-sm">
                    {col.label}
                  </span>
                </div>
                <span className="num text-xs font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                  {byStatus(col.k).length}
                </span>
              </div>

              <div className="space-y-3">
                {byStatus(col.k).map((a) => (
                  <Card key={a.id} hover className="p-4 group">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-brand-50 flex items-center justify-center font-bold text-brand text-xs shrink-0">
                        {a.company?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 text-sm leading-snug">
                          {a.role}
                        </div>
                        <div className="text-xs text-slate-500">{a.company}</div>
                      </div>
                      <button
                        onClick={() => remove(a.id)}
                        className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"
                        aria-label="Delete application"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <select
                        value={a.status}
                        onChange={(e) => moveStatus(a.id, e.target.value)}
                        className="text-xs rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-600 outline-none focus:border-brand"
                      >
                        {APPLICATION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {a.match_score > 0 && (
                        <span
                          className="num text-xs font-bold"
                          style={{ color: matchHex(a.match_score) }}
                        >
                          {a.match_score}%
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
