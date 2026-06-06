# ShipOrDie — App Flow Document

> **Version:** 2.0  
> **Author:** Soumya Chakraborty  
> **Updated:** Resume Builder flows added  

---

## 1. High-Level User Journeys

### Journey 1: New User (Free Tier)

```
Landing Page
    │
    ▼
Sign Up (Google / GitHub OAuth)
    │
    ▼
Onboarding Screen
  "Here are 3 sample ideas to get you started"
    │
    ▼
Dashboard (Free)
  - 3 credits shown
  - Sample idea cards visible
    │
    ▼
Click "Generate Ideas"
    │
    ▼
[Credit deducted: 3 → 2]
    │
    ▼
Pipeline Running Screen
  (Progress: Scraping → Synthesizing → Generating → Monetizing)
    │
    ▼
Results Page
  - 5–8 idea cards displayed
  - Each card expandable
    │
    ▼
View Idea Detail → See Monetization Report
    │
    ├─► Save to Vault (free)
    │
    └─► Export PDF → Upgrade Prompt (Pro only)
```

---

### Journey 2: Upgrade Flow

```
User on Free Tier
    │
    ▼
Hits credit limit OR clicks locked feature (PDF export)
    │
    ▼
Upgrade Modal
  "You've used all 3 free credits"
  [Upgrade to Pro — ₹499/month]
    │
    ▼
Razorpay Checkout
    │
    ├── Payment Success
    │       │
    │       ▼
    │   Dashboard (Pro badge, unlimited credits)
    │
    └── Payment Failed
            │
            ▼
        Error screen → Retry button
```

---

### Journey 3: Returning Pro User

```
Login
    │
    ▼
Dashboard
  - Idea history (last 30 runs)
  - Saved vault (bookmarked ideas)
  - Credits: Unlimited
    │
    ▼
Generate Ideas (no credit check)
    │
    ▼
Pipeline → Results
    │
    ▼
Filter Ideas by:
  - Category (AI, Productivity, Dev Tools, E-commerce)
  - Build time (< 2 weeks, < 4 weeks, < 8 weeks)
  - Niche score (> 7)
    │
    ▼
Export idea as PDF → Download / Share
```

---

### Journey 4: Resume Builder — First Time

```
Dashboard
    │
    ▼
Click "Build Resume" in sidebar
    │
    ▼
Resume Builder Landing
  - Sample resume preview (3 templates shown)
  - "Create Resume" CTA
    │
    ▼
Step 1 — Personal Info
  Name, Email, Phone, Location, LinkedIn, GitHub/Portfolio
    │
    ▼
Step 2 — Work Experience
  Company, Title, Duration, Bullet points (or free-form description)
  "Add another role" button
    │
    ▼
Step 3 — Education
  Institution, Degree, Year, GPA (optional)
    │
    ▼
Step 4 — Skills & Projects
  Technical skills (tag input), Projects (name + description + stack)
    │
    ▼
Step 5 — Job Description (optional)
  Paste JD → "Tailor my resume to this role"
  Skip option available
    │
    ▼
Step 6 — Template & Style
  Pick template (Classic ATS / Modern Split / Tech Minimal / Creative Edge)
  Pick color theme (5 options)
    │
    ▼
[Resume credit deducted: 1 → 0]
    │
    ▼
Pipeline Running Screen
  (Progress: Drafting → Humanizing → Checking AI Score → ATS Optimizing)
    │
    ▼
Resume Preview Screen
  - Full resume preview
  - AI Score badge: "AI Detection: 7%" ✅
  - ATS Score badge: "ATS Compatible: 91%" ✅
  - Download PDF button
  - "Regenerate" / "Edit Details" options
```

---

### Journey 5: Tailor Existing Resume for New Job

```
Resume History (/dashboard/resume)
    │
    ▼
Select saved resume → "Tailor for New Job"
    │
    ▼
Paste new Job Description
    │
    ▼
[1 resume credit deducted]
    │
    ▼
Pipeline runs (faster — skips form steps, reuses existing data)
    │
    ▼
New resume variant saved (linked to parent resume)
Side-by-side diff available (Pro)
```



### 2.1 Landing Page (`/`)

**Purpose:** Convert visitors to signups

**Sections:**
- Hero: Headline + CTA ("Generate your first idea free")
- Demo: Animated idea card reveal (3 sample cards)
- How it works: 3-step visual (Scrape → Synthesize → Generate)
- Pricing: Free vs Pro comparison table
- Footer: Links, legal

**Primary CTA:** "Start Free → Sign up with Google"

---

### 2.2 Auth Flow (`/auth/signin`)

