"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sparkles, AlertCircle, Lock } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false
      });
      if (res?.error) {
        setError("Login fehlgeschlagen. Bitte überprüfe deine Zugangsdaten.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center p-4 relative min-h-screen bg-[#080c14]">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 md:p-10 rounded-3xl border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10">
        
        {/* App Title / Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-slate-100 mb-4 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <Sparkles size={24} className="animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Exam Planner 🚦</h1>
          <p className="text-slate-400 text-xs mt-1.5">
            AI-gestützte Klausuranalyse & Ampel-Planer
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Email Adresse
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/50 hover:border-slate-700 focus:border-blue-500 focus:outline-none text-slate-200 text-sm transition-colors"
              placeholder="deine.email@gmail.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/50 hover:border-slate-700 focus:border-blue-500 focus:outline-none text-slate-200 text-sm transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-slate-100 font-semibold text-sm transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Lock size={16} />
                <span>Einloggen</span>
              </>
            )}
          </button>

          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 border-t border-slate-800/80 w-full" />
            <span className="relative z-10 px-3 bg-[#0c101c] text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              oder
            </span>
          </div>

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full py-3.5 px-4 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/70 text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            {/* Google Icon SVG */}
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.6 15.02 1 12 1 7.35 1 3.39 3.67 1.39 7.56l3.85 2.99C6.16 7.42 8.86 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.11 2.73-2.36 3.58l3.66 2.84c2.14-1.98 3.38-4.89 3.38-8.52z"
              />
              <path
                fill="#FBBC05"
                d="M5.24 10.55c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28L1.39 2.99C.5 4.74 0 6.69 0 8.77s.5 4.03 1.39 5.78l3.85-2.99z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.3 1.09-3.95 1.09-3.14 0-5.84-2.38-6.76-5.51L1.74 15.8C3.74 19.68 7.7 23 12 23z"
              />
            </svg>
            <span>Mit Google anmelden</span>
          </button>
        </form>
        
        {/* Footer info */}
        <p className="text-center text-[10px] text-slate-500 leading-normal mt-8 px-4">
          Der Zugriff ist auf autorisierte Email-Adressen beschränkt (Whitelisted Accounts).
        </p>
      </div>
    </div>
  );
}
