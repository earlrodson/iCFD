-- Storage bucket for admin-uploaded certificate background images.
-- Public bucket: base_image_url is rendered directly in an <img> tag on both
-- the admin preview page and the issued-certificate view, so reads must not
-- require an authenticated session. Writes go through the service-role
-- client in app/api/admin/certificates/upload (admin membership already
-- verified there), so no storage.objects RLS policy is needed for writes.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificate-templates',
  'certificate-templates',
  true,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
