import { Linkedin, Instagram, Twitter, Mail, Globe, Phone, MapPin } from "lucide-react";

import { CONTACT_EMAIL, PHONE, PHONE_HREF, LOCATIONS, SOCIAL_LINKS } from "../../data/site";

const SOCIAL_ICONS = { LinkedIn: Linkedin, Twitter, Instagram };

const LINK_COLUMNS = [
  ["Company", [["About Us", "about"], ["Careers", "caseStudies"], ["Collaborate", "collaborate"], ["Terms & Conditions", "terms"]]],
  ["Connect", [["Services", "services"], ["Partners", "partners"], ["Privacy Policy", "privacy"], ["Contact", "contact"]]],
];

const PILL = "inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5";

/**
 * Footer of every marketing page. `compact` is the landing page's version:
 * centred, without the link columns, with Privacy and Terms links beside the
 * copyright line instead.
 */
export default function SiteFooter({ go, compact = false }) {
  const open = (e, page) => {
    e.preventDefault();
    go?.(page);
  };

  const socials = [...SOCIAL_LINKS, ["Email", `mailto:${CONTACT_EMAIL}`]];

  const brand = (
    <div className={compact ? "flex flex-col items-center text-center" : undefined}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30">
          <img src="/logo.png" alt="AIFAGen Labs" className="h-6 w-6 invert" />
        </div>
        <span className="font-display text-lg font-extrabold text-white">
          AIFAGen <span className="text-brand-400">Labs</span>
        </span>
      </div>
      <p className={"text-sm text-slate-400 mt-4 leading-relaxed " + (compact ? "max-w-sm" : "max-w-xs")}>
        Building Intelligent Ecosystems for the Future. AI for All Generations.
      </p>
      <div className="flex items-center gap-2.5 mt-5">
        {socials.map(([label, href]) => {
          const Icon = SOCIAL_ICONS[label] || Mail;
          const external = href.startsWith("http");
          return (
            <a
              key={label}
              href={href}
              aria-label={label}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-brand-500 hover:text-white hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200"
            >
              <Icon size={16} />
            </a>
          );
        })}
      </div>
    </div>
  );

  return (
    <footer className="relative bg-slate-900 overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[36rem] rounded-full bg-brand-500/25 blur-3xl"
      />

      {compact ? (
        <div className="relative max-w-6xl mx-auto px-5 py-14">{brand}</div>
      ) : (
        <div className="relative max-w-6xl mx-auto px-5 py-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {brand}
          {LINK_COLUMNS.map(([title, links]) => (
            <div key={title}>
              <div className="font-bold text-white text-sm">
                {title}
                <span className="block mt-2 h-0.5 w-6 rounded-full bg-brand-500" />
              </div>
              <ul className="mt-4 space-y-2.5">
                {links.map(([label, page]) => (
                  <li key={page}>
                    <a
                      href="#"
                      onClick={(e) => open(e, page)}
                      className="group inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-300 transition-colors"
                    >
                      <span className="h-1 w-1 rounded-full bg-brand-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Contact + locations bar */}
      <div className="relative border-t border-white/10 bg-black/20">
        <div
          className={
            "max-w-6xl mx-auto px-5 py-6 flex flex-col gap-4 " +
            (compact ? "items-center" : "lg:flex-row lg:items-center")
          }
        >
          <div
            className={
              "flex flex-wrap items-center gap-2 text-sm text-slate-400 " + (compact ? "justify-center" : "")
            }
          >
            <span className={PILL}>
              <Globe size={13} className="text-brand-400" />
              Global Operations
            </span>
            <a href={`mailto:${CONTACT_EMAIL}`} className={PILL + " hover:border-brand-400/50 hover:text-white transition"}>
              <Mail size={13} className="text-brand-400" />
              {CONTACT_EMAIL}
            </a>
            <a href={PHONE_HREF} className={PILL + " hover:border-brand-400/50 hover:text-white transition"}>
              <Phone size={13} className="text-brand-400" />
              {PHONE}
            </a>
            {LOCATIONS.map((place) => (
              <span key={place} className={PILL}>
                <MapPin size={13} className="text-brand-400" />
                {place}
              </span>
            ))}
          </div>

          {compact ? (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>© {new Date().getFullYear()} AIFAGen Labs Pvt. Ltd. All rights reserved.</span>
              <button type="button" onClick={(e) => open(e, "privacy")} className="hover:text-white underline-offset-2 hover:underline">
                Privacy Policy
              </button>
              <button type="button" onClick={(e) => open(e, "terms")} className="hover:text-white underline-offset-2 hover:underline">
                Terms &amp; Conditions
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 lg:ml-auto">
              © {new Date().getFullYear()} AIFAGen Labs Pvt. Ltd. All rights reserved.
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
