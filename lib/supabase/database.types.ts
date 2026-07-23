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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          email: string
          granted_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          granted_by?: string | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          granted_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      canons: {
        Row: {
          book: string | null
          canon: number
          lang: string
          summary: string | null
          text: string
        }
        Insert: {
          book?: string | null
          canon: number
          lang?: string
          summary?: string | null
          text: string
        }
        Update: {
          book?: string | null
          canon?: number
          lang?: string
          summary?: string | null
          text?: string
        }
        Relationships: []
      }
      ccc_paragraphs: {
        Row: {
          article: string | null
          chapter_title: string | null
          lang: string
          paragraph: number
          part: string | null
          section: string | null
          summary: string | null
          text: string | null
        }
        Insert: {
          article?: string | null
          chapter_title?: string | null
          lang?: string
          paragraph: number
          part?: string | null
          section?: string | null
          summary?: string | null
          text?: string | null
        }
        Update: {
          article?: string | null
          chapter_title?: string | null
          lang?: string
          paragraph?: number
          part?: string | null
          section?: string | null
          summary?: string | null
          text?: string | null
        }
        Relationships: []
      }
      church_father_quotes: {
        Row: {
          author: string
          id: number
          quote: string
          source: string
          year_approx: number | null
        }
        Insert: {
          author: string
          id?: number
          quote: string
          source: string
          year_approx?: number | null
        }
        Update: {
          author?: string
          id?: number
          quote?: string
          source?: string
          year_approx?: number | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          added_at: string
          id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          topic_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: []
      }
      girm_articles: {
        Row: {
          article: number
          lang: string
          section: string | null
          summary: string | null
          text: string
        }
        Insert: {
          article: number
          lang?: string
          section?: string | null
          summary?: string | null
          text: string
        }
        Update: {
          article?: number
          lang?: string
          section?: string | null
          summary?: string | null
          text?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          id: string
          text: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          text?: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          text?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      path_topics: {
        Row: {
          path_slug: string
          position: number
          topic_id: string
        }
        Insert: {
          path_slug: string
          position: number
          topic_id: string
        }
        Update: {
          path_slug?: string
          position?: number
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "path_topics_path_slug_paths_slug_fk"
            columns: ["path_slug"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["slug"]
          },
        ]
      }
      paths: {
        Row: {
          audience: string
          created_at: string
          deleted_at: string | null
          description: string
          difficulty: string
          estimated_minutes: number
          icon: string
          pinned: boolean
          quiz_mode: string
          slug: string
          title: string
        }
        Insert: {
          audience: string
          created_at?: string
          deleted_at?: string | null
          description: string
          difficulty: string
          estimated_minutes: number
          icon: string
          pinned?: boolean
          quiz_mode?: string
          slug: string
          title: string
        }
        Update: {
          audience?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          difficulty?: string
          estimated_minutes?: number
          icon?: string
          pinned?: boolean
          quiz_mode?: string
          slug?: string
          title?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string | null
        }
        Relationships: []
      }
      quiz_settings: {
        Row: {
          tier: string
          item_count: number
          bank_size: number
          pass_percent: number
          updated_at: string
        }
        Insert: {
          tier: string
          item_count: number
          bank_size: number
          pass_percent: number
          updated_at?: string
        }
        Update: {
          tier?: string
          item_count?: number
          bank_size?: number
          pass_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          id: number
          topic_id: string
          tier: string
          question: string
          choices: Json
          correct_index: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          topic_id: string
          tier: string
          question: string
          choices: Json
          correct_index: number
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          topic_id?: string
          tier?: string
          question?: string
          choices?: Json
          correct_index?: number
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          id: string
          user_id: string
          topic_id: string
          tier: string
          question_ids: Json
          answers: Json
          score_percent: number
          passed: boolean
          attempted_at: string
        }
        Insert: {
          id?: string
          user_id: string
          topic_id: string
          tier: string
          question_ids: Json
          answers: Json
          score_percent: number
          passed: boolean
          attempted_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic_id?: string
          tier?: string
          question_ids?: Json
          answers?: Json
          score_percent?: number
          passed?: boolean
          attempted_at?: string
        }
        Relationships: []
      }
      course_progress: {
        Row: {
          user_id: string
          topic_id: string
          tier: string
          passed_at: string
        }
        Insert: {
          user_id: string
          topic_id: string
          tier: string
          passed_at: string
        }
        Update: {
          user_id?: string
          topic_id?: string
          tier?: string
          passed_at?: string
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          tier: string
          base_image_url: string
          placeholders: Json
          updated_at: string
        }
        Insert: {
          tier: string
          base_image_url: string
          placeholders: Json
          updated_at?: string
        }
        Update: {
          tier?: string
          base_image_url?: string
          placeholders?: Json
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          id: string
          user_id: string
          tier: string
          serial_code: string
          issued_at: string
          pdf_url: string
          image_url: string
        }
        Insert: {
          id?: string
          user_id: string
          tier: string
          serial_code: string
          issued_at?: string
          pdf_url: string
          image_url: string
        }
        Update: {
          id?: string
          user_id?: string
          tier?: string
          serial_code?: string
          issued_at?: string
          pdf_url?: string
          image_url?: string
        }
        Relationships: []
      }
      read_progress: {
        Row: {
          id: string
          read_at: string
          topic_id: string
          user_id: string
        }
        Insert: {
          id?: string
          read_at?: string
          topic_id: string
          user_id: string
        }
        Update: {
          id?: string
          read_at?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: []
      }
      scripture_verses: {
        Row: {
          book: string | null
          book_code: string | null
          chapter: number | null
          id: number
          reference: string
          text: string
          verse_end: number | null
          verse_start: number | null
          version: string
        }
        Insert: {
          book?: string | null
          book_code?: string | null
          chapter?: number | null
          id?: number
          reference: string
          text: string
          verse_end?: number | null
          verse_start?: number | null
          version?: string
        }
        Update: {
          book?: string | null
          book_code?: string | null
          chapter?: number | null
          id?: number
          reference?: string
          text?: string
          verse_end?: number | null
          verse_start?: number | null
          version?: string
        }
        Relationships: []
      }
      site_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          answer: string
          category: string
          created_at: string
          difficulty: string
          id: string
          question: string
          scripture_refs: string | null
          status: string
          submitted_by: string | null
          submitter_notes: string | null
          title: string
        }
        Insert: {
          answer: string
          category: string
          created_at?: string
          difficulty: string
          id?: string
          question: string
          scripture_refs?: string | null
          status?: string
          submitted_by?: string | null
          submitter_notes?: string | null
          title: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          difficulty?: string
          id?: string
          question?: string
          scripture_refs?: string | null
          status?: string
          submitted_by?: string | null
          submitter_notes?: string | null
          title?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          answer: Json
          answer_full: string | null
          catechism: Json | null
          category: string
          church_fathers: Json | null
          citations: Json | null
          cover_image: string | null
          created_at: string
          difficulty: string
          id: string
          is_recommended: boolean
          lang: string
          last_reviewed: string | null
          last_updated: string
          objections: Json | null
          published: boolean
          question: string
          related_topics: Json | null
          scripture: Json | null
          tags: Json
          title: string
          translation_notes: string | null
          translation_source: string
        }
        Insert: {
          answer: Json
          answer_full?: string | null
          catechism?: Json | null
          category: string
          church_fathers?: Json | null
          citations?: Json | null
          cover_image?: string | null
          created_at?: string
          difficulty: string
          id: string
          is_recommended?: boolean
          lang: string
          last_reviewed?: string | null
          last_updated: string
          objections?: Json | null
          published?: boolean
          question: string
          related_topics?: Json | null
          scripture?: Json | null
          tags?: Json
          title: string
          translation_notes?: string | null
          translation_source?: string
        }
        Update: {
          answer?: Json
          answer_full?: string | null
          catechism?: Json | null
          category?: string
          church_fathers?: Json | null
          citations?: Json | null
          cover_image?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          is_recommended?: boolean
          lang?: string
          last_reviewed?: string | null
          last_updated?: string
          objections?: Json | null
          published?: boolean
          question?: string
          related_topics?: Json | null
          scripture?: Json | null
          tags?: Json
          title?: string
          translation_notes?: string | null
          translation_source?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          bible_version: string
          font_size: string
          language: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bible_version?: string
          font_size?: string
          language?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bible_version?: string
          font_size?: string
          language?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      view_history: {
        Row: {
          id: string
          topic_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          topic_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          topic_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
