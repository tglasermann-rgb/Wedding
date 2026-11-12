-- Platform is English-first: new events default to English and a US time zone.
alter table events alter column locale set default 'en';
alter table events alter column timezone set default 'America/New_York';
alter table message_templates alter column wa_language set default 'en_US';
update events set locale = 'en' where locale = 'es';
