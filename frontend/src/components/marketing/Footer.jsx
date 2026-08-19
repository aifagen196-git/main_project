import {
  ArrowRight,
  Linkedin,
  Twitter,
  Github,
  Mail,
  Globe,
  Phone,
  MapPin,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200">
      {/* Newsletter band */}
      <div className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row md:items-center gap-6">
          <div>
            <h3 className="font-display text-2xl font-extrabold text-slate-900">
              Stay ahead with AI insights
            </h3>
            <p className="text-slate-500 mt-2">
              Get the latest on AI innovations delivered to your inbox.
            </p>
          </div>

          <div className="md:ml-auto flex w-full max-w-md gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-brand transition"
            />
            <button
              onClick={(e) => e.preventDefault()}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-brand-grad px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition"
            >
              Subscribe
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main columns */}
      <div className="max-w-6xl mx-auto px-5 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand + social */}
        <div>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="AIFAGen Labs" className="h-8 w-8" />
            <span className="font-display font-extrabold text-slate-900">
              AIFAGen <span className="brand">Labs</span>
            </span>
          </div>

          <p className="text-sm text-slate-500 mt-3 max-w-xs">
            Building Intelligent Ecosystems for the Future. AI for All
            Generations.
          </p>

          <div className="flex items-center gap-3 mt-5">
            {[
              [Linkedin, "LinkedIn"],
              [Twitter, "Twitter"],
              [Github, "GitHub"],
              [Mail, "Email"],
            ].map(([Icon, label], i) => (
              <a
                key={i}
                href="#"
                aria-label={label}
                onClick={(e) => e.preventDefault()}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-[#6d4aff] transition"
              >
                <Icon size={17} />
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {[
          ["Company", ["About Us", "Innovation Labs", "Case Studies", "Careers"]],
          ["Solutions", ["Services", "Products", "AIFAG Suite", "LifeOS"]],
          [
            "Connect",
            [
              "Contact",
              "Collaborate",
              "Partners",
              "Privacy Policy",
              "Terms & Conditions",
            ],
          ],
        ].map((col, i) => (
          <div key={i}>
            <div className="font-bold text-slate-900 text-sm">{col[0]}</div>
            <ul className="mt-3 space-y-2">
              {col[1].map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-sm text-slate-500 hover:text-slate-800"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Contact + locations bar */}
      <div className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-5 py-6 flex flex-col lg:flex-row lg:items-start gap-4">
          <div className="text-sm text-slate-500 space-y-2">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="inline-flex items-center gap-2">
                <Globe size={15} className="text-slate-400" />
                Global Operations
              </span>
              <span className="inline-flex items-center gap-2">
                <Mail size={15} className="text-slate-400" />
                pmo@aifagenlabs.com
              </span>
              <span className="inline-flex items-center gap-2">
                <Phone size={15} className="text-slate-400" />
                +1 (475) 224-0417
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="inline-flex items-center gap-2">
                <MapPin size={15} className="text-slate-400" />
                Hyderabad, India
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin size={15} className="text-slate-400" />
                USA: New Jersey
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400 lg:ml-auto lg:text-right lg:pt-1">
            © 2025 AIFAGen Labs Pvt. Ltd. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
