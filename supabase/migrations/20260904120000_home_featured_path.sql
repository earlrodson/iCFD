-- Slug of the learning path (paths.slug) to feature as a progress widget on
-- the home page, replacing the generic Read/Saved stats bar. Empty = hidden.
-- Editable from /admin/paths (per-row "Feature on Home" toggle) rather than
-- typed by hand — see app/admin/paths/page.tsx.
insert into site_config (key, value, description)
values
  ('home_featured_path', '', 'Slug of the path to feature as a progress widget on the home page. Empty hides the widget.')
on conflict (key) do nothing;
