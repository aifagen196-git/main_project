import {
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
    <footer className="relative bg-slate-900 overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[36rem] rounded-full bg-brand-500/25 blur-3xl"
      />

      {/* Main columns */}
      <div className="relative max-w-6xl mx-auto px-5 py-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {/* Brand + social */}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
              <img src="/logo.png" alt="AIFAGen Labs" className="h-6 w-6 invert" />
            </div>
            <span className="font-display text-lg font-extrabold text-white">
              AIFAGen <span className="text-brand-400">Labs</span>
            </span>
          </div>

          <p className="text-sm text-slate-400 mt-4 max-w-xs leading-relaxed">
            Building Intelligent Ecosystems for the Future. AI for All
            Generations.
          </p>

          <div className="flex items-center gap-2.5 mt-5">
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
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-brand-500 hover:text-white hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {[
          ["Company", ["About Us", "Careers", "Collaborate", "Terms & Conditions"]],
          ["Connect", ["Services", "Partners", "Privacy Policy", "Contact"]],
        ].map((col, i) => (
          <div key={i}>
            <div className="font-bold text-white text-sm">
              {col[0]}
              <span className="block mt-2 h-0.5 w-6 rounded-full bg-brand-500" />
            </div>
            <ul className="mt-4 space-y-2.5">
              {col[1].map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="group inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-300 transition-colors"
                  >
                    <span className="h-1 w-1 rounded-full bg-brand-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Contact + locations bar */}
      <div className="relative border-t border-white/10 bg-black/20">
        <div className="max-w-6xl mx-auto px-5 py-6 flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
              <Globe size={13} className="text-brand-400" />
              Global Operations
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
              <Mail size={13} className="text-brand-400" />
              pmo@aifagenlabs.com
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
              <Phone size={13} className="text-brand-400" />
              +1 (475) 224-0417
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
              <MapPin size={13} className="text-brand-400" />
              Hyderabad, India
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5">
              <MapPin size={13} className="text-brand-400" />
              USA: New Jersey
            </span>
          </div>

          <div className="text-xs text-slate-500 lg:ml-auto">
            © 2025 AIFAGen Labs Pvt. Ltd. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
