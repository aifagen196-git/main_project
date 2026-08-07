export default function HowItWorks({ STEPS }) {
  return (
    <section id="how-it-works" className="bg-brand-50">
      <div className="max-w-6xl mx-auto px-5 py-16 md:py-20">

        <div className="text-center">
          <p className="text-xs font-bold tracking-widest brand">
            SIMPLE. FAST. EFFECTIVE.
          </p>

          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 mt-3">
            How AIFAGen Works
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">

          {STEPS.map((s, i) => {
            const Icon = s.icon;

            return (
              <div
                key={i}
                className="text-center relative"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md relative">

                  <Icon
                    size={28}
                    className="brand"
                  />

                  <span className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">
                    {i + 1}
                  </span>

                </div>

                <h3 className="font-bold text-slate-900 mt-5">
                  {s.t}
                </h3>

                <p className="text-sm text-slate-500 mt-2">
                  {s.d}
                </p>

              </div>
            );
          })}

        </div>

      </div>
    </section>
  );
}