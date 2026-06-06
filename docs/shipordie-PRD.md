# ShipOrDie — Product Requirements Document (PRD)

> **Version:** 2.0  
> **Author:** Soumya Chakraborty  
> **Project:** ShipOrDie  
> **Status:** Draft — Updated with Resume Builder Module  

---

## 1. Product Overview

### 1.1 What is ShipOrDie?

ShipOrDie is a multi-agent platform with two core modules:

**Module 1 — Idea Engine:** Automates the discovery, validation, and monetization planning of niche software business ideas. It takes real-time market signals (trends, Reddit discussions, ProductHunt launches) and synthesizes them through a pipeline of AI agents to output actionable, investment-grade Micro-SaaS ideas with full business context.

**Module 2 — Resume Builder:** An AI-powered resume generation tool that produces human-written resumes undetectable by AI detectors (GPTZero, Originality.ai, Copyleaks). Users input their details, select a template, and receive an ATS-optimized, job-description-tailored resume that reads as naturally human-written.

### 1.2 Problem Statement

**Problem 1 — Idea Discovery:**
Indie developers and solo founders spend weeks manually:
- Browsing Reddit, Twitter/X, and ProductHunt for pain points
- Validating whether a niche has paying customers
- Figuring out pricing, positioning, and monetization strategy
- Estimating competition and market size

ShipOrDie compresses this entire workflow into minutes.

**Problem 2 — Resume Generation:**
Job seekers face two competing problems:
- AI-written resumes are flagged by GPTZero, Originality.ai, and company ATS filters
- Manually writing resumes is time-consuming and most people don't know how to tailor them per job description

ShipOrDie Resume Builder generates resumes that are AI-assisted but human-sounding — optimized for ATS systems and undetectable by AI content detectors.

### 1.3 Target Users

| Segment | Module | Description |
|---|---|---|
| Solo founders / indie hackers | Idea Engine | Want to ship fast, need validated ideas |
| Developers exploring SaaS | Idea Engine | First-time builders unsure what to build |
| Agency owners | Idea Engine | Looking to productize services |
| Student entrepreneurs | Both | Limited time, need direction |
| Fresh graduates / job seekers | Resume Builder | Need ATS-ready, human-sounding resumes |
| Working professionals | Resume Builder | Switching jobs, need tailored resumes fast |
| Freelancers | Resume Builder | Need quick polished resumes per client pitch |

### 1.4 Value Proposition

> **Idea Engine:** "From market noise to a launch-ready Micro-SaaS idea in under 5 minutes — with monetization strategy included."

> **Resume Builder:** "A resume that gets past the ATS, past the AI detector, and into the hiring manager's hands."

---

## 2. Goals & Success Metrics

### 2.1 Business Goals

- Launch Idea Engine MVP within 6 weeks
- Launch Resume Builder MVP within 8 weeks (2 weeks after Idea Engine)
- Reach 100 paying users within 3 months of launch
- Achieve ₹75,000 MRR by month 4 (both modules combined)

### 2.2 Product Goals

- Generate 5–10 validated Micro-SaaS ideas per run
- Each idea includes: problem, target user, stack suggestion, pricing model, competitors, and monetization plan
- Resume generation end-to-end in under 60 seconds
- AI detection score < 10% on GPTZero and Originality.ai for all generated resumes
- Response time under 90 seconds per idea pipeline run

### 2.3 Key Metrics

| Metric | Target |
|---|---|
| Idea generation latency | < 90 seconds |
| Resume generation latency | < 60 seconds |
| AI detection score (GPTZero) | < 10% |
| AI detection score (Originality.ai) | < 15% |
| ATS compatibility score | > 85% |
| User satisfaction (CSAT) | > 4.2 / 5 |
| Idea uniqueness score | > 80% (no duplicate niches) |
| Free → Paid conversion | > 8% |
| Monthly Churn | < 5% |

---

## 3. Features

### 3.1 Core Features (MVP)

#### F1 — Trend Scraper Agent
- Scrapes Google Trends, Reddit (r/SaaS, r/entrepreneur, r/webdev), ProductHunt, and Hacker News
- Extracts pain points, upvoted complaints, and feature requests
- Runs on a 6-hour refresh cycle

#### F2 — Synthesizer RAG Agent
- Uses ChromaDB / Pinecone as vector store
- Embeds scraped content and retrieves semantically similar pain points
- Groups related signals into "opportunity clusters"
- Deduplicates ideas using cosine similarity threshold (> 0.85 = duplicate)

#### F3 — Idea Generation Agent
- Takes opportunity clusters as input
- Generates structured Micro-SaaS idea cards using LLM
- Each card includes:
  - Problem statement
  - Target user persona
  - Proposed solution (1–2 sentences)
  - Tech stack suggestion
  - Estimated build time
  - Niche score (1–10)

#### F4 — VC / Monetization Agent
- Evaluates each idea card for:
  - Market size (TAM/SAM/SOM estimate)
  - Pricing model (freemium, subscription, one-time)
  - Willingness to pay signal (based on scraped data)
  - Competitive landscape summary
  - Monetization recommendation

#### F5 — User Dashboard
- Browse generated ideas (card grid view)
- Filter by niche, build time, pricing model
- Save / bookmark ideas
- Export idea as PDF or Notion page
- "Regenerate" button for fresh variations

#### F6 — Credits & Subscription System
- Free tier: 3 idea generations/month + 1 resume generation/month
- Pro tier: ₹499/month — unlimited idea generations, 10 resumes/month, PDF export, saved history
- Team tier: ₹1499/month — up to 5 seats, shared workspace, unlimited resumes

---

### 3.2 Resume Builder Features (MVP)

