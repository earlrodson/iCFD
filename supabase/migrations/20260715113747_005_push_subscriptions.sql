create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

-- Users can manage their own subscriptions; anonymous subscriptions allowed (user_id nullable)
create policy "Users can insert own subscription"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid() or user_id is null);

create policy "Users can delete own subscription"
  on public.push_subscriptions for delete
  using (user_id = auth.uid() or user_id is null);

create policy "Users can view own subscription"
  on public.push_subscriptions for select
  using (user_id = auth.uid() or user_id is null);

-- Edge function needs to read all subscriptions to send notifications
create policy "Service role can read all subscriptions"
  on public.push_subscriptions for select
  using (auth.role() = 'service_role');
