-- Yalla Fit Initial Core Schema Migration
-- Enables UUID generation and sets up profiles, fitness profiles, assignments,
-- assessments, segmental analysis, exercise catalog, workout generation, and logging.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('member', 'trainer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE fitness_goal AS ENUM ('muscle_gain', 'fat_loss', 'strength', 'general_fitness', 'endurance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE experience_level AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE assessment_status AS ENUM ('uploaded', 'extracting', 'needs_review', 'pending_trainer_review', 'verified', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'revision_requested', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('in_progress', 'completed', 'abandoned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE segmental_region AS ENUM ('left_arm', 'right_arm', 'trunk', 'left_leg', 'right_leg');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE segmental_analysis_type AS ENUM ('lean', 'fat');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE
-- Profile id maps directly to auth.users.id.
-- Role cannot be self-escalated to trainer via client insert/update.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    avatar_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. FITNESS PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.fitness_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    height_cm NUMERIC(5,2) NOT NULL CHECK (height_cm > 50 AND height_cm < 280),
    date_of_birth DATE,
    sex_for_report TEXT,
    fitness_goal fitness_goal NOT NULL,
    experience_level experience_level NOT NULL,
    available_days_per_week INT NOT NULL CHECK (available_days_per_week BETWEEN 1 AND 7),
    session_duration_minutes INT NOT NULL CHECK (session_duration_minutes BETWEEN 15 AND 180),
    available_equipment TEXT[] NOT NULL DEFAULT '{}',
    exercise_preferences TEXT[] NOT NULL DEFAULT '{}',
    limitations_or_injuries TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. TRAINER MEMBER ASSIGNMENTS
-- Explicit assignment model. A member has assigned trainer(s).
CREATE TABLE IF NOT EXISTS public.trainer_member_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    notes TEXT,
    CONSTRAINT unique_active_trainer_member UNIQUE (member_id, trainer_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_trainer ON public.trainer_member_assignments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_assignments_member ON public.trainer_member_assignments(member_id);

-- 6. INBODY ASSESSMENTS
CREATE TABLE IF NOT EXISTS public.inbody_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assessment_date TIMESTAMPTZ NOT NULL,
    device_model TEXT,
    height_cm NUMERIC(5,2),
    age INT,
    sex_for_report TEXT,
    total_body_score NUMERIC(5,2),
    source_image_storage_path TEXT NOT NULL,
    extraction_provider TEXT,
    extraction_status assessment_status NOT NULL DEFAULT 'uploaded',
    verification_status assessment_status NOT NULL DEFAULT 'needs_review',
    
    -- Body composition metrics
    total_body_water_l NUMERIC(6,2),
    protein_kg NUMERIC(6,2),
    minerals_kg NUMERIC(6,2),
    body_fat_mass_kg NUMERIC(6,2),
    weight_kg NUMERIC(6,2),
    skeletal_muscle_mass_kg NUMERIC(6,2),
    
    -- Obesity analysis
    bmi NUMERIC(5,2),
    percent_body_fat NUMERIC(5,2),
    waist_hip_ratio NUMERIC(5,3),
    visceral_fat_level NUMERIC(5,2),
    obesity_degree_percent NUMERIC(5,2),
    bmr_kcal NUMERIC(7,2),
    
    -- Raw extraction output & audit
    raw_extraction_output JSONB,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    member_notes TEXT,
    trainer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_assessments_member ON public.inbody_assessments(member_id);
CREATE INDEX IF NOT EXISTS idx_assessments_date ON public.inbody_assessments(assessment_date DESC);

-- 7. FIVE-REGION SEGMENTAL RESULTS
CREATE TABLE IF NOT EXISTS public.inbody_segmental_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES public.inbody_assessments(id) ON DELETE CASCADE,
    region segmental_region NOT NULL,
    analysis_type segmental_analysis_type NOT NULL,
    mass_kg NUMERIC(6,2),
    reported_percentage NUMERIC(6,2),
    classification TEXT,
    raw_label TEXT,
    confidence NUMERIC(4,3),
    raw_extracted_value TEXT,
    verified_value NUMERIC(6,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT unique_assessment_region_type UNIQUE (assessment_id, region, analysis_type)
);

CREATE INDEX IF NOT EXISTS idx_segmental_assessment ON public.inbody_segmental_results(assessment_id);

-- 8. ASSESSMENT REVIEW EVENTS (Audit log)
CREATE TABLE IF NOT EXISTS public.assessment_review_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES public.inbody_assessments(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 9. EXERCISE CATALOG
CREATE TABLE IF NOT EXISTS public.exercise_catalog (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    primary_muscle TEXT NOT NULL,
    secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
    movement_pattern TEXT NOT NULL,
    equipment TEXT NOT NULL,
    difficulty experience_level NOT NULL DEFAULT 'intermediate',
    instructions TEXT NOT NULL,
    contraindications TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 10. WORKOUT REQUESTS
CREATE TABLE IF NOT EXISTS public.workout_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES public.inbody_assessments(id) ON DELETE RESTRICT,
    goal fitness_goal NOT NULL,
    experience_level experience_level NOT NULL,
    days_per_week INT NOT NULL CHECK (days_per_week BETWEEN 2 AND 6),
    split_template TEXT NOT NULL,
    session_duration_minutes INT NOT NULL,
    equipment_available TEXT[] NOT NULL DEFAULT '{}',
    limitations_or_injuries TEXT,
    member_notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 11. WORKOUT PLANS
CREATE TABLE IF NOT EXISTS public.workout_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    request_id UUID REFERENCES public.workout_requests(id) ON DELETE SET NULL,
    trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    split_template TEXT NOT NULL,
    status plan_status NOT NULL DEFAULT 'draft',
    revision_number INT NOT NULL DEFAULT 1,
    trainer_feedback TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_plans_member ON public.workout_plans(member_id);
CREATE INDEX IF NOT EXISTS idx_plans_trainer ON public.workout_plans(trainer_id);

-- 12. WORKOUT DAYS
CREATE TABLE IF NOT EXISTS public.workout_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    name TEXT NOT NULL,
    focus_muscles TEXT[] NOT NULL DEFAULT '{}',
    is_rest_day BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT unique_plan_day UNIQUE (plan_id, day_number)
);

-- 13. WORKOUT EXERCISES
CREATE TABLE IF NOT EXISTS public.workout_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_id UUID NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES public.exercise_catalog(id) ON DELETE RESTRICT,
    order_index INT NOT NULL,
    prescribed_sets INT NOT NULL CHECK (prescribed_sets > 0),
    prescribed_reps TEXT NOT NULL,
    rest_seconds INT NOT NULL DEFAULT 90,
    notes TEXT,
    CONSTRAINT unique_day_exercise_order UNIQUE (day_id, order_index)
);

-- 14. WORKOUT SESSIONS
CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_id UUID NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
    status session_status NOT NULL DEFAULT 'in_progress',
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    completed_at TIMESTAMPTZ,
    duration_minutes INT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_member ON public.workout_sessions(member_id);

-- 15. WORKOUT SET LOGS
CREATE TABLE IF NOT EXISTS public.workout_set_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES public.exercise_catalog(id) ON DELETE RESTRICT,
    set_number INT NOT NULL,
    reps_completed INT NOT NULL CHECK (reps_completed >= 0),
    weight_kg NUMERIC(6,2),
    rpe NUMERIC(3,1) CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
    is_warmup BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT unique_session_exercise_set UNIQUE (session_id, exercise_id, set_number)
);

CREATE INDEX IF NOT EXISTS idx_set_logs_session ON public.workout_set_logs(session_id);

-- AUTOMATIC UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_fitness_profiles_updated_at BEFORE UPDATE ON public.fitness_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_inbody_assessments_updated_at BEFORE UPDATE ON public.inbody_assessments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_workout_plans_updated_at BEFORE UPDATE ON public.workout_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
