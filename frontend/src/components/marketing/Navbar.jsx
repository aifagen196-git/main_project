import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

export default function Navbar({ enter, user, setView, setAuthPage }) {
  const [open, setOpen] = useState(false);

  const links = ["Features", "How It Works", "FAQ"];

  const handleLogin = () => {
    if (user) {
      setView?.("dashboard");
    } else {
      setAuthPage?.("login");
    }
  };

  const handleSignup = () => {
    if (user) {
      setView?.("dashboard");
    } else {
      setAuthPage?.("signup");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center">
        {/* Logo */}
        <button onClick={enter} className="flex items-center gap-3 shrink-0">
          <img
            src="/logo.png"
            alt="AIFAGen"
            className="h-12 w-12 object-contain"
          />

          <span className="font-display text-2xl font-extrabold text-slate-900">
            AIFAGen
          </span>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-10 mx-auto">
          <a
            href="#features"
            className="text-sm font-semibold text-slate-600 hover:text-[#6D4AFF] transition"
          >
            Features
          </a>

          <a
            href="#how-it-works"
            className="text-sm font-semibold text-slate-600 hover:text-[#6D4AFF] transition"
          >
            How It Works
          </a>

          <a
            href="#resources"
            className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-[#6D4AFF] transition"
          >
            FAQ
          </a>
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={handleLogin}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
          >
            Login
          </button>

          <button
            onClick={handleSignup}
            className="px-5 py-2.5 rounded-xl text-white font-semibold bg-gradient-to-r from-[#6D4AFF] to-[#8B5CFF] hover:opacity-90 transition shadow-sm"
          >
            Get Your Career Plan
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button onClick={() => setOpen(!open)} className="lg:hidden ml-auto">
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="lg:hidden border-t border-slate-100 bg-white">
          <div className="px-6 py-4 space-y-4">
            <a
              href="#features"
              className="block text-sm font-semibold text-slate-700"
            >
              Features
            </a>

            <a
              href="#how-it-works"
              className="block text-sm font-semibold text-slate-700"
            >
              How It Works
            </a>

            <a
              href="#resources"
              className="block text-sm font-semibold text-slate-700"
            >
              FAQ
            </a>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
              <button
                onClick={handleLogin}
                className="w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold"
              >
                Login
              </button>

              <button
                onClick={handleSignup}
                className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-[#6D4AFF] to-[#8B5CFF]"
              >
                Get Your Career Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
