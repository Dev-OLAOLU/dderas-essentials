-- Photos attached to a booking. No FK so a vault restore of intakes
-- does not wipe pictures that still match the same booking id.

create table if not exists intake_files (
  id           serial primary key,
  intake_id    integer not null,
  kind         text not null,
  filename     text not null,
  mime         text not null,
  bytes        integer not null,
  data         text not null,
  uploaded_by  text not null,
  created_at   timestamptz not null default now()
);

create index if not exists intake_files_intake_idx
  on intake_files (intake_id, created_at desc);
