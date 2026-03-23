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
      client_access_requests: {
        Row: {
          cnpj_digits: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          id: string
          reason: string | null
          requester_id: string
          status: Database["public"]["Enums"]["access_request_status"]
        }
        Insert: {
          cnpj_digits: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          id?: string
          reason?: string | null
          requester_id: string
          status?: Database["public"]["Enums"]["access_request_status"]
        }
        Update: {
          cnpj_digits?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          id?: string
          reason?: string | null
          requester_id?: string
          status?: Database["public"]["Enums"]["access_request_status"]
        }
        Relationships: []
      }
      clients: {
        Row: {
          assigned_to: string | null
          cep: string | null
          cidade: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          cnpj: string | null
          cnpj_digits: string | null
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
          assigned_to?: string | null
          cep?: string | null
          cidade?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          cnpj?: string | null
          cnpj_digits?: string | null
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
          assigned_to?: string | null
          cep?: string | null
          cidade?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          cnpj?: string | null
          cnpj_digits?: string | null
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
      company_settings: {
        Row: {
          address: string | null
          cnpj: string | null
          company_name: string
          crea_registration: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          razao_social: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          company_name?: string
          crea_registration?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          razao_social?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          company_name?: string
          crea_registration?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          razao_social?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      default_panel_items: {
        Row: {
          created_at: string | null
          id: string
          item_text: string
          order_index: number
          product_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_text: string
          order_index?: number
          product_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_text?: string
          order_index?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "default_panel_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_approval_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          discount_percent: number
          id: string
          justification: string
          quote_id: string
          requested_at: string
          requested_by: string
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          discount_percent: number
          id?: string
          justification: string
          quote_id: string
          requested_at?: string
          requested_by: string
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          discount_percent?: number
          id?: string
          justification?: string
          quote_id?: string
          requested_at?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "discount_approval_requests_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
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
      email_verification_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_sheets_config: {
        Row: {
          apps_script_url: string | null
          created_at: string
          field_mapping: Json
          id: string
          is_active: boolean
          sheet_name: string | null
          spreadsheet_id: string | null
          trigger_on: string
          trigger_stage_id: string | null
          updated_at: string
        }
        Insert: {
          apps_script_url?: string | null
          created_at?: string
          field_mapping?: Json
          id?: string
          is_active?: boolean
          sheet_name?: string | null
          spreadsheet_id?: string | null
          trigger_on?: string
          trigger_stage_id?: string | null
          updated_at?: string
        }
        Update: {
          apps_script_url?: string | null
          created_at?: string
          field_mapping?: Json
          id?: string
          is_active?: boolean
          sheet_name?: string | null
          spreadsheet_id?: string | null
          trigger_on?: string
          trigger_stage_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_sheets_config_trigger_stage_id_fkey"
            columns: ["trigger_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
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
          lead_origin: string
          metadata: Json | null
          notes: string | null
          owner_id: string
          quote_id: string | null
          source: string
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
          lead_origin?: string
          metadata?: Json | null
          notes?: string | null
          owner_id: string
          quote_id?: string | null
          source?: string
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
          lead_origin?: string
          metadata?: Json | null
          notes?: string | null
          owner_id?: string
          quote_id?: string | null
          source?: string
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
            foreignKeyName: "leads_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
      login_otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      otp_attempts: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_attempt_at: string | null
          locked_until: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          locked_until?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          locked_until?: string | null
          user_id?: string
        }
        Relationships: []
      }
      outbound_webhooks: {
        Row: {
          created_at: string
          event_type: string
          headers: Json
          id: string
          is_active: boolean
          retry_count: number
          target_url: string
          timeout_ms: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_type: string
          headers?: Json
          id?: string
          is_active?: boolean
          retry_count?: number
          target_url: string
          timeout_ms?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          headers?: Json
          id?: string
          is_active?: boolean
          retry_count?: number
          target_url?: string
          timeout_ms?: number
          updated_at?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pipeline_history: {
        Row: {
          from_stage_id: string | null
          id: string
          lead_id: string
          moved_at: string
          moved_by: string
          notes: string | null
          to_stage_id: string | null
        }
        Insert: {
          from_stage_id?: string | null
          id?: string
          lead_id: string
          moved_at?: string
          moved_by: string
          notes?: string | null
          to_stage_id?: string | null
        }
        Update: {
          from_stage_id?: string | null
          id?: string
          lead_id?: string
          moved_at?: string
          moved_by?: string
          notes?: string | null
          to_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
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
          is_fixed: boolean
          is_lost: boolean
          name: string
          order_index: number
          stage_type: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_final?: boolean
          is_fixed?: boolean
          is_lost?: boolean
          name: string
          order_index: number
          stage_type?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_final?: boolean
          is_fixed?: boolean
          is_lost?: boolean
          name?: string
          order_index?: number
          stage_type?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          categoria: Database["public"]["Enums"]["product_category"]
          codigo: string
          created_at: string
          default_altura_torre_m: number | null
          default_altura_trabalho_m: number | null
          default_carga_maxima_kg: number | null
          default_carga_ponta_kg: number | null
          default_lanca_m: number | null
          default_motor_elev_hp: number | null
          default_motor_elev_kw: number | null
          default_motor_elev_vel: string | null
          default_motor_rot_hp: number | null
          default_motor_rot_kw: number | null
          default_motor_rot_vel: string | null
          default_motor_trans_hp: number | null
          default_motor_trans_kw: number | null
          default_motor_trans_vel: string | null
          default_panel_include_motors: boolean | null
          default_panel_voltage: string | null
          default_warranty_components_years: number | null
          default_warranty_paint_years: number | null
          default_warranty_struct_years: number | null
          descricao: string | null
          descricao_en: string | null
          descricao_tecnica: string | null
          descricao_tecnica_en: string | null
          id: string
          international_price_brl: number | null
          is_active: boolean
          needs_review: boolean
          nome: string
          nome_en: string | null
          preco: number
          show_tech_desc_pdf: boolean
          spec_tipo: string | null
          spec_vel_elevacao: string | null
          spec_vel_rotacao: string | null
          spec_vel_translacao: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          categoria: Database["public"]["Enums"]["product_category"]
          codigo: string
          created_at?: string
          default_altura_torre_m?: number | null
          default_altura_trabalho_m?: number | null
          default_carga_maxima_kg?: number | null
          default_carga_ponta_kg?: number | null
          default_lanca_m?: number | null
          default_motor_elev_hp?: number | null
          default_motor_elev_kw?: number | null
          default_motor_elev_vel?: string | null
          default_motor_rot_hp?: number | null
          default_motor_rot_kw?: number | null
          default_motor_rot_vel?: string | null
          default_motor_trans_hp?: number | null
          default_motor_trans_kw?: number | null
          default_motor_trans_vel?: string | null
          default_panel_include_motors?: boolean | null
          default_panel_voltage?: string | null
          default_warranty_components_years?: number | null
          default_warranty_paint_years?: number | null
          default_warranty_struct_years?: number | null
          descricao?: string | null
          descricao_en?: string | null
          descricao_tecnica?: string | null
          descricao_tecnica_en?: string | null
          id?: string
          international_price_brl?: number | null
          is_active?: boolean
          needs_review?: boolean
          nome: string
          nome_en?: string | null
          preco?: number
          show_tech_desc_pdf?: boolean
          spec_tipo?: string | null
          spec_vel_elevacao?: string | null
          spec_vel_rotacao?: string | null
          spec_vel_translacao?: string | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["product_category"]
          codigo?: string
          created_at?: string
          default_altura_torre_m?: number | null
          default_altura_trabalho_m?: number | null
          default_carga_maxima_kg?: number | null
          default_carga_ponta_kg?: number | null
          default_lanca_m?: number | null
          default_motor_elev_hp?: number | null
          default_motor_elev_kw?: number | null
          default_motor_elev_vel?: string | null
          default_motor_rot_hp?: number | null
          default_motor_rot_kw?: number | null
          default_motor_rot_vel?: string | null
          default_motor_trans_hp?: number | null
          default_motor_trans_kw?: number | null
          default_motor_trans_vel?: string | null
          default_panel_include_motors?: boolean | null
          default_panel_voltage?: string | null
          default_warranty_components_years?: number | null
          default_warranty_paint_years?: number | null
          default_warranty_struct_years?: number | null
          descricao?: string | null
          descricao_en?: string | null
          descricao_tecnica?: string | null
          descricao_tecnica_en?: string | null
          id?: string
          international_price_brl?: number | null
          is_active?: boolean
          needs_review?: boolean
          nome?: string
          nome_en?: string | null
          preco?: number
          show_tech_desc_pdf?: boolean
          spec_tipo?: string | null
          spec_vel_elevacao?: string | null
          spec_vel_rotacao?: string | null
          spec_vel_translacao?: string | null
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
          must_complete_profile: boolean
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
          must_complete_profile?: boolean
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
          must_complete_profile?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string
          grua_altura_torre_m: number | null
          grua_altura_trabalho_m: number | null
          grua_carga_maxima_kg: number | null
          grua_carga_ponta_kg: number | null
          grua_lanca_m: number | null
          id: string
          international_unit_price_brl: number | null
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
          grua_altura_torre_m?: number | null
          grua_altura_trabalho_m?: number | null
          grua_carga_maxima_kg?: number | null
          grua_carga_ponta_kg?: number | null
          grua_lanca_m?: number | null
          id?: string
          international_unit_price_brl?: number | null
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
          grua_altura_torre_m?: number | null
          grua_altura_trabalho_m?: number | null
          grua_carga_maxima_kg?: number | null
          grua_carga_ponta_kg?: number | null
          grua_lanca_m?: number | null
          id?: string
          international_unit_price_brl?: number | null
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
      quote_panel_items: {
        Row: {
          created_at: string | null
          id: string
          item_text: string
          order_index: number
          quote_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_text: string
          order_index?: number
          quote_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_text?: string
          order_index?: number
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_panel_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_versions: {
        Row: {
          edited_at: string
          edited_by: string
          id: string
          quote_id: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          edited_at?: string
          edited_by: string
          id?: string
          quote_id: string
          snapshot: Json
          version_number?: number
        }
        Update: {
          edited_at?: string
          edited_by?: string
          id?: string
          quote_id?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_versions_quote_id_fkey"
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
          grua_altura_torre_m: number | null
          grua_altura_trabalho_m: number | null
          grua_carga_maxima_kg: number | null
          grua_carga_ponta_kg: number | null
          grua_lanca_m: number | null
          hide_discount_value: boolean | null
          hide_unit_prices: boolean | null
          id: string
          language: string
          lead_id: string | null
          notes: string | null
          panel_include_motors: boolean | null
          panel_motor_elev_hp: number | null
          panel_motor_elev_kw: number | null
          panel_motor_elev_vel: string | null
          panel_motor_rot_hp: number | null
          panel_motor_rot_kw: number | null
          panel_motor_rot_vel: string | null
          panel_motor_trans_hp: number | null
          panel_motor_trans_kw: number | null
          panel_motor_trans_vel: string | null
          panel_voltage: string | null
          payment_terms: string | null
          payment_terms_items: Json | null
          pdf_generated_at: string | null
          pdf_hash: string | null
          project_location: string | null
          project_name: string | null
          quote_number: string
          spec_override_enabled: boolean | null
          spec_tipo: string | null
          spec_vel_elevacao: string | null
          spec_vel_rotacao: string | null
          spec_vel_translacao: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          total: number
          updated_at: string
          usd_brl_rate_updated_at: string | null
          usd_brl_rate_used: number | null
          validity_days: number
          warranty_components_years: number | null
          warranty_paint_years: number | null
          warranty_struct_years: number | null
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
          grua_altura_torre_m?: number | null
          grua_altura_trabalho_m?: number | null
          grua_carga_maxima_kg?: number | null
          grua_carga_ponta_kg?: number | null
          grua_lanca_m?: number | null
          hide_discount_value?: boolean | null
          hide_unit_prices?: boolean | null
          id?: string
          language?: string
          lead_id?: string | null
          notes?: string | null
          panel_include_motors?: boolean | null
          panel_motor_elev_hp?: number | null
          panel_motor_elev_kw?: number | null
          panel_motor_elev_vel?: string | null
          panel_motor_rot_hp?: number | null
          panel_motor_rot_kw?: number | null
          panel_motor_rot_vel?: string | null
          panel_motor_trans_hp?: number | null
          panel_motor_trans_kw?: number | null
          panel_motor_trans_vel?: string | null
          panel_voltage?: string | null
          payment_terms?: string | null
          payment_terms_items?: Json | null
          pdf_generated_at?: string | null
          pdf_hash?: string | null
          project_location?: string | null
          project_name?: string | null
          quote_number: string
          spec_override_enabled?: boolean | null
          spec_tipo?: string | null
          spec_vel_elevacao?: string | null
          spec_vel_rotacao?: string | null
          spec_vel_translacao?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          usd_brl_rate_updated_at?: string | null
          usd_brl_rate_used?: number | null
          validity_days?: number
          warranty_components_years?: number | null
          warranty_paint_years?: number | null
          warranty_struct_years?: number | null
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
          grua_altura_torre_m?: number | null
          grua_altura_trabalho_m?: number | null
          grua_carga_maxima_kg?: number | null
          grua_carga_ponta_kg?: number | null
          grua_lanca_m?: number | null
          hide_discount_value?: boolean | null
          hide_unit_prices?: boolean | null
          id?: string
          language?: string
          lead_id?: string | null
          notes?: string | null
          panel_include_motors?: boolean | null
          panel_motor_elev_hp?: number | null
          panel_motor_elev_kw?: number | null
          panel_motor_elev_vel?: string | null
          panel_motor_rot_hp?: number | null
          panel_motor_rot_kw?: number | null
          panel_motor_rot_vel?: string | null
          panel_motor_trans_hp?: number | null
          panel_motor_trans_kw?: number | null
          panel_motor_trans_vel?: string | null
          panel_voltage?: string | null
          payment_terms?: string | null
          payment_terms_items?: Json | null
          pdf_generated_at?: string | null
          pdf_hash?: string | null
          project_location?: string | null
          project_name?: string | null
          quote_number?: string
          spec_override_enabled?: boolean | null
          spec_tipo?: string | null
          spec_vel_elevacao?: string | null
          spec_vel_rotacao?: string | null
          spec_vel_translacao?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          usd_brl_rate_updated_at?: string | null
          usd_brl_rate_used?: number | null
          validity_days?: number
          warranty_components_years?: number | null
          warranty_paint_years?: number | null
          warranty_struct_years?: number | null
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
      security_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      webhook_configs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          secret_token: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          secret_token?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          secret_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          direction: string
          endpoint: string | null
          event_type: string | null
          http_status: number | null
          id: string
          payload: Json | null
          response: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          direction: string
          endpoint?: string | null
          event_type?: string | null
          http_status?: number | null
          id?: string
          payload?: Json | null
          response?: Json | null
          status: string
        }
        Update: {
          created_at?: string
          direction?: string
          endpoint?: string | null
          event_type?: string | null
          http_status?: number | null
          id?: string
          payload?: Json | null
          response?: Json | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_directory: {
        Row: {
          name: string | null
          user_id: string | null
        }
        Insert: {
          name?: string | null
          user_id?: string | null
        }
        Update: {
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      access_request_status: "pending" | "approved" | "rejected"
      app_role: "admin" | "operator"
      approval_status: "pending" | "approved" | "rejected"
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
      access_request_status: ["pending", "approved", "rejected"],
      app_role: ["admin", "operator"],
      approval_status: ["pending", "approved", "rejected"],
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
