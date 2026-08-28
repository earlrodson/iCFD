-- National President / National Spiritual Adviser names printed on every
-- issued certificate (see lib/content/certificateTemplate.ts). Global,
-- site-wide values reused across every path/tier — editable via the existing
-- generic App Config UI at /admin (site_config), no dedicated admin UI needed.
insert into site_config (key, value, description)
values
  ('certificate_national_president', '', 'Name printed as National President on issued certificates'),
  ('certificate_national_spiritual_adviser', '', 'Name printed as National Spiritual Adviser on issued certificates')
on conflict (key) do nothing;
