-- Show/hide the "Recommended for You" section on the home page (app/page.tsx).
-- 'true' (default) shows it; any other value hides it. Editable via the
-- existing generic App Config UI at /admin — no dedicated admin UI needed.
insert into site_config (key, value, description)
values
  ('home_show_recommended', 'true', 'Show the "Recommended for You" section on the home page. Set to "false" to hide it.')
on conflict (key) do nothing;
