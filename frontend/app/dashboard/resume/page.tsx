"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import {
  FileText, ArrowRight, Trash2, Download,
  RefreshCw, CheckCircle, Eye, X,
  Scissors
} from "lucide-react";

const subscribeToHydration = () => () => {};

interface ResumeRecord {
  id: string;
  title: string;
  template: string;
  ai_score: number;
  ats_score: number;
  color_theme?: string;
  job_description?: string;
  final_resume?: { summary?: string };
  created_at?: string;
  updated_at?: string;
}

function getErrorDetail(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    return (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || fallback;
  }
  return fallback;
}

export default function ResumeHistoryPage() {
  const { token, user, setUpgradeModal } = useAppStore();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tailorModalOpen, setTailorModalOpen] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [processingTailor, setProcessingTailor] = useState(false);
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  useEffect(() => {
    if (mounted && !token) {
      window.location.href = "/auth/signin";
    }
  }, [mounted, token]);

  useEffect(() => {
    if (token) {
      const timeout = window.setTimeout(() => {
        api.get("/api/resume")
          .then((data: ResumeRecord[]) => setResumes(data))
          .catch(() => {})
          .finally(() => setLoading(false));
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [token]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this resume?")) {
      try {
        await api.delete(`/api/resume/${id}`);
        setResumes(resumes.filter(r => r.id !== id));
      } catch {
        alert("Failed to delete resume.");
      }
    }
  };

  const triggerTailor = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    setJobDescription("");
    setTailorModalOpen(true);
  };

  const handleTailorSubmit = async () => {
    if (!selectedResumeId || !jobDescription.trim()) return;
    setProcessingTailor(true);
    try {
      const res = await api.post(`/api/resume/${selectedResumeId}/tailor`, {
        job_description: jobDescription,
      });
      useAppStore.getState().setActiveResumeJobId(res.id);
      window.location.href = `/dashboard/resume/generating?job_id=${res.id}`;
    } catch (error: unknown) {
      alert(getErrorDetail(error, "Failed to start tailoring."));
    } finally {
      setProcessingTailor(false);
      setTailorModalOpen(false);
    }
  };

  const handleDownloadPdf = (id: string) => {
    window.open(`${api.getBaseUrl()}/api/resume/${id}/export/pdf`, "_blank");
  };

  if (!mounted || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex h-10 w-10 animate-spin items-center justify-center rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-9 flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="editorial-label">Workspace / resumes</p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-white sm:text-4xl">
            Resume Profiles
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Manage all your AI-generated resumes. Preview, download, tailor variants for new jobs, or start fresh.
          </p>
        </div>
        <Link href="/dashboard/resume/new" className="premium-primary">
          Create Resume <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Stats */}
      {resumes.length > 0 && (
        <div className="mb-8 flex items-center gap-6 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> {resumes.length} resume{resumes.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" /> {resumes.filter(r => r.ai_score < 0.15).length} undetectable
          </span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : resumes.length === 0 ? (
        <div className="py-16 text-center glass-panel rounded-2xl border-white/5">
          <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h4 className="font-bold text-white text-lg">No Resumes Generated</h4>
          <p className="text-zinc-500 text-sm mt-1 mb-6">
            Create an ATS-optimized, humanized resume that bypasses AI detectors.
          </p>
          <Link href="/dashboard/resume/new" className="premium-primary !min-h-10">
            <FileText className="h-4 w-4" /> Start Resume Builder
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {resumes.map(resume => (
            <div
              key={resume.id}
              className="glass-panel p-6 rounded-2xl border-white/5 hover:border-violet-500/20 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Title and scores */}
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg text-white truncate">{resume.title}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-zinc-500 capitalize">
                        {resume.template.replace(/_/g, " ")}
                      </span>
                      {resume.color_theme && resume.color_theme !== "default" && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span className="text-[10px] text-zinc-500 capitalize">{resume.color_theme}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-right shrink-0 ml-4">
                    <span
                      className={`text-[10px] py-0.5 px-2 rounded-full font-bold border ${
                        resume.ai_score < 0.15
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                          : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                      }`}
                    >
                      AI: {Math.round(resume.ai_score * 100)}%
                    </span>
                    <span className="text-[10px] py-0.5 px-2 rounded-full font-bold bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
                      ATS: {Math.round(resume.ats_score * 100)}%
                    </span>
                  </div>
                </div>

                {/* Summary excerpt */}
                <p className="text-zinc-400 text-xs mt-4 line-clamp-2 italic">
                  &quot;{resume.final_resume?.summary || "No summary compiled."}&quot;
                </p>

                {/* Date */}
                {resume.created_at && (
                  <p className="text-[10px] text-zinc-600 mt-3">
                    Created {new Date(resume.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => triggerTailor(resume.id)}
                    className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-1.5 px-3 rounded-lg border border-white/5 transition-colors"
                  >
                    <Scissors className="h-3 w-3" /> Tailor Variant
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(resume.id)}
                    className="p-1.5 text-zinc-500 hover:text-indigo-400 transition-colors"
                    title="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(resume.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                    title="Delete Resume"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <Link
                  href={`/dashboard/resume/preview?id=${resume.id}`}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" /> Preview & Export <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tailor Modal */}
      {tailorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="font-heading font-extrabold text-xl text-white">Tailor Resume for New Job</h3>
                <p className="text-zinc-400 text-xs mt-1">
                  We will optimize your experiences and skills to match the target keywords.
                </p>
              </div>
              <button
                onClick={() => setTailorModalOpen(false)}
                className="text-zinc-400 hover:text-white rounded-full bg-white/5 p-1.5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the target Job Description (JD) text here..."
              rows={6}
              className="mt-4 w-full rounded-2xl p-4 text-sm text-white"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setTailorModalOpen(false)}
                className="rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 py-2 px-4 text-sm font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleTailorSubmit}
                disabled={processingTailor || !jobDescription.trim()}
                className="rounded-xl bg-indigo-500 hover:bg-indigo-600 py-2 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {processingTailor ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Starting pipeline...
                  </span>
                ) : (
                  "Run Tailoring (-1 resume credit)"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
