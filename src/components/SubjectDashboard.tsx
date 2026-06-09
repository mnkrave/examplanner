"use client";

import React, { useState, useTransition } from "react";
import { Plus, Search, BookOpen, FileText, ListChecks, Trash2, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { createSubject, deleteSubject, SubjectListItem } from "@/app/actions";

interface SubjectDashboardProps {
  initialSubjects: SubjectListItem[];
}

export default function SubjectDashboard({ initialSubjects }: SubjectDashboardProps) {
  const [subjects, setSubjects] = useState<SubjectListItem[]>(initialSubjects);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter subjects based on search query
  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle creating a new subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    setError(null);
    startTransition(async () => {
      try {
        const newSub = await createSubject(newSubjectName);
        // Add to local state (or reload page)
        setSubjects((prev) => [
          {
            id: newSub.id,
            name: newSub.name,
            filesCount: 0,
            topicsCount: 0,
            progress: 0,
            createdAt: newSub.createdAt
          },
          ...prev
        ]);
        setNewSubjectName("");
        setIsModalOpen(false);
      } catch (err: any) {
        setError(err.message || "Fehler beim Erstellen");
      }
    });
  };

  // Handle deleting a subject
  const handleDeleteSubject = async (id: string, name: string) => {
    if (!confirm(`Möchtest du das Fach "${name}" wirklich löschen? Alle hochgeladenen Dokumente und Themen gehen verloren.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteSubject(id);
      setSubjects((prev) => prev.filter((sub) => sub.id !== id));
    } catch (err: any) {
      alert(err.message || "Fehler beim Löschen");
    } finally {
      setDeletingId(null);
    }
  };

  // Helper to color code progress borders/glowing shadows
  const getProgressColorClass = (progress: number) => {
    if (progress >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (progress >= 50) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  const getProgressBarClass = (progress: number) => {
    if (progress >= 80) return "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
    if (progress >= 50) return "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]";
    return "bg-gradient-to-r from-rose-500 to-orange-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]";
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
      {/* Header section with Stats summary */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Klausuren Planner 🚦
          </h1>
          <p className="mt-2 text-slate-400 text-lg">
            Intelligente Lernkontrolle und Ampelsystem zur Klausurvorbereitung.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-3 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.25)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:-translate-y-0.5"
        >
          <Plus size={20} />
          Fach hinzufügen
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="glass-card p-6 rounded-2xl">
          <p className="text-sm font-medium text-slate-400">Aktive Fächer</p>
          <p className="text-3xl font-bold mt-2 text-slate-200">{subjects.length}</p>
        </div>
        <div className="glass-card p-6 rounded-2xl">
          <p className="text-sm font-medium text-slate-400">Hochgeladene Dokumente</p>
          <p className="text-3xl font-bold mt-2 text-slate-200">
            {subjects.reduce((acc, sub) => acc + sub.filesCount, 0)}
          </p>
        </div>
        <div className="glass-card p-6 rounded-2xl">
          <p className="text-sm font-medium text-slate-400">Gesamtfortschritt (Schnitt)</p>
          <p className="text-3xl font-bold mt-2 text-blue-400">
            {subjects.length > 0
              ? Math.round(subjects.reduce((acc, sub) => acc + sub.progress, 0) / subjects.length)
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Nach Fach suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-300"
        />
      </div>

      {/* Subjects Grid */}
      {filteredSubjects.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-dashed border-slate-800">
          <BookOpen className="mx-auto text-slate-500 mb-4 animate-pulse-slow" size={48} />
          <h3 className="text-xl font-semibold text-slate-300">Keine Fächer gefunden</h3>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto">
            {searchQuery
              ? "Passe deinen Suchbegriff an oder füge ein neues Fach hinzu."
              : "Erstelle dein erstes Fach, um Vorlesungsfolien und Übungen hochzuladen."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl transition-all duration-300"
            >
              <Plus size={16} /> Erstes Fach erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((subject) => {
            const progressColor = getProgressColorClass(subject.progress);
            const progressBar = getProgressBarClass(subject.progress);

            return (
              <div
                key={subject.id}
                className="group relative glass-card rounded-2xl p-6 flex flex-col justify-between overflow-hidden"
              >
                {/* Subtle top border gradient glow */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div>
                  <div className="flex items-start justify-between gap-4">
                    <Link
                      href={`/subjects/${subject.id}`}
                      className="text-2xl font-bold text-slate-200 hover:text-blue-400 transition-colors duration-300 line-clamp-1"
                    >
                      {subject.name}
                    </Link>

                    <button
                      onClick={() => handleDeleteSubject(subject.id, subject.name)}
                      disabled={deletingId === subject.id}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800/50 transition-all duration-300 focus:outline-none"
                      title="Fach löschen"
                    >
                      {deletingId === subject.id ? (
                        <Loader2 size={16} className="animate-spin text-rose-400" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>

                  <div className="flex gap-4 mt-6 text-sm text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <FileText size={16} className="text-blue-500/70" />
                      <span>{subject.filesCount} Dateien</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ListChecks size={16} className="text-indigo-500/70" />
                      <span>{subject.topicsCount} Themen</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Lernstatus
                    </span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-md border ${progressColor}`}>
                      {subject.progress}%
                    </span>
                  </div>

                  {/* Progress Bar Container */}
                  <div className="w-full bg-slate-950/60 rounded-full h-2 overflow-hidden border border-slate-900">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out`}
                      style={{ width: `${subject.progress}%` }}
                    >
                      <div className={`h-full w-full ${progressBar}`} />
                    </div>
                  </div>
                </div>

                {/* Card Action Link */}
                <Link
                  href={`/subjects/${subject.id}`}
                  className="mt-6 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900/40 hover:bg-blue-600/10 border border-slate-800 hover:border-blue-500/30 text-slate-300 hover:text-blue-400 font-semibold text-sm transition-all duration-300"
                >
                  Details & Ampel öffnen
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog for creating Subject */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 relative animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Neues Fach hinzufügen</h2>
            <p className="text-sm text-slate-400 mb-6">
              Gib dem Fach einen Namen, um anschließend Lernmaterialien hochzuladen.
            </p>

            <form onSubmit={handleCreateSubject} className="space-y-6">
              <div>
                <label htmlFor="subject-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Name des Fachs
                </label>
                <input
                  id="subject-name"
                  type="text"
                  required
                  placeholder="z.B. Software Engineering, Mathe 2"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 transition-colors font-semibold"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isPending || !newSubjectName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Erstelle...
                    </>
                  ) : (
                    "Erstellen"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
