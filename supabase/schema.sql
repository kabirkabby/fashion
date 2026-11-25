-- Run this in your Supabase Dashboard -> SQL Editor

create table if not exists public.akoya_workspaces (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Keep access restricted to server-side service role (Next.js API routes)
alter table public.akoya_workspaces enable row level security;

-- Create a public storage bucket for SKU product images
insert into storage.buckets (id, name, public)
values ('akoya-images', 'akoya-images', true)
on conflict (id) do nothing;

-- Allow public read access to uploaded garment images
create policy "Public read access for akoya-images"
on storage.objects for select
using (bucket_id = 'akoya-images');
