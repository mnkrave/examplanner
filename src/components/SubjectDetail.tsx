"use client";

import React, { useState, useTransition, useEffect } from "react";
import { 
  ArrowLeft, Upload, Trash2, Sparkles, Loader2, AlertCircle, 
  CheckCircle2, FileText, BookOpen, Layers, ClipboardList, HelpCircle,
  ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { uploadFile, deleteFile, toggleTopicStatus, analyzeSubject, getSubjectDetail } from "@/app/actions";

interface FileItem {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  createdAt: string;
}

interface SourceLink {
  fileId: string;
  fileName: string;
  fileType: "SLIDES" | "EXERCISES" | "EXAMS";
  page?: number | null;
}

interface SubtopicItem {
  name: string;
  details: string;
}

interface ExamItem {
  name: string;
  details: string;
  type?: "APPLICATION" | "ROTE_LEARNING" | null;
}

interface TopicItem {
  id: string;
  name: string;
  category: string;
  description: string;
  status: string;
  difficulty: string;
  sources: SourceLink[];
  subtopics: SubtopicItem[];
  exercises: SubtopicItem[];
  exams: ExamItem[];
  createdAt: string;
}

interface SubjectDetailProps {
  subject: {
    id: string;
    name: string;
    files: FileItem[];
    topics: TopicItem[];
    progress: number;
    createdAt?: string;
    updatedAt?: string;
  };
}

export default function SubjectDetail({ subject: initialSubject }: SubjectDetailProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [activeTab, setActiveTab] = useState<"checklist" | "files">("checklist");
  const [uploadingType, setUploadingType] = useState<"SLIDES" | "EXERCISES" | "EXAMS" | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0); // 0: Idle, 1: Slides, 2: Exercises, 3: Exams, 4: Synthesizer
  const [error, setError] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem(`completed-items-${subject.id}`);
    if (saved) {
      try {
        setCompletedItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse completed items", e);
      }
    }
  }, [subject.id]);

  const toggleItemCompleted = (topicId: string, itemType: string, itemName: string) => {
    const key = `${topicId}-${itemType}-${itemName}`;
    const updated = {
      ...completedItems,
      [key]: !completedItems[key]
    };
    setCompletedItems(updated);
    localStorage.setItem(`completed-items-${subject.id}`, JSON.stringify(updated));
  };

  const [isPending, startTransition] = useTransition();

  const toggleExpand = (id: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Categories of files
  const slidesFiles = subject.files.filter(f => f.type === "SLIDES");
  const exercisesFiles = subject.files.filter(f => f.type === "EXERCISES");
  const examsFiles = subject.files.filter(f => f.type === "EXAMS");

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "SLIDES" | "EXERCISES" | "EXAMS") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 15MB)
    if (file.size > 15 * 1024 * 1024) {
      alert("Die Datei ist zu groß. Die maximale Größe ist 15MB.");
      return;
    }

    setUploadingType(type);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("subjectId", subject.id);
      formData.append("type", type);
      formData.append("file", file);

      const newFile = await uploadFile(formData);

      // Update local state
      setSubject((prev) => ({
        ...prev,
        files: [
          {
            id: newFile.id,
            name: newFile.name,
            type: newFile.type,
            mimeType: newFile.mimeType,
            createdAt: newFile.createdAt
          },
          ...prev.files
        ]
      }));
    } catch (err: any) {
      setError(err.message || "Fehler beim Hochladen der Datei");
    } finally {
      setUploadingType(null);
      e.target.value = ""; // reset input
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Möchtest du die Datei "${fileName}" wirklich löschen?`)) {
      return;
    }

    setDeletingFileId(fileId);
    try {
      await deleteFile(subject.id, fileId);
      setSubject((prev) => ({
        ...prev,
        files: prev.files.filter(f => f.id !== fileId)
      }));
    } catch (err: any) {
      alert(err.message || "Fehler beim Löschen");
    } finally {
      setDeletingFileId(null);
    }
  };

  // Handle toggling topic traffic light
  const handleToggleStatus = async (topicId: string, newStatus: "RED" | "YELLOW" | "GREEN") => {
    startTransition(async () => {
      try {
        await toggleTopicStatus(subject.id, topicId, newStatus);
        
        // Update local state and recalculate progress
        setSubject((prev) => {
          const updatedTopics = prev.topics.map(t => 
            t.id === topicId ? { ...t, status: newStatus } : t
          );
          
          // Recalculate progress
          let score = 0;
          for (const t of updatedTopics) {
            if (t.status === "GREEN") score += 1.0;
            else if (t.status === "YELLOW") score += 0.5;
          }
          const progress = updatedTopics.length > 0 ? Math.round((score / updatedTopics.length) * 100) : 0;

          return {
            ...prev,
            topics: updatedTopics,
            progress
          };
        });
      } catch (err: any) {
        alert(err.message || "Fehler beim Ändern des Status");
      }
    });
  };

  // Trigger AI Multi-Agent Analysis
  const handleAnalyze = async () => {
    if (subject.files.length === 0) {
      alert("Lade zuerst mindestens eine Datei (Vorlesung, Übung oder Altklausur) hoch.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    // Simulate stepping through stages for user visual satisfaction
    const stepDuration = 1500;
    
    // Step 1: Text aus Dateien extrahieren
    setAnalysisStep(1);
    await new Promise((r) => setTimeout(r, stepDuration));
    
    // Step 2: Dokumente verarbeiten
    setAnalysisStep(2);
    await new Promise((r) => setTimeout(r, stepDuration));

    // Step 3: AI-Analyse vorbereiten
    setAnalysisStep(3);
    await new Promise((r) => setTimeout(r, stepDuration));

    // Step 4: Themen & Aufgaben konsolidieren
    setAnalysisStep(4);


    try {
      const result = await analyzeSubject(subject.id);
      
      // Re-fetch details to sync the final checklist
      // To keep it simple, we reload or re-fetch details
      const updated = await getSubjectDetail(subject.id);
      if (updated) {
        // Map null safety
        setSubject({
          id: updated.id,
          name: updated.name,
          files: updated.files,
          topics: updated.topics,
          progress: updated.progress
        });
      }
      
      setAnalysisStep(0);
      setIsAnalyzing(false);
      setActiveTab("checklist");
    } catch (err: any) {
      setError(err.message || "Fehler bei der Analyse");
      setAnalysisStep(0);
      setIsAnalyzing(false);
    }
  };

  // Helper styles for traffic light colors
  const getTopicBorderGlow = (status: string) => {
    if (status === "GREEN") return "glow-green border-emerald-500/30 bg-emerald-950/5";
    if (status === "YELLOW") return "glow-yellow border-amber-500/30 bg-amber-950/5";
    return "glow-red border-rose-500/30 bg-rose-950/5";
  };

  const getProgressColorClass = (progress: number) => {
    if (progress >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (progress >= 50) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  const getProgressBarClass = (progress: number) => {
    if (progress >= 80) return "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]";
    if (progress >= 50) return "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]";
    return "bg-gradient-to-r from-rose-500 to-orange-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]";
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12 relative">
      
      {/* Back navigation */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-8 transition-colors text-sm font-semibold group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Zurück zur Übersicht
      </Link>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-100">{subject.name}</h1>
          <p className="text-slate-400 mt-1">Erstelle deine Klausurthemen-Ampel über AI-Analyse.</p>
        </div>

        {/* Big AI Trigger Button */}
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || subject.files.length === 0}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold px-6 py-3.5 rounded-xl transition-all duration-300 shadow-[0_0_25px_rgba(99,102,241,0.3)] hover:shadow-[0_0_35px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Analysiere Themen...</span>
            </>
          ) : (
            <>
              <Sparkles size={20} className="animate-pulse" />
              <span>Themen-Analyse starten</span>
            </>
          )}
        </button>
      </div>

      {/* Progress & Dashboard Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        
        {/* Progress Card */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-300">Prüfungsreife</h3>
              <span className={`text-base font-extrabold px-3 py-1 rounded-lg border ${getProgressColorClass(subject.progress)}`}>
                {subject.progress}% Bereit
              </span>
            </div>
            
            <p className="text-slate-400 text-sm mb-6">
              Dein Fortschritt wird gewichtet berechnet: Jedes grüne Thema bringt 100%, gelbe 50%, rote 0%.
            </p>
          </div>

          <div className="w-full bg-slate-950/60 rounded-full h-4 overflow-hidden border border-slate-900">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${subject.progress}%` }}
            >
              <div className={`h-full w-full ${getProgressBarClass(subject.progress)}`} />
            </div>
          </div>
        </div>

        {/* Files Count Summary */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <h3 className="text-lg font-bold text-slate-300 mb-4">Materialien</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><Layers size={16} className="text-blue-500/70" /> Vorlesungsfolien:</span>
              <span className="font-bold text-slate-200">{slidesFiles.length}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><ClipboardList size={16} className="text-indigo-500/70" /> Übungsaufgaben:</span>
              <span className="font-bold text-slate-200">{exercisesFiles.length}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><HelpCircle size={16} className="text-purple-500/70" /> Altklausuren:</span>
              <span className="font-bold text-slate-200">{examsFiles.length}</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("files")}
            className="mt-4 text-xs font-semibold text-blue-400 hover:text-blue-300 text-left transition-colors"
          >
            Dateien verwalten &rarr;
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 mb-8">
        <button
          onClick={() => setActiveTab("checklist")}
          className={`px-6 py-3 font-semibold text-base transition-colors border-b-2 ${
            activeTab === "checklist"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Klausurthemen ({subject.topics.length})
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`px-6 py-3 font-semibold text-base transition-colors border-b-2 ${
            activeTab === "files"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Dateien ({subject.files.length})
        </button>
      </div>

      {/* ERROR Banner */}
      {error && (
        <div className="flex items-center gap-3 text-rose-400 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl mb-8">
          <AlertCircle size={20} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* CHECKLIST TAB */}
      {activeTab === "checklist" && (
        <div className="max-w-4xl mx-auto">
          {subject.topics.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-dashed border-slate-800">
              <ClipboardList className="mx-auto text-slate-500 mb-4 animate-pulse-slow" size={48} />
              <h3 className="text-xl font-semibold text-slate-300">Keine Themen vorhanden</h3>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                {subject.files.length === 0
                  ? "Lade zuerst Vorlesungsfolien, Übungszettel oder Altklausuren hoch."
                  : "Klicke auf 'Themen-Analyse starten', um die Skripte von AI analysieren zu lassen."}
              </p>
              {subject.files.length > 0 && (
                <button
                  onClick={handleAnalyze}
                  className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                >
                  <Sparkles size={16} /> AI-Analyse starten
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {subject.topics.map((topic) => {
                const isExpanded = expandedTopics[topic.id];
                return (
                  <div
                    key={topic.id}
                    className={`glass-card rounded-2xl border transition-all duration-500 overflow-hidden ${getTopicBorderGlow(topic.status)}`}
                  >
                    {/* Collapsed Header */}
                    <div 
                      onClick={() => toggleExpand(topic.id)}
                      className="p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/10 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h4 className="text-xl font-bold text-slate-100 truncate">{topic.name}</h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full shrink-0">
                            {topic.category}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
                            topic.difficulty === "HIGH" ? "bg-rose-950/30 text-rose-400 border border-rose-900/30" :
                            topic.difficulty === "MEDIUM" ? "bg-amber-950/30 text-amber-400 border border-amber-900/30" :
                            "bg-emerald-950/30 text-emerald-400 border border-emerald-900/30"
                          }`}>
                            {topic.difficulty}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm line-clamp-1">{topic.description}</p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Traffic Light Button Group */}
                        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-full border border-slate-900">
                          <button
                            onClick={() => handleToggleStatus(topic.id, "RED")}
                            disabled={isPending}
                            className={`w-7 h-7 rounded-full transition-all duration-300 flex items-center justify-center ${
                              topic.status === "RED"
                                ? "bg-rose-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] scale-110"
                                : "bg-transparent text-slate-600 hover:text-slate-400"
                            }`}
                            title="Noch nicht gelernt"
                          >
                            <span className={`w-3.5 h-3.5 rounded-full ${topic.status === "RED" ? "bg-white" : "bg-rose-600/50"}`} />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(topic.id, "YELLOW")}
                            disabled={isPending}
                            className={`w-7 h-7 rounded-full transition-all duration-300 flex items-center justify-center ${
                              topic.status === "YELLOW"
                                ? "bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)] scale-110"
                                : "bg-transparent text-slate-600 hover:text-slate-400"
                            }`}
                            title="Teilweise gelernt"
                          >
                            <span className={`w-3.5 h-3.5 rounded-full ${topic.status === "YELLOW" ? "bg-white" : "bg-amber-600/50"}`} />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(topic.id, "GREEN")}
                            disabled={isPending}
                            className={`w-7 h-7 rounded-full transition-all duration-300 flex items-center justify-center ${
                              topic.status === "GREEN"
                                ? "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)] scale-110"
                                : "bg-transparent text-slate-600 hover:text-slate-400"
                            }`}
                            title="Sicher gelernt"
                          >
                            <span className={`w-3.5 h-3.5 rounded-full ${topic.status === "GREEN" ? "bg-white" : "bg-emerald-600/50"}`} />
                          </button>
                        </div>

                        {/* Expand Icon */}
                        <button 
                          onClick={() => toggleExpand(topic.id)}
                          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800/40 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Content Details */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-2 border-t border-slate-900 bg-slate-950/20 space-y-6 animate-fade-in">
                        
                        {/* Summary / Description */}
                        <div>
                          <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Beschreibung</h5>
                          <p className="text-slate-300 text-sm leading-relaxed">{topic.description}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Subtopics column (Theory) */}
                          <div className="space-y-3">
                            <h5 className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-1.5">
                              <BookOpen size={14} /> Theorie & Folien
                            </h5>
                            {topic.subtopics.length === 0 ? (
                              <p className="text-xs text-slate-655 italic">Keine Unterthemen gelistet</p>
                            ) : (
                              <ul className="space-y-2.5">
                                {topic.subtopics.map((sub, idx) => {
                                  const isChecked = !!completedItems[`${topic.id}-subtopic-${sub.name}`];
                                  return (
                                    <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed group">
                                      <button
                                        type="button"
                                        onClick={() => toggleItemCompleted(topic.id, "subtopic", sub.name)}
                                        className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                                          isChecked
                                            ? "bg-blue-500 border-blue-500 text-slate-950 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                            : "border-slate-800 bg-slate-950/50 hover:border-slate-700 text-transparent"
                                        }`}
                                      >
                                        <svg className="w-2.5 h-2.5 stroke-current stroke-[3] fill-none" viewBox="0 0 24 24">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      </button>
                                      <div onClick={() => toggleItemCompleted(topic.id, "subtopic", sub.name)} className="cursor-pointer select-none flex-grow">
                                        <span className={`font-medium transition-all ${
                                          isChecked ? "text-slate-500 line-through decoration-slate-600" : "text-slate-300 group-hover:text-slate-200"
                                        }`}>
                                          {sub.name}
                                        </span>
                                        {sub.details && (
                                          <span className={`block text-[10px] mt-0.5 transition-all ${
                                            isChecked ? "text-slate-600" : "text-slate-500"
                                          }`}>
                                            {sub.details}
                                          </span>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>

                          {/* Exercises column */}
                          <div className="space-y-3">
                            <h5 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-1.5">
                              <ClipboardList size={14} /> Übungsaufgaben
                            </h5>
                            {topic.exercises.length === 0 ? (
                              <p className="text-xs text-slate-655 italic">Keine Übungsaufgaben gelistet</p>
                            ) : (
                              <ul className="space-y-2.5">
                                {topic.exercises.map((ex, idx) => {
                                  const isChecked = !!completedItems[`${topic.id}-exercise-${ex.name}`];
                                  return (
                                    <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed group">
                                      <button
                                        type="button"
                                        onClick={() => toggleItemCompleted(topic.id, "exercise", ex.name)}
                                        className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                                          isChecked
                                            ? "bg-indigo-500 border-indigo-500 text-slate-950 shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                                            : "border-slate-800 bg-slate-950/50 hover:border-slate-700 text-transparent"
                                        }`}
                                      >
                                        <svg className="w-2.5 h-2.5 stroke-current stroke-[3] fill-none" viewBox="0 0 24 24">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      </button>
                                      <div onClick={() => toggleItemCompleted(topic.id, "exercise", ex.name)} className="cursor-pointer select-none flex-grow">
                                        <span className={`font-medium transition-all ${
                                          isChecked ? "text-slate-500 line-through decoration-slate-600" : "text-slate-300 group-hover:text-slate-200"
                                        }`}>
                                          {ex.name}
                                        </span>
                                        {ex.details && (
                                          <span className={`block text-[10px] mt-0.5 transition-all ${
                                            isChecked ? "text-slate-600" : "text-slate-500"
                                          }`}>
                                            {ex.details}
                                          </span>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>

                          {/* Exams column */}
                          <div className="space-y-3">
                            <h5 className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-1.5">
                              <HelpCircle size={14} /> Klausurfragen
                            </h5>
                            {topic.exams.length === 0 ? (
                              <p className="text-xs text-slate-655 italic">Keine Klausuraufgaben gelistet</p>
                            ) : (
                              <ul className="space-y-2.5">
                                {topic.exams.map((exam, idx) => {
                                  const isChecked = !!completedItems[`${topic.id}-exam-${exam.name}`];
                                  return (
                                    <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed group">
                                      <button
                                        type="button"
                                        onClick={() => toggleItemCompleted(topic.id, "exam", exam.name)}
                                        className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                                          isChecked
                                            ? "bg-purple-500 border-purple-500 text-slate-950 shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                                            : "border-slate-800 bg-slate-950/50 hover:border-slate-700 text-transparent"
                                        }`}
                                      >
                                        <svg className="w-2.5 h-2.5 stroke-current stroke-[3] fill-none" viewBox="0 0 24 24">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      </button>
                                      <div onClick={() => toggleItemCompleted(topic.id, "exam", exam.name)} className="cursor-pointer select-none flex-grow">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className={`font-medium transition-all ${
                                            isChecked ? "text-slate-500 line-through decoration-slate-600" : "text-slate-300 group-hover:text-slate-200"
                                          }`}>
                                            {exam.name}
                                          </span>
                                          {exam.type && (
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold tracking-wide border uppercase transition-all shadow-sm ${
                                              exam.type === "APPLICATION"
                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                                                : "bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                                            } ${isChecked ? "opacity-40" : ""}`}>
                                              {exam.type === "APPLICATION" ? "Anwendung" : "Auswendiglernen"}
                                            </span>
                                          )}
                                        </div>
                                        {exam.details && (
                                          <span className={`block text-[10px] mt-0.5 transition-all ${
                                            isChecked ? "text-slate-600" : "text-slate-500"
                                          }`}>
                                            {exam.details}
                                          </span>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Document Links */}
                        <div className="pt-4 border-t border-slate-900">
                          <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Direkte Dokumenten-Links</h5>
                          {topic.sources.length === 0 ? (
                            <p className="text-xs text-slate-655 italic">Keine Quelldateien verlinkt</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {topic.sources.map((source, idx) => {
                                let link = `/api/files/${source.fileId}`;
                                if (source.page) {
                                  link += `#page=${source.page}`;
                                }
                                return (
                                  <a
                                    key={idx}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    <ExternalLink size={12} />
                                    <span>{source.fileName}</span>
                                    {source.page && <span className="text-slate-550 font-normal">S. {source.page}</span>}
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FILES TAB */}
      {activeTab === "files" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Loop over file types to create upload panels */}
          {(["SLIDES", "EXERCISES", "EXAMS"] as const).map((fileType) => {
            const label = fileType === "SLIDES" ? "Vorlesungsfolien" : fileType === "EXERCISES" ? "Übungsaufgaben" : "Altklausuren";
            const files = fileType === "SLIDES" ? slidesFiles : fileType === "EXERCISES" ? exercisesFiles : examsFiles;
            const inputId = `file-input-${fileType}`;

            return (
              <div key={fileType} className="glass-card rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-200 mb-2">{label}</h3>
                  <p className="text-sm text-slate-500 mb-6">Upload PDFs, Skripte oder Textdokumente.</p>
                  
                  {/* File List */}
                  {files.length === 0 ? (
                    <div className="text-center py-8 bg-slate-950/30 rounded-xl border border-dashed border-slate-900 mb-6">
                      <FileText className="mx-auto text-slate-600 mb-2" size={24} />
                      <span className="text-xs text-slate-500">Keine Dateien hochgeladen</span>
                    </div>
                  ) : (
                    <div className="space-y-2 mb-6 max-h-[220px] overflow-y-auto pr-1">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2.5 bg-slate-950/50 border border-slate-900 rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-2 overflow-hidden mr-2">
                            <FileText size={16} className="text-blue-500/70 shrink-0" />
                            <span className="text-slate-300 truncate" title={file.name}>
                              {file.name}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteFile(file.id, file.name)}
                            disabled={deletingFileId === file.id}
                            className="text-slate-600 hover:text-rose-400 p-1 hover:bg-slate-900 rounded transition-colors shrink-0"
                            title="Datei löschen"
                          >
                            {deletingFileId === file.id ? (
                              <Loader2 size={14} className="animate-spin text-rose-400" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div>
                  <input
                    type="file"
                    id={inputId}
                    onChange={(e) => handleFileUpload(e, fileType)}
                    className="hidden"
                    disabled={uploadingType !== null}
                    accept=".pdf,.txt,.md,.png,.jpg,.jpeg"
                  />
                  <label
                    htmlFor={inputId}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold py-3 rounded-xl cursor-pointer transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
                  >
                    {uploadingType === fileType ? (
                      <>
                        <Loader2 size={18} className="animate-spin text-blue-500" />
                        Lade hoch...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        Datei hochladen
                      </>
                    )}
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ANALYSIS PIPELINE */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg glass-panel p-8 md:p-10 rounded-3xl border border-slate-800 text-center animate-slide-up">
            <div className="relative w-24 h-24 mx-auto mb-8">
              {/* Outer pulsing glow */}
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
              {/* Spinning Loader */}
              <div className="absolute inset-0 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
              {/* Inner Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={32} className="text-indigo-400 animate-pulse" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-slate-100 mb-2">AI-Klausuranalyse läuft</h3>
            <p className="text-slate-400 text-sm mb-8 text-center px-4">
              Das System extrahiert den Text aus deinen Dateien und konsolidiert die Themen mit Google Gemini...
            </p>

            {/* Stepper showing Agent progress */}
            <div className="space-y-4 text-left max-w-xs mx-auto">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs font-bold transition-all ${
                  analysisStep > 1 ? "bg-emerald-500 border-emerald-500 text-white" :
                  analysisStep === 1 ? "bg-indigo-500 border-indigo-500 text-white animate-pulse" :
                  "border-slate-800 text-slate-600 bg-slate-950"
                }`}>
                  {analysisStep > 1 ? "✓" : "1"}
                </div>
                <span className={`text-sm font-semibold transition-colors ${analysisStep === 1 ? "text-indigo-400" : analysisStep > 1 ? "text-slate-300" : "text-slate-600"}`}>
                  Text aus Dateien extrahieren
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs font-bold transition-all ${
                  analysisStep > 2 ? "bg-emerald-500 border-emerald-500 text-white" :
                  analysisStep === 2 ? "bg-indigo-500 border-indigo-500 text-white animate-pulse" :
                  "border-slate-800 text-slate-600 bg-slate-950"
                }`}>
                  {analysisStep > 2 ? "✓" : "2"}
                </div>
                <span className={`text-sm font-semibold transition-colors ${analysisStep === 2 ? "text-indigo-400" : analysisStep > 2 ? "text-slate-300" : "text-slate-600"}`}>
                  Dokumente verarbeiten
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs font-bold transition-all ${
                  analysisStep > 3 ? "bg-emerald-500 border-emerald-500 text-white" :
                  analysisStep === 3 ? "bg-indigo-500 border-indigo-500 text-white animate-pulse" :
                  "border-slate-800 text-slate-600 bg-slate-950"
                }`}>
                  {analysisStep > 3 ? "✓" : "3"}
                </div>
                <span className={`text-sm font-semibold transition-colors ${analysisStep === 3 ? "text-indigo-400" : analysisStep > 3 ? "text-slate-300" : "text-slate-600"}`}>
                  AI-Analyse vorbereiten
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs font-bold transition-all ${
                  analysisStep > 4 ? "bg-emerald-500 border-emerald-500 text-white" :
                  analysisStep === 4 ? "bg-indigo-500 border-indigo-500 text-white animate-pulse" :
                  "border-slate-800 text-slate-600 bg-slate-950"
                }`}>
                  {analysisStep > 4 ? "✓" : "4"}
                </div>
                <span className={`text-sm font-semibold transition-colors ${analysisStep === 4 ? "text-indigo-400" : "text-slate-650"}`}>
                  Themen & Aufgaben konsolidieren
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
