create extension if not exists "pgcrypto";

create table resources (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  identifier text not null,
  unique(type, identifier)
);

create table locks (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id) on delete cascade,
  owner_id text not null,
  status text not null check (status in ('HELD','RELEASED','EXPIRED')),
  ttl_seconds int not null,
  created_at timestamptz default now(),
  last_heartbeat timestamptz default now(),
  unique(resource_id)
);

create index idx_locks_resource_id on locks(resource_id);
create index idx_locks_status on locks(status);
