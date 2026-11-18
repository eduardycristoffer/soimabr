import { Database } from "@/integrations/supabase/types";

// Tipos base extraídos do Supabase
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadHistory = Database["public"]["Tables"]["lead_histories"]["Row"];
export type Quote = Database["public"]["Tables"]["quotes"]["Row"];
export type QuoteItem = Database["public"]["Tables"]["quote_items"]["Row"];
export type PipelineStage = Database["public"]["Tables"]["pipeline_stages"]["Row"];
export type DiscountRule = Database["public"]["Tables"]["discount_rules"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
export type PipelineHistory = Database["public"]["Tables"]["pipeline_history"]["Row"];

// Enums
export type AppRole = Database["public"]["Enums"]["app_role"];
export type ClientType = Database["public"]["Enums"]["client_type"];
export type QuoteStatus = Database["public"]["Enums"]["quote_status"];
export type Currency = Database["public"]["Enums"]["currency"];
export type ProductCategory = Database["public"]["Enums"]["product_category"];

// Insert types
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type QuoteInsert = Database["public"]["Tables"]["quotes"]["Insert"];
export type QuoteItemInsert = Database["public"]["Tables"]["quote_items"]["Insert"];

// Update types
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
export type QuoteUpdate = Database["public"]["Tables"]["quotes"]["Update"];

// Tipos compostos para UI
export interface LeadWithStage extends Lead {
  pipeline_stages?: PipelineStage | null;
  clients?: Client | null;
  quotes?: Quote | null;
}

export interface QuoteWithRelations extends Quote {
  clients?: Client | null;
  leads?: Lead | null;
  quote_items?: QuoteItem[];
}

export interface ProfileWithRole extends Profile {
  role?: AppRole;
}

// Context types
export interface AuthContextType {
  user: Profile | null;
  role: AppRole | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Navigation
export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  /** só aparece depois que a gestão de frota foi ativada no banco */
  needsFleet?: boolean;
}

// Lead source / origin types
export type LeadSource = "manual" | "webhook" | "indicacao" | "outro";
export type LeadOrigin = "manual" | "marketing" | "indicacao" | "proposal_direct";
