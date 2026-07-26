-- pdf_url/image_url were designed for a pre-rendered static certificate file,
-- but certificates are rendered on demand (base template + overlaid name via
-- CertificatePreview) — no generator produces these files today. Relax to
-- nullable so /api/quiz can issue a certificate row without them.

ALTER TABLE "certificates" ALTER COLUMN "pdf_url" DROP NOT NULL;
ALTER TABLE "certificates" ALTER COLUMN "image_url" DROP NOT NULL;
