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
  employee_id: string | null;
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
  "Digital Marketing",
  "Social Media Marketing",
  "Graphic Design",
  "Video Editing",
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

export interface OfferLetter {
  id: number;
  application_id: number | null;
  full_name: string;
  email: string;
  whatsapp: string | null;
  degree: string | null;
  college: string | null;
  city: string | null;
  enrollment_id: string | null;
  technology: string | null;
  domain_label: string | null;
  organization: string | null;
  location: string | null;
  domain: string | null;
  duration: string | null;
  start_date: string | null;
  end_date: string | null;
  stipend: string | null;
  reporting_sme: string | null;
  shift_time: string | null;
  shift_days: string | null;
  sme_email: string | null;
  sme_mobile: string | null;
  employee_id: string | null;
  body: string | null;
  status: "draft" | "sent";
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfferLetterStats {
  selected_candidates: number;
  with_employee_id: number;
  drafts: number;
  sent: number;
  last_sent_at: string | null;
  offer_jobs: {
    pending: number;
    running: number;
    failed: number;
  };
}

export interface OfferBulkResultItem {
  application_id: number;
  full_name: string;
  offer_id: number | null;
  job_id: number | null;
}

export interface OfferBulkResult {
  action: string;
  created: OfferBulkResultItem[];
  queued: OfferBulkResultItem[];
  skipped: OfferBulkResultItem[];
}

export interface AuditLogEntry {
  id: number;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  summary: string | null;
  details: string | null;
  ip: string | null;
  created_at: string;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
  actions: string[];
  resources: string[];
}

export interface JobEntry {
  id: number;
  kind: string;
  payload: string | null;
  status: "pending" | "running" | "done" | "failed";
  queue: string;
  attempts: number;
  max_attempts: number;
  error: string | null;
  run_at: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface OfferLetterDraftInput {
  application_id?: number | null;
  full_name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  degree?: string | null;
  college?: string | null;
  city?: string | null;
  enrollment_id?: string | null;
  technology?: string | null;
  domain_label?: string | null;
  organization?: string | null;
  location?: string | null;
  domain?: string | null;
  duration?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  stipend?: string | null;
  reporting_sme?: string | null;
  shift_time?: string | null;
  shift_days?: string | null;
  sme_email?: string | null;
  sme_mobile?: string | null;
  employee_id?: string | null;
  body?: string | null;
}

export function calculateOfferEndDate(
  start: string | null | undefined,
  duration: string | null | undefined,
): string | null {
  if (!start || !duration || duration === "Ongoing") return null;
  const match = duration.match(/^(\d+)\s*months?$/i);
  if (!match) return null;
  const months = parseInt(match[1], 10);
  if (Number.isNaN(months)) return null;
  const date = new Date(start);
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() - 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface LookupItem {
  id: number;
  category: string;
  value: string;
  is_active: boolean;
  sort_order: number;
}

export interface LookupLists {
  domain: string[];
  duration: string[];
  gender: string[];
  degree: string[];
  year: string[];
  status: string[];
  interview_type: string[];
}

export type LookupCategory = keyof LookupLists;

export interface AppSetting {
  key: string;
  label: string;
  value: string | null;
  type: string;
  group: string;
  is_public: boolean;
}

export type OfferLetterSectionType =
  | "header"
  | "title"
  | "candidate"
  | "heading_paragraph"
  | "paragraph"
  | "list"
  | "table"
  | "signature"
  | "footer";

export interface OfferLetterListItem {
  text: string;
  visible: boolean;
}

export interface OfferLetterTableRow {
  label: string;
  value?: string;
  field?: string;
  visible: boolean;
}

export interface OfferLetterSection {
  id: string;
  type: OfferLetterSectionType;
  label: string;
  visible: boolean;
  props: Record<string, unknown>;
}

export interface OfferLetterStructure {
  title?: {
    text1?: string;
    text2?: string;
    size?: number;
    align?: string;
    show_underline?: boolean;
    underline_color?: string;
    letter_spacing?: number;
    text1_color?: string;
    text2_color?: string;
    font?: string;
  };
  sections: OfferLetterSection[];
}

export const OFFER_LETTER_FONTS = [
  { value: "inter", label: "Inter" },
  { value: "poppins", label: "Poppins" },
  { value: "lato", label: "Lato" },
] as const;

export const OFFER_LETTER_ALIGNS = ["left", "center", "right", "justify"] as const;
export const OFFER_LETTER_TEXT_COLORS = [
  { key: "primary", label: "Primary" },
  { key: "dark", label: "Dark Text" },
  { key: "body", label: "Body Text" },
  { key: "accent", label: "Accent" },
  { key: "border", label: "Border" },
] as const;

export interface OfferLetterDesign {
  page?: {
    margin_top?: number;
    margin_side?: number;
    margin_bottom?: number;
  };
  colors?: {
    primary?: string;
    dark_text?: string;
    body_text?: string;
    border?: string;
    background?: string;
    accent?: string;
  };
  fonts?: {
    family?: string;
    body?: number;
    title?: number;
    subtitle?: number;
    table_label?: number;
    table_value?: number;
    heading?: number;
    signature?: number;
    footer?: number;
  };
  spacing?: {
    section_gap?: number;
    table_row?: number;
    line_height?: number;
  };
}

export interface OfferLetterTemplate {
  id: number;
  name: string;
  description: string | null;
  structure: OfferLetterStructure;
  design: OfferLetterDesign;
  is_active: boolean;
  is_default: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface OfferLetterTemplateListItem {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  updated_at: string | null;
}

export const OFFER_LETTER_FIELDS: Array<{ key: string; label: string }> = [
  { key: "candidate_name", label: "Candidate Name" },
  { key: "company_name", label: "Company Name" },
  { key: "qualification", label: "Qualification" },
  { key: "college", label: "College" },
  { key: "enrollment_id", label: "Enrollment ID" },
  { key: "technology", label: "Technology" },
  { key: "domain", label: "Domain" },
  { key: "organization", label: "Organization" },
  { key: "location", label: "Location" },
  { key: "start_date", label: "Start Date" },
  { key: "end_date", label: "End Date" },
  { key: "duration", label: "Duration" },
  { key: "stipend", label: "Stipend" },
  { key: "reporting_sme", label: "Reporting SME" },
  { key: "shift_time", label: "Shift Time" },
  { key: "shift_days", label: "Shift Days" },
  { key: "sme_email", label: "SME Email" },
  { key: "sme_mobile", label: "SME Mobile" },
  { key: "date", label: "Letter Date" },
];

export interface AdminUserItem {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  avatar_path: string | null;
  created_at: string | null;
}

export const LOOKUP_CATEGORIES: Array<{ key: LookupCategory; label: string }> = [
  { key: "domain", label: "Internship Domains" },
  { key: "status", label: "Application Statuses" },
  { key: "degree", label: "Degrees" },
  { key: "year", label: "Years of Study" },
  { key: "duration", label: "Durations" },
  { key: "gender", label: "Genders" },
  { key: "interview_type", label: "Interview Types" },
];
