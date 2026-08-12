export type ApplicationStatus =
  | "bookmarked"
  | "outreach_sent"
  | "applied"
  | "interviewing"
  | "offer"
  | "archived";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  target_titles: string[] | null;
  location_preference: string | null;
  resume: string | null;
  technical_skills: string[] | null;
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
  raw_description: string;
  status: ApplicationStatus;
  match_score: number | null;
  evaluation_summary: EvaluationSummary | null;
  created_at: string;
  updated_at: string | null;
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
  parsed_requirements: {
    required_skills: string[];
    preferred_skills: string[];
    is_remote: boolean;
    salary_range?: string;
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
          Pick<
            Job,
            "user_id" | "company_name" | "role_title" | "raw_description"
          >;
        Update: Partial<Job>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
