-- Celebra now ships in English: new events default to English and US Eastern time.
alter table events alter column locale set default 'en';
alter table events alter column timezone set default 'America/New_York';
