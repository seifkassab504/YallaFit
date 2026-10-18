-- Helper functions and procedures for secure user management & onboarding
-- 1. Trigger to automatically create a profile entry when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Fitness Member'),
        'member' -- Explicitly enforce member role for self-service signups
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if already exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Procedure / Admin Function: Promote User to Trainer
-- Since trainers cannot self-assign role, this function can be invoked from the Supabase SQL editor
-- or by a verified service role to grant trainer status securely.
CREATE OR REPLACE FUNCTION public.promote_user_to_trainer(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET role = 'trainer'
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Procedure: Assign Member to Trainer
CREATE OR REPLACE FUNCTION public.assign_member_to_trainer(p_trainer_id UUID, p_member_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    new_assignment_id UUID;
BEGIN
    -- Verify trainer has trainer role
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_trainer_id AND role = 'trainer') THEN
        RAISE EXCEPTION 'User % is not a registered trainer', p_trainer_id;
    END IF;

    -- Verify member has member role
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_member_id AND role = 'member') THEN
        RAISE EXCEPTION 'User % is not a registered member', p_member_id;
    END IF;

    INSERT INTO public.trainer_member_assignments (trainer_id, member_id, status, notes)
    VALUES (p_trainer_id, p_member_id, 'active', p_notes)
    ON CONFLICT (member_id, trainer_id) 
    DO UPDATE SET status = 'active', notes = COALESCE(p_notes, trainer_member_assignments.notes)
    RETURNING id INTO new_assignment_id;

    RETURN new_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
