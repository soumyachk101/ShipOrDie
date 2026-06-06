import axios from 'axios';

const BACKEND_URL = 'http://localhost:8000';

const axiosClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
});

// Request interceptor to append JWT token
axiosClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Client-side mock responses for offline execution
const MOCK_IDEAS = [
  {
    id: "mock-idea-1",
    job_id: "mock-job-1",
    problem: "Writing cold emails and landing page hooks for indie products takes hours and feels artificial.",
    target_user: "Solo SaaS Founders & Bootstrappers",
    solution: "An AI-powered copywriting tool that writes human-sounding copy specifically for technical and developer-focused products.",
    stack: ["Next.js", "FastAPI", "OpenAI API", "Tailwind CSS"],
    build_time_weeks: 2,
    niche_score: 8.5,
    is_saved: false,
    created_at: new Date().toISOString(),
    monetization_report: {
      tam_estimate: "TAM of $500M, driven by massive demand from content creators and solo entrepreneurs scaling marketing.",
      pricing_model: "subscription",
      price_range_usd: "$29 - $79 / month",
      price_range_inr: "₹2,499 - ₹6,499 / month",
      competitors: ["Jasper.ai", "Copy.ai", "WriteSonic"],
      wtp_signal: "strong",
      distribution: ["Cold Email Outreach", "SEO Marketing", "Reddit & Indie Hackers Community"],
      summary: "Strong viability. Marketing copy remains a persistent bottleneck; developers are highly willing to delegate copywriting tasks."
    }
  },
  {
    id: "mock-idea-2",
    job_id: "mock-job-1",
    problem: "Popular logging and observability platforms like Datadog are prohibitively expensive for early-stage startups.",
    target_user: "Early Stage Startups & Self-Hosted Devs",
    solution: "A self-hosted, single-binary log parser that watches local system logs or Docker containers and alerts Slack on error spikes.",
    stack: ["Go", "SQLite", "Docker", "Slack Webhooks"],
    build_time_weeks: 3,
    niche_score: 9.0,
    is_saved: true,
    created_at: new Date().toISOString(),
    monetization_report: {
      tam_estimate: "TAM of $2.5B, though the target market segment of bootstrapped developers represents a $60M addressable SOM.",
      pricing_model: "usage-based",
      price_range_usd: "$15 - $99 / month",
      price_range_inr: "₹1,299 - ₹7,999 / month",
      competitors: ["Datadog", "LogSnag", "Grafana Cloud"],
      wtp_signal: "moderate",
      distribution: ["Hacker News discussion launch", "Developer Blog tutorials", "Self-hosted deploy buttons"],
      summary: "High viability. Devs hate high Datadog bills. A lightweight, simple solution can capture market share rapidly on price alone."
    }
  },
  {
    id: "mock-idea-3",
    job_id: "mock-job-1",
    problem: "Setting up SaaS boilerplate components like stripe, auth, and database connections takes several days for every new micro-project.",
    target_user: "Hackathon Participants & Prototypers",
    solution: "An ultra-minimalist, single-command Python/FastAPI boilerplate pre-configured with SQLite, Stripe, and simple JWT authentication.",
    stack: ["FastAPI", "SQLAlchemy", "Stripe API", "Zustand"],
    build_time_weeks: 1,
    niche_score: 7.8,
    is_saved: false,
    created_at: new Date().toISOString(),
    monetization_report: {
      tam_estimate: "TAM of $45M, targeting the active community of solo developers launching 2-3 projects annually.",
      pricing_model: "one-time",
      price_range_usd: "$99 - $199 one-time",
      price_range_inr: "₹7,999 - ₹15,999 one-time",
      competitors: ["ShipFast", "SaaS Pegasus", "Gravity"],
      wtp_signal: "strong",
      distribution: ["Twitter Build in Public", "GitHub Open-Source starter", "Developer Influencer Shoutouts"],
      summary: "Very high viability for a developer audience. One-time payment models are popular among builders who dislike recurring boilerplate costs."
    }
  }
];

