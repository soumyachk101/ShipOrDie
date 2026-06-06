"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ResumeInput, useAppStore } from "@/store/useAppStore";
import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, Check, ChevronDown, Code2,
  Download, Eye, FileText, GraduationCap, LayoutTemplate, Loader2, Mail,
  MapPin, Menu, Palette, Phone, Plus, Sparkles, Trash2, Upload, UserRound,
  WandSparkles, X,
} from "lucide-react";

const sections = [
  { id: "personal", label: "Personal details", icon: UserRound },
  { id: "summary", label: "Professional summary", icon: FileText },
  { id: "experience", label: "Experience", icon: BriefcaseBusiness },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "skills", label: "Skills & projects", icon: Code2 },
  { id: "design", label: "Design & finish", icon: Palette },
] as const;

type SectionId = (typeof sections)[number]["id"];

const templates = [
  { id: "classic_ats", label: "Essential", font: "font-sans" },
  { id: "modern_split", label: "Modern", font: "font-sans" },
  { id: "tech_minimal", label: "Minimal", font: "font-mono" },
  { id: "creative_edge", label: "Editorial", font: "font-serif" },
];

const themes: Record<string, { accent: string; pale: string }> = {
  default: { accent: "#111827", pale: "#f3f4f6" },
  navy: { accent: "#1d4ed8", pale: "#eff6ff" },
  emerald: { accent: "#047857", pale: "#ecfdf5" },
  indigo: { accent: "#4f46e5", pale: "#eef2ff" },
  violet: { accent: "#7c3aed", pale: "#f5f3ff" },
  rose: { accent: "#e11d48", pale: "#fff1f2" },
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    return response?.data?.detail || fallback;
  }
  return fallback;
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.13em] text-zinc-500">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="builder-input w-full"
      />
    </label>
  );
}

