export interface Application {
  id: number;
  full_name: string;
  email: string;
  mobile: string;
  whatsapp: string | null;
  dob: string;
  gender: string;
  address: string | null;
  college: string;
  degree: string;
  department: string;
  current_year: string;
  cgpa: number | null;
  domain: string;
  duration: string;
  preferred_joining_date: string | null;
  technical_skills: string[] | null;
  soft_skills: string[] | null;
  projects: string | null;
  certifications: string | null;
  github: string | null;
  linkedin: string | null;
  portfolio: string | null;
  resume_path: string | null;
  photo_path: string | null;
  status: string;
  rating: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusHistoryEntry {
  id: number;
  application_id: number;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface Interview {
  id: number;
  application_id: number;
  scheduled_date: string;
  scheduled_time: string;
  interview_type: string;
  interviewer: string | null;
  location: string | null;
  notes: string | null;
  remarks: string | null;
  result: string | null;
  status: string;
  created_at: string;
}

export interface CommunicationLog {
  id: number;
  application_id: number;
  channel: string;
  subject: string | null;
  message: string;
  status: string;
  sent_by: string | null;
  created_at: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  reviewed: number;
  shortlisted: number;
  interview_scheduled: number;
  interview_completed: number;
  selected: number;
  rejected: number;
  withdrawn: number;
}

export interface DomainStat {
  domain: string;
  count: number;
}

export interface AnalyticsData {
  stats: DashboardStats;
  domain_distribution: DomainStat[];
  gender_distribution: DomainStat[];
  daily_applications: { date: string; count: number }[];
  college_distribution: DomainStat[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  avatar_path: string | null;
}

export const APPLICATION_STATUSES = [
  "Pending",
  "Reviewed",
  "Shortlisted",
  "Interview Scheduled",
  "Interview Completed",
  "Selected",
  "Rejected",
  "Withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  Reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Shortlisted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  "Interview Scheduled": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  "Interview Completed": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  Selected: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  Withdrawn: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export const DOMAIN_OPTIONS = [
  "Web Development",
  "Mobile Development",
  "Data Science",
  "Machine Learning",
  "AI / Deep Learning",
  "Cloud Computing",
  "Cybersecurity",
  "DevOps",
  "UI/UX Design",
  "Blockchain",
  "IoT",
  "Game Development",
  "Full Stack Development",
  "Backend Development",
  "Frontend Development",
  "Other",
];

export const DURATION_OPTIONS = [
  "1 Month",
  "2 Months",
  "3 Months",
  "4 Months",
  "5 Months",
  "6 Months",
  "Ongoing",
];

export const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

export const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Final Year", "Post Graduate"];

export const DEGREE_OPTIONS = ["B.Tech", "B.E.", "BCA", "B.Sc", "M.Tech", "M.E.", "MCA", "M.Sc", "MBA", "Ph.D", "Other"];

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplate {
  id: number;
  name: string;
  message: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SendEmailRequest {
  to_email: string;
  subject: string;
  message: string;
  html?: boolean;
}

export interface SendWhatsAppRequest {
  to_phone: string;
  message: string;
}
