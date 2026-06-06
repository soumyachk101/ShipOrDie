"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Check, FileText, MoveRight,
  Radar, ScanSearch, Sparkles, TrendingUp,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";

const subscribeToHydration = () => () => {};

const opportunities = [
  { score: 92, name: "Back-office automation for boutique agencies", source: "Reddit · 184 signals", movement: "+24%" },
  { score: 88, name: "Incident handoff for small engineering teams", source: "Hacker News · 96 signals", movement: "+18%" },
  { score: 84, name: "Client reporting for fractional marketers", source: "Product Hunt · 71 signals", movement: "+13%" },
];

export default function LandingPage() {
  const { token } = useAppStore();
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const appHref = isHydrated && token ? "/dashboard" : "/auth/signin";

  return (
    <div className="editorial-page">
      <section className="editorial-hero">
        <div className="editorial-container">
          <div className="editorial-kicker-row">
            <span>ShipOrDie / Product intelligence</span>
            <span className="hidden sm:block">Research. Decide. Ship.</span>
          </div>

          <div className="grid gap-14 border-t border-white/15 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
            <div>
              <p className="editorial-label">For independent builders and ambitious operators</p>
              <h1 className="editorial-hero-title">
                Good products start with
                <em> better evidence.</em>
              </h1>
              <p className="editorial-hero-copy">
                ShipOrDie turns scattered market conversations into useful product direction, then helps you present your work with equal clarity.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link href={appHref} className="editorial-primary">Enter workspace <ArrowRight className="h-4 w-4" /></Link>
                <a href="#products" className="editorial-text-link">See how it works <MoveRight className="h-4 w-4" /></a>
              </div>
            </div>

            <ResearchBrief />
          </div>
        </div>
      </section>

      <section className="editorial-proof">
        <div className="editorial-container grid gap-0 sm:grid-cols-3">
          <Proof value="12,840" label="public market signals reviewed" />
          <Proof value="47" label="qualified opportunities surfaced" />
          <Proof value="90+" label="target ATS compatibility score" />
        </div>
      </section>

      <section id="products" className="editorial-section">
        <div className="editorial-container">
          <div className="editorial-section-intro">
            <span className="editorial-index">01</span>
            <div>
              <p className="editorial-label">A working system, not another AI wrapper</p>
              <h2>Two focused tools for making a stronger next move.</h2>
            </div>
          </div>

          <div className="product-ledger">
            <ProductRow
              number="A"
              icon={<ScanSearch />}
              title="Opportunity research"
              copy="Find recurring customer pain across Reddit, Hacker News, and Product Hunt. Get a ranked business brief instead of a list of generic ideas."
              notes={["Source-linked evidence", "Competition and demand score", "Pricing and distribution plan"]}
              href={appHref}
            />
            <ProductRow
              number="B"
              icon={<FileText />}
              title="Resume studio"
              copy="Build role-specific resumes with measured impact, restrained design, and a live preview that stays friendly to applicant tracking systems."
              notes={["Structured content editor", "Job-description tailoring", "PDF and DOCX output"]}
              href={appHref}
            />
          </div>
        </div>
      </section>

      <section className="editorial-section editorial-section-paper">
        <div className="editorial-container">
          <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <span className="editorial-index text-stone-400">02</span>
              <h2 className="paper-heading">Designed to reduce indecision.</h2>
              <p className="mt-5 max-w-sm text-sm leading-7 text-stone-600">The workflow is intentionally short. Each step should leave you with something concrete enough to act on.</p>
            </div>
            <div className="process-list">
              <Process number="01" title="Collect the evidence" copy="We find repeated problems in places where people already complain, compare, and buy." />
              <Process number="02" title="Make the trade-offs visible" copy="Each opportunity is scored against demand, competition, complexity, and likely distribution." />
              <Process number="03" title="Leave with an artifact" copy="Export a product brief or a tailored resume that is ready for the next conversation." />
            </div>
          </div>
        </div>
      </section>

      <section className="editorial-closing">
        <div className="editorial-container">
          <p className="editorial-label">Your next useful decision</p>
          <div className="mt-5 flex flex-col justify-between gap-8 border-t border-white/15 pt-8 lg:flex-row lg:items-end">
            <h2>Less noise.<br /><em>More signal.</em></h2>
            <div className="max-w-sm">
              <p className="text-sm leading-7 text-stone-400">Start with the evidence you have. ShipOrDie will help make it useful.</p>
              <Link href={appHref} className="editorial-primary mt-6">Open ShipOrDie <ArrowUpRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ResearchBrief() {
  return (
    <div className="research-brief">
      <div className="brief-header">
        <div><span>Research brief</span><strong>Emerging opportunities / Week 23</strong></div>
        <Radar className="h-5 w-5" />
      </div>
      <div className="brief-meta">
        <span><b>12,840</b> signals reviewed</span>
        <span><b>03</b> sources</span>
        <span><b>47</b> qualified</span>
      </div>
      <div className="brief-table">
        <div className="brief-table-heading"><span>Score / opportunity</span><span>Movement</span></div>
        {opportunities.map((item) => (
          <div key={item.name} className="brief-row">
            <span className="brief-score">{item.score}</span>
            <div><strong>{item.name}</strong><small>{item.source}</small></div>
            <span className="brief-movement">{item.movement}</span>
          </div>
        ))}
      </div>
      <div className="brief-note"><Sparkles className="h-4 w-4" /><span><b>Analyst note:</b> Agency operations shows consistent willingness to pay and a reachable audience.</span></div>
    </div>
  );
}

function Proof({ value, label }: { value: string; label: string }) {
  return <div className="editorial-proof-item"><strong>{value}</strong><span>{label}</span></div>;
}

function ProductRow({ number, icon, title, copy, notes, href }: { number: string; icon: React.ReactNode; title: string; copy: string; notes: string[]; href: string }) {
  return (
    <article className="product-ledger-row">
      <div className="product-ledger-mark"><span>{number}</span>{icon}</div>
      <div><h3>{title}</h3><p>{copy}</p></div>
      <ul>{notes.map((note) => <li key={note}><Check className="h-3.5 w-3.5" />{note}</li>)}</ul>
      <Link href={href} aria-label={`Open ${title}`}><ArrowUpRight className="h-5 w-5" /></Link>
    </article>
  );
}

function Process({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <div className="process-row"><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div><TrendingUp className="h-4 w-4" /></div>;
}
