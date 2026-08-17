import { TrendingUp } from "lucide-react";
import Card from "../common/Card";
import { STAT_TINT } from "../../data/constants";
import useCountUp from "../../hooks/useCountUp";

export default function Stat({ s, index = 0 }) {
  const Icon = s.icon || TrendingUp;
  const t = STAT_TINT[s.tint];
  const animated = useCountUp(s.v);

  return (
    <Card
      hover
      className="p-4 fadeUp"
      style={{ animationDelay: index * 60 + "ms" }}
    >
      <div
        className={
          "inline-flex h-10 w-10 items-center justify-center rounded-xl " +
          t.bg
        }
      >
        <Icon size={18} className={t.fg} />
      </div>

      <div className="mt-3 num text-2xl font-extrabold text-slate-900">
        {animated}
      </div>

      <div className="text-sm text-slate-500">{s.t}</div>

      <div
        className={
          "mt-1 text-xs font-semibold flex items-center gap-1 " + t.fg
        }
      >
        <TrendingUp size={12} />
        {s.d}
      </div>
    </Card>
  );
}