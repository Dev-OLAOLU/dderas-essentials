-- D-Dera's Essentials — home-service booking + client intake.
-- Public form writes rows; only a signed-in therapist can read or update them.

create table if not exists intakes (
  id                  serial primary key,
  reference           text not null unique,
  full_name           text not null,
  phone               text not null,
  address_exact       text not null,
  service_area        text not null default '',
  preferred_date      text not null,
  preferred_time      text not null,
  service_type        text not null,
  duration_minutes    integer not null,
  extras              text not null default '[]',
  service_fee         integer not null,
  extras_fee          integer not null default 0,
  transport_fee       integer not null default 0,
  grand_total         integer not null,
  injuries_flag       boolean not null default false,
  injuries_detail     text not null default '',
  allergies           text not null default '',
  areas_of_focus      text not null default '[]',
  pressure            text not null,
  consent_name        text not null,
  consent_at          timestamptz not null default now(),
  status              text not null default 'new',
  deposit_received    boolean not null default false,
  therapist_notes     text not null default '',
  updated_by          text,
  created_at          timestamptz not null default now()
);

create index if not exists intakes_created_at_idx on intakes (created_at desc);
create index if not exists intakes_status_idx on intakes (status);
create index if not exists intakes_preferred_date_idx on intakes (preferred_date);
