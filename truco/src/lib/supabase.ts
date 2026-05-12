import { createClient } from '@supabase/supabase-js'

// The anon key is *meant* to be public — RLS policies on the server
// constrain what it can do. Don't paste the service_role key here.
const SUPABASE_URL = 'https://dlsjrcmdxanttglbyugx.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsc2pyY21keGFudHRnbGJ5dWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDQwMTUsImV4cCI6MjA5MzQ4MDAxNX0.vq6Urs8cNutEHG1jxy4PsOwwsijktJR24A4w15rj1VM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 8 } },
})

// ─── Database row shapes ───────────────────────────────────────

export interface PlayerRow {
  id: string
  name: string
  joined_at: string
  retired_at: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  photo_url?: string | null
  venmo?: string | null
  zelle?: string | null
  auth_user_id?: string | null
}

export interface MatchRow {
  id: string
  started_at: string
  finished_at: string | null
  team_a_name: string
  team_a_player_ids: string[]
  team_b_name: string
  team_b_player_ids: string[]
  score_a: number
  score_b: number
  winner: 'A' | 'B' | null
  abandoned: boolean
  // Optional — null on pre-seats matches, length 6 on 3v3.
  seats?: string[] | null
}

export interface EventRow {
  id: number
  match_id: string
  team: 'A' | 'B'
  points: number
  reason: string
  round_mode: 'redondo' | 'picapica'
  at: string
}

export interface AppStateRow {
  id: 'singleton'
  active_match_id: string | null
}
