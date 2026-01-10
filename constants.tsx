
import { Candidate, Job, Activity } from './types';

export const MOCK_CANDIDATES: Candidate[] = [
  {
    id: '1',
    name: 'Sarah Jenkins',
    role: 'Senior UX Designer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    appliedDate: 'Oct 24, 2023',
    status: 'Interviewing',
    matchScore: 92,
    avatar: 'https://picsum.photos/seed/sarah/100/100'
  },
  {
    id: '2',
    name: 'Michael Chen',
    role: 'Product Designer',
    company: 'CreativeFlow',
    location: 'Austin, TX',
    appliedDate: 'Oct 23, 2023',
    status: 'Shortlisted',
    matchScore: 88,
    avatar: 'https://picsum.photos/seed/michael/100/100'
  },
  {
    id: '3',
    name: 'James Doe',
    role: 'UI Developer',
    company: 'StartupInc',
    location: 'Remote, NY',
    appliedDate: 'Oct 22, 2023',
    status: 'New',
    matchScore: 74,
  },
  {
    id: '4',
    name: 'Emily Davis',
    role: 'UX Researcher',
    company: 'DataDrive',
    location: 'Seattle, WA',
    appliedDate: 'Oct 21, 2023',
    status: 'Rejected',
    matchScore: 45,
    avatar: 'https://picsum.photos/seed/emily/100/100'
  }
];

export const MOCK_JOBS: Job[] = [
  {
    id: 'j1',
    title: 'Senior Product Designer',
    department: 'Design',
    location: 'Remote',
    type: 'Full-time',
    status: 'Active',
    applicantsCount: 45,
    matchesCount: 8,
    skills: ['Figma', 'Prototyping', 'Design Systems']
  },
  {
    id: 'j2',
    title: 'Frontend Engineer',
    department: 'Engineering',
    location: 'SF',
    type: 'Full-time',
    status: 'Active',
    applicantsCount: 32,
    matchesCount: 12,
    skills: ['React', 'TypeScript', 'Tailwind']
  }
];

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'a1',
    user: 'Sophia Doe',
    action: 'applied for',
    target: 'Senior UX Designer',
    time: '09:00 AM',
    avatar: 'https://picsum.photos/seed/sophia/100/100',
    type: 'application'
  },
  {
    id: 'a2',
    user: 'System',
    action: 'High volume of applications detected',
    target: '',
    time: '08:45 AM',
    type: 'alert',
    resolved: true
  },
  {
    id: 'a3',
    user: 'Emily R.',
    action: 'sent a message about',
    target: 'Marketing Manager',
    time: 'Yesterday',
    avatar: 'https://picsum.photos/seed/emilyr/100/100',
    type: 'message'
  }
];
