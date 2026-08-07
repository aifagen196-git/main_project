import {
  ANA_STATS,
  OUTCOME,
  TREND,
  SOURCES,
  CATS,
} from "../data/analytics";

import Card from "../components/common/Card";
import SectionTitle from "../components/common/SectionTitle";
import Stat from "../components/ui/Stat";
import Bar from "../components/ui/Bar";
import { STAT_TINT } from "../data/constants";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";




export default function Analytics() {
  return (
    <div className="space-y-6">

      <div>
        <h2 className="font-display text-3xl font-extrabold text-slate-900">
          Analytics
        </h2>

        <p className="text-slate-500 mt-1">
          Track your progress and optimize your job search performance.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {ANA_STATS.map((s, i) => (
          <div
            key={i}
            className="fadeUp"
            style={{
              animationDelay: i * 50 + "ms",
            }}
          >
            <Stat s={s} />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        <Card className="lg:col-span-2 p-6">

          <SectionTitle
            title="Application Trend"
            sub="Applications & interviews over time"
          />

          <div
            style={{
              width: "100%",
              height: 250,
            }}
          >
            <ResponsiveContainer>
              <AreaChart
                data={TREND}
                margin={{
                  left: -18,
                  right: 8,
                  top: 6,
                }}
              >

                <defs>
                  <linearGradient
                    id="ga"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#6d4aff"
                      stopOpacity={0.3}
                    />

                    <stop
                      offset="100%"
                      stopColor="#6d4aff"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#eef0f6"
                  vertical={false}
                />

                <XAxis
                  dataKey="d"
                  tick={{
                    fontSize: 12,
                    fill: "#94a3b8",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fontSize: 12,
                    fill: "#94a3b8",
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="a"
                  stroke="#6d4aff"
                  strokeWidth={2.5}
                  fill="url(#ga)"
                />

                <Line
                  type="monotone"
                  dataKey="i"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />

              </AreaChart>
            </ResponsiveContainer>
          </div>

        </Card>

        <Card className="p-6">

          <SectionTitle title="Application Outcome" />

          <div className="flex justify-center">

            <div
              style={{
                width: 160,
                height: 160,
              }}
            >
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={OUTCOME}
                    dataKey="v"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {OUTCOME.map((o, i) => (
                      <Cell
                        key={i}
                        fill={o.c}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

          </div>

          <div className="space-y-1.5 mt-3">

            {OUTCOME.map((o, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background: o.c,
                  }}
                />

                <span className="text-slate-600 flex-1">
                  {o.n}
                </span>

                <span className="num font-bold text-slate-800">
                  {o.v}
                </span>
              </div>
            ))}

          </div>

        </Card>

      </div>

      <div className="grid md:grid-cols-2 gap-6">

        <Card className="p-6">

          <SectionTitle title="Applications by Source" />

          {SOURCES.map((s, i) => (
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

        <Card className="p-6">

          <SectionTitle
            title="Top Job Categories"
            sub="By interviews"
          />

          {CATS.map((s, i) => (
            <div key={i} className="mb-3">

              <div className="flex justify-between text-sm mb-1">

                <span className="text-slate-600">
                  {s[0]}
                </span>

                <span className="num font-semibold text-slate-700">
                  {s[1]}
                </span>

              </div>

              <Bar
                value={s[1] * 20}
                color="bg-emerald-500"
              />

            </div>
          ))}

        </Card>

      </div>

      <Card className="p-6 flex flex-col sm:flex-row items-center gap-6">

        <div className="text-center">

          <div className="text-sm font-semibold text-slate-500">
            Your Job Search Score
          </div>

          <div className="num text-5xl font-extrabold brand mt-1">
            72
            <span className="text-lg text-slate-400">
              /100
            </span>
          </div>

          <div className="text-xs text-emerald-600 font-semibold mt-1">
            Good progress! Keep optimizing.
          </div>

        </div>

        <div className="flex-1 grid sm:grid-cols-2 gap-4 w-full">

          {[
            ["Application Volume", 80],
            ["Profile Strength", 65],
            ["Interview Conversion", 70],
            ["Response Rate", 75],
          ].map((x, i) => (
            <div key={i}>

              <div className="flex justify-between text-sm mb-1">

                <span className="text-slate-600">
                  {x[0]}
                </span>

                <span className="num font-semibold text-slate-700">
                  {x[1]}/100
                </span>

              </div>

              <Bar value={x[1]} />

            </div>
          ))}

        </div>

      </Card>

    </div>
  );
}