"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { Loader2, CheckCircle2, Circle, AlertCircle } from "lucide-react";

const RESUME_STEPS = [
  { id: "drafting", label: "Drafting resume profile achievements..." },
  { id: "humanizing", label: "Making it sound human (burstiness adjustments)..." },
  { id: "scoring", label: "Checking AI detection scores (entropy checking)..." },
  { id: "ats", label: "Optimizing structure headers for ATS compatibility..." }
];

export default function ResumeGeneratingPage() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job_id");
  const { setActiveResumeJobId } = useAppStore();

  const [status, setStatus] = useState<"pending" | "running" | "done" | "failed">("running");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [resumeId, setResumeId] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      window.location.href = "/dashboard";
      return;
    }

    setActiveResumeJobId(jobId);

    const intervalId = setInterval(async () => {
      try {
        const job = await api.get(`/api/jobs/${jobId}`);
        const currentStatus = job.status.toLowerCase();
        
        if (currentStatus === "done") {
          clearInterval(intervalId);
          setStatus("done");
          setResumeId(job.resume_id);
          // Redirect to preview screen
          window.location.href = `/dashboard/resume/preview?id=${job.resume_id}`;
        } else if (currentStatus === "failed") {
          clearInterval(intervalId);
          setErrorMsg("Resume generation failed. Please try again with less wordy items.");
          setStatus("failed");
        } else {
          // Find step index
          const idx = RESUME_STEPS.findIndex(s => s.id === currentStatus);
          if (idx !== -1) {
            setCurrentStepIndex(idx);
          }
        }
      } catch (e) {
        console.warn("Error checking resume job status", e);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [jobId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      
      {status === "running" && (
        <div className="glass-panel w-full max-w-md p-8 rounded-3xl border-white/5 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-heading font-extrabold text-lg text-white font-sans">Compiling Resume</h3>
            <span className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Humanizing...
            </span>
          </div>

          <div className="space-y-4">
            {RESUME_STEPS.map((step, idx) => {
              const isDone = idx < currentStepIndex;
              const isActive = idx === currentStepIndex;
              return (
                <div 
                  key={step.id} 
                  className={`flex items-start gap-3 rounded-xl p-3 border transition-colors ${
                    isActive ? 'bg-indigo-500/5 border-indigo-500/20' : 'border-transparent'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="h-4.5 w-4.5 text-indigo-400 animate-spin" />
                    ) : (
                      <Circle className="h-4.5 w-4.5 text-zinc-800" />
                    )}
                  </div>
                  <div>
                    <span className={`text-xs font-semibold ${isActive ? 'text-white' : isDone ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-zinc-500 text-center text-xs mt-8">
            Estimated compilation time: ~45 seconds. Keep tab open.
          </p>
        </div>
      )}

      {status === "failed" && (
        <div className="glass-panel text-center p-8 rounded-3xl border-rose-500/20 bg-rose-500/5 max-w-sm w-full shadow-2xl">
          <AlertCircle className="h-12 w-12 text-rose-400 mx-auto mb-4" />
          <h3 className="font-heading font-bold text-lg text-white">Generation Failed</h3>
          <p className="text-zinc-400 text-xs mt-2">{errorMsg}</p>
          <a 
            href="/dashboard/resume/new"
            className="mt-6 inline-block rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/5 py-2 px-5 text-sm font-bold text-white"
          >
            Go Back
          </a>
        </div>
      )}

    </div>
  );
}
