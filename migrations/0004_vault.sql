-- Studio vault: full booking snapshots + per-client revision history.

create table if not exists studio_backups (
  id            serial primary key,
  label         text not null,
  kind          text not null default 'manual',
  intake_count  integer not null default 0,
  payload       text not null,
  created_by    text,
  created_at    timestamptz not null default now()
);

create index if not exists studio_backups_created_at_idx
  on studio_backups (created_at desc);

create table if not exists intake_revisions (
  id          serial primary key,
  intake_id   integer not null,
  reference   text not null,
  snapshot    text not null,
  reason      text not null,
  summary     text not null default '',
  created_by  text,
  created_at  timestamptz not null default now()
);

create index if not exists intake_revisions_intake_idx
  on intake_revisions (intake_id, created_at desc);
