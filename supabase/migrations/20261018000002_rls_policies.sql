-- Yalla Fit Row Level Security (RLS) & Access Control Migration
-- Ensures members access only their own data and trainers access only explicitly assigned members' data.

-- 1. ENABLE RLS ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_member_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbody_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbody_segmental_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_review_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_set_logs ENABLE ROW LEVEL SECURITY;

-- 2. HELPER FUNCTIONS FOR CLEAN POLICY CHECKS
-- Check if current user is an active trainer for the given member
CREATE OR REPLACE FUNCTION public.is_trainer_of_member(target_member_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.trainer_member_assignments
        WHERE trainer_id = auth.uid()
          AND member_id = target_member_id
          AND status = 'active'
    );
$$;

-- Check if current user has the 'trainer' role
CREATE OR REPLACE FUNCTION public.is_trainer()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'trainer'
    );
$$;

-- 3. PROFILES POLICIES
-- Anyone authenticated can view their own profile or their assigned trainer/member profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_trainer_of_member(id));

CREATE POLICY "Trainers can view their assigned members profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.trainer_member_assignments
            WHERE (trainer_id = auth.uid() AND member_id = profiles.id)
               OR (member_id = auth.uid() AND trainer_id = profiles.id)
        )
    );

-- Users can insert their initial profile upon signup with 'member' role only
CREATE POLICY "Users can insert own member profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid() AND role = 'member');

-- Users can update non-privileged fields of their own profile (cannot change role)
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- 4. FITNESS PROFILES POLICIES
CREATE POLICY "Members can view own fitness profile"
    ON public.fitness_profiles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_trainer_of_member(user_id));

CREATE POLICY "Members can insert own fitness profile"
    ON public.fitness_profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can update own fitness profile"
    ON public.fitness_profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 5. TRAINER MEMBER ASSIGNMENTS POLICIES
CREATE POLICY "Users can view their assignments"
    ON public.trainer_member_assignments FOR SELECT
    TO authenticated
    USING (trainer_id = auth.uid() OR member_id = auth.uid());

-- 6. INBODY ASSESSMENTS POLICIES
CREATE POLICY "Members and assigned trainers can view assessments"
    ON public.inbody_assessments FOR SELECT
    TO authenticated
    USING (member_id = auth.uid() OR public.is_trainer_of_member(member_id));

CREATE POLICY "Members can insert their assessments"
    ON public.inbody_assessments FOR INSERT
    TO authenticated
    WITH CHECK (member_id = auth.uid());

CREATE POLICY "Members can update their unverified assessments"
    ON public.inbody_assessments FOR UPDATE
    TO authenticated
    USING (member_id = auth.uid() AND verification_status != 'verified')
    WITH CHECK (member_id = auth.uid());

CREATE POLICY "Trainers can update assigned member assessment verification"
    ON public.inbody_assessments FOR UPDATE
    TO authenticated
    USING (public.is_trainer_of_member(member_id))
    WITH CHECK (public.is_trainer_of_member(member_id));

-- 7. INBODY SEGMENTAL RESULTS POLICIES
CREATE POLICY "View segmental results"
    ON public.inbody_segmental_results FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.inbody_assessments a
            WHERE a.id = inbody_segmental_results.assessment_id
              AND (a.member_id = auth.uid() OR public.is_trainer_of_member(a.member_id))
        )
    );

CREATE POLICY "Insert segmental results for own assessment"
    ON public.inbody_segmental_results FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.inbody_assessments a
            WHERE a.id = inbody_segmental_results.assessment_id
              AND a.member_id = auth.uid()
        )
    );

CREATE POLICY "Update segmental results"
    ON public.inbody_segmental_results FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.inbody_assessments a
            WHERE a.id = inbody_segmental_results.assessment_id
              AND (a.member_id = auth.uid() OR public.is_trainer_of_member(a.member_id))
        )
    );