- OAuth provider buttons (Google, GitHub)
- On success → redirect to `/dashboard`
- New user → brief onboarding tooltip tour (3 steps)
- Returning user → direct to dashboard

---

### 2.3 Dashboard (`/dashboard`)

**Layout:** Sidebar nav + main content area

**Sidebar:**
- Generate Ideas (CTA button)
- My Ideas (history)
- Saved Vault
- Settings
- Upgrade (if free tier)

**Main Area (default):**
- Credits remaining widget
- Recent idea runs (last 3, card preview)
- "Generate New Ideas" large CTA button

---

### 2.4 Generation Screen (`/dashboard/generate`)

**Step 1 — Pre-Generation (instant):**
- Single button: "Generate Ideas"
- Shows credit cost: "-1 credit"
- Estimated time: "~60–90 seconds"

**Step 2 — Pipeline Running:**
```
[●] Scraping market signals...          ✓ Done
[●] Synthesizing opportunity clusters... ⟳ Running
[ ] Generating idea cards...            ○ Pending
[ ] Analyzing monetization...           ○ Pending
```
- WebSocket connection to job status endpoint
- Auto-redirects to results when job status = "done"

**Step 3 — Error State:**
- If pipeline fails: "Something went wrong. Your credit was not charged."
- Retry button

---

### 2.5 Results Page (`/dashboard/ideas/:job_id`)

**Layout:** Card grid (2 columns desktop, 1 column mobile)

**Each Idea Card (collapsed):**
```
┌─────────────────────────────────────────┐
│ 🎯 Niche Score: 8.2 / 10               │
│                                          │
│ Problem: [1-line problem statement]      │
│ For: [target user]                       │
│                                          │
│ Stack: Next.js · FastAPI · PostgreSQL    │
│ Build time: ~3 weeks                     │
│                                          │
│ [View Full Idea ▼]   [Save 🔖]          │
└─────────────────────────────────────────┘
```

**Each Idea Card (expanded):**
- Full solution description
- Monetization section:
  - TAM estimate
  - Pricing model recommendation
  - Suggested price (USD + INR)
  - Competitors (if any)
  - WTP signal badge (Strong / Moderate / Weak)
  - Distribution channels list
- Export PDF button (Pro only)
- "Regenerate variation" button

**Filters (top of page):**
- Category dropdown
- Build time slider
- Niche score minimum
- Sort: by niche score / newest / WTP signal

---

### 2.6 Saved Vault (`/dashboard/vault`)

- Grid of saved idea cards
- Personal notes field per idea (editable inline)
- Delete from vault option
- Bulk export (Pro)

---

### 2.7 Settings (`/dashboard/settings`)

**Sections:**
- Profile: Name, avatar, email
- Subscription: Plan details, next billing date, cancel button
- Notifications: Email digest preferences (daily/weekly/off)
- Danger Zone: Delete account

### 2.8 Resume Builder (`/dashboard/resume/new`)

**Multi-step form (6 steps, progress bar at top):**

Step 1 — Personal Info: Name, email, phone, location, LinkedIn, GitHub  
Step 2 — Experience: Add roles (company, title, dates, description/bullets)  
Step 3 — Education: Degree, institution, year, GPA optional  
Step 4 — Skills & Projects: Tag-based skill input + project cards  
Step 5 — Job Description: Optional JD paste with "Skip" option  
Step 6 — Template & Style: Template picker + color theme  

**Navigation:** Back/Next buttons, progress saved in Zustand (survives refresh)

---

### 2.9 Resume Pipeline Screen (`/dashboard/resume/generating`)

```
[●] Drafting your resume...              ✓ Done
[●] Making it sound human...             ⟳ Running
[ ] Checking AI detection score...       ○ Pending
[ ] Optimizing for ATS...               ○ Pending
```

- WebSocket-connected live progress
- Estimated time: "~45 seconds"
- Cannot navigate away (modal warning if attempted)

---

### 2.10 Resume Preview (`/dashboard/resume/:id`)

**Layout:** Split screen — rendered preview (left) + score panel (right)

**Score Panel:**
```
┌─────────────────────────────┐
│  AI Detection Score          │
│  ████████░░  7%  ✅ Safe    │
│                              │
│  ATS Compatibility           │
│  █████████░  91% ✅ Strong  │
│                              │
│  Template: Classic ATS       │
│  Color: Navy Blue            │
└─────────────────────────────┘
```

**Action buttons:**
- Download PDF (all tiers)
- Download DOCX (Pro)
- Copy as Plain Text
- Tailor for New Job
- Edit Details (re-runs pipeline)
- Share Link (Pro)

---

### 2.11 Resume History (`/dashboard/resume`)

