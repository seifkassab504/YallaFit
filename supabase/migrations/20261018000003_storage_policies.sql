-- Storage Bucket and Access Policies for Yalla Fit InBody Reports
-- Source reports are stored in a private bucket 'inbody-reports'.
-- Only the owning member and their assigned trainer can view the uploaded image.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'inbody-reports',
    'inbody-reports',
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

-- Policy: Members can upload to their own folder: inbody-reports/{member_id}/*
DROP POLICY IF EXISTS "Members can upload their own reports" ON storage.objects;
CREATE POLICY "Members can upload their own reports"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'inbody-reports' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Members can view their own uploaded reports
DROP POLICY IF EXISTS "Members can view own reports" ON storage.objects;
CREATE POLICY "Members can view own reports"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'inbody-reports' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Assigned trainers can view reports of their assigned members
DROP POLICY IF EXISTS "Assigned trainers can view member reports" ON storage.objects;
CREATE POLICY "Assigned trainers can view member reports"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'inbody-reports' AND
        public.is_trainer_of_member((storage.foldername(name))[1]::uuid)
    );
