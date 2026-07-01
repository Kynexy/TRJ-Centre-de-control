-- Kynexy Core V1
-- PostgreSQL / Supabase schema
-- Principle: business tables stay readable; context tables connect domains over time.

create extension if not exists pgcrypto;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key,
  display_name text not null,
  role text,
  email text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  member_role text not null default 'member'
    check (member_role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'suspended', 'left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, profile_id)
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  display_name text not null,
  email text,
  phone text,
  role text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'invited', 'archived')),
  skills text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Europe/Paris',
  location text,
  status text not null default 'scheduled'
    check (status in ('draft', 'scheduled', 'completed', 'cancelled')),
  owner_member_id uuid references team_members(id) on delete set null,
  source text not null default 'kynexy',
  external_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists appointment_participants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  appointment_id uuid not null references appointments(id) on delete cascade,
  team_member_id uuid references team_members(id) on delete set null,
  external_name text,
  external_email text,
  participation_role text not null default 'attendee'
    check (participation_role in ('organizer', 'attendee', 'optional')),
  response_status text not null default 'needs_action'
    check (response_status in ('needs_action', 'accepted', 'declined', 'tentative')),
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'waiting', 'done', 'cancelled')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'critical')),
  due_at timestamptz,
  assigned_to uuid references team_members(id) on delete set null,
  source_domain text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists finance_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  label text not null,
  account_type text not null
    check (account_type in ('wallet', 'exchange', 'bank', 'defi_position', 'manual')),
  provider text,
  public_reference text,
  currency text not null default 'EUR',
  risk_profile text not null default 'balanced'
    check (risk_profile in ('conservative', 'balanced', 'opportunistic')),
  is_connected boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists finance_positions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  finance_account_id uuid references finance_accounts(id) on delete cascade,
  asset_symbol text not null,
  protocol text,
  network text,
  quantity numeric,
  value_eur numeric,
  apy numeric,
  tvl numeric,
  source text not null default 'manual',
  observed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists document_refs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  document_type text not null default 'document'
    check (document_type in ('document', 'quote', 'invoice', 'contract', 'report', 'file')),
  provider text not null default 'glide',
  external_ref text,
  url text,
  related_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists integration_refs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null,
  external_type text not null,
  external_id text not null,
  local_table text not null,
  local_id uuid not null,
  sync_state text not null default 'linked'
    check (sync_state in ('linked', 'pending', 'stale', 'error', 'archived')),
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider, external_type, external_id)
);

create table if not exists context_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  domain text not null,
  event_type text not null,
  actor_type text not null default 'system'
    check (actor_type in ('user', 'team_member', 'system', 'integration', 'intelligence')),
  actor_id uuid,
  subject_table text,
  subject_id uuid,
  occurred_at timestamptz not null default now(),
  source text not null default 'kynexy',
  correlation_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists context_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  from_table text not null,
  from_id uuid not null,
  to_table text not null,
  to_id uuid not null,
  relation_type text not null,
  confidence numeric not null default 1.0 check (confidence >= 0 and confidence <= 1),
  source text not null default 'manual',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, from_table, from_id, to_table, to_id, relation_type)
);

create table if not exists context_facts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  subject_table text not null,
  subject_id uuid not null,
  fact_type text not null,
  value jsonb not null,
  confidence numeric not null default 1.0 check (confidence >= 0 and confidence <= 1),
  observed_at timestamptz not null default now(),
  valid_until timestamptz,
  source_event_id uuid references context_events(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists context_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  scope text not null,
  summary text not null,
  included_refs jsonb not null default '[]'::jsonb,
  generated_by text not null default 'system',
  created_at timestamptz not null default now()
);

create table if not exists intelligence_engines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null,
  version text not null,
  capabilities jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (provider, name, version)
);

create table if not exists intelligence_outputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  engine_id uuid references intelligence_engines(id) on delete set null,
  output_type text not null
    check (output_type in ('summary', 'recommendation', 'warning', 'decision_support', 'automation_proposal')),
  title text not null,
  body text not null,
  input_snapshot_id uuid references context_snapshots(id) on delete set null,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  evidence jsonb not null default '[]'::jsonb,
  recommendation jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'shown', 'accepted', 'dismissed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists automation_intents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  proposed_by_output_id uuid references intelligence_outputs(id) on delete set null,
  intent_type text not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'scheduled', 'executed', 'cancelled', 'failed')),
  requires_confirmation boolean not null default true,
  target_refs jsonb not null default '[]'::jsonb,
  action_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  confirmed_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on profiles(email);
