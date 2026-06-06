import { create } from 'zustand';

export interface WorkExperience {
  company: string;
  title: string;
  duration: string;
  bullets: string[];
}

export interface Education {
  institution: string;
  degree: string;
  year: string;
  gpa?: string;
}

export interface Projects {
  name: string;
  description: string;
  tech_stack: string[];
  link?: string;
}

export interface ResumeInput {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: {
    technical: string[];
    soft: string[];
  };
  projects: Projects[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  tier: string;
  credits_remaining: number;
  resume_credits_remaining: number;
}

interface AppState {
  // Auth
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  updateUserCredits: (credits: number, resumeCredits: number) => void;

  // Active Job Trackers
  activeJobId: string | null;
  activeResumeJobId: string | null;
  setActiveJobId: (id: string | null) => void;
  setActiveResumeJobId: (id: string | null) => void;

  // UI state
  isUpgradeModalOpen: boolean;
  setUpgradeModal: (isOpen: boolean) => void;

  // Resume Form Wizard
  resumeForm: ResumeInput;
  updateResumeForm: (data: Partial<ResumeInput>) => void;
  addExperience: (exp: WorkExperience) => void;
  removeExperience: (index: number) => void;
  addEducation: (edu: Education) => void;
  removeEducation: (index: number) => void;
  addProject: (proj: Projects) => void;
  removeProject: (index: number) => void;
  setSkills: (type: 'technical' | 'soft', list: string[]) => void;
  resetResumeForm: () => void;
}

const initialResumeForm: ResumeInput = {
  name: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  summary: '',
  experience: [],
  education: [],
  skills: {
    technical: [],
    soft: []
  },
  projects: []
};

export const useAppStore = create<AppState>((set) => ({
  // Auth
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null,
  
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },

  updateUserCredits: (credits, resumeCredits) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { 
        ...state.user, 
        credits_remaining: credits, 
        resume_credits_remaining: resumeCredits 
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },

  // Active Jobs
  activeJobId: null,
  activeResumeJobId: null,
  setActiveJobId: (id) => set({ activeJobId: id }),
  setActiveResumeJobId: (id) => set({ activeResumeJobId: id }),

  // UI
  isUpgradeModalOpen: false,
  setUpgradeModal: (isOpen) => set({ isUpgradeModalOpen: isOpen }),

  // Resume Form
  resumeForm: initialResumeForm,
  
  updateResumeForm: (data) => set((state) => ({
    resumeForm: { ...state.resumeForm, ...data }
  })),
  
  addExperience: (exp) => set((state) => ({
    resumeForm: {
      ...state.resumeForm,
      experience: [...state.resumeForm.experience, exp]
    }
  })),
  
  removeExperience: (index) => set((state) => ({
    resumeForm: {
      ...state.resumeForm,
      experience: state.resumeForm.experience.filter((_, i) => i !== index)
    }
  })),

  addEducation: (edu) => set((state) => ({
    resumeForm: {
      ...state.resumeForm,
      education: [...state.resumeForm.education, edu]
    }
  })),

  removeEducation: (index) => set((state) => ({
    resumeForm: {
      ...state.resumeForm,
      education: state.resumeForm.education.filter((_, i) => i !== index)
    }
  })),

  addProject: (proj) => set((state) => ({
    resumeForm: {
      ...state.resumeForm,
      projects: [...state.resumeForm.projects, proj]
    }
  })),

  removeProject: (index) => set((state) => ({
    resumeForm: {
      ...state.resumeForm,
      projects: state.resumeForm.projects.filter((_, i) => i !== index)
    }
  })),

  setSkills: (type, list) => set((state) => ({
    resumeForm: {
      ...state.resumeForm,
      skills: {
        ...state.resumeForm.skills,
        [type]: list
      }
    }
  })),

  resetResumeForm: () => set({ resumeForm: initialResumeForm })
}));