export default function ResumeBuilderPage() {
  const {
    resumeForm, updateResumeForm, addExperience, removeExperience, addEducation,
    removeEducation, addProject, removeProject, setSkills, user, updateUserCredits,
  } = useAppStore();

  const [activeSection, setActiveSection] = useState<SectionId>("personal");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importTab, setImportTab] = useState<"file" | "text">("file");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeTitle, setResumeTitle] = useState("My professional resume");
  const [selectedTemplate, setSelectedTemplate] = useState("classic_ats");
  const [selectedTheme, setSelectedTheme] = useState("indigo");

  const [exp, setExp] = useState({ company: "", title: "", duration: "", bullets: "" });
  const [edu, setEdu] = useState({ institution: "", degree: "", year: "", gpa: "" });
  const [project, setProject] = useState({ name: "", description: "", tech: "", link: "" });
  const [skillInput, setSkillInput] = useState("");

  const completion = useMemo(() => {
    const checks = [
      resumeForm.name, resumeForm.email, resumeForm.summary,
      resumeForm.experience.length, resumeForm.education.length,
      resumeForm.skills.technical.length,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [resumeForm]);

  const theme = themes[selectedTheme];
  const templateFont = templates.find((item) => item.id === selectedTemplate)?.font || "font-sans";

  const goToSection = (id: SectionId) => {
    setActiveSection(id);
    setMobileMenu(false);
    setMobilePreview(false);
  };

  const nextSection = () => {
    const index = sections.findIndex((item) => item.id === activeSection);
    if (index < sections.length - 1) goToSection(sections[index + 1].id);
  };

  const handleParseImport = async () => {
    if (importTab === "file" && !uploadFile) return setErrorMsg("Choose a PDF to import first.");
    if (importTab === "text" && !pastedText.trim()) return setErrorMsg("Paste your resume text first.");
    setParsing(true);
    setErrorMsg("");
    try {
      const formData = new FormData();
      if (importTab === "file" && uploadFile) formData.append("file", uploadFile);
      else formData.append("text", pastedText.trim());
      const data = await api.post("/api/resume/parse", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateResumeForm({
        name: data.name || "", email: data.email || "", phone: data.phone || "",
        location: data.location || "", linkedin: data.linkedin || "", github: data.github || "",
        summary: data.summary || "", experience: data.experience || [],
        education: data.education || [], projects: data.projects || [],
      });
      setSkills("technical", data.skills?.technical || []);
      setSkills("soft", data.skills?.soft || []);
      setShowImport(false);
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, "Could not import that resume. Try pasting the text instead."));
    } finally {
      setParsing(false);
    }
  };

  const addSkill = () => {
    const skills = skillInput.split(",").map((item) => item.trim()).filter(Boolean);
    if (skills.length) setSkills("technical", [...new Set([...resumeForm.skills.technical, ...skills])]);
    setSkillInput("");
  };

  const submitResume = async () => {
    if (!resumeForm.name || !resumeForm.email) {
      setErrorMsg("Add your name and email before generating the resume.");
      goToSection("personal");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const job = await api.post("/api/resume/generate", {
        title: resumeTitle, template: selectedTemplate, color_theme: selectedTheme,
        job_description: jobDescription || null, raw_input: resumeForm,
      });
      if (user && user.resume_credits_remaining > 0) {
        updateUserCredits(user.credits_remaining, Math.max(0, user.resume_credits_remaining - 1));
      }
      window.location.href = `/dashboard/resume/generating?job_id=${job.id}`;
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, "Resume generation failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resume-builder-shell">
      <header className="builder-topbar">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="builder-icon-button" title="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="hidden h-6 w-px bg-white/10 sm:block" />
          <div className="min-w-0">
            <input
              value={resumeTitle}
              onChange={(event) => setResumeTitle(event.target.value)}
              className="builder-title-input"
              aria-label="Resume title"
            />
            <p className="mt-0.5 text-[10px] font-semibold text-zinc-600">Saved automatically</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMobilePreview(!mobilePreview)} className="builder-secondary-button lg:hidden">
            <Eye className="h-4 w-4" /> {mobilePreview ? "Edit" : "Preview"}
          </button>
          <button onClick={() => setShowImport(true)} className="builder-secondary-button hidden sm:flex">
            <Upload className="h-4 w-4" /> Import
          </button>
          <button onClick={submitResume} disabled={loading} className="builder-primary-button">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span className="hidden sm:inline">Generate resume</span>
            <span className="sm:hidden">Generate</span>
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="fixed left-1/2 top-20 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 shadow-xl">
          {errorMsg}<button onClick={() => setErrorMsg("")}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="builder-workspace">
        <aside className={`${mobileMenu ? "flex" : "hidden"} builder-sidebar lg:flex`}>
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              <span>Resume strength</span><span className="text-white">{completion}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all" style={{ width: `${completion}%` }} />
            </div>
          </div>
          <nav className="space-y-1">
            {sections.map((section, index) => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              return (
                <button key={section.id} onClick={() => goToSection(section.id)} className={`builder-nav-item ${active ? "active" : ""}`}>
                  <span className="builder-nav-number">{index + 1}</span>
                  <Icon className="h-4 w-4" />
                  <span>{section.label}</span>
                  {index < sections.findIndex((item) => item.id === activeSection) && <Check className="ml-auto h-3.5 w-3.5 text-emerald-400" />}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto rounded-2xl border border-indigo-400/15 bg-indigo-500/10 p-4">
            <WandSparkles className="mb-3 h-5 w-5 text-indigo-300" />
            <p className="text-xs font-bold text-white">Tailor it to a role</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">Add a job description in Design & finish for stronger ATS matching.</p>
          </div>
        </aside>

        <main className={`${mobilePreview ? "hidden" : "block"} builder-editor lg:block`}>
          <button onClick={() => setMobileMenu(!mobileMenu)} className="builder-mobile-section lg:hidden">
            <Menu className="h-4 w-4" />
            {sections.find((item) => item.id === activeSection)?.label}
            <ChevronDown className="ml-auto h-4 w-4" />
          </button>

          <div className="builder-editor-inner">
            {activeSection === "personal" && (
              <EditorSection title="Let’s start with the basics" description="This information appears at the top of your resume.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Full name" value={resumeForm.name} placeholder="Alex Morgan" onChange={(name) => updateResumeForm({ name })} />
                  <Field label="Email address" type="email" value={resumeForm.email} placeholder="alex@email.com" onChange={(email) => updateResumeForm({ email })} />
                  <Field label="Phone" value={resumeForm.phone} placeholder="+1 555 010 2398" onChange={(phone) => updateResumeForm({ phone })} />
                  <Field label="Location" value={resumeForm.location} placeholder="New York, NY" onChange={(location) => updateResumeForm({ location })} />
                  <Field label="LinkedIn" value={resumeForm.linkedin} placeholder="linkedin.com/in/alex" onChange={(linkedin) => updateResumeForm({ linkedin })} />
                  <Field label="Portfolio or GitHub" value={resumeForm.github} placeholder="alexmorgan.design" onChange={(github) => updateResumeForm({ github })} />
                </div>
              </EditorSection>
            )}

            {activeSection === "summary" && (
              <EditorSection title="Tell your professional story" description="Write 2–4 sentences that make your value immediately clear.">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.13em] text-zinc-500">Professional summary</span>
                  <textarea value={resumeForm.summary} onChange={(event) => updateResumeForm({ summary: event.target.value })} rows={9} maxLength={700} className="builder-input w-full resize-none" placeholder="Product-minded software engineer with 5+ years of experience..." />
                  <span className="mt-2 block text-right text-[10px] text-zinc-600">{resumeForm.summary.length}/700</span>
                </label>
                <div className="builder-tip"><Sparkles className="h-4 w-4 text-indigo-400" /><span>Start with your role, years of experience, strongest specialty, and one measurable result.</span></div>
              </EditorSection>
            )}

            {activeSection === "experience" && (
              <EditorSection title="Show your impact" description="Focus on results, not just responsibilities.">
                <div className="space-y-3">
                  {resumeForm.experience.map((item, index) => (
                    <SavedCard key={`${item.company}-${index}`} title={item.title} subtitle={`${item.company} · ${item.duration}`} onDelete={() => removeExperience(index)} />
                  ))}
                </div>
                <div className="builder-add-card">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Job title" value={exp.title} placeholder="Senior Product Designer" onChange={(title) => setExp({ ...exp, title })} />
                    <Field label="Company" value={exp.company} placeholder="Northstar Labs" onChange={(company) => setExp({ ...exp, company })} />
                  </div>
                  <div className="mt-4"><Field label="Dates" value={exp.duration} placeholder="Jan 2022 – Present" onChange={(duration) => setExp({ ...exp, duration })} /></div>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.13em] text-zinc-500">Highlights, one per line</span>
                    <textarea value={exp.bullets} onChange={(event) => setExp({ ...exp, bullets: event.target.value })} rows={4} className="builder-input w-full resize-none" placeholder="Led redesign that improved activation by 24%..." />
                  </label>
                  <AddButton label="Add experience" onClick={() => {
                    if (!exp.title || !exp.company) return;
                    addExperience({ ...exp, bullets: exp.bullets.split("\n").filter(Boolean) });
                    setExp({ company: "", title: "", duration: "", bullets: "" });
                  }} />
                </div>
              </EditorSection>
            )}

            {activeSection === "education" && (
              <EditorSection title="Add your education" description="Include relevant education, training, or certifications.">
                <div className="space-y-3">
                  {resumeForm.education.map((item, index) => (
                    <SavedCard key={`${item.institution}-${index}`} title={item.degree} subtitle={`${item.institution} · ${item.year}`} onDelete={() => removeEducation(index)} />
                  ))}
                </div>
                <div className="builder-add-card">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="School or institution" value={edu.institution} placeholder="University of California" onChange={(institution) => setEdu({ ...edu, institution })} />
                    <Field label="Degree or certificate" value={edu.degree} placeholder="B.S. Computer Science" onChange={(degree) => setEdu({ ...edu, degree })} />
                    <Field label="Year" value={edu.year} placeholder="2021" onChange={(year) => setEdu({ ...edu, year })} />
                    <Field label="GPA (optional)" value={edu.gpa} placeholder="3.8 / 4.0" onChange={(gpa) => setEdu({ ...edu, gpa })} />
                  </div>
                  <AddButton label="Add education" onClick={() => {
                    if (!edu.institution || !edu.degree) return;
                    addEducation({ ...edu, gpa: edu.gpa || undefined });
                    setEdu({ institution: "", degree: "", year: "", gpa: "" });
                  }} />
                </div>
              </EditorSection>
            )}

            {activeSection === "skills" && (
              <EditorSection title="Highlight what you do best" description="Add the skills and projects most relevant to your next role.">
                <div>
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.13em] text-zinc-500">Skills</span>
                  <div className="flex gap-2"><input value={skillInput} onChange={(event) => setSkillInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addSkill()} className="builder-input min-w-0 flex-1" placeholder="React, Research, Leadership..." /><button onClick={addSkill} className="builder-square-add"><Plus className="h-4 w-4" /></button></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {resumeForm.skills.technical.map((skill) => <button key={skill} onClick={() => setSkills("technical", resumeForm.skills.technical.filter((item) => item !== skill))} className="builder-skill">{skill}<X className="h-3 w-3" /></button>)}
                  </div>
                </div>
                <div className="builder-add-card">
                  <p className="mb-4 text-sm font-bold text-white">Add a project</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Project name" value={project.name} placeholder="Analytics dashboard" onChange={(name) => setProject({ ...project, name })} />
                    <Field label="Link (optional)" value={project.link} placeholder="project-link.com" onChange={(link) => setProject({ ...project, link })} />
                  </div>
                  <div className="mt-4"><Field label="Tools used" value={project.tech} placeholder="Next.js, TypeScript, PostgreSQL" onChange={(tech) => setProject({ ...project, tech })} /></div>
                  <label className="mt-4 block"><span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.13em] text-zinc-500">Description</span><textarea value={project.description} onChange={(event) => setProject({ ...project, description: event.target.value })} rows={3} className="builder-input w-full resize-none" /></label>
                  <AddButton label="Add project" onClick={() => {
                    if (!project.name) return;
                    addProject({ name: project.name, description: project.description, link: project.link || undefined, tech_stack: project.tech.split(",").map((item) => item.trim()).filter(Boolean) });
                    setProject({ name: "", description: "", tech: "", link: "" });
                  }} />
                </div>
                <div className="space-y-3">{resumeForm.projects.map((item, index) => <SavedCard key={`${item.name}-${index}`} title={item.name} subtitle={item.tech_stack.join(" · ")} onDelete={() => removeProject(index)} />)}</div>
              </EditorSection>
            )}

            {activeSection === "design" && (
              <EditorSection title="Make it yours" description="Choose a clean template, accent color, and optionally tailor it to a role.">
                <div>
                  <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.13em] text-zinc-500">Template</span>
                  <div className="grid grid-cols-2 gap-3">
                    {templates.map((item) => <button key={item.id} onClick={() => setSelectedTemplate(item.id)} className={`builder-template-card ${selectedTemplate === item.id ? "selected" : ""}`}><LayoutTemplate className="h-5 w-5" /><span>{item.label}</span>{selectedTemplate === item.id && <Check className="ml-auto h-4 w-4 text-indigo-400" />}</button>)}
                  </div>
                </div>
                <div>
                  <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.13em] text-zinc-500">Accent color</span>
                  <div className="flex flex-wrap gap-3">{Object.entries(themes).map(([name, colors]) => <button key={name} onClick={() => setSelectedTheme(name)} aria-label={name} className={`builder-color ${selectedTheme === name ? "selected" : ""}`} style={{ backgroundColor: colors.accent }} />)}</div>
                </div>
                <label className="block"><span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.13em] text-zinc-500">Target job description (optional)</span><textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} rows={7} className="builder-input w-full resize-none" placeholder="Paste the job description to tailor keywords and phrasing..." /></label>
              </EditorSection>
            )}

            <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-5">
              <span className="text-[11px] text-zinc-600">Changes are saved in this browser</span>
              {activeSection !== "design" ? <button onClick={nextSection} className="builder-primary-button">Continue <ArrowRight className="h-4 w-4" /></button> : <button onClick={submitResume} disabled={loading} className="builder-primary-button"><Sparkles className="h-4 w-4" /> Generate resume</button>}
            </div>
          </div>
        </main>

        <aside className={`${mobilePreview ? "flex" : "hidden"} builder-preview-panel lg:flex`}>
          <div className="builder-preview-toolbar">
            <div><p className="text-xs font-bold text-white">Live preview</p><p className="text-[10px] text-zinc-500">A4 · {templates.find((item) => item.id === selectedTemplate)?.label}</p></div>
            <button onClick={submitResume} className="builder-icon-button" title="Generate and download"><Download className="h-4 w-4" /></button>
          </div>
          <ResumePreview form={resumeForm} theme={theme} font={templateFont} />
        </aside>
      </div>

      {showImport && (
        <div className="builder-modal-backdrop">
          <div className="builder-modal">
            <button onClick={() => setShowImport(false)} className="absolute right-4 top-4 text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300"><Upload className="h-5 w-5" /></div>
            <h2 className="text-xl font-extrabold text-white">Import an existing resume</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">We’ll extract the details so you can refine them here.</p>
            <div className="mt-6 flex rounded-xl bg-black/30 p-1">
              {(["file", "text"] as const).map((tab) => <button key={tab} onClick={() => setImportTab(tab)} className={`flex-1 rounded-lg py-2 text-xs font-bold ${importTab === tab ? "bg-white/10 text-white" : "text-zinc-500"}`}>{tab === "file" ? "Upload PDF" : "Paste text"}</button>)}
            </div>
            {importTab === "file" ? <label className="mt-4 flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-white/15 p-8 text-center hover:border-indigo-400/50"><Upload className="mb-3 h-6 w-6 text-zinc-500" /><span className="text-xs font-bold text-white">{uploadFile?.name || "Choose a PDF"}</span><span className="mt-1 text-[10px] text-zinc-600">PDF up to 5MB</span><input type="file" accept=".pdf" className="hidden" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} /></label> : <textarea value={pastedText} onChange={(event) => setPastedText(event.target.value)} rows={9} className="builder-input mt-4 w-full resize-none" placeholder="Paste your resume text here..." />}
            <button onClick={handleParseImport} disabled={parsing} className="builder-primary-button mt-5 w-full justify-center">{parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Import and continue</button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditorSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section><div className="mb-8"><h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-zinc-500">{description}</p></div><div className="space-y-7">{children}</div></section>;
}

function SavedCard({ title, subtitle, onDelete }: { title: string; subtitle: string; onDelete: () => void }) {
  return <div className="builder-saved-card"><div><p className="text-sm font-bold text-white">{title}</p><p className="mt-1 text-xs text-zinc-500">{subtitle}</p></div><button onClick={onDelete} className="p-2 text-zinc-600 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button></div>;
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="mt-5 flex items-center gap-2 text-xs font-bold text-indigo-300 hover:text-indigo-200"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/15"><Plus className="h-3.5 w-3.5" /></span>{label}</button>;
}

function ResumePreview({ form, theme, font }: { form: ResumeInput; theme: { accent: string; pale: string }; font: string }) {
  return (
    <div className={`resume-paper ${font}`}>
      <header className="border-b-2 pb-5" style={{ borderColor: theme.accent }}>
        <h1 className="text-[25px] font-bold tracking-tight" style={{ color: theme.accent }}>{form.name || "Your Name"}</h1>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[7px] text-zinc-500">
          {form.email && <span className="flex items-center gap-1"><Mail className="h-2 w-2" />{form.email}</span>}
          {form.phone && <span className="flex items-center gap-1"><Phone className="h-2 w-2" />{form.phone}</span>}
          {form.location && <span className="flex items-center gap-1"><MapPin className="h-2 w-2" />{form.location}</span>}
          {form.linkedin && <span>{form.linkedin}</span>}{form.github && <span>{form.github}</span>}
        </div>
      </header>
      {form.summary && <ResumeBlock title="Profile" color={theme.accent}><p>{form.summary}</p></ResumeBlock>}
      {form.experience.length > 0 && <ResumeBlock title="Experience" color={theme.accent}>{form.experience.map((item, index) => <div key={index} className="mb-3"><div className="flex justify-between gap-4"><strong className="text-zinc-800">{item.title} · {item.company}</strong><span className="shrink-0 text-zinc-400">{item.duration}</span></div><ul className="mt-1 list-disc space-y-0.5 pl-3">{item.bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}</ul></div>)}</ResumeBlock>}
      {form.projects.length > 0 && <ResumeBlock title="Projects" color={theme.accent}>{form.projects.map((item, index) => <div key={index} className="mb-2"><strong className="text-zinc-800">{item.name}</strong><span className="ml-2 text-zinc-400">{item.tech_stack.join(" · ")}</span><p>{item.description}</p></div>)}</ResumeBlock>}
      {form.skills.technical.length > 0 && <ResumeBlock title="Skills" color={theme.accent}><p>{form.skills.technical.join("  ·  ")}</p></ResumeBlock>}
      {form.education.length > 0 && <ResumeBlock title="Education" color={theme.accent}>{form.education.map((item, index) => <div key={index} className="mb-1 flex justify-between"><span><strong className="text-zinc-800">{item.degree}</strong> · {item.institution}</span><span className="text-zinc-400">{item.year}</span></div>)}</ResumeBlock>}
      {!form.summary && !form.experience.length && <div className="mt-12 rounded-lg border border-dashed border-zinc-200 p-8 text-center text-[9px] text-zinc-400">Your resume will take shape here as you add details.</div>}
    </div>
  );
}

function ResumeBlock({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return <section className="mt-5 text-[8px] leading-[1.55] text-zinc-600"><h2 className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.18em]" style={{ color }}>{title}</h2>{children}</section>;
}