create index if not exists idx_workspace_members_profile on workspace_members(profile_id);
create index if not exists idx_workspace_members_workspace on workspace_members(workspace_id, status);
create index if not exists idx_team_members_workspace_status on team_members(workspace_id, status);
create index if not exists idx_appointments_workspace_time on appointments(workspace_id, starts_at, ends_at);
create index if not exists idx_appointment_participants_appointment on appointment_participants(appointment_id);
create index if not exists idx_tasks_workspace_status_due on tasks(workspace_id, status, due_at);
create index if not exists idx_finance_accounts_workspace on finance_accounts(workspace_id, account_type);
create index if not exists idx_finance_positions_account_observed on finance_positions(finance_account_id, observed_at desc);
create index if not exists idx_document_refs_workspace_type on document_refs(workspace_id, document_type);
create index if not exists idx_integration_refs_local on integration_refs(workspace_id, local_table, local_id);
create index if not exists idx_context_events_subject on context_events(workspace_id, subject_table, subject_id);
create index if not exists idx_context_events_domain_time on context_events(workspace_id, domain, occurred_at desc);
create index if not exists idx_context_links_from on context_links(workspace_id, from_table, from_id);
create index if not exists idx_context_links_to on context_links(workspace_id, to_table, to_id);
create index if not exists idx_context_facts_subject on context_facts(workspace_id, subject_table, subject_id, fact_type);
create index if not exists idx_intelligence_outputs_workspace_status on intelligence_outputs(workspace_id, status, created_at desc);
create index if not exists idx_automation_intents_workspace_status on automation_intents(workspace_id, status, scheduled_for);

create index if not exists idx_team_members_metadata_gin on team_members using gin(metadata);
create index if not exists idx_appointments_metadata_gin on appointments using gin(metadata);
create index if not exists idx_context_events_payload_gin on context_events using gin(payload);
create index if not exists idx_context_facts_value_gin on context_facts using gin(value);
create index if not exists idx_intelligence_outputs_evidence_gin on intelligence_outputs using gin(evidence);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_workspaces_updated_at on workspaces;
create trigger trg_workspaces_updated_at
before update on workspaces
for each row execute function set_updated_at();

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
before update on profiles
for each row execute function set_updated_at();

drop trigger if exists trg_workspace_members_updated_at on workspace_members;
create trigger trg_workspace_members_updated_at
before update on workspace_members
for each row execute function set_updated_at();

drop trigger if exists trg_team_members_updated_at on team_members;
create trigger trg_team_members_updated_at
before update on team_members
for each row execute function set_updated_at();

drop trigger if exists trg_appointments_updated_at on appointments;
create trigger trg_appointments_updated_at
before update on appointments
for each row execute function set_updated_at();

drop trigger if exists trg_tasks_updated_at on tasks;
create trigger trg_tasks_updated_at
before update on tasks
for each row execute function set_updated_at();

drop trigger if exists trg_finance_accounts_updated_at on finance_accounts;
create trigger trg_finance_accounts_updated_at
before update on finance_accounts
for each row execute function set_updated_at();

drop trigger if exists trg_document_refs_updated_at on document_refs;
create trigger trg_document_refs_updated_at
before update on document_refs
for each row execute function set_updated_at();

drop trigger if exists trg_integration_refs_updated_at on integration_refs;
create trigger trg_integration_refs_updated_at
before update on integration_refs
for each row execute function set_updated_at();

drop trigger if exists trg_intelligence_outputs_updated_at on intelligence_outputs;
create trigger trg_intelligence_outputs_updated_at
before update on intelligence_outputs
for each row execute function set_updated_at();

drop trigger if exists trg_automation_intents_updated_at on automation_intents;
create trigger trg_automation_intents_updated_at
before update on automation_intents
for each row execute function set_updated_at();

