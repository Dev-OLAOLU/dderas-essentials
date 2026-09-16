-- Ambassador seat lock (exactly two studio profiles) + ops settings.

create table if not exists ambassadors (
  user_id      text primary key,
  email        text not null default '',
  display_name text not null default '',
  seat         integer not null unique check (seat in (1, 2)),
  created_at   timestamptz not null default now()
);

create index if not exists ambassadors_seat_idx on ambassadors (seat);

create table if not exists studio_settings (
  id           integer primary key check (id = 1),
  notify_email text not null default '',
  updated_at   timestamptz not null default now(),
  updated_by   text
);

insert into studio_settings (id, notify_email)
values (1, '')
on conflict (id) do nothing;

alter table intakes add column if not exists completed_at timestamptz;
