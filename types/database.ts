export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'member' | 'trainer';
export type FitnessGoal = 'muscle_gain' | 'fat_loss' | 'strength' | 'general_fitness' | 'endurance';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type AssessmentStatus = 'uploaded' | 'extracting' | 'needs_review' | 'pending_trainer_review' | 'verified' | 'failed';
export type PlanStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'revision_requested' | 'archived';
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';
export type SegmentalRegion = 'left_arm' | 'right_arm' | 'trunk' | 'left_leg' | 'right_leg';
export type SegmentalAnalysisType = 'lean' | 'fat';
export type SplitTemplateKey = 'ppl' | 'upper_lower' | 'full_body' | 'bro_split' | 'ppl_upper_lower' | 'arnold_split';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: UserRole;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: UserRole;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      fitness_profiles: {
        Row: {
          user_id: string;
          height_cm: number;
          date_of_birth: string | null;
          sex_for_report: string | null;
          fitness_goal: FitnessGoal;
          experience_level: ExperienceLevel;
          available_days_per_week: number;
          session_duration_minutes: number;
          available_equipment: string[];
          exercise_preferences: string[];
          limitations_or_injuries: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          height_cm: number;
          date_of_birth?: string | null;
          sex_for_report?: string | null;
          fitness_goal: FitnessGoal;
          experience_level: ExperienceLevel;
          available_days_per_week: number;
          session_duration_minutes: number;
          available_equipment?: string[];
          exercise_preferences?: string[];
          limitations_or_injuries?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          height_cm?: number;
          date_of_birth?: string | null;
          sex_for_report?: string | null;
          fitness_goal?: FitnessGoal;
          experience_level?: ExperienceLevel;
          available_days_per_week?: number;
          session_duration_minutes?: number;
          available_equipment?: string[];
          exercise_preferences?: string[];
          limitations_or_injuries?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      trainer_member_assignments: {
        Row: {
          id: string;
          trainer_id: string;
          member_id: string;
          status: 'active' | 'inactive';
          assigned_at: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          member_id: string;
          status?: 'active' | 'inactive';
          assigned_at?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          member_id?: string;
          status?: 'active' | 'inactive';
          assigned_at?: string;
          notes?: string | null;
        };
      };
      inbody_assessments: {
        Row: {
          id: string;
          member_id: string;
          assessment_date: string;
          device_model: string | null;
          height_cm: number | null;
          age: number | null;
          sex_for_report: string | null;
          total_body_score: number | null;
          source_image_storage_path: string;
          extraction_provider: string | null;
          extraction_status: AssessmentStatus;
          verification_status: AssessmentStatus;
          total_body_water_l: number | null;
          protein_kg: number | null;
          minerals_kg: number | null;
          body_fat_mass_kg: number | null;
          weight_kg: number | null;
          skeletal_muscle_mass_kg: number | null;
          bmi: number | null;
          percent_body_fat: number | null;
          waist_hip_ratio: number | null;
          visceral_fat_level: number | null;
          obesity_degree_percent: number | null;
          bmr_kcal: number | null;
          raw_extraction_output: Json | null;
          verified_by: string | null;
          verified_at: string | null;
          member_notes: string | null;
          trainer_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          assessment_date: string;
          device_model?: string | null;
          height_cm?: number | null;
          age?: number | null;
          sex_for_report?: string | null;
          total_body_score?: number | null;
          source_image_storage_path: string;
          extraction_provider?: string | null;
          extraction_status?: AssessmentStatus;
          verification_status?: AssessmentStatus;
          total_body_water_l?: number | null;
          protein_kg?: number | null;
          minerals_kg?: number | null;
          body_fat_mass_kg?: number | null;
          weight_kg?: number | null;
          skeletal_muscle_mass_kg?: number | null;
          bmi?: number | null;
          percent_body_fat?: number | null;
          waist_hip_ratio?: number | null;
          visceral_fat_level?: number | null;
          obesity_degree_percent?: number | null;
          bmr_kcal?: number | null;
          raw_extraction_output?: Json | null;
          verified_by?: string | null;
          verified_at?: string | null;
          member_notes?: string | null;
          trainer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          assessment_date?: string;
          device_model?: string | null;
          height_cm?: number | null;
          age?: number | null;
          sex_for_report?: string | null;
          total_body_score?: number | null;
          source_image_storage_path?: string;
          extraction_provider?: string | null;
          extraction_status?: AssessmentStatus;
          verification_status?: AssessmentStatus;
          total_body_water_l?: number | null;
          protein_kg?: number | null;
          minerals_kg?: number | null;
          body_fat_mass_kg?: number | null;
          weight_kg?: number | null;
          skeletal_muscle_mass_kg?: number | null;
          bmi?: number | null;
          percent_body_fat?: number | null;
          waist_hip_ratio?: number | null;
          visceral_fat_level?: number | null;
          obesity_degree_percent?: number | null;
          bmr_kcal?: number | null;
          raw_extraction_output?: Json | null;
          verified_by?: string | null;
          verified_at?: string | null;
          member_notes?: string | null;
          trainer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      inbody_segmental_results: {
        Row: {
          id: string;
          assessment_id: string;
          region: SegmentalRegion;
          analysis_type: SegmentalAnalysisType;
          mass_kg: number | null;
          reported_percentage: number | null;
          classification: string | null;
          raw_label: string | null;
          confidence: number | null;
          raw_extracted_value: string | null;
          verified_value: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          region: SegmentalRegion;
          analysis_type: SegmentalAnalysisType;
          mass_kg?: number | null;
          reported_percentage?: number | null;
          classification?: string | null;
          raw_label?: string | null;
          confidence?: number | null;
          raw_extracted_value?: string | null;
          verified_value?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          assessment_id?: string;
          region?: SegmentalRegion;
          analysis_type?: SegmentalAnalysisType;
          mass_kg?: number | null;
          reported_percentage?: number | null;
          classification?: string | null;
          raw_label?: string | null;
          confidence?: number | null;
          raw_extracted_value?: string | null;
          verified_value?: number | null;
          created_at?: string;
        };
      };
      assessment_review_events: {
        Row: {
          id: string;
          assessment_id: string;
          reviewer_id: string;
          action: string;
          previous_status: string;
          new_status: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          reviewer_id: string;
          action: string;
          previous_status: string;
          new_status: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      exercise_catalog: {
        Row: {
          id: string;
          name: string;
          primary_muscle: string;
          secondary_muscles: string[];
          movement_pattern: string;
          equipment: string;
          difficulty: ExperienceLevel;
          instructions: string;
          contraindications: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          primary_muscle: string;
          secondary_muscles?: string[];
          movement_pattern: string;
          equipment: string;
          difficulty?: ExperienceLevel;
          instructions: string;
          contraindications?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      workout_requests: {
        Row: {
          id: string;
          member_id: string;
          assessment_id: string;
          goal: FitnessGoal;
          experience_level: ExperienceLevel;
          days_per_week: number;
          split_template: SplitTemplateKey;
          session_duration_minutes: number;
          equipment_available: string[];
          limitations_or_injuries: string | null;
          member_notes: string | null;
          status: 'pending' | 'processed' | 'rejected';
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          assessment_id: string;
          goal: FitnessGoal;
          experience_level: ExperienceLevel;
          days_per_week: number;
          split_template: SplitTemplateKey;
          session_duration_minutes: number;
          equipment_available?: string[];
          limitations_or_injuries?: string | null;
          member_notes?: string | null;
          status?: 'pending' | 'processed' | 'rejected';
          created_at?: string;
        };
      };
      workout_plans: {
        Row: {
          id: string;
          member_id: string;
          request_id: string | null;
          trainer_id: string | null;
          title: string;
          split_template: SplitTemplateKey;
          status: PlanStatus;
          revision_number: number;
          trainer_feedback: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          request_id?: string | null;
          trainer_id?: string | null;
          title: string;
          split_template: SplitTemplateKey;
          status?: PlanStatus;
          revision_number?: number;
          trainer_feedback?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          request_id?: string | null;
          trainer_id?: string | null;
          title?: string;
          split_template?: SplitTemplateKey;
          status?: PlanStatus;
          revision_number?: number;
          trainer_feedback?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workout_days: {
        Row: {
          id: string;
          plan_id: string;
          day_number: number;
          name: string;
          focus_muscles: string[];
          is_rest_day: boolean;
        };
        Insert: {
          id?: string;
          plan_id: string;
          day_number: number;
          name: string;
          focus_muscles?: string[];
          is_rest_day?: boolean;
        };
      };
      workout_exercises: {
        Row: {
          id: string;
          day_id: string;
          exercise_id: string;
          order_index: number;
          prescribed_sets: number;
          prescribed_reps: string;
          rest_seconds: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          day_id: string;
          exercise_id: string;
          order_index: number;
          prescribed_sets: number;
          prescribed_reps: string;
          rest_seconds?: number;
          notes?: string | null;
        };
      };
      workout_sessions: {
        Row: {
          id: string;
          member_id: string;
          day_id: string;
          plan_id: string;
          status: SessionStatus;
          started_at: string;
          completed_at: string | null;
          duration_minutes: number | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          member_id: string;
          day_id: string;
          plan_id: string;
          status?: SessionStatus;
          started_at?: string;
          completed_at?: string | null;
          duration_minutes?: number | null;
          notes?: string | null;
        };
      };
      workout_set_logs: {
        Row: {
          id: string;
          session_id: string;
          exercise_id: string;
          set_number: number;
          reps_completed: number;
          weight_kg: number | null;
          rpe: number | null;
          is_warmup: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          exercise_id: string;
          set_number: number;
          reps_completed: number;
          weight_kg?: number | null;
          rpe?: number | null;
          is_warmup?: boolean;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
