-- resource_preview_metadata (already applied to Supabase AVODAH)
alter table public.library_items
 add column if not exists preview_title text,
 add column if not exists preview_description text,
 add column if not exists preview_image text,
 add column if not exists preview_site text,
 add column if not exists preview_kind text,
 add column if not exists preview_fetched_at timestamptz;
