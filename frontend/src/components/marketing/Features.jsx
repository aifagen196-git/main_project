import { FEATURES, STAT_TINT } from "../../data/marketing";

export default function Features() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center max-w-3xl mx-auto">
        <p className="text-xs font-bold tracking-[0.25em] uppercase brand">
          Powered by AI. Built for You.
        </p>

        <h2 className="font-display text-4xl lg:text-5xl font-extrabold text-slate-900 mt-4">
          Everything you need to stand out and land your dream role.
        </h2>

        <p className="mt-5 text-lg text-slate-500">
          A complete AI-powered career platform that helps you discover,
          optimize, prepare, and get hired faster.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-14">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          const tint = STAT_TINT[feature.tint];

          return (
            <div
              key={index}
              className="text-center rounded-3xl bg-white border border-slate-100 p-8 shadow-sm card"
            >
              <div
                className={
                  "inline-flex h-16 w-16 items-center justify-center rounded-2xl " +
                  tint.bg
                }
              >
                <Icon
                  size={28}
                  className={tint.fg}
                />
              </div>

              <h3 className="font-bold text-slate-900 mt-5 text-lg">
                {feature.t}
              </h3>

              <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                {feature.d}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}