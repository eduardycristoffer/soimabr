export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          cep: string | null
          cidade: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          cnpj: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          is_active: boolean
          nome_fantasia: string | null
          observacoes: string | null
          pais: string
          razao_social: string
          tax_id: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          cnpj?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          is_active?: boolean
          nome_fantasia?: string | null
          observacoes?: string | null
          pais?: string
          razao_social: string
          tax_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          cnpj?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          is_active?: boolean
          nome_fantasia?: string | null
          observacoes?: string | null
          pais?: string
          razao_social?: string
          tax_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      discount_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          max_discount_percent: number
          requires_approval: boolean
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          max_discount_percent: number
          requires_approval?: boolean
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          max_discount_percent?: number
          requires_approval?: boolean
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      lead_histories: {
        Row: {
          action: string
          created_at: string
          from_stage_id: string | null
          id: string
          lead_id: string
          notes: string | null
          to_stage_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          from_stage_id?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          to_stage_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          from_stage_id?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          to_stage_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_histories_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_histories_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_histories_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          client_id: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          converted_at: string | null
          created_at: string
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          is_converted: boolean
          notes: string | null
          owner_id: string
          stage_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          converted_at?: string | null
          created_at?: string
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          is_converted?: boolean
          notes?: string | null
          owner_id: string
          stage_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          converted_at?: string | null
          created_at?: string
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          is_converted?: boolean
          notes?: string | null
          owner_id?: string
          stage_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_final: boolean
          is_lost: boolean
          name: string
          order_index: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_final?: boolean
          is_lost?: boolean
          name: string
          order_index: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_final?: boolean
          is_lost?: boolean
          name?: string
          order_index?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          categoria: Database["public"]["Enums"]["product_category"]
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          is_active: boolean
          needs_review: boolean
          nome: string
          preco: number
          unidade: string
          updated_at: string
        }
        Insert: {
          categoria: Database["public"]["Enums"]["product_category"]
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_active?: boolean
          needs_review?: boolean
          nome: string
          preco?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["product_category"]
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          is_active?: boolean
          needs_review?: boolean
          nome?: string
          preco?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_index: number
          product_category: Database["public"]["Enums"]["product_category"]
          product_code: string
          product_id: string | null
          product_name: string
          quantity: number
          quote_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_index?: number
          product_category: Database["public"]["Enums"]["product_category"]
          product_code: string
          product_id?: string | null
          product_name: string
          quantity?: number
          quote_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_index?: number
          product_category?: Database["public"]["Enums"]["product_category"]
          product_code?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          quote_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          cancelled_at: string | null
          client_id: string
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["currency"]
          delivery_time: string | null
          discount_approved: boolean
          discount_approved_at: string | null
          discount_approved_by: string | null
          discount_percent: number
          discount_value: number
          finalized_at: string | null
          freight_terms: string | null
          id: string
          lead_id: string | null
          notes: string | null
          payment_terms: string | null
          pdf_generated_at: string | null
          pdf_hash: string | null
          project_location: string | null
          project_name: string | null
          quote_number: string
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          total: number
          updated_at: string
          validity_days: number
        }
        Insert: {
          cancelled_at?: string | null
          client_id: string
          created_at?: string
          created_by: string
          currency?: Database["public"]["Enums"]["currency"]
          delivery_time?: string | null
          discount_approved?: boolean
          discount_approved_at?: string | null
          discount_approved_by?: string | null
          discount_percent?: number
          discount_value?: number
          finalized_at?: string | null
          freight_terms?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          payment_terms?: string | null
          pdf_generated_at?: string | null
          pdf_hash?: string | null
          project_location?: string | null
          project_name?: string | null
          quote_number: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          validity_days?: number
        }
        Update: {
          cancelled_at?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency"]
          delivery_time?: string | null
          discount_approved?: boolean
          discount_approved_at?: string | null
          discount_approved_by?: string | null
          discount_percent?: number
          discount_value?: number
          finalized_at?: string | null
          freight_terms?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          payment_terms?: string | null
          pdf_generated_at?: string | null
          pdf_hash?: string | null
          project_location?: string | null
          project_name?: string | null
          quote_number?: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operator"
      client_type: "nacional" | "internacional"
      currency: "BRL" | "USD" | "EUR"
      product_category:
        | "grua"
        | "configuracao"
        | "torre"
        | "tramo"
        | "chassis"
        | "acessorio"
      quote_status: "draft" | "finalized" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operator"],
      client_type: ["nacional", "internacional"],
      currency: ["BRL", "USD", "EUR"],
      product_category: [
        "grua",
        "configuracao",
        "torre",
        "tramo",
        "chassis",
        "acessorio",
      ],
      quote_status: ["draft", "finalized", "cancelled"],
    },
  },
} as const
