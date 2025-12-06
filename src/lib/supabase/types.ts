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
          brokerage_name: string | null
          role: string | null
          subscription_tier: string | null
          subscription_status: string | null
          subscription_expires_at: string | null
          trial_end_date: string | null
          subscription_notes: string | null
          stripe_customer_id: string | null
          email_notifications_enabled: boolean
          reminder_inspection_days: number[] | null
          reminder_closing_days: number[] | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          brokerage_name?: string | null
          role?: string | null
          subscription_tier?: string | null
          subscription_status?: string | null
          subscription_expires_at?: string | null
          trial_end_date?: string | null
          subscription_notes?: string | null
          stripe_customer_id?: string | null
          email_notifications_enabled?: boolean
          reminder_inspection_days?: number[] | null
          reminder_closing_days?: number[] | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      contracts: {
        Row: {
          id: string
          user_id: string
          property_address: string | null
          title: string | null
          contract_date: string | null
          closing_date: string | null
          inspection_date: string | null
          inspection_response_date: string | null
          loan_contingency_date: string | null
          appraisal_date: string | null
          final_walkthrough_date: string | null
          status: string | null
          representing_side: string | null
          buyer_email: string | null
          buyer_phone: string | null
          buyer_name: string | null
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
          inspection_completed: boolean | null
          inspection_response_completed: boolean | null
          appraisal_completed: boolean | null
          loan_contingency_completed: boolean | null
          final_walkthrough_completed: boolean | null
          closing_completed: boolean | null
          created_at: string
          updated_at?: string | null
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
      client_updates: {
        Row: {
          id: string
          user_id: string
          contract_id: string
          client_email: string | null
          client_phone: string | null
          update_type: string
          message: string | null
          send_method: string | null
          sent_date: string | null
          is_sent: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['client_updates']['Row']>
        Update: Partial<Database['public']['Tables']['client_updates']['Row']>
      }
    }
  }
}
