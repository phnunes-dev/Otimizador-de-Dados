-- Storage bucket
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true);

-- Open policies for the bucket (MVP)
create policy "Public can read documents bucket"
  on storage.objects for select
  using (bucket_id = 'documents');

create policy "Public can upload to documents bucket"
  on storage.objects for insert
  with check (bucket_id = 'documents');

create policy "Public can update documents bucket"
  on storage.objects for update
  using (bucket_id = 'documents');

create policy "Public can delete from documents bucket"
  on storage.objects for delete
  using (bucket_id = 'documents');

-- Documents table
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_type text not null,
  file_path text not null,
  status text not null default 'pending', -- pending | processing | done | error
  error_message text,
  category text,
  vendor text,
  amount numeric,
  document_date date,
  summary text,
  items jsonb,
  raw_extraction jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "Anyone can view documents"
  on public.documents for select using (true);

create policy "Anyone can insert documents"
  on public.documents for insert with check (true);

create policy "Anyone can update documents"
  on public.documents for update using (true);

create policy "Anyone can delete documents"
  on public.documents for delete using (true);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- Realtime
alter table public.documents replica identity full;
alter publication supabase_realtime add table public.documents;