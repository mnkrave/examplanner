import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex-1 w-full bg-[#080c14] flex flex-col items-center justify-center p-6 text-center min-h-screen relative">
      <div className="glass-card max-w-md p-8 md:p-10 rounded-3xl border border-slate-800 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
          <AlertTriangle className="text-amber-500" size={32} />
        </div>
        
        <h2 className="text-3xl font-extrabold text-slate-100 mb-3">Nicht gefunden</h2>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Das gesuchte Fach oder die Seite existiert nicht oder wurde gelöscht.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-3 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.25)] hover:-translate-y-0.5"
        >
          <ArrowLeft size={16} />
          Zurück zum Dashboard
        </Link>
      </div>
    </main>
  );
}
