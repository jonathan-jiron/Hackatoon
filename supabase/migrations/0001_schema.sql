-- Embedding size is pinned here (Gemini embedding with outputDimensionality=768).
-- Changing the embedding model means changing this value and re-embedding everything.
create extension if not exists vector;

create table courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  objectives text[] not null default '{}',
  venue text,
  organizers text[] not null default '{}',
  instructors text[] not null default '{}',
  enrollment_start timestamptz,
  enrollment_end timestamptz,
  start_date timestamptz,
  end_date timestamptz,
  schedule_text text,
  min_seats int,
  max_seats int,
  price_uta_student numeric(10,2),
  price_uta_grad_staff numeric(10,2),
  price_public numeric(10,2),
  certificate_type text,
  hours int,
  audience text,
  modality text,
  prerequisites text,
  materials text,
  contents text,
  poster_url text,
  source_url text unique not null,
  content_hash text,
  scraped_at timestamptz not null default now()
);

create table course_chunks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  section text not null,
  content text not null,
  embedding vector(768)
);
create index course_chunks_embedding_idx on course_chunks using hnsw (embedding vector_cosine_ops);

create table faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  source_url text,
  embedding vector(768),
  unique (question)
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('telegram', 'whatsapp')),
  channel_user_id text not null,
  name text,
  audience_type text check (audience_type in ('uta_student', 'uta_grad_staff', 'public')),
  consent_at timestamptz,
  unique (channel, channel_user_id)
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  stage text not null default 'new',
  sentiment text check (sentiment in ('interested', 'doubtful', 'frustrated', 'hot_lead')),
  ai_paused boolean not null default false,
  paused_by text,
  summary text,
  last_message_at timestamptz not null default now()
);
create index conversations_last_message_idx on conversations (last_message_at desc);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'operator')),
  content text not null,
  media_type text not null default 'text' check (media_type in ('text', 'audio')),
  tool_calls jsonb,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at);

create table leads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  stage text not null default 'new'
    check (stage in ('new', 'interested', 'asked_price', 'asked_enroll', 'ready_to_close', 'enrolled', 'lost')),
  score int not null default 0,
  notes text,
  updated_at timestamptz not null default now(),
  unique (contact_id, course_id)
);

-- Only upcoming courses are ever offered; past courses stay stored but hidden.
create view open_courses as
  select * from courses where start_date > now();

-- RLS: dashboard (authenticated) reads and writes operator actions; the bot uses service_role (bypasses RLS).
alter table courses enable row level security;
alter table course_chunks enable row level security;
alter table faqs enable row level security;
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table leads enable row level security;

create policy read_all on courses for select to authenticated using (true);
create policy read_all on course_chunks for select to authenticated using (true);
create policy read_all on faqs for select to authenticated using (true);
create policy read_all on contacts for select to authenticated using (true);
create policy read_all on conversations for select to authenticated using (true);
create policy read_all on messages for select to authenticated using (true);
create policy read_all on leads for select to authenticated using (true);
-- Operator toggles takeover/resume from the dashboard.
create policy operator_update on conversations for update to authenticated using (true) with check (true);

grant select on all tables in schema public to authenticated;
grant select on open_courses to authenticated;
grant update (ai_paused, paused_by) on conversations to authenticated;
grant all on all tables in schema public to service_role;
