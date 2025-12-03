export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          organization_id: string | null
          created_at: string
          updated_at: string | null
          reminder_preferences: Json | null
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          organization_id?: string | null
          created_at?: string
          updated_at?: string | null
          reminder_preferences?: Json | null
        }
        Update: {
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          organization_id?: string | null
          created_at?: string
          updated_at?: string | null
          reminder_preferences?: Json | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          id: string
          owner_id: string
          team_id: string | null
          organization_id: string | null
          title: string
          status:
            | 'pending'
            | 'under_contract'
            | 'inspection'
            | 'financing'
            | 'closing'
            | 'closed'
            | 'cancelled'
          client_name: string | null
          property_address: string | null
          purchase_price: number | null
          closing_date: string | null
          signed_date: string | null
          storage_path: string | null
          counter_offer_path: string | null
          summary_path: string | null
          timeline: Json | null
          ai_summary: string | null
          referral_source: string | null
          is_counter_offer: boolean | null
          parent_contract_id: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          team_id?: string | null
          organization_id?: string | null
          title: string
          status?:
            | 'pending'
            | 'under_contract'
            | 'inspection'
            | 'financing'
            | 'closing'
            | 'closed'
            | 'cancelled'
          client_name?: string | null
          property_address?: string | null
          purchase_price?: number | null
          closing_date?: string | null
          signed_date?: string | null
          storage_path?: string | null
          counter_offer_path?: string | null
          summary_path?: string | null
          timeline?: Json | null
          ai_summary?: string | null
          referral_source?: string | null
          is_counter_offer?: boolean | null
          parent_contract_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          owner_id?: string
          team_id?: string | null
          organization_id?: string | null
          title?: string
          status?:
            | 'pending'
            | 'under_contract'
            | 'inspection'
            | 'financing'
            | 'closing'
            | 'closed'
            | 'cancelled'
          client_name?: string | null
          property_address?: string | null
          purchase_price?: number | null
          closing_date?: string | null
          signed_date?: string | null
          storage_path?: string | null
          counter_offer_path?: string | null
          summary_path?: string | null
          timeline?: Json | null
          ai_summary?: string | null
          referral_source?: string | null
          is_counter_offer?: boolean | null
          parent_contract_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'contracts_owner_id_fkey'
            columns: ['owner_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      teams: {
        Row: {
          id: string
          name: string
          owner_id: string
          organization_id: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          organization_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          name?: string
          owner_id?: string
          organization_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'teams_owner_id_fkey'
            columns: ['owner_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Update: {
          team_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey'
            columns: ['team_id']
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_members_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      organizations: {
        Row: {
          id: string
          name: string
          owner_id: string
          subscription_tier: 'starter' | 'pro' | 'enterprise'
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          subscription_tier?: 'starter' | 'pro' | 'enterprise'
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          name?: string
          owner_id?: string
          subscription_tier?: 'starter' | 'pro' | 'enterprise'
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'organizations_owner_id_fkey'
            columns: ['owner_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          product: 'starter' | 'pro' | 'enterprise'
          status: 'trialing' | 'active' | 'past_due' | 'canceled'
          renews_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          product?: 'starter' | 'pro' | 'enterprise'
          status?: 'trialing' | 'active' | 'past_due' | 'canceled'
          renews_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          product?: 'starter' | 'pro' | 'enterprise'
          status?: 'trialing' | 'active' | 'past_due' | 'canceled'
          renews_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_subscriptions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Enums: {
      contract_status: 'pending' | 'under_contract' | 'inspection' | 'financing' | 'closing' | 'closed' | 'cancelled'
      subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled'
      subscription_product: 'starter' | 'pro' | 'enterprise'
      member_role: 'owner' | 'admin' | 'member'
    }
    Functions: {}
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