- Grid of resume cards
- Each card shows: title, template, AI score, ATS score, date, download button
- "Tailor" quick action per card
- Version tree view for tailored variants (Pro)

---



```
                    ┌──────────┐
                    │  IDLE    │
                    └────┬─────┘
                         │ User triggers generation
                         ▼
                    ┌──────────┐
                    │ SCRAPING │ ← ScraperAgent running
                    └────┬─────┘
                         │ Signals collected
                         ▼
                   ┌───────────────┐
                   │ SYNTHESIZING  │ ← RAG Agent clustering
                   └──────┬────────┘
                          │ Clusters ready
                          ▼
                   ┌───────────────┐
                   │  GENERATING   │ ← IdeaGen Agent
                   └──────┬────────┘
                          │ Idea cards created
                          ▼
                   ┌────────────────┐
                   │  MONETIZING    │ ← VC Agent evaluating
                   └──────┬─────────┘
                          │ Reports attached
                          ▼
                   ┌────────────────┐
                   │     DONE       │ ← Results visible to user
                   └────────────────┘

   At any state → FAILED (on exception, credit not deducted)
```

---

## 4. Resume Pipeline State Machine

```
                    ┌──────────┐
                    │  IDLE    │
                    └────┬─────┘
                         │ User submits form
                         ▼
                    ┌──────────┐
                    │ DRAFTING │ ← Pass 1: Draft Generation
                    └────┬─────┘
                         │ Draft ready
                         ▼
                  ┌─────────────┐
                  │ HUMANIZING  │ ← Pass 2: Humanization
                  └──────┬──────┘
                         │ Humanized
                         ▼
                  ┌─────────────┐
                  │  SCORING    │ ← Pass 3: AI Score Check
                  └──────┬──────┘
                         │
              ┌──────────┴──────────┐
              │ score > 0.30        │ score ≤ 0.30
              ▼                     ▼
      ┌──────────────┐     ┌──────────────────┐
      │ RE-HUMANIZE  │     │  ATS OPTIMIZING  │ ← Pass 4
      │ (max 3x)     │     └────────┬─────────┘
      └──────┬───────┘              │
             │                      ▼
             └──────────►  ┌──────────────┐
                           │     DONE     │
                           └──────────────┘

   At any state → FAILED (on exception, credit restored)
```

---



### 4.1 Credit Guard

Every call to `POST /api/ideas/generate`:
1. Check `user.credits_remaining > 0` OR `user.tier === 'pro'`
2. If not → return 402 with upgrade prompt payload
3. If yes → deduct credit atomically in DB transaction BEFORE starting job
4. If job fails → restore credit (compensating transaction)

### 4.2 Real-Time Progress

- Frontend opens WebSocket to `/ws/jobs/:job_id` on generation start
- Backend publishes progress events to Redis pub/sub channel `job:{id}`
- FastAPI WebSocket handler subscribes and streams to client
- On disconnect → client polls `GET /api/jobs/:id` every 3 seconds as fallback

### 4.3 PDF Export

1. Client requests `GET /api/ideas/:id/export`
2. Backend generates PDF server-side (using `reportlab` or `weasyprint`)
3. Uploads to Cloudflare R2 with 1-hour presigned URL
4. Returns URL to client → browser triggers download

---

## 5. Error States & Edge Cases

| Scenario | Handling |
|---|---|
| Scraper returns 0 signals | Retry once; if still 0 → use cached signals from last run |
| LLM returns malformed JSON | Retry with stricter prompt; max 3 retries |
| User closes tab during pipeline | Job continues server-side; results available when user returns |
| Duplicate idea across runs | Dedup at DB level using `cluster_id` similarity check |
| Razorpay webhook delayed | Subscription activation via polling + webhook (belt-and-suspenders) |
| ChromaDB collection empty (first run) | Bootstrap with 50 seed signals before first real scrape |

---

## 7. Navigation Map

```
/                              → Landing Page
/auth/signin                   → Auth Screen
/dashboard                     → Main Dashboard
/dashboard/generate            → Idea Pipeline Trigger + Status
/dashboard/ideas/:job_id       → Idea Results Page
/dashboard/ideas/:idea_id      → Single Idea Detail
/dashboard/vault               → Saved Ideas
/dashboard/resume              → Resume History
/dashboard/resume/new          → Resume Builder Form (multi-step)
/dashboard/resume/generating   → Resume Pipeline Status
/dashboard/resume/:id          → Resume Preview + Scores
/dashboard/settings            → User Settings
/dashboard/billing             → Subscription Management
/r/:username                   → Public resume share page (Pro only)
/api/*                         → REST API (internal)
/ws/*                          → WebSocket endpoints
```
