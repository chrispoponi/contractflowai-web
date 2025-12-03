export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          email_notifications_enabled: boolean
          subscription_status: string
          subscription_expires_at: string | null
          reminder_inspection_days: number[] | null
          reminder_closing_days: number[] | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
        }
        Update: {
          full_name?: string | null
        }
      }
      contracts: {
        Row: any
        Insert: any
        Update: any
      }
      organizations: {
        Row: any
        Insert: any
        Update: any
      }
      teams: {
        Row: any
        Insert: any
        Update: any
      }
      team_members: {
        Row: any
        Insert: any
        Update: any
      }
      user_subscriptions: {
        Row: any
        Insert: any
        Update: any
      }
      referrals: {
        Row: any
        Insert: any
        Update: any
      }
    }
    Functions: {}
    Enums: {}
  }
}
