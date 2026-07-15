/**
 * Database types — mirrors drizzle/schema.ts.
 * Regenerate with: npx supabase gen types typescript --project-id gdobgalhdepfpxexssvq > lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      topics: {
        Row: {
          id: string
          lang: 'en' | 'tl' | 'ceb'
          category: 'sacraments' | 'mary' | 'papacy' | 'salvation' | 'bible' | 'saints' | 'tradition' | 'church-teaching'
          title: string
          question: string
          answer: Json
          citations: Json | null
          scripture: Json | null
          catechism: Json | null
          church_fathers: Json | null
          tags: Json
          difficulty: 'beginner' | 'intermediate' | 'advanced'
          related_topics: Json | null
          last_updated: string
          last_reviewed: string | null
          created_at: string
        }
        Insert: {
          id: string
          lang: 'en' | 'tl' | 'ceb'
          category: 'sacraments' | 'mary' | 'papacy' | 'salvation' | 'bible' | 'saints' | 'tradition' | 'church-teaching'
          title: string
          question: string
          answer: Json
          citations?: Json | null
          scripture?: Json | null
          catechism?: Json | null
          church_fathers?: Json | null
          tags: Json
          difficulty: 'beginner' | 'intermediate' | 'advanced'
          related_topics?: Json | null
          last_updated: string
          last_reviewed?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['topics']['Insert']>
        Relationships: []
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          topic_id: string
          added_at: string
        }
        Insert: {
          id?: string
          user_id: string
          topic_id: string
          added_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic_id?: string
          added_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          id: string
          user_id: string
          topic_id: string
          text: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          topic_id: string
          text: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      read_progress: {
        Row: {
          id: string
          user_id: string
          topic_id: string
          read_at: string
        }
        Insert: {
          id?: string
          user_id: string
          topic_id: string
          read_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic_id?: string
          read_at?: string
        }
        Relationships: []
      }
      view_history: {
        Row: {
          id: string
          user_id: string
          topic_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          topic_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          user_id: string
          role: 'user' | 'editor' | 'admin'
          display_name: string | null
          avatar_url: string | null
          language: 'en' | 'tl' | 'ceb'
          theme: 'light' | 'dark' | 'system'
          font_size: 'small' | 'medium' | 'large'
          updated_at: string
        }
        Insert: {
          user_id: string
          role?: 'user' | 'editor' | 'admin'
          display_name?: string | null
          avatar_url?: string | null
          language?: 'en' | 'tl' | 'ceb'
          theme?: 'light' | 'dark' | 'system'
          font_size?: 'small' | 'medium' | 'large'
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_settings']['Insert']>
        Relationships: []
      }
      site_config: {
        Row: {
          key: string
          value: string
          description: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value: string
          description?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['site_config']['Insert']>
        Relationships: []
      }
      paths: {
        Row: {
          slug: string
          title: string
          description: string
          audience: string
          estimated_minutes: number
          difficulty: 'beginner' | 'intermediate' | 'advanced'
          icon: string
          created_at: string
        }
        Insert: {
          slug: string
          title: string
          description: string
          audience: string
          estimated_minutes: number
          difficulty: 'beginner' | 'intermediate' | 'advanced'
          icon: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['paths']['Insert']>
        Relationships: []
      }
      path_topics: {
        Row: {
          path_slug: string
          topic_id: string
          position: number
        }
        Insert: {
          path_slug: string
          topic_id: string
          position: number
        }
        Update: Partial<Database['public']['Tables']['path_topics']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