#### F7 — Resume Input Form
- Multi-step form: Personal Info → Work Experience → Education → Skills → Projects
- Job Description paste field (optional) — enables JD-tailored output
- "Import from LinkedIn" button (Phase 2)
- All fields optional except name and at least one experience/project entry

#### F8 — Anti-AI-Detection Engine
Core of the Resume Builder. Uses a multi-pass rewriting pipeline:

**Pass 1 — Draft Generation**
- LLM generates a raw resume draft from user inputs
- Structured, complete, professional

**Pass 2 — Humanization Layer**
- Sentence variety injection (short punchy sentences mixed with longer ones)
- Active voice enforcement with human irregularities
- Removes LLM-signature patterns: avoid "leverage", "utilize", "spearhead", "seamlessly", "robust", "cutting-edge"
- Injects subtle imperfections: natural word choices, varied punctuation rhythm, occasional informal-but-professional phrasing
- Replaces uniform bullet length with varied lengths (2–3 words to 15–20 words)

**Pass 3 — AI Detection Score Check**
- Runs output through internal perplexity + burstiness scoring model
- If score > threshold → re-runs Pass 2 with higher randomization
- Max 3 re-runs before returning best result

**Pass 4 — ATS Optimization**
- Keyword injection from job description (if provided)
- Section heading normalization (Experience, Education, Skills — standard ATS labels)
- Removes special characters, tables, columns that break ATS parsers

#### F9 — Template System
- 4 templates at launch:
  - **Classic ATS** — Single column, clean, maximum ATS compatibility
  - **Modern Split** — Two-column with skills sidebar, visually appealing
  - **Tech Minimal** — Developer-focused, project-heavy layout
  - **Creative Edge** — For designers/marketers, subtle color accents
- Template preview before generation
- Color theme selector (5 options per template)

#### F10 — Resume Export
- Export as PDF (all tiers)
- Export as DOCX (Pro only)
- Copy as plain text (all tiers — for quick paste into application forms)
- Shareable link (Pro only — hosted resume page at `shipordie.ai/r/username`)

#### F11 — Resume History & Versioning
- Save up to 3 resume versions (free) / unlimited (pro)
- "Tailor for new job" — takes existing resume + new JD → generates tailored version
- Side-by-side diff view between versions (Pro)

### 3.3 Post-MVP Features (Phase 2)

- **Validation Agent** — Auto-generates a landing page and tracks waitlist signups to validate demand before building
- **Competitor Deep-Dive** — Full competitor analysis with traffic estimates (SimilarWeb/Ahrefs integration)
- **Builder Roadmap Generator** — Converts idea card into a 4-week build plan with milestones
- **Slack / Telegram notifications** — Daily idea digest delivery
- **LinkedIn Import** — Auto-fill resume form from LinkedIn profile URL
- **Cover Letter Generator** — Anti-detection cover letter matched to resume + JD
- **AI Score Badge** — Show user their resume's AI detection score before download

---

## 4. User Stories

### Onboarding
- As a new user, I want to sign up with Google/GitHub so I can start generating ideas immediately without friction.
- As a free user, I want to see 3 sample ideas immediately on signup so I understand the product's value before paying.
- As a new user, I want to see a sample resume output before entering my details so I trust the quality.

### Idea Engine Flow
- As a user, I want to click "Generate Ideas" and receive 5–10 validated Micro-SaaS ideas in under 2 minutes.
- As a user, I want to filter ideas by category (developer tools, productivity, AI, e-commerce) so I can focus on my domain.
- As a user, I want to see monetization strategy for each idea so I know how to make money from it.
- As a user, I want to export an idea as a PDF so I can share it with my co-founder or team.

### Resume Builder Flow
- As a user, I want to fill in my experience and skills in a simple form and get a complete resume in under 60 seconds.
- As a user, I want to paste a job description so my resume is automatically tailored to that role.
- As a user, I want to choose from multiple resume templates so I can match the style to the industry I'm applying to.
- As a user, I want to see my resume's AI detection score before downloading so I know it's safe to submit.
- As a user, I want to export my resume as a PDF so I can attach it to job applications directly.
- As a Pro user, I want to create multiple resume versions for different job roles.
- As a Pro user, I want to export as DOCX so I can make small manual edits in Word before submitting.

### Pro Features
- As a Pro user, I want unlimited idea generations so I can run the pipeline whenever I need inspiration.
- As a Pro user, I want to save ideas to a personal vault so I can revisit them later.

---

## 5. Out of Scope (MVP)

- Mobile app (web-only for MVP)
- Real-time collaboration / commenting on ideas
- Custom agent configuration by users
- Direct integration with code scaffolding tools
- Paid ads or affiliate network integrations

---

## 6. Constraints & Assumptions

- LLM backend: Ollama (local, free tier) with fallback to Groq API
- Vector DB: ChromaDB (self-hosted) or Pinecone free tier
- Scraping within rate limits and robots.txt compliance
- All AI-generated content marked as "AI-assisted" in UI
- Payments via Razorpay (India-first) with Stripe as secondary

---

## 7. Timeline

| Phase | Duration | Deliverable |
|---|---|---|
| Phase 0 — Setup | Week 1 | Repo, infra, auth, DB schema (both modules) |
| Phase 1 — Idea Engine Agents | Week 2–3 | All 4 idea agents functional end-to-end |
| Phase 2 — Resume Builder Core | Week 4–5 | Anti-detection engine + 4 templates + PDF export |
| Phase 3 — Dashboard + Credits | Week 6 | Unified frontend, credits system, both modules |
| Phase 4 — Launch | Week 7–8 | Beta launch, payments live, AI score badge |

---

## 8. Stakeholders

| Role | Name |
|---|---|
| Founder / Lead Dev | Soumya Chakraborty |
| AI Agent Design | Soumya Chakraborty |
| Target Reviewer | Indie Hacker community, CodeNEST members |
