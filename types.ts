
export enum Page {
  Landing = 'landing',
  Login = 'login',
  Register = 'register',
  Dashboard = 'dashboard',
  Jobs = 'jobs',
  Candidates = 'candidates',
  CandidateDetail = 'candidate-detail',
  BulkUpload = 'bulk-upload',
  Profile = 'profile',
  Settings = 'settings',
  ResumeScore = 'resume-score',
  Plugins = 'plugins',
  Community = 'community'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  title?: string;
  about?: string;
  location?: string;
  stats?: {
    hired: string;
    timeToHire: string;
    efficiency: string;
  };
  settings?: {
    companyName?: string;
    industry?: string;
    aiRigorous?: boolean;
    aiBiasRedaction?: boolean;
    emailDigests?: boolean;
  };
}

export interface Candidate {
  id: string;
  name: string;
  role: string;
  company: string;
  location: string;
  appliedDate: string;
  status: 'Interviewing' | 'Shortlisted' | 'New' | 'Rejected' | 'Offer Sent';
  matchScore: number;
  avatar?: string;
  associatedJdId?: string;
  analysis?: string;
  resumeBase64?: string;
  resumeMimeType?: string;
  userId?: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: 'Active' | 'Paused' | 'Draft';
  applicantsCount: number;
  matchesCount: number;
  skills: string[];
  description?: string;
  jdUrl?: string;
  jdFileName?: string;
  userId?: string;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  avatar?: string;
  type: 'application' | 'alert' | 'message';
  resolved?: boolean;
  userId?: string;
}
