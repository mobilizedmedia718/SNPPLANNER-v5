insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'promo-media',
  'promo-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read promo media'
  ) then
    create policy "Public read promo media"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'promo-media');
  end if;

  drop policy if exists "Authenticated upload promo media" on storage.objects;
  drop policy if exists "Authenticated update promo media" on storage.objects;
  drop policy if exists "Authenticated delete promo media" on storage.objects;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated upload own promo media'
  ) then
    create policy "Authenticated upload own promo media"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = 'promo-media'
      and (storage.foldername(name))[1] = 'users'
      and (storage.foldername(name))[2] = (select auth.uid())::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated update own promo media'
  ) then
    create policy "Authenticated update own promo media"
    on storage.objects for update
    to authenticated
    using (
      bucket_id = 'promo-media'
      and (storage.foldername(name))[1] = 'users'
      and (storage.foldername(name))[2] = (select auth.uid())::text
    )
    with check (
      bucket_id = 'promo-media'
      and (storage.foldername(name))[1] = 'users'
      and (storage.foldername(name))[2] = (select auth.uid())::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated delete own promo media'
  ) then
    create policy "Authenticated delete own promo media"
    on storage.objects for delete
    to authenticated
    using (
      bucket_id = 'promo-media'
      and (storage.foldername(name))[1] = 'users'
      and (storage.foldername(name))[2] = (select auth.uid())::text
    );
  end if;
end $$;
