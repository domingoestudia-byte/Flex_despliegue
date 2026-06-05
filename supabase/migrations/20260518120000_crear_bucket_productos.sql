-- Crear bucket 'productos' en Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'productos',
  'productos',
  true,
  52428800,  -- 50MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/jpg', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;