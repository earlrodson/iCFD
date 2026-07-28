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
      certificate_templates: {
        Row: {
          base_image_url: string
          path_slug: string
          placeholders: Json
          tier: string
          updated_at: string
        }
        Insert: {
          base_image_url: string
          path_slug: string
          placeholders: Json
          tier: string
          updated_at?: string
        }
        Update: {
          base_image_url?: string
          path_slug?: string
          placeholders?: Json
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_path_slug_fkey"
            columns: ["path_slug"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "certificate_templates_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "quiz_settings"
            referencedColumns: ["tier"]
          },
        ]
      }
      certificates: {
        Row: {
          id: string
          image_url: string | null
          issued_at: string
          path_slug: string
          pdf_url: string | null
          serial_code: string
          tier: string
          user_id: string
        }
        Insert: {
          id?: string
          image_url?: string | null
          issued_at?: string
          path_slug: string
          pdf_url?: string | null
          serial_code: string
          tier: string
          user_id: string
        }
        Update: {
          id?: string
          image_url?: string | null
          issued_at?: string
          path_slug?: string
          pdf_url?: string | null
          serial_code?: string
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_path_slug_fkey"
            columns: ["path_slug"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "certificates_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "quiz_settings"
            referencedColumns: ["tier"]
          },
        ]
      }
      church_document_meta: {
        Row: {
          author: string | null
          description: string | null
          free_access: boolean | null
          slug: string
          sort_order: number | null
          subtitle: string | null
          title: string
          year: number | null
        }
        Insert: {
          author?: string | null
          description?: string | null
          free_access?: boolean | null
          slug: string
          sort_order?: number | null
          subtitle?: string | null
          title: string
          year?: number | null
        }
        Update: {
          author?: string | null
          description?: string | null
          free_access?: boolean | null
          slug?: string
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          year?: number | null
        }
        Relationships: []
      }
      church_documents: {
        Row: {
          created_at: string | null
          id: number
          section_label: string | null
          section_num: number
          slug: string
          summary: string | null
          text: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          section_label?: string | null
          section_num: number
          slug: string
          summary?: string | null
          text?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          section_label?: string | null
          section_num?: number
          slug?: string
          summary?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_church_documents_meta"
            columns: ["slug"]
            isOneToOne: false
            referencedRelation: "church_document_meta"
            referencedColumns: ["slug"]
          },
        ]
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
      course_progress: {
        Row: {
          passed_at: string
          tier: string
          topic_id: string
          user_id: string
        }
        Insert: {
          passed_at: string
          tier: string
          topic_id: string
          user_id: string
        }
        Update: {
          passed_at?: string
          tier?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "quiz_settings"
            referencedColumns: ["tier"]
          },
        ]
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
      page_views: {
        Row: {
          country: string | null
          created_at: string
          device_type: string | null
          duration_ms: number | null
          id: number
          path: string
          referrer_path: string | null
          region: string | null
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_ms?: number | null
          id?: number
          path: string
          referrer_path?: string | null
          region?: string | null
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_ms?: number | null
          id?: number
          path?: string
          referrer_path?: string | null
          region?: string | null
          user_id?: string | null
          visitor_id?: string
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
      quiz_attempts: {
        Row: {
          answers: Json
          attempted_at: string
          id: string
          passed: boolean
          question_ids: Json
          score_percent: number
          tier: string
          topic_id: string
          user_id: string
        }
        Insert: {
          answers: Json
          attempted_at?: string
          id?: string
          passed: boolean
          question_ids: Json
          score_percent: number
          tier: string
          topic_id: string
          user_id: string
        }
        Update: {
          answers?: Json
          attempted_at?: string
          id?: string
          passed?: boolean
          question_ids?: Json
          score_percent?: number
          tier?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "quiz_settings"
            referencedColumns: ["tier"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          active: boolean
          choices: Json
          correct_index: number
          created_at: string
          id: number
          path_slug: string | null
          question: string
          tier: string
          topic_id: string
        }
        Insert: {
          active?: boolean
          choices: Json
          correct_index: number
          created_at?: string
          id?: number
          path_slug?: string | null
          question: string
          tier: string
          topic_id: string
        }
        Update: {
          active?: boolean
          choices?: Json
          correct_index?: number
          created_at?: string
          id?: number
          path_slug?: string | null
          question?: string
          tier?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "quiz_settings"
            referencedColumns: ["tier"]
          },
          {
            foreignKeyName: "quiz_questions_path_slug_fkey"
            columns: ["path_slug"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["slug"]
          },
        ]
      }
      quiz_settings: {
        Row: {
          bank_size: number
          item_count: number
          pass_percent: number
          tier: string
          updated_at: string
        }
        Insert: {
          bank_size: number
          item_count: number
          pass_percent: number
          tier: string
          updated_at?: string
        }
        Update: {
          bank_size?: number
          item_count?: number
          pass_percent?: number
          tier?: string
          updated_at?: string
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
      theological_terms: {
        Row: {
          created_at: string | null
          debate_note: string | null
          definition: string
          keywords: string | null
          language: string
          pronunciation: string | null
          root_meaning: string
          root_text: string | null
          slug: string
          term: string
        }
        Insert: {
          created_at?: string | null
          debate_note?: string | null
          definition: string
          keywords?: string | null
          language?: string
          pronunciation?: string | null
          root_meaning: string
          root_text?: string | null
          slug: string
          term: string
        }
        Update: {
          created_at?: string | null
          debate_note?: string | null
          definition?: string
          keywords?: string | null
          language?: string
          pronunciation?: string | null
          root_meaning?: string
          root_text?: string | null
          slug?: string
          term?: string
        }
        Relationships: []
      }
      topic_document_refs: {
        Row: {
          created_at: string | null
          doc_slug: string
          id: number
          section_label: string | null
          section_num: number
          topic_id: string
        }
        Insert: {
          created_at?: string | null
          doc_slug: string
          id?: number
          section_label?: string | null
          section_num: number
          topic_id: string
        }
        Update: {
          created_at?: string | null
          doc_slug?: string
          id?: number
          section_label?: string | null
          section_num?: number
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_document_refs_doc_slug_fkey"
            columns: ["doc_slug"]
            isOneToOne: false
            referencedRelation: "church_document_meta"
            referencedColumns: ["slug"]
          },
        ]
      }
      topic_terms: {
        Row: {
          term_slug: string
          topic_id: string
        }
        Insert: {
          term_slug: string
          topic_id: string
        }
        Update: {
          term_slug?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_terms_term_slug_fkey"
            columns: ["term_slug"]
            isOneToOne: false
            referencedRelation: "theological_terms"
            referencedColumns: ["slug"]
          },
        ]
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
          age: number | null
          avatar_url: string | null
          bible_version: string
          certifications: string[] | null
          cfd_id_image_path: string | null
          chapter: string | null
          diocese: string | null
          display_name: string | null
          first_name: string | null
          font_size: string
          is_cfd_member: boolean
          language: string
          last_name: string | null
          location: string | null
          membership_date: string | null
          membership_expiration: string | null
          mobile_number: string | null
          role: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bible_version?: string
          certifications?: string[] | null
          cfd_id_image_path?: string | null
          chapter?: string | null
          diocese?: string | null
          display_name?: string | null
          first_name?: string | null
          font_size?: string
          is_cfd_member?: boolean
          language?: string
          last_name?: string | null
          location?: string | null
          membership_date?: string | null
          membership_expiration?: string | null
          mobile_number?: string | null
          role?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bible_version?: string
          certifications?: string[] | null
          cfd_id_image_path?: string | null
          chapter?: string | null
          diocese?: string | null
          display_name?: string | null
          first_name?: string | null
          font_size?: string
          is_cfd_member?: boolean
          language?: string
          last_name?: string | null
          location?: string | null
          membership_date?: string | null
          membership_expiration?: string | null
          mobile_number?: string | null
          role?: string
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
      get_all_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          role: string
        }[]
      }
      get_topic_analytics: {
        Args: { filter_user_id?: string }
        Returns: {
          category: string
          lang: string
          reader_count: number
          title: string
          topic_id: string
          view_count: number
        }[]
      }
      get_user_activity_summary: {
        Args: never
        Returns: {
          email: string
          last_active: string
          topic_views: number
          topics_read: number
          user_id: string
        }[]
      }
      get_page_analytics: {
        Args: { days_back?: number }
        Returns: {
          avg_duration_seconds: number
          path: string
          unique_visitors: number
          view_count: number
        }[]
      }
      get_navigation_flow: {
        Args: { days_back?: number }
        Returns: {
          from_path: string
          to_path: string
          transition_count: number
        }[]
      }
      get_geo_analytics: {
        Args: { days_back?: number }
        Returns: {
          country: string
          region: string
          unique_visitors: number
          view_count: number
        }[]
      }
      get_visitor_summary: {
        Args: { days_back?: number }
        Returns: {
          avg_visit_duration_seconds: number
          guest_views: number
          guest_visitors: number
          registered_views: number
          registered_visitors: number
          total_views: number
        }[]
      }
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