const MOCK_RESUMES = [
  {
    id: "mock-resume-1",
    user_id: "demo-user",
    title: "Senior Full Stack Dev",
    template: "tech_minimal",
    color_theme: "emerald",
    job_description: "Senior node/react engineer with system design skills",
    raw_input: {},
    final_resume: {
      name: "Demo Founder",
      email: "demo@shipordie.ai",
      phone: "+1 555-0199",
      location: "San Francisco, CA",
      linkedin: "linkedin.com/in/demofounder",
      github: "github.com/demofounder",
      summary: "Full stack engineer with 6+ years of experience building and scaling software products. Expert in React, Node, and AWS with a history of driving product metrics.",
      experience: [
        {
          company: "SaaSify Inc",
          title: "Senior Software Engineer",
          duration: "2022 - Present",
          bullets: [
            "Built a distributed event-driven billing dashboard that reduced client onboarding latency by 45%.",
            "Led a team of 3 developers to re-architect our legacy state management structure, improving site loading speeds by 30%.",
            "Fixed scaling issues in Postgres read replicas, handling a 4x increase in traffic during a seasonal campaign."
          ]
        }
      ],
      education: [
        {
          institution: "State University",
          degree: "B.S. in Computer Science",
          year: "2018"
        }
      ],
      skills: {
        technical: ["React", "Node.js", "PostgreSQL", "Docker", "AWS", "FastAPI"],
        soft: ["Team Leadership", "Agile Methodologies", "System Design"]
      },
      projects: [
        {
          name: "TaskFlow Manager",
          description: "Privacy-first P2P task board deployed to 15,000 active monthly developers.",
          tech_stack: ["Next.js", "WebRTC", "SQLite"]
        }
      ]
    },
    ai_score: 0.08,
    ats_score: 0.92,
    pdf_url: "#",
    docx_url: "#",
    version: 1,
    parent_id: null as string | null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let mockSavedVault = [...MOCK_IDEAS.filter(i => i.is_saved)];
let mockActiveJobs: Record<string, { status: string; currentStep: number }> = {};
let mockActiveResumeJobs: Record<string, { status: string; currentStep: number; resumeId: string }> = {};

export const api = {
  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    try {
      const response = await axiosClient.post(url, data, config);
      return response.data;
    } catch (e: any) {
      loggerWarning(url, e);
      return mockPostResponse(url, data);
    }
  },

  async get<T = any>(url: string): Promise<T> {
    try {
      const response = await axiosClient.get(url);
      return response.data;
    } catch (e: any) {
      loggerWarning(url, e);
      return mockGetResponse(url);
    }
  },

  async put<T = any>(url: string, data?: any): Promise<T> {
    try {
      const response = await axiosClient.put(url, data);
      return response.data;
    } catch (e: any) {
      loggerWarning(url, e);
      return data; // just return input on mock
    }
  },

  async delete<T = any>(url: string): Promise<T> {
    try {
      const response = await axiosClient.delete(url);
      return response.data;
    } catch (e: any) {
      loggerWarning(url, e);
      return mockDeleteResponse(url);
    }
  }
};

function loggerWarning(url: string, error: any) {
  console.warn(`[API Connection Fallback] ${url} failed. Using mock data. Details:`, error.message);
}

// Mock POST Router
function mockPostResponse(url: string, data: any): any {
  if (url === '/api/resume/parse') {
    return {
      name: "Jane Dev",
      email: "jane.dev@example.com",
      phone: "+1 (555) 0199",
      location: "Seattle, WA",
      linkedin: "linkedin.com/in/janedev",
      github: "github.com/janedev",
      summary: "Innovative Full-Stack Software Engineer with 5+ years of experience designing high-performance cloud architectures. Expert in TypeScript, React, Node.js, and automated CI/CD systems.",
      experience: [
        {
          company: "MicroSystems Corp",
          title: "Senior Software Engineer",
          duration: "2022 - Present",
          bullets: [
            "Architected a scalable event-driven transaction processor handling 10k requests per second.",
            "Mentored a cross-functional team of 6 engineers and successfully shipped the core payments API upgrade."
          ]
        },
        {
          company: "WebCraft Studio",
          title: "Full Stack Engineer",
          duration: "2019 - 2022",
          bullets: [
            "Redesigned the customer dashboard interface resulting in a 40% improvement in user session retention.",
            "Configured Dockerized deployment environments on AWS ECS reducing server bills by 20%."
          ]
        }
      ],
      education: [
        {
          institution: "University of Washington",
          degree: "B.S. in Computer Science",
          year: "2019",
          gpa: "3.9/4.0"
        }
      ],
      projects: [
        {
          name: "GitPulse Dashboard",
          description: "A real-time developer productivity analytics platform reading commits and issues.",
          tech_stack: ["Next.js", "GraphQL", "Tailwind CSS"],
          link: "github.com/janedev/gitpulse"
        }
      ],
      skills: {
        technical: ["TypeScript", "React", "Node.js", "AWS", "Docker", "GraphQL", "PostgreSQL"],
        soft: ["Team Leadership", "System Architecture Design", "Problem Solving", "Technical Writing"]
      }
    };
  }

  if (url === '/api/auth/login') {
    const mockUser = {
      id: "demo-user-id",
      email: data.email || "demo@shipordie.ai",
      name: data.name || "Demo Founder",
      avatar_url: data.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=demo",
      tier: "free",
      credits_remaining: 3,
      resume_credits_remaining: 1
    };
    return { token: "mock-jwt-token-12345", user: mockUser };
  }

  if (url === '/api/ideas/generate') {
    const newJobId = `job-ref-${Math.floor(Math.random() * 100000)}`;
    mockActiveJobs[newJobId] = { status: "scraping", currentStep: 0 };
    return {
      id: newJobId,
      user_id: "demo-user-id",
      status: "pending",
      created_at: new Date().toISOString()
    };
  }

  if (url.startsWith('/api/ideas/') && url.endsWith('/save')) {
    const ideaId = url.split('/')[3];
    const idea = MOCK_IDEAS.find(i => i.id === ideaId);
    if (idea && !mockSavedVault.find(v => v.id === ideaId)) {
      mockSavedVault.push({ ...idea, is_saved: true });
    }
    return { detail: "Saved to vault successfully." };
  }

  if (url === '/api/resume/generate') {
    const newJobId = `resume-job-ref-${Math.floor(Math.random() * 100000)}`;
    const newResumeId = `resume-ref-${Math.floor(Math.random() * 100000)}`;
    
    // Seed new mock resume matching the input data
    const input = data.raw_input || {};
    const mockCreatedResume = {
      id: newResumeId,
      user_id: "demo-user-id",
      title: data.title || "My Styled Resume",
      template: data.template || "classic_ats",
      color_theme: data.color_theme || "default",
      job_description: data.job_description || "",
      raw_input: input,
      final_resume: {
        name: input.name || "Demo Candidate",
        email: input.email || "demo@shipordie.ai",
        phone: input.phone || "",
        location: input.location || "",
        linkedin: input.linkedin || "",
        github: input.github || "",
        summary: input.summary || "Professional software engineer with a track record of implementing high-performance solutions.",
        experience: input.experience || [
          { company: "Company Inc", title: "Developer", duration: "2020 - Present", bullets: ["Implemented features", "Refined codebases"] }
        ],
        education: input.education || [],
        skills: input.skills || { technical: [], soft: [] },
        projects: input.projects || []
      },
      ai_score: 0.06,
      ats_score: 0.89,
      pdf_url: `/api/resume/${newResumeId}/export/pdf`,
      docx_url: `/api/resume/${newResumeId}/export/docx`,
      version: 1,
      parent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    MOCK_RESUMES.unshift(mockCreatedResume);
    mockActiveResumeJobs[newJobId] = { status: "drafting", currentStep: 0, resumeId: newResumeId };
    
    return {
      id: newJobId,
      user_id: "demo-user-id",
      resume_id: newResumeId,
      status: "pending",
      pass2_attempts: 0,
      created_at: new Date().toISOString()
    };
  }

  if (url.startsWith('/api/resume/') && url.endsWith('/tailor')) {
    const newJobId = `resume-job-ref-tailor-${Math.floor(Math.random() * 100000)}`;
    const originalId = url.split('/')[3];
    const parent = MOCK_RESUMES.find(r => r.id === originalId);
    
    const newResumeId = `resume-ref-tailored-${Math.floor(Math.random() * 100000)}`;
    if (parent) {
      const tailoredResume = {
        ...parent,
        id: newResumeId,
        title: `${parent.title} (Tailored)`,
        version: parent.version + 1,
        parent_id: parent.id,
        ai_score: 0.05,
        ats_score: 0.94,
        created_at: new Date().toISOString()
      };
      MOCK_RESUMES.unshift(tailoredResume);
    }
    
    mockActiveResumeJobs[newJobId] = { status: "drafting", currentStep: 0, resumeId: newResumeId };
    return {
      id: newJobId,
      user_id: "demo-user-id",
      resume_id: newResumeId,
      status: "pending",
      pass2_attempts: 0
    };
  }

  if (url === '/api/billing/upgrade-demo') {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      user.tier = 'pro';
      user.credits_remaining = 9999;
      user.resume_credits_remaining = 10;
      localStorage.setItem('user', JSON.stringify(user));
      return { detail: "Upgraded", user };
    }
    return { detail: "No user session found." };
  }

  if (url === '/api/billing/checkout') {
    return {
      checkout_url: `http://localhost:3000/dashboard?upgrade=success`,
      subscription_id: "sub_mock_12345",
      razorpay_key_id: "rzp_test_mock"
    };
  }

  return { detail: "Operation completed." };
}

// Mock GET Router
function mockGetResponse(url: string): any {
  if (url === '/api/auth/me') {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      return JSON.parse(userJson);
    }
    return {
      id: "demo-user-id",
      email: "demo@shipordie.ai",
      name: "Demo Founder",
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=demo",
      tier: "free",
      credits_remaining: 3,
      resume_credits_remaining: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  if (url.startsWith('/api/ideas/generate') || url.startsWith('/api/ideas?job_id=')) {
    return MOCK_IDEAS;
  }

  if (url === '/api/ideas') {
    return MOCK_IDEAS;
  }

  if (url.startsWith('/api/ideas/')) {
    const id = url.split('/')[3];
    return MOCK_IDEAS.find(i => i.id === id) || MOCK_IDEAS[0];
  }

  if (url === '/api/resume') {
    return MOCK_RESUMES;
  }

  if (url.startsWith('/api/resume/')) {
    const id = url.split('/')[3];
    return MOCK_RESUMES.find(r => r.id === id) || MOCK_RESUMES[0];
  }

  if (url.startsWith('/api/jobs/')) {
    const jobId = url.split('/')[3];
    
    // Check if it is an idea engine job
    if (mockActiveJobs[jobId]) {
      const job = mockActiveJobs[jobId];
      const steps = ["scraping", "synthesizing", "generating", "monetizing", "done"];
      
      // Advance step on each poll to simulate progress bar loading!
      if (job.status !== "done") {
        job.currentStep += 1;
        job.status = steps[job.currentStep] || "done";
      }
      
      return {
        type: "idea",
        id: jobId,
        status: job.status,
        ideas_count: job.status === "done" ? 3 : null,
        duration_ms: job.status === "done" ? 8500 : null,
        created_at: new Date().toISOString(),
        completed_at: job.status === "done" ? new Date().toISOString() : null
      };
    }
    
    // Check if it is a resume job
    if (mockActiveResumeJobs[jobId]) {
      const job = mockActiveResumeJobs[jobId];
      const steps = ["drafting", "humanizing", "scoring", "ats", "done"];
      
      if (job.status !== "done") {
        job.currentStep += 1;
        job.status = steps[job.currentStep] || "done";
      }
      
      return {
        type: "resume",
        id: jobId,
        resume_id: job.resumeId,
        status: job.status,
        pass2_attempts: 1,
        final_ai_score: job.status === "done" ? 0.06 : null,
        duration_ms: job.status === "done" ? 6200 : null,
        created_at: new Date().toISOString(),
        completed_at: job.status === "done" ? new Date().toISOString() : null
      };
    }
    
    return {
      type: "idea",
      id: jobId,
      status: "done",
      ideas_count: 3
    };
  }

  if (url === '/api/billing/status') {
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : { tier: 'free', credits_remaining: 3, resume_credits_remaining: 1 };
    return {
      tier: user.tier,
      credits_remaining: user.credits_remaining,
      resume_credits_remaining: user.resume_credits_remaining
    };
  }

  return [];
}

// Mock DELETE Router
function mockDeleteResponse(url: string): any {
  if (url.startsWith('/api/ideas/') && url.endsWith('/save')) {
    const ideaId = url.split('/')[3];
    mockSavedVault = mockSavedVault.filter(v => v.id !== ideaId);
    return { detail: "Removed from vault." };
  }

  if (url.startsWith('/api/resume/')) {
    return { detail: "Resume deleted." };
  }

  if (url === '/api/billing/cancel') {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      user.tier = 'free';
      user.credits_remaining = 3;
      user.resume_credits_remaining = 1;
      localStorage.setItem('user', JSON.stringify(user));
    }
    return { detail: "Subscription cancelled successfully." };
  }

  return { detail: "Deleted successfully." };
}
