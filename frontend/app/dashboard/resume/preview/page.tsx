"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { 
  ArrowLeft, Download, RefreshCw, FileText, CheckCircle, 
  AlertTriangle, Copy, Shield, Layers, Calendar, Mail, Phone, MapPin, Link2
} from "lucide-react";

export default function ResumePreviewPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black"><div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" /></div>}><ResumePreviewContent /></Suspense>;
}

function ResumePreviewContent() {
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("id");
  const { user, setUpgradeModal } = useAppStore();

  const [resume, setResume] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (resumeId) {
      setLoading(true);
      api.get(`/api/resume/${resumeId}`)
        .then((res: any) => setResume(res))
        .catch(console.warn)
        .finally(() => setLoading(false));
    }
  }, [resumeId]);

  const handleCopyText = () => {
    if (!resume) return;
    const data = resume.final_resume;
    
    // Construct a nice formatted text representation
    let text = `${data.name}\n${data.email} | ${data.phone || ''} | ${data.location || ''}\n`;
    if (data.linkedin) text += `LinkedIn: ${data.linkedin}\n`;
    if (data.github) text += `GitHub: ${data.github}\n`;
    
    text += `\nSUMMARY\n${data.summary}\n`;
    
    text += `\nEXPERIENCE\n`;
    data.experience?.forEach((exp: any) => {
      text += `${exp.company} - ${exp.title} (${exp.duration})\n`;
      exp.bullets?.forEach((b: string) => {
        text += `- ${b}\n`;
      });
    });
    
    text += `\nSKILLS\n`;
    if (data.skills?.technical) text += `Technical: ${data.skills.technical.join(', ')}\n`;
    if (data.skills?.soft) text += `Soft: ${data.skills.soft.join(', ')}\n`;
    
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleDownloadPDF = () => {
    if (!resumeId) return;
    // Download directly from FastAPI route
    window.location.href = `http://localhost:8000/api/resume/${resumeId}/export/pdf`;
  };

  const handleDownloadDOCX = () => {
    if (user?.tier !== 'pro') {
      setUpgradeModal(true);
      return;
    }
    // Download Word file
    window.location.href = `http://localhost:8000/api/resume/${resumeId}/export/docx`;
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center bg-black min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="py-20 text-center bg-black min-h-screen">
        <p className="text-zinc-400">Resume details not found.</p>
        <Link href="/dashboard" className="text-indigo-400 text-xs mt-4 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const profile = resume.final_resume || {};
  const isAIsafe = resume.ai_score < 0.15;
  const isATSstrong = resume.ats_score > 0.80;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-black">
      
      <Link 
        href="/dashboard" 
        className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left pane: styled resume preview sheet */}
        <div className="lg:col-span-2">
          <div className="bg-white text-zinc-800 p-8 sm:p-12 rounded-3xl border border-zinc-200 shadow-xl max-h-[85vh] overflow-y-auto font-sans leading-relaxed">
            
            {/* Header info */}
            <div className="text-center border-b border-zinc-200 pb-6 mb-6">
              <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{profile.name}</h2>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-zinc-500 mt-2 font-medium">
                {profile.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {profile.email}</span>}
                {profile.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {profile.phone}</span>}
                {profile.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.location}</span>}
              </div>
              <div className="flex justify-center gap-4 text-xs text-zinc-500 mt-1 font-medium">
                {profile.linkedin && <a href={`https://${profile.linkedin}`} className="hover:underline flex items-center gap-1"><Link2 className="h-3 w-3" /> linkedin</a>}
                {profile.github && <a href={`https://${profile.github}`} className="hover:underline flex items-center gap-1"><Link2 className="h-3 w-3" /> github</a>}
              </div>
            </div>

            {/* Summary */}
            {profile.summary && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-2">Professional Summary</h4>
                <p className="text-xs text-zinc-600 text-justify">{profile.summary}</p>
              </div>
            )}

            {/* Experience */}
            {profile.experience && profile.experience.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-3">Work History</h4>
                {profile.experience.map((exp: any, idx: number) => (
                  <div key={idx} className="mb-4">
                    <div className="flex justify-between font-bold text-xs text-zinc-800">
                      <span>{exp.company} — {exp.title}</span>
                      <span className="font-normal text-zinc-500 text-[11px]">{exp.duration}</span>
                    </div>
                    <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
                      {exp.bullets?.map((b: string, i: number) => (
                        <li key={i} className="text-xs text-zinc-600 text-justify leading-relaxed">{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Projects */}
            {profile.projects && profile.projects.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-3">Key Projects</h4>
                {profile.projects.map((proj: any, idx: number) => (
                  <div key={idx} className="mb-3">
                    <div className="flex justify-between font-bold text-xs text-zinc-800">
                      <span>{proj.name}</span>
                      {proj.link && <span className="font-normal text-zinc-400 text-[10px]">{proj.link}</span>}
                    </div>
                    {proj.tech_stack && <div className="text-[10px] text-zinc-500 font-semibold italic">Stack: {proj.tech_stack.join(', ')}</div>}
                    <p className="text-xs text-zinc-600 mt-1 text-justify">{proj.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Skills */}
            {profile.skills && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-2">Technical Proficiencies</h4>
                {profile.skills.technical && (
                  <div className="text-xs text-zinc-600">
                    <strong>Tech:</strong> {profile.skills.technical.join(', ')}
                  </div>
                )}
                {profile.skills.soft && (
                  <div className="text-xs text-zinc-600 mt-1">
                    <strong>Soft Skills:</strong> {profile.skills.soft.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Education */}
            {profile.education && profile.education.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest border-b border-zinc-200 pb-1 mb-3">Education</h4>
                {profile.education.map((edu: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs text-zinc-700">
                    <div>
                      <strong className="text-zinc-800">{edu.institution}</strong> — {edu.degree}
                    </div>
                    <span className="text-zinc-500">{edu.year}</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* Right pane: Score metrics and downloads dashboard */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* AI Score */}
          <div className="glass-panel p-6 rounded-3xl border-white/5">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-4">AI Scan Dashboard</span>
            
            <div className="space-y-5">
              
              {/* Radial simulated meter */}
              <div className="flex items-center gap-4">
                <div className={`h-16 w-16 rounded-full flex flex-col items-center justify-center border-4 ${
                  isAIsafe ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                }`}>
                  <span className="font-heading font-extrabold text-lg leading-none">{Math.round(resume.ai_score * 100)}%</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">AI Detection Check</h4>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    {isAIsafe ? (
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Undetectable (Human-Score)</span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Likely Flagged</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ATS matching */}
              <div className="flex items-center gap-4 border-t border-white/5 pt-4">
                <div className="h-16 w-16 rounded-full flex flex-col items-center justify-center border-4 border-indigo-500/30 text-indigo-400 bg-indigo-500/5">
                  <span className="font-heading font-extrabold text-lg leading-none">{Math.round(resume.ats_score * 100)}%</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">ATS Keywords Match</h4>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-indigo-400">
                    <CheckCircle className="h-3.5 w-3.5" /> strong alignment score
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Style details */}
          <div className="glass-panel p-6 rounded-3xl border-white/5 bg-zinc-900/10 text-xs">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-3">Styles Configuration</span>
            <div className="space-y-1.5">
              <div><span className="text-zinc-500">Selected Template:</span> <span className="font-bold text-white uppercase">{resume.template.replace('_', ' ')}</span></div>
              <div><span className="text-zinc-500">Color Palette:</span> <span className="font-bold text-indigo-400 uppercase">{resume.color_theme}</span></div>
            </div>
          </div>

          {/* Action buttons downloads */}
          <div className="space-y-3">
            
            {/* Download PDF */}
            <button 
              onClick={handleDownloadPDF}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 py-3.5 px-4 font-bold text-white shadow-lg shadow-indigo-500/20"
            >
              <Download className="h-4 w-4" /> Download PDF Export
            </button>

            {/* Download DOCX (Pro check) */}
            <button 
              onClick={handleDownloadDOCX}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-800 py-3.5 px-4 font-bold text-zinc-200 transition-colors"
            >
              <Download className="h-4 w-4 text-violet-400" /> Download DOCX (Pro Word file)
            </button>

            {/* Copy text */}
            <button 
              onClick={handleCopyText}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 py-3.5 px-4 font-bold text-zinc-300 transition-colors"
            >
              <Copy className="h-4 w-4 text-zinc-500" /> 
              {copySuccess ? 'Copied to Clipboard!' : 'Copy Plain Text'}
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}
