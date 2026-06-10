"use client";

import React from "react";
import { ArrowLeft, Sparkles, Key, ExternalLink, HelpCircle } from "lucide-react";
import Link from "next/link";

export default function ApiKeyHelp() {
  return (
    <div className="min-h-screen bg-[#080c14] relative text-slate-200 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-2xl">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors mb-8 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Zurück zum Dashboard</span>
        </Link>

        {/* Content Panel */}
        <div className="glass-panel p-8 md:p-10 rounded-3xl border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-slate-100 shadow-[0_0_15px_rgba(59,130,246,0.25)]">
              <Key size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Gemini API-Schlüssel holen</h1>
              <p className="text-slate-400 text-xs mt-1">Anleitung zur Erstellung deines kostenlosen AI-Schlüssels</p>
            </div>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-slate-300">
            <p>
              Der Exam Planner verwendet **Google Gemini (gemini-2.5-flash)**, um Vorlesungsfolien und Übungsaufgaben zu analysieren.
              Da dies ein privates Projekt ist, benötigst du einen eigenen (kostenlosen) API-Schlüssel von Google, um die Analysen durchzuführen.
            </p>

            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Schritt-für-Schritt Anleitung
              </h2>

              <ol className="space-y-4 list-decimal pl-5">
                <li>
                  <strong>Google AI Studio öffnen:</strong><br />
                  Gehe auf die offizielle Entwicklerplattform von Google:{" "}
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline font-semibold"
                  >
                    <span>Google AI Studio</span>
                    <ExternalLink size={12} />
                  </a>. Melde dich dort mit deinem ganz normalen Google-Konto an.
                </li>

                <li>
                  <strong>API-Key Bereich aufrufen:</strong><br />
                  Klicke links oben im Menü auf den blauen Button <strong>"Get API key"</strong>.
                </li>

                <li>
                  <strong>Schlüssel erstellen:</strong><br />
                  Klicke auf den Button <strong>"Create API key"</strong>. Wähle anschließend die Option <em>"Create API key in new project"</em> aus (oder wähle ein bestehendes Google Cloud Projekt, falls du bereits eins hast).
                </li>

                <li>
                  <strong>Schlüssel kopieren:</strong><br />
                  Sobald der Schlüssel generiert wurde, kopiere ihn in deine Zwischenablage. Der API-Schlüssel beginnt in der Regel mit den Zeichen <code>AIzaSy</code>.
                </li>

                <li>
                  <strong>Im Exam Planner speichern:</strong><br />
                  Kehre zum Exam Planner zurück. Klicke oben rechts auf den <strong>"Get Started"</strong> Button (oder das Zahnrad-Symbol), füge den kopierten Schlüssel ein und klicke auf <strong>"Speichern"</strong>.
                </li>
              </ol>
            </div>

            <div className="p-4 rounded-2xl border border-blue-500/10 bg-blue-500/5 space-y-2.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-blue-400 flex items-center gap-2">
                <HelpCircle size={14} /> Wichtige Hinweise & Kosten
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-400">
                <li>
                  <strong className="text-slate-350">Vollständig kostenlos:</strong> Die Nutzung der Gemini API im AI Studio über den Free Tier Tarif ist zu 100% kostenlos und hat großzügige Limits, die für das Lernen vollkommen ausreichen.
                </li>
                <li>
                  <strong className="text-slate-350">Maximale Sicherheit:</strong> Dein API-Schlüssel wird sicher in unserer verschlüsselten Datenbank gespeichert und ausschließlich für deine eigenen Fach-Analysen verwendet. Weder andere Nutzer noch wir können auf deinen Schlüssel zugreifen.
                </li>
                <li>
                  <strong className="text-slate-350">Keine Kreditkarte erforderlich:</strong> Bei der Anmeldung im AI Studio musst du keine Zahlungsinformationen hinterlegen.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
