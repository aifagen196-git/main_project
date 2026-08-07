import Card from "../components/common/Card";
import Ring from "../components/common/Ring";
import SectionTitle from "../components/common/SectionTitle";
import Bar from "../components/ui/Bar";

import {
  PREP_STATS,
  PREP_SKILLS,
  PERF,
} from "../data/interviewPrepData";

import { STAT_TINT } from "../data/constants";

import {
  Briefcase,
  Calendar,
  Clock,
  Mic,
  HelpCircle,
  Star,
  ArrowRight,
  GraduationCap,
  ChevronRight,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

const bOutlineSm =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition";

const bBrandSm =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition";


export default function InterviewPrep() {
  return (
    <div className="space-y-6">

      <div>
        <h2 className="font-display text-3xl font-extrabold text-slate-900">
          Interview Preparation
        </h2>

        <p className="text-slate-500 mt-1">
          Practice smarter. Get confident. Ace your next interview.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        <Card className="lg:col-span-2 p-6">

          <div className="flex items-center gap-5">

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
              <Briefcase size={28} className="brand" />
            </div>

            <div className="flex-1">
              <div className="text-xs text-slate-400">
                Target Role
              </div>

              <div className="font-display text-xl font-extrabold text-slate-900">
                Senior Product Designer
              </div>

              <div className="text-sm text-slate-500">
                Product Design · Mid to Senior
              </div>
            </div>

            <Ring
              value={68}
              size={86}
              stroke={9}
              label="68%"
            />

          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">

            {PREP_STATS.map((s, i) => {
              const Icon = s.icon;
              const t = STAT_TINT[s.tint];

              return (
                <div
                  key={i}
                  className="rounded-xl border border-slate-100 p-3"
                >
                  <div
                    className={
                      "inline-flex h-9 w-9 items-center justify-center rounded-lg " +
                      t.bg
                    }
                  >
                    <Icon
                      size={16}
                      className={t.fg}
                    />
                  </div>

                  <div className="num text-xl font-extrabold text-slate-900 mt-2">
                    {s.v}
                  </div>

                  <div className="text-xs text-slate-500">
                    {s.t}
                  </div>
                </div>
              );
            })}

          </div>

        </Card>

        <Card className="p-6">

          <SectionTitle
            title="Weekly Goal"
            action={
              <button className="text-sm font-semibold brand">
                Edit
              </button>
            }
          />

          <p className="text-sm text-slate-600 mb-3">
            Complete 3 mock interviews
          </p>

          <div className="flex items-center gap-2">
            <Bar value={66} />
            <span className="num text-sm font-bold text-slate-700">
              2/3
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-2">
            1 more to complete your goal!
          </p>

          <div className="mt-5 rounded-xl border border-slate-100 p-3">

            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Calendar size={16} className="brand" />
              Product Design Interview
            </div>

            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Clock size={12} />
              Today, 7:00 PM · 45 min · AI Interviewer
            </div>

            <button className={bOutlineSm + " w-full mt-3"}>
              View Details
            </button>

          </div>

        </Card>

      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-6">

          <div>

            <h3 className="font-display text-lg font-bold text-slate-900 mb-4">
              Recommended for you
            </h3>

            <div className="grid sm:grid-cols-3 gap-4">

              {[
                [
                  Mic,
                  "violet",
                  "Product Design Interview",
                  "45 min · AI Interviewer",
                  "Start Practice",
                ],
                [
                  HelpCircle,
                  "amber",
                  "Most Asked Questions",
                  "50 questions",
                  "Start Practicing",
                ],
                [
                  Star,
                  "emerald",
                  "STAR Method Practice",
                  "30 questions",
                  "Start Practicing",
                ],
              ].map((x, i) => {
                const Icon = x[0];
                const t = STAT_TINT[x[1]];

                return (
                  <Card
                    key={i}
                    hover
                    className="p-5"
                  >
                    <div
                      className={
                        "inline-flex h-11 w-11 items-center justify-center rounded-xl " +
                        t.bg
                      }
                    >
                      <Icon
                        size={20}
                        className={t.fg}
                      />
                    </div>

                    <div className="font-bold text-slate-900 mt-3 text-sm">
                      {x[2]}
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      {x[3]}
                    </div>

                    <button className={bBrandSm + " w-full mt-3"}>
                      {x[4]}
                      <ArrowRight size={14} />
                    </button>

                  </Card>
                );
              })}

            </div>

          </div>

          <Card className="p-6">

            <SectionTitle title="Skill-wise preparation" />

            {PREP_SKILLS.map((s, i) => (
              <div key={i} className="mb-3">

                <div className="flex justify-between text-sm mb-1">

                  <span className="text-slate-600">
                    {s[0]}
                  </span>

                  <span className="num font-semibold text-slate-700">
                    {s[1]}%
                  </span>

                </div>

                <Bar value={s[1]} />

              </div>
            ))}

          </Card>

        </div>

        <Card className="p-6">

          <SectionTitle
            title="Recent Performance"
            action={
              <button className="text-sm font-semibold brand">
                View all
              </button>
            }
          />

          <div className="num text-3xl font-extrabold text-slate-900">
            78%
          </div>

          <div className="text-xs text-slate-500">
            Last Interview Score
          </div>

          <div className="text-xs text-emerald-600 font-semibold mt-1">
            12% improvement
          </div>

          <div
            style={{
              width: "100%",
              height: 120,
            }}
            className="mt-3"
          >
            <ResponsiveContainer>
              <LineChart
                data={PERF}
                margin={{
                  left: -28,
                  right: 6,
                  top: 6,
                }}
              >
                <XAxis
                  dataKey="x"
                  tick={{
                    fontSize: 10,
                    fill: "#94a3b8",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  hide
                  domain={[40, 100]}
                />

                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="#6d4aff"
                  strokeWidth={2.5}
                  dot={{
                    r: 3,
                    fill: "#6d4aff",
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 text-sm font-bold text-slate-700 mb-2">
            Recommended Topics
          </div>

          {[
            "Design Thinking Process",
            "Handling Design Criticism",
            "Portfolio Deep Dive",
          ].map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0"
            >
              <GraduationCap
                size={16}
                className="brand"
              />

              <span className="text-sm text-slate-600 flex-1">
                {t}
              </span>

              <ChevronRight
                size={14}
                className="text-slate-300"
              />
            </div>
          ))}

        </Card>

      </div>

    </div>
  );
}