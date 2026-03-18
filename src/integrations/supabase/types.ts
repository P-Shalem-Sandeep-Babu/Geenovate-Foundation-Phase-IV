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
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          approved_by_ceo: boolean
          approved_by_delegate: boolean
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_sticky: boolean
          priority: Database["public"]["Enums"]["announcement_priority"]
          target_category: Database["public"]["Enums"]["category_type"] | null
          target_cohort_id: string | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_type"]
        }
        Insert: {
          approved_by_ceo?: boolean
          approved_by_delegate?: boolean
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_sticky?: boolean
          priority?: Database["public"]["Enums"]["announcement_priority"]
          target_category?: Database["public"]["Enums"]["category_type"] | null
          target_cohort_id?: string | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_type"]
        }
        Update: {
          approved_by_ceo?: boolean
          approved_by_delegate?: boolean
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_sticky?: boolean
          priority?: Database["public"]["Enums"]["announcement_priority"]
          target_category?: Database["public"]["Enums"]["category_type"] | null
          target_cohort_id?: string | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_type"]
        }
        Relationships: [
          {
            foreignKeyName: "announcements_target_cohort_id_fkey"
            columns: ["target_cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cohort_files: {
        Row: {
          cohort_id: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          is_important: boolean
          restricted: boolean
          uploaded_by: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number
          file_type: string
          file_url: string
          id?: string
          is_important?: boolean
          restricted?: boolean
          uploaded_by: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          is_important?: boolean
          restricted?: boolean
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_files_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_members: {
        Row: {
          cohort_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_members_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_archived: boolean
          mentor_id: string | null
          name: string
          skills: string | null
          start_date: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_archived?: boolean
          mentor_id?: string | null
          name: string
          skills?: string | null
          start_date?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_archived?: boolean
          mentor_id?: string | null
          name?: string
          skills?: string | null
          start_date?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      performance_scores: {
        Row: {
          attendance_score: number
          cohort_id: string | null
          computed_at: string
          id: string
          is_at_risk: boolean
          overall_score: number
          period_end: string
          period_start: string
          task_score: number
          update_score: number
          user_id: string
        }
        Insert: {
          attendance_score?: number
          cohort_id?: string | null
          computed_at?: string
          id?: string
          is_at_risk?: boolean
          overall_score?: number
          period_end: string
          period_start: string
          task_score?: number
          update_score?: number
          user_id: string
        }
        Update: {
          attendance_score?: number
          cohort_id?: string | null
          computed_at?: string
          id?: string
          is_at_risk?: boolean
          overall_score?: number
          period_end?: string
          period_start?: string
          task_score?: number
          update_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_scores_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          module: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          module: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category: Database["public"]["Enums"]["category_type"] | null
          created_at: string
          email: string
          full_name: string
          id: string
          must_change_password: boolean
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category?: Database["public"]["Enums"]["category_type"] | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          must_change_password?: boolean
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category?: Database["public"]["Enums"]["category_type"] | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          cohort_id: string | null
          created_at: string
          id: string
          title: string
          type: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          cohort_id?: string | null
          created_at?: string
          id?: string
          title: string
          type: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          cohort_id?: string | null
          created_at?: string
          id?: string
          title?: string
          type?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_ideas: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          problem: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          solution: string
          stage: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          problem: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          solution: string
          stage?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          problem?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          solution?: string
          stage?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_ideas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          startup_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          startup_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          startup_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_members_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_pitches: {
        Row: {
          created_at: string
          demo_date: string | null
          feedback: string | null
          id: string
          pitch_link: string
          startup_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          demo_date?: string | null
          feedback?: string | null
          id?: string
          pitch_link: string
          startup_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          demo_date?: string | null
          feedback?: string | null
          id?: string
          pitch_link?: string
          startup_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_pitches_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_submissions: {
        Row: {
          id: string
          startup_id: string
          submission_link: string
          submitted_at: string
          submitted_by: string | null
          title: string
        }
        Insert: {
          id?: string
          startup_id: string
          submission_link: string
          submitted_at?: string
          submitted_by?: string | null
          title: string
        }
        Update: {
          id?: string
          startup_id?: string
          submission_link?: string
          submitted_at?: string
          submitted_by?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_submissions_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          startup_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          startup_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          startup_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_tasks_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_scores: {
        Row: {
          created_at: string
          execution_score: number
          feedback: string | null
          id: string
          innovation_score: number
          market_score: number
          reviewer_id: string
          startup_id: string
          team_score: number
          total_score: number
        }
        Insert: {
          created_at?: string
          execution_score: number
          feedback?: string | null
          id?: string
          innovation_score: number
          market_score: number
          reviewer_id: string
          startup_id: string
          team_score: number
        }
        Update: {
          created_at?: string
          execution_score?: number
          feedback?: string | null
          id?: string
          innovation_score?: number
          market_score?: number
          reviewer_id?: string
          startup_id?: string
          team_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "startup_scores_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startups: {
        Row: {
          cohort_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          domain: string | null
          funding_received: number | null
          funding_type: string | null
          id: string
          logo_url: string | null
          mentor_id: string | null
          name: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          stage: string | null
          status: string
          support_notes: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          cohort_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain?: string | null
          funding_received?: number | null
          funding_type?: string | null
          id?: string
          logo_url?: string | null
          mentor_id?: string | null
          name: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          stage?: string | null
          status?: string
          support_notes?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          cohort_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain?: string | null
          funding_received?: number | null
          funding_type?: string | null
          id?: string
          logo_url?: string | null
          mentor_id?: string | null
          name?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          stage?: string | null
          status?: string
          support_notes?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startups_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_feedback: {
        Row: {
          comment: string
          created_at: string
          id: string
          mentor_id: string
          rating: number
          submission_id: string
          updated_at: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          mentor_id: string
          rating: number
          submission_id: string
          updated_at?: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          mentor_id?: string
          rating?: number
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_feedback_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          submission_link: string
          submitted_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          submission_link: string
          submitted_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          submission_link?: string
          submitted_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          approved_by_ceo: boolean
          assigned_category: Database["public"]["Enums"]["category_type"] | null
          assigned_to: string | null
          cohort_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          priority: string
          proof_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_by_ceo?: boolean
          assigned_category?:
            | Database["public"]["Enums"]["category_type"]
            | null
          assigned_to?: string | null
          cohort_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          priority?: string
          proof_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_by_ceo?: boolean
          assigned_category?:
            | Database["public"]["Enums"]["category_type"]
            | null
          assigned_to?: string | null
          cohort_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          priority?: string
          proof_url?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      weekly_updates: {
        Row: {
          challenges: string | null
          cohort_id: string | null
          created_at: string
          id: string
          next_goals: string
          submitted_at: string
          support_needed: string | null
          user_id: string
          week_start: string
          work_completed: string
        }
        Insert: {
          challenges?: string | null
          cohort_id?: string | null
          created_at?: string
          id?: string
          next_goals: string
          submitted_at?: string
          support_needed?: string | null
          user_id: string
          week_start: string
          work_completed: string
        }
        Update: {
          challenges?: string | null
          cohort_id?: string | null
          created_at?: string
          id?: string
          next_goals?: string
          submitted_at?: string
          support_needed?: string | null
          user_id?: string
          week_start?: string
          work_completed?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_updates_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          name: string
        }[]
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      log_audit: {
        Args: { _action: string; _details?: Json; _user_id?: string }
        Returns: undefined
      }
    }
    Enums: {
      announcement_priority: "high" | "medium" | "low"
      app_role: "super_admin" | "category_admin" | "member" | "viewer"
      category_type: "startups" | "innovation_associates" | "catalysts"
      user_status: "active" | "inactive" | "suspended" | "alumni"
      visibility_type: "public" | "internal" | "category" | "cohort"
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
      announcement_priority: ["high", "medium", "low"],
      app_role: ["super_admin", "category_admin", "member", "viewer"],
      category_type: ["startups", "innovation_associates", "catalysts"],
      user_status: ["active", "inactive", "suspended", "alumni"],
      visibility_type: ["public", "internal", "category", "cohort"],
    },
  },
} as const
