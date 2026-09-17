-- Chidera is always copied via STUDIO.email. notify_email is the second admin inbox.

update studio_settings
set notify_email = ''
where id = 1 and lower(notify_email) = 'chideraal29@gmail.com';
