-- Chapter map coordinates, set manually by an admin via a map picker
-- (search-and-click, no geocoding provider) in /admin/organization. Nullable
-- since existing chapters have no location yet.

ALTER TABLE "chapters"
  ADD COLUMN "lat" double precision,
  ADD COLUMN "lng" double precision;
