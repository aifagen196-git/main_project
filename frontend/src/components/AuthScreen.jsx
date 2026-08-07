import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { signIn, signUp } from "../services/auth";

export default function AuthScreen({ onBack }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setLoading(true);

      if (mode === "signup") {
        await signUp(email, password, name);
        alert("Account created! Check your email.");
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5fb] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 px-8 py-6 sm:px-10 sm:py-8">

          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 mb-2"
            >
              <ArrowLeft size={15} />
              Back to home
            </button>
          )}

          {/* Brand — goes back to the landing page (an href="/" here would
              reload straight back into the login screen via the saved mode). */}
          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-4 mb-8"
          >
            <img
              src="/logo.png"
              alt="AIFAGen"
              className="h-16 w-16 object-contain"
            />
            <h1 className="text-4xl font-extrabold text-slate-900">AIFAGen</h1>
          </button>

          {/* Heading */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === "login"
                ? "Welcome Back"
                : "Create Account"}
            </h2>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {mode === "signup" && (
              <div>
                <label className="block mb-2 text-sm font-medium text-slate-700">
                  Full Name
                </label>

                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  className="w-full h-12 rounded-xl border border-slate-200 px-4 text-base focus:outline-none focus:border-[#6D4AFF] focus:ring-2 focus:ring-[#6D4AFF]/20"
                />
              </div>
            )}

            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700">
                Email Address
              </label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className="w-full h-12 rounded-xl border border-slate-200 px-4 text-base focus:outline-none focus:border-[#6D4AFF] focus:ring-2 focus:ring-[#6D4AFF]/20"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700">
                Password
              </label>

              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                className="w-full h-12 rounded-xl border border-slate-200 px-4 text-base focus:outline-none focus:border-[#6D4AFF] focus:ring-2 focus:ring-[#6D4AFF]/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-white text-lg font-semibold bg-gradient-to-r from-[#6D4AFF] to-[#8B5CFF] hover:opacity-90 transition"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() =>
                setMode(
                  mode === "login"
                    ? "signup"
                    : "login"
                )
              }
              className="text-[#6D4AFF] font-medium hover:underline"
            >
              {mode === "login"
                ? "Don't have an account? Create one"
                : "Already have an account? Sign In"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}