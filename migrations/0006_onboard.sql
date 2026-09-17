-- Client quote / payment choice after Chidera onboards a booking.

alter table intakes add column if not exists client_email text not null default '';
alter table intakes add column if not exists client_token text;
alter table intakes add column if not exists payment_choice text;
alter table intakes add column if not exists quote_sent_at timestamptz;
alter table intakes add column if not exists payment_choice_at timestamptz;

create unique index if not exists intakes_client_token_idx
  on intakes (client_token)
  where client_token is not null;

update studio_settings
set notify_email = 'chideraal29@gmail.com'
where id = 1 and (notify_email is null or notify_email = '');