-- 8. ASSESSMENT REVIEW EVENTS POLICIES
CREATE POLICY "View review events"
    ON public.assessment_review_events FOR SELECT
    TO authenticated
    USING (
        reviewer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.inbody_assessments a
            WHERE a.id = assessment_review_events.assessment_id AND a.member_id = auth.uid()
        )
    );

CREATE POLICY "Trainers can insert review events"
    ON public.assessment_review_events FOR INSERT
    TO authenticated
    WITH CHECK (reviewer_id = auth.uid() AND public.is_trainer());

-- 9. EXERCISE CATALOG POLICIES
CREATE POLICY "Anyone authenticated can read exercises"
    ON public.exercise_catalog FOR SELECT
    TO authenticated
    USING (is_active = true);

-- 10. WORKOUT REQUESTS POLICIES
CREATE POLICY "View workout requests"
    ON public.workout_requests FOR SELECT
    TO authenticated
    USING (member_id = auth.uid() OR public.is_trainer_of_member(member_id));

CREATE POLICY "Members can create workout requests"
    ON public.workout_requests FOR INSERT
    TO authenticated
    WITH CHECK (member_id = auth.uid());

-- 11. WORKOUT PLANS POLICIES
-- CRITICAL REQUIREMENT: Member can ONLY see approved plans. Trainer can see all plans for assigned members.
CREATE POLICY "Members see only approved plans"
    ON public.workout_plans FOR SELECT
    TO authenticated
    USING (
        (member_id = auth.uid() AND status = 'approved') OR
        public.is_trainer_of_member(member_id)
    );

CREATE POLICY "Trainers can update plans for assigned members"
    ON public.workout_plans FOR UPDATE
    TO authenticated
    USING (public.is_trainer_of_member(member_id))
    WITH CHECK (public.is_trainer_of_member(member_id));

-- 12. WORKOUT DAYS & EXERCISES POLICIES
CREATE POLICY "View workout days"
    ON public.workout_days FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_plans p
            WHERE p.id = workout_days.plan_id
              AND ((p.member_id = auth.uid() AND p.status = 'approved') OR public.is_trainer_of_member(p.member_id))
        )
    );

CREATE POLICY "Trainers can manage workout days"
    ON public.workout_days FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_plans p
            WHERE p.id = workout_days.plan_id AND public.is_trainer_of_member(p.member_id)
        )
    );

CREATE POLICY "View workout exercises"
    ON public.workout_exercises FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_days d
            JOIN public.workout_plans p ON p.id = d.plan_id
            WHERE d.id = workout_exercises.day_id
              AND ((p.member_id = auth.uid() AND p.status = 'approved') OR public.is_trainer_of_member(p.member_id))
        )
    );

CREATE POLICY "Trainers can manage workout exercises"
    ON public.workout_exercises FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_days d
            JOIN public.workout_plans p ON p.id = d.plan_id
            WHERE d.id = workout_exercises.day_id AND public.is_trainer_of_member(p.member_id)
        )
    );

-- 13. WORKOUT SESSIONS & SET LOGS POLICIES
CREATE POLICY "Members and trainers view sessions"
    ON public.workout_sessions FOR SELECT
    TO authenticated
    USING (member_id = auth.uid() OR public.is_trainer_of_member(member_id));

CREATE POLICY "Members insert and update own sessions"
    ON public.workout_sessions FOR ALL
    TO authenticated
    USING (member_id = auth.uid())
    WITH CHECK (member_id = auth.uid());

CREATE POLICY "View workout set logs"
    ON public.workout_set_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_sessions s
            WHERE s.id = workout_set_logs.session_id
              AND (s.member_id = auth.uid() OR public.is_trainer_of_member(s.member_id))
        )
    );

CREATE POLICY "Members insert and update own set logs"
    ON public.workout_set_logs FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_sessions s
            WHERE s.id = workout_set_logs.session_id AND s.member_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_sessions s
            WHERE s.id = workout_set_logs.session_id AND s.member_id = auth.uid()
        )
    );
