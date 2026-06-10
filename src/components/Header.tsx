"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Sparkles, Settings, LogOut, Key, Check, Loader2, AlertCircle, X, Shield, Plus, Trash2, HelpCircle } from "lucide-react";
import Link from "next/link";
import {
  getGeminiApiKey,
  updateGeminiApiKey,
  getWhitelistedEmails,
  addWhitelistedEmail,
  removeWhitelistedEmail,
} from "@/app/actions";

export default function Header() {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"api" | "whitelist">("api");
  const isAdmin = session?.user?.role === "ADMIN";

  // API Key States
  const [apiKey, setApiKey] = useState("");
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [isGetStartedOpen, setIsGetStartedOpen] = useState(false);

  // Whitelist States
  const [whitelistEmails, setWhitelistEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [whitelistLoading, setWhitelistLoading] = useState(false);
  const [whitelistError, setWhitelistError] = useState<string | null>(null);
  const [whitelistSuccess, setWhitelistSuccess] = useState<string | null>(null);

  // Fetch API key status on mount to check if "Get Started" should be shown
  useEffect(() => {
    if (session) {
      getGeminiApiKey()
        .then((key) => {
          setHasApiKey(!!key);
          if (key) {
            setApiKey(key);
            setIsKeySaved(true);
          } else {
            setApiKey("");
            setIsKeySaved(false);
          }
        })
        .catch(() => {
          setHasApiKey(false);
        });
    }
  }, [session]);

  // Fetch API key status on mount / modal open
  useEffect(() => {
    if (isModalOpen && session && activeTab === "api") {
      setIsLoading(true);
      setError(null);
      getGeminiApiKey()
        .then((key) => {
          if (key) {
            setApiKey(key);
            setIsKeySaved(true);
          } else {
            setApiKey("");
            setIsKeySaved(false);
          }
        })
        .catch(() => {
          setError("Fehler beim Laden des API-Schlüssels.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isModalOpen, session, activeTab]);

  // Fetch whitelist emails when whitelist tab is active
  useEffect(() => {
    if (isModalOpen && isAdmin && activeTab === "whitelist") {
      fetchWhitelist();
    }
  }, [isModalOpen, activeTab, isAdmin]);

  const fetchWhitelist = async () => {
    setWhitelistLoading(true);
    setWhitelistError(null);
    try {
      const emails = await getWhitelistedEmails();
      setWhitelistEmails(emails);
    } catch (err: any) {
      setWhitelistError(err.message || "Fehler beim Laden der Whitelist.");
    } finally {
      setWhitelistLoading(false);
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await updateGeminiApiKey(apiKey);
      const isSaved = !!apiKey.trim();
      setIsKeySaved(isSaved);
      setHasApiKey(isSaved);
      setSuccess(apiKey.trim() ? "API-Schlüssel erfolgreich gespeichert!" : "API-Schlüssel gelöscht.");
      if (!apiKey.trim()) {
        setApiKey("");
      }
      if (isSaved) {
        setTimeout(() => {
          setSuccess(null);
          setIsGetStartedOpen(false);
        }, 1500);
      } else {
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || "Fehler beim Speichern des API-Schlüssels.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!confirm("Möchtest du deinen gespeicherten API-Schlüssel wirklich löschen?")) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await updateGeminiApiKey("");
      setApiKey("");
      setIsKeySaved(false);
      setHasApiKey(false);
      setSuccess("API-Schlüssel gelöscht.");
      setTimeout(() => {
        setSuccess(null);
        setIsGetStartedOpen(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Fehler beim Löschen des API-Schlüssels.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setWhitelistLoading(true);
    setWhitelistError(null);
    setWhitelistSuccess(null);
    try {
      await addWhitelistedEmail(newEmail);
      setNewEmail("");
      setWhitelistSuccess("Email erfolgreich hinzugefügt!");
      await fetchWhitelist();
      setTimeout(() => setWhitelistSuccess(null), 3000);
    } catch (err: any) {
      setWhitelistError(err.message || "Fehler beim Hinzufügen.");
    } finally {
      setWhitelistLoading(false);
    }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!confirm(`Möchtest du "${email}" wirklich von der Whitelist entfernen?`)) return;
    setWhitelistLoading(true);
    setWhitelistError(null);
    setWhitelistSuccess(null);
    try {
      await removeWhitelistedEmail(email);
      setWhitelistSuccess("Email erfolgreich entfernt.");
      await fetchWhitelist();
      setTimeout(() => setWhitelistSuccess(null), 3000);
    } catch (err: any) {
      setWhitelistError(err.message || "Fehler beim Entfernen.");
    } finally {
      setWhitelistLoading(false);
    }
  };

  if (!session) return null;

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/60 border-b border-slate-800/80 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo / Home link */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-slate-100 shadow-[0_0_15px_rgba(59,130,246,0.25)] group-hover:scale-105 transition-transform duration-300">
              <Sparkles size={18} />
            </div>
            <span className="font-bold text-lg text-slate-100 tracking-tight group-hover:text-blue-400 transition-colors duration-300">
              Exam Planner <span className="text-blue-500">🚦</span>
            </span>
          </Link>

          {/* User Profile + Action buttons */}
          <div className="flex items-center gap-4">
            {/* User Info */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-200 leading-tight flex items-center gap-1">
                {session.user?.name || "Benutzer"}
                {isAdmin && (
                  <span className="text-[9px] px-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold rounded">
                    Admin
                  </span>
                )}
              </span>
              <span className="text-[10px] text-slate-400 leading-none">
                {session.user?.email}
              </span>
            </div>

            {/* Avatar / Profile Image */}
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center">
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-slate-400 uppercase">
                  {(session.user?.name || session.user?.email || "U").charAt(0)}
                </span>
              )}
            </div>

            {/* Get Started Button */}
            {hasApiKey === false && (
              <div className="relative">
                <button
                  onClick={() => setIsGetStartedOpen(!isGetStartedOpen)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center gap-1.5 animate-pulse-slow cursor-pointer"
                >
                  <Sparkles size={12} className="text-amber-300" />
                  <span>Get Started</span>
                </button>
                
                {isGetStartedOpen && (
                  <div className="absolute right-0 mt-2 z-50 w-72 glass-panel p-4 rounded-2xl border border-slate-800 shadow-[0_15px_40px_rgba(0,0,0,0.5)] space-y-4 animate-slide-up">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">Gemini API-Key hinzufügen</span>
                      <Link
                        href="/help/api-key"
                        target="_blank"
                        className="p-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center cursor-pointer"
                        title="Anleitung anzeigen"
                      >
                        <HelpCircle size={14} />
                      </Link>
                    </div>
                    
                    <form onSubmit={handleSaveApiKey} className="space-y-3">
                      <div className="relative">
                        <input
                          type="password"
                          placeholder={isKeySaved ? "••••••••••••••••••••••••••••••••" : "AIzaSy..."}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          disabled={isLoading}
                          className="w-full pl-3 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-xs"
                        />
                        {isKeySaved && (
                          <div className="absolute inset-y-0 right-3 flex items-center text-emerald-400">
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                      
                      {error && (
                        <p className="text-[10px] text-rose-450 leading-tight">{error}</p>
                      )}
                      {success && (
                        <p className="text-[10px] text-emerald-400 leading-tight">{success}</p>
                      )}
                      
                      <div className="flex justify-between items-center pt-1">
                        {isKeySaved ? (
                          <button
                            type="button"
                            onClick={handleDeleteApiKey}
                            disabled={isLoading}
                            className="text-[10px] text-rose-450 hover:underline bg-transparent border-none p-0 cursor-pointer"
                          >
                            Löschen
                          </button>
                        ) : (
                          <span className="text-[9px] text-slate-500">Gemini-2.5-flash</span>
                        )}
                        
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                        >
                          {isLoading ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            "Speichern"
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* Settings button */}
            <button
              onClick={() => {
                setActiveTab("api");
                setIsModalOpen(true);
              }}
              className="p-2 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all duration-300 cursor-pointer"
              title="Profil & Einstellungen"
            >
              <Settings size={16} />
            </button>

            {/* Logout button */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-rose-950/20 hover:border-rose-900/50 text-slate-400 hover:text-rose-400 transition-all duration-300 cursor-pointer"
              title="Ausloggen"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 relative animate-slide-up shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setIsModalOpen(false);
                setError(null);
                setSuccess(null);
                setWhitelistError(null);
                setWhitelistSuccess(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Admin Tabs */}
            {isAdmin ? (
              <div className="flex border-b border-slate-800/80 mb-6">
                <button
                  onClick={() => setActiveTab("api")}
                  className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                    activeTab === "api"
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Key size={14} />
                    API-Schlüssel
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("whitelist")}
                  className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                    activeTab === "whitelist"
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Shield size={14} />
                    Whitelist
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20">
                  <Key size={16} />
                </div>
                <h2 className="text-xl font-bold text-slate-100">API-Key Einstellungen</h2>
              </div>
            )}

            {/* API KEY TAB */}
            {activeTab === "api" && (
              <>
                {!isAdmin && (
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                    Trage deinen eigenen Google Gemini API-Schlüssel ein. Dieser wird ausschließlich für deine Analysen genutzt und ist für niemanden sonst sichtbar.
                  </p>
                )}
                
                <form onSubmit={handleSaveApiKey} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Gemini API-Schlüssel (gemini-3.5-flash)
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder={isKeySaved ? "••••••••••••••••••••••••••••••••" : "AIzaSy..."}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        disabled={isLoading}
                        className="w-full pl-3 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
                      />
                      {isKeySaved && (
                        <div className="absolute inset-y-0 right-3 flex items-center text-emerald-400" title="API Key aktiv">
                          <Check size={18} />
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <a
                        href="https://aistudio.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-400 hover:underline"
                      >
                        API-Key in Google AI Studio holen &rarr;
                      </a>
                      {isKeySaved && (
                        <button
                          type="button"
                          onClick={handleDeleteApiKey}
                          disabled={isLoading}
                          className="text-[10px] text-rose-400 hover:underline bg-transparent border-none p-0 cursor-pointer"
                        >
                          Schlüssel löschen
                        </button>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 text-rose-400 bg-rose-500/5 border border-rose-500/20 p-3.5 rounded-xl text-xs leading-relaxed">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-start gap-2 text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-xl text-xs leading-relaxed">
                      <Check size={16} className="mt-0.5 flex-shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-8 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setError(null);
                        setSuccess(null);
                      }}
                      className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 transition-colors font-semibold text-xs cursor-pointer"
                    >
                      Schließen
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] text-xs cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Speichere...
                        </>
                      ) : (
                        "Speichern"
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* WHITELIST TAB (ADMIN ONLY) */}
            {activeTab === "whitelist" && isAdmin && (
              <div className="space-y-5">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Trage die Google E-Mail-Adressen von Kommilitonen oder Freunden ein, um ihnen Zugriff auf den Exam Planner zu gewähren.
                </p>

                {/* Add Email Form */}
                <form onSubmit={handleAddEmail} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="name@gmail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={whitelistLoading}
                    className="flex-grow px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-xs"
                  />
                  <button
                    type="submit"
                    disabled={whitelistLoading || !newEmail.trim()}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                  >
                    {whitelistLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    Hinzufügen
                  </button>
                </form>

                {whitelistError && (
                  <div className="flex items-start gap-2 text-rose-400 bg-rose-500/5 border border-rose-500/20 p-2.5 rounded-xl text-[11px] leading-relaxed">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{whitelistError}</span>
                  </div>
                )}

                {whitelistSuccess && (
                  <div className="flex items-start gap-2 text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 p-2.5 rounded-xl text-[11px] leading-relaxed">
                    <Check size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{whitelistSuccess}</span>
                  </div>
                )}

                {/* Whitelist Directory */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Freigeschaltete Konten ({whitelistEmails.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto pr-1 border border-slate-900 rounded-xl bg-slate-950/50 divide-y divide-slate-900/60 custom-scrollbar">
                    {whitelistEmails.length === 0 && !whitelistLoading ? (
                      <p className="p-4 text-center text-xs text-slate-600 italic">
                        Keine Emails whitelisted.
                      </p>
                    ) : (
                      whitelistEmails.map((email) => {
                        const isSuperAdmin = email === "lukasreinle0@gmail.com";
                        return (
                          <div
                            key={email}
                            className="px-3 py-2 flex items-center justify-between text-xs text-slate-300"
                          >
                            <span className="truncate">{email}</span>
                            {isSuperAdmin ? (
                              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                                Owner
                              </span>
                            ) : (
                              <button
                                onClick={() => handleRemoveEmail(email)}
                                disabled={whitelistLoading}
                                className="text-slate-650 hover:text-rose-400 p-1 rounded transition-colors bg-transparent border-none cursor-pointer"
                                title="Whitelist-Eintrag löschen"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setWhitelistError(null);
                      setWhitelistSuccess(null);
                    }}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 transition-colors font-semibold text-xs cursor-pointer"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
