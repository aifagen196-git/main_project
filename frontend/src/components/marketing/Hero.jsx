import { ArrowRight, Briefcase, FileText, TrendingUp } from "lucide-react";

function HeroCard({
  icon: Icon,
  tint,
  title,
  description,
  className,
  style,
}) {
  const map = {
    violet: "bg-brand-50 brand",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <div
      className={
        "absolute rounded-2xl bg-white border border-slate-100 shadow-xl p-4 w-64 " +
        className
      }
      style={style}
    >
      <div className="flex items-center gap-3">
        <div
          className={
            "flex h-10 w-10 items-center justify-center rounded-xl " +
            map[tint]
          }
        >
          <Icon size={20} />
        </div>

        <div>
          <div className="font-bold text-slate-900 text-sm">
            {title}
          </div>

          <div className="text-xs text-slate-500">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero({ enter }) {
  return (
    <section className="hero-bg">
      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">

        {/* Left */}
        <div className="fadeUp">

          <p className="text-xs font-bold tracking-[0.25em] uppercase brand mb-4">
            AI Career Accelerator
          </p>

          <h1
            className="font-display text-5xl lg:text-7xl font-extrabold text-slate-900"
            style={{ lineHeight: 1.05 }}
          >
            Stop Applying.
            <br />
            <span className="brand">
              Start Getting Interviews.
            </span>
          </h1>

          <p className="mt-6 text-lg text-slate-500 max-w-xl leading-relaxed">
            AIFAGen uses AI to find the right opportunities,
            optimize your profile, improve your resume,
            and help you move faster through the hiring process.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={enter}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-[#6D4AFF] to-[#8B5CFF]"
            >
              Get Your Career Plan
              <ArrowRight size={18} />
            </button>

            <button className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              Learn More
            </button>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[
                "#6d4aff",
                "#f43f5e",
                "#22c55e",
                "#0ea5e9",
              ].map((c, i) => (
                <div
                  key={i}
                  className="h-9 w-9 rounded-full border-2 border-white"
                  style={{ background: c }}
                />
              ))}
            </div>

            <div>
              <div className="font-bold text-slate-900">
                Join 50,000+ job seekers
              </div>

              <div className="text-sm text-slate-500">
                getting hired faster with AI
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="relative h-[420px] hidden lg:block">

          <div className="absolute right-10 top-0 h-80 w-80 rounded-full bg-brand-50 opacity-80" />

          <HeroCard
            icon={Briefcase}
            tint="violet"
            title="AI Job Matching"
            description="Find roles that fit you best"
            className="floaty"
            style={{
              top: 0,
              right: 30,
            }}
          />

          <HeroCard
            icon={FileText}
            tint="emerald"
            title="Resume Optimization"
            description="Improve your chances"
            className="floaty"
            style={{
              top: 140,
              right: 0,
              animationDelay: ".8s",
            }}
          />

          <HeroCard
            icon={TrendingUp}
            tint="rose"
            title="Interview Preparation"
            description="Practice and ace interviews"
            className="floaty"
            style={{
              top: 280,
              right: 60,
              animationDelay: "1.4s",
            }}
          />
        </div>

      </div>
    </section>
  );
}