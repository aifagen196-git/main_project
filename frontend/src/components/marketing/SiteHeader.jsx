import { useState } from "react";
import { Menu, X } from "lucide-react";

// Top bar of the inner marketing pages (About, Services, Contact, the legal
// pages ...). The landing page has its own (MarketingNav in AIFAGen.jsx).
const LINKS = [
  ["Home", "home"],
  ["Services", "services"],
  ["About", "about"],
  ["Contact", "contact"],
];

/**
 * @param {() => void} home    back to the landing page
 * @param {(page: string) => void} go  open another marketing page
 * @param {() => void} onCta   the "Collaborate" button
 * @param {string} active      id of the current page; its link is underlined
 */
export default function SiteHeader({ home, go, onCta, active }) {
  const [open, setOpen] = useState(false);

  const nav = (e, page) => {
    e.preventDefault();
    setOpen(false);
    if (page === "home") home?.();
    else go?.(page);
  };

  const cta = () => {
    setOpen(false);
    onCta?.();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-3">
        <button onClick={home} className="flex items-center gap-2">
          <img src="/logo.png" alt="AIFAGen Labs" className="h-8 w-8 object-contain" />
          <span className="font-display text-xl font-extrabold text-slate-900 leading-none">
            AIFAGen <span className="brand">Labs</span>
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-6 mx-auto">
          {LINKS.map(([label, page]) => (
            <a
              key={page}
              href="#"
              onClick={(e) => nav(e, page)}
              className={
                "text-sm font-semibold transition " +
                (page === active
                  ? "text-slate-900 border-b-2 border-brand pb-0.5"
                  : "text-slate-600 hover:text-slate-900")
              }
            >
              {label}
            </a>
          ))}
        </nav>

        <button
          onClick={cta}
          className="hidden lg:inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white btn-brand transition shadow-sm ml-auto"
        >
          Collaborate
        </button>

        <button
          className="lg:hidden ml-auto text-slate-600"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-100 px-5 py-3 space-y-2">
          {LINKS.map(([label, page]) => (
            <a
              key={page}
              href="#"
              onClick={(e) => nav(e, page)}
              className="block text-sm font-semibold text-slate-700 py-1"
            >
              {label}
            </a>
          ))}
          <button
            onClick={cta}
            className="w-full mt-2 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white btn-brand"
          >
            Collaborate
          </button>
        </div>
      )}
    </header>
  );
}