create or replace function log_context_event(
  p_workspace_id uuid,
  p_domain text,
  p_event_type text,
  p_actor_type text,
  p_actor_id uuid,
  p_subject_table text,
  p_subject_id uuid,
  p_source text,
  p_payload jsonb
)
returns uuid as $$
declare
  v_event_id uuid;
begin
  insert into context_events (
    workspace_id,
    domain,
    event_type,
    actor_type,
    actor_id,
    subject_table,
    subject_id,
    source,
    payload
  )
  values (
    p_workspace_id,
    p_domain,
    p_event_type,
    coalesce(p_actor_type, 'system'),
    p_actor_id,
    p_subject_table,
    p_subject_id,
    coalesce(p_source, 'kynexy'),
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$ language plpgsql;

insert into intelligence_engines (name, provider, version, capabilities)
values (
  'Aurel',
  'kynexy',
  'v1',
  '{"reads_context": true, "writes_recommendations": true, "proposes_automations": true}'::jsonb
)
on conflict (provider, name, version) do update
set capabilities = excluded.capabilities,
    is_active = true;

create or replace function current_profile_id()
returns uuid as $$
  select auth.uid();
$$ language sql stable;

create or replace function is_workspace_member(p_workspace_id uuid)
returns boolean as $$
  select exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.profile_id = current_profile_id()
      and wm.status = 'active'
  );
$$ language sql stable security definer set search_path = public;

-- Supabase RLS bootstrap.
alter table workspaces enable row level security;
alter table profiles enable row level security;
alter table workspace_members enable row level security;
alter table team_members enable row level security;
alter table appointments enable row level security;
alter table appointment_participants enable row level security;
alter table tasks enable row level security;
alter table finance_accounts enable row level security;
alter table finance_positions enable row level security;
alter table document_refs enable row level security;
alter table integration_refs enable row level security;
alter table context_events enable row level security;
alter table context_links enable row level security;
alter table context_facts enable row level security;
alter table context_snapshots enable row level security;
alter table intelligence_outputs enable row level security;
alter table automation_intents enable row level security;

drop policy if exists profiles_read_self on profiles;
create policy profiles_read_self on profiles
for select using (id = current_profile_id());

drop policy if exists profiles_insert_self on profiles;
create policy profiles_insert_self on profiles
for insert with check (id = current_profile_id());

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
for update using (id = current_profile_id())
with check (id = current_profile_id());

drop policy if exists workspaces_read_member on workspaces;
create policy workspaces_read_member on workspaces
for select using (is_workspace_member(id));

drop policy if exists workspace_members_read_member on workspace_members;
create policy workspace_members_read_member on workspace_members
for select using (is_workspace_member(workspace_id));

drop policy if exists team_members_member_access on team_members;
create policy team_members_member_access on team_members
for all using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

drop policy if exists appointments_member_access on appointments;
create policy appointments_member_access on appointments
for all using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

drop policy if exists appointment_participants_member_access on appointment_participants;
create policy appointment_participants_member_access on appointment_participants
for all using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

drop policy if exists tasks_member_access on tasks;
create policy tasks_member_access on tasks
for all using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

drop policy if exists finance_accounts_member_access on finance_accounts;
create policy finance_accounts_member_access on finance_accounts
for all using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

drop policy if exists finance_positions_member_access on finance_positions;
create policy finance_positions_member_access on finance_positions
for all using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

drop policy if exists document_refs_member_access on document_refs;
create policy document_refs_member_access on document_refs
for all using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

drop policy if exists integration_refs_member_access on integration_refs;
create policy integration_refs_member_access on integration_refs
for all using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

drop policy if exists context_events_member_access on context_events;
create policy context_events_member_access on context_events
for all using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

drop policy if exists context_links_member_access on context_links;
create policy context_links_member_access on context_links
for all using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

drop policy if exists context_facts_member_access on context_facts;
create policy context_facts_member_access on context_facts
for all using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

drop policy if exists context_snapshots_member_access on context_snapshots;
create policy context_snapshots_member_access on context_snapshots
for all using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

drop policy if exists intelligence_outputs_member_access on intelligence_outputs;
create policy intelligence_outputs_member_access on intelligence_outputs
for all using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

drop policy if exists automation_intents_member_access on automation_intents;
create policy automation_intents_member_access on automation_intents
for all using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));
