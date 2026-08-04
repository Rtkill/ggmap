-- Schema for submissions table in Supabase
create table if not exists public.submissions (
  id uuid default gen_random_uuid() primary key,
  video_url text,
  place_name text,
  google_maps_url text,
  status text not null default 'pending', -- 'pending' | 'approved' | 'rejected'
  note text,
  created_at timestamptz default now() not null
);

-- Enable Row Level Security (RLS)
alter table public.submissions enable row level security;

-- Policy: Anyone can insert submissions (Public User)
create policy "Allow public insert to submissions"
  on public.submissions
  for insert
  with check (true);

-- Policy: Anyone can select submissions (or restrict to authenticated/admin if auth is configured)
create policy "Allow public select on submissions"
  on public.submissions
  for select
  using (true);

-- Policy: Anyone can update submissions (Admin status updates)
create policy "Allow public update on submissions"
  on public.submissions
  for update
  using (true);

-- Policy: Anyone can delete submissions
create policy "Allow public delete on submissions"
  on public.submissions
  for delete
  using (true);
