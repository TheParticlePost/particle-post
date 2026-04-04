export interface Specialist {
  id: string;
  user_id: string;
  slug: string;
  type: "individual" | "firm";
  display_name: string;
  headline: string;
  bio: string | null;
  avatar_url: string | null;
  categories: string[];
  industries: string[];
  location_city: string;
  country_code: string;
  languages: string[];
  hourly_rate_range: string | null;
  team_size: string | null;
  certifications: string[];
  linkedin_url: string;
  website_url: string | null;
  is_available: boolean;
  is_verified: boolean;
  is_featured: boolean;
  status: "pending" | "approved" | "rejected" | "suspended";
  avg_rating: number;
  total_reviews: number;
  profile_views: number;
  created_at: string;
  email: string | null;
  updated_at: string;
}

export interface SpecialistListItem {
  id: string;
  slug: string;
  type: "individual" | "firm";
  display_name: string;
  headline: string;
  avatar_url: string | null;
  categories: string[];
  location_city: string;
  country_code: string;
  languages: string[];
  hourly_rate_range: string | null;
  is_available: boolean;
  is_verified: boolean;
  is_featured: boolean;
  avg_rating: number;
  total_reviews: number;
}

export interface PortfolioItem {
  id: string;
  specialist_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  external_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface SpecialistReview {
  id: string;
  specialist_id: string;
  reviewer_name: string;
  reviewer_company: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface SpecialistLead {
  id: string;
  specialist_id: string;
  client_name: string;
  client_email: string;
  client_company: string | null;
  project_description: string;
  budget_range: string | null;
  timeline: string | null;
  status: "new" | "viewed" | "responded" | "archived";
  created_at: string;
  viewed_at: string | null;
  responded_at: string | null;
}

export interface SpecialistFilters {
  category?: string;
  country?: string;
  language?: string;
  availability?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ProjectBrief {
  id: string;
  client_name: string;
  client_email: string;
  client_company: string | null;
  categories: string[];
  industries: string[];
  country_code: string;
  languages: string[];
  budget_range: string | null;
  timeline: string | null;
  project_description: string;
  match_count: number;
  status: "active" | "matched" | "expired" | "cancelled";
  created_at: string;
  matched_at: string | null;
}

export interface AutomatchResult {
  id: string;
  brief_id: string;
  specialist_id: string;
  match_score: number;
  category_score: number;
  geo_score: number;
  rating_score: number;
  availability_score: number;
  language_score: number;
  rank: number;
  notified_at: string | null;
  created_at: string;
  specialist?: SpecialistListItem;
}

export interface AnalyticsEvent {
  id: string;
  specialist_id: string;
  event_type: "profile_view" | "lead_submitted" | "match_received" | "directory_impression" | "contact_click";
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  profileViews: number;
  avgRating: number;
  totalReviews: number;
  matchCount: number;
  responseRate: number;
}
