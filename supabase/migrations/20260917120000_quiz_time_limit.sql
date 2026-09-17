-- Per-tier quiz time limit, admin-editable via /admin/quiz.
-- Required (not nullable) — every tier must have a limit, no "unlimited" option.
alter table quiz_settings
  add column time_limit_minutes integer not null default 15;

alter table quiz_settings
  alter column time_limit_minutes drop default;
