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
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      background_music_tracks: {
        Row: {
          created_at: string
          file_path: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      channel_upload_locks: {
        Row: {
          channel_id: string
          lock_acquired_at: string
          locked_by_video_id: string | null
          locked_until: string
          next_allowed_upload_at: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          lock_acquired_at?: string
          locked_by_video_id?: string | null
          locked_until?: string
          next_allowed_upload_at?: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          lock_acquired_at?: string
          locked_by_video_id?: string | null
          locked_until?: string
          next_allowed_upload_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      long_form_projects: {
        Row: {
          background_music_category: string | null
          background_music_source: string | null
          background_music_url: string | null
          brief_description: string | null
          channel_id: string | null
          clips_metadata: Json | null
          created_at: string
          error_message: string | null
          final_video_path: string | null
          id: string
          processing_progress: number | null
          published_at: string | null
          reference_urls: Json
          scheduled_publish_at: string | null
          scheduling_delay: number | null
          scheduling_mode: string | null
          script: string | null
          script_source: string | null
          status: string
          target_duration_seconds: number
          thumbnail_path: string | null
          topic: string
          updated_at: string
          user_id: string
          video_filter: string | null
          voiceover_path: string | null
          youtube_category: string | null
          youtube_chapters: Json | null
          youtube_description: string | null
          youtube_embeddable: boolean | null
          youtube_made_for_kids: boolean | null
          youtube_notify_subscribers: boolean | null
          youtube_privacy: string | null
          youtube_tags: string[] | null
          youtube_title: string | null
          youtube_video_id: string | null
        }
        Insert: {
          background_music_category?: string | null
          background_music_source?: string | null
          background_music_url?: string | null
          brief_description?: string | null
          channel_id?: string | null
          clips_metadata?: Json | null
          created_at?: string
          error_message?: string | null
          final_video_path?: string | null
          id?: string
          processing_progress?: number | null
          published_at?: string | null
          reference_urls?: Json
          scheduled_publish_at?: string | null
          scheduling_delay?: number | null
          scheduling_mode?: string | null
          script?: string | null
          script_source?: string | null
          status?: string
          target_duration_seconds?: number
          thumbnail_path?: string | null
          topic: string
          updated_at?: string
          user_id: string
          video_filter?: string | null
          voiceover_path?: string | null
          youtube_category?: string | null
          youtube_chapters?: Json | null
          youtube_description?: string | null
          youtube_embeddable?: boolean | null
          youtube_made_for_kids?: boolean | null
          youtube_notify_subscribers?: boolean | null
          youtube_privacy?: string | null
          youtube_tags?: string[] | null
          youtube_title?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          background_music_category?: string | null
          background_music_source?: string | null
          background_music_url?: string | null
          brief_description?: string | null
          channel_id?: string | null
          clips_metadata?: Json | null
          created_at?: string
          error_message?: string | null
          final_video_path?: string | null
          id?: string
          processing_progress?: number | null
          published_at?: string | null
          reference_urls?: Json
          scheduled_publish_at?: string | null
          scheduling_delay?: number | null
          scheduling_mode?: string | null
          script?: string | null
          script_source?: string | null
          status?: string
          target_duration_seconds?: number
          thumbnail_path?: string | null
          topic?: string
          updated_at?: string
          user_id?: string
          video_filter?: string | null
          voiceover_path?: string | null
          youtube_category?: string | null
          youtube_chapters?: Json | null
          youtube_description?: string | null
          youtube_embeddable?: boolean | null
          youtube_made_for_kids?: boolean | null
          youtube_notify_subscribers?: boolean | null
          youtube_privacy?: string | null
          youtube_tags?: string[] | null
          youtube_title?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "long_form_projects_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          channel_id: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          is_short: boolean | null
          published_at: string | null
          scheduled_publish_at: string | null
          source_type: string
          source_url: string
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
          video_file_path: string | null
          youtube_video_id: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          is_short?: boolean | null
          published_at?: string | null
          scheduled_publish_at?: string | null
          source_type: string
          source_url: string
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          video_file_path?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          is_short?: boolean | null
          published_at?: string | null
          scheduled_publish_at?: string | null
          source_type?: string
          source_url?: string
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          video_file_path?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_channels: {
        Row: {
          access_token: string
          channel_id: string
          channel_thumbnail: string | null
          channel_title: string
          created_at: string
          id: string
          is_active: boolean | null
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          channel_id: string
          channel_thumbnail?: string | null
          channel_title: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          channel_id?: string
          channel_thumbnail?: string | null
          channel_title?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
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
