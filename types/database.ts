export type ApplicationStatus =
  | "bookmarked"
  | "outreach_sent"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "archived";

export type WorkMode = "remote" | "hybrid" | "onsite";

export type InteractionKind =
  | "recruiter_screen"
  | "hiring_manager"
  | "technical"
  | "panel"
  | "take_home"
  | "onsite"
  | "offer_call"
  | "email"
  | "other";

export type InteractionOutcome =
  | "scheduled"
  | "completed"
  | "passed"
  | "rejected"
  | "cancelled";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  resume: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Story {
  id: string;
  user_id: string;
  title: string;
  company: string | null;
  competencies: string[] | null;
  story_text: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Job {
  id: string;
  user_id: string;
  company_name: string;
  role_title: string;
  location: string | null;
  job_url: string | null;
  raw_description: string | null;
  status: ApplicationStatus | null;
  application_date: string | null; // ISO date (YYYY-MM-DD)
  contact_person: string | null;
  salary_range: string | null;
  recruiter_initiated: boolean;
  next_action: string | null;
  next_action_date: string | null; // ISO date (YYYY-MM-DD)
  source: string | null;
  referral_name: string | null;
  notes: string | null;
  closed_reason: string | null;
  work_mode: WorkMode | null;
  // Denormalized snapshot of the most recent row in `evaluations` for this
  // job, kept in sync on every insert/re-evaluation so list views don't need
  // to join. The full history lives in `evaluations`.
  match_score: number | null;
  evaluation_summary: EvaluationSummary | null;
  created_at: string;
  updated_at: string | null;
}

export interface Evaluation {
  id: string;
  job_id: string;
  user_id: string;
  match_score: number;
  evaluation_summary: EvaluationSummary;
  resume_snapshot: string | null;
  created_at: string;
}

// A conversation or interview stage for a job. `occurred_at` null means not
// yet scheduled; a future timestamp means upcoming.
export interface Interaction {
  id: string;
  job_id: string;
  user_id: string;
  kind: InteractionKind;
  occurred_at: string | null;
  interviewer_names: string[] | null;
  outcome: InteractionOutcome | null;
  notes: string | null;
  story_ids: string[] | null;
  created_at: string;
  updated_at: string | null;
}

export interface JobSummary {
  id: string;
  role_title: string;
  company_name: string;
  match_score: number | null;
  created_at: string;
}

export interface EvaluationSummary {
  match_score: number; // 0 - 100
  score_breakdown: {
    technical_match: number;
    domain_match: number;
    leadership_match: number;
  };
  key_strengths: string[];
  potential_gaps: string[];
  positioning_advice: string;
  ats_analysis?: {
    missing_exact_keywords: string[];
    formatting_warnings: string[];
    ats_pass_probability: "High" | "Medium" | "Low";
  };
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      stories: {
        Row: Story;
        Insert: Partial<Story> & Pick<Story, "user_id" | "title">;
        Update: Partial<Story>;
        Relationships: [];
      };
      jobs: {
        Row: Job;
        Insert: Partial<Job> &
          Pick<Job, "user_id" | "company_name" | "role_title">;
        Update: Partial<Job>;
        Relationships: [];
      };
      evaluations: {
        Row: Evaluation;
        Insert: Partial<Evaluation> &
          Pick<
            Evaluation,
            "job_id" | "user_id" | "match_score" | "evaluation_summary"
          >;
        Update: Partial<Evaluation>;
        Relationships: [];
      };
      interactions: {
        Row: Interaction;
        Insert: Partial<Interaction> &
          Pick<Interaction, "job_id" | "user_id" | "kind">;
        Update: Partial<Interaction>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
