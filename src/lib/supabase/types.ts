export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          subscription_status: string | null
          subscription_expires_at: string | null
          email_notifications_enabled: boolean
          reminder_inspection_days: number[] | null
          reminder_closing_days: number[] | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          subscription_status?: string | null
          subscription_expires_at?: string | null
          email_notifications_enabled?: boolean
          reminder_inspection_days?: number[] | null
          reminder_closing_days?: number[] | null
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      contracts: {
        Row: {
          id: string
          user_id: string
          property_address: string | null
          contract_date: string | null
          closing_date: string | null
          inspection_date: string | null
          inspection_response_date: string | null
          loan_contingency_date: string | null
          appraisal_date: string | null
          final_walkthrough_date: string | null
          status: string | null
          is_counter_offer: boolean
          original_contract_id: string | null
          counter_offer_number: number | null
          all_parties_signed: boolean
          signature_date: string | null
          cancellation_reason: string | null
          cancellation_notes: string | null
          cancellation_date: string | null
          purchase_price: number | null
          earnest_money: number | null
          agent_notes: string | null
          contract_file_url: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['contracts']['Row']>
        Update: Partial<Database['public']['Tables']['contracts']['Row']>
      }
      teams: {
        Row: {
          id: string
          owner_id: string
          name: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['teams']['Row']>
        Update: Partial<Database['public']['Tables']['teams']['Row']>
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: string | null
        }
        Insert: Partial<Database['public']['Tables']['team_members']['Row']>
        Update: Partial<Database['public']['Tables']['team_members']['Row']>
      }
      organizations: {
        Row: {
          id: string
          owner_id: string
          name: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['organizations']['Row']>
        Update: Partial<Database['public']['Tables']['organizations']['Row']>
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          plan: string
          status: string
          expires_at: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['user_subscriptions']['Row']>
        Update: Partial<Database['public']['Tables']['user_subscriptions']['Row']>
      }
      referrals: {
        Row: {
          id: string
          referrer_email: string
          referred_email: string | null
          ref_code: string
          status: string
          reward_issued: boolean
          created_date: string
        }
        Insert: Partial<Database['public']['Tables']['referrals']['Row']>
        Update: Partial<Database['public']['Tables']['referrals']['Row']>
      }
    }
  }
}
