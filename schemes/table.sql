-- Users table (unchanged)
create table users (
  id uuid primary key references auth.users(id),
  age integer check (age >= 18), -- Restrict to 18+ for DRC gambling laws
  preferred_payment_method text check (preferred_payment_method in ('orange_money', 'm_pesa', 'airtel_money')) not null,
  balance float default 0,
  created_at timestamp with time zone default now()
);

-- Games table (updated with closes_at)
create table games (
  id serial primary key,
  player1_id uuid references users(id),
  player2_id uuid references users(id),
  stake float not null,
  status text check (status in ('open', 'active', 'finished', 'closed')) default 'open', -- Added 'closed' status
  board jsonb,
  winner_id uuid references users(id),
  created_at timestamp with time zone default now(),
  closes_at timestamp with time zone default now() + interval '48 hours' -- Auto-set to 48 hours from creation
);

-- Enable Row-Level Security (RLS) for users table
alter table users enable row level security;
create policy user_access on users for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Enable Row-Level Security (RLS) for games table
alter table games enable row level security;
create policy game_access on games for all
  using (auth.uid() in (player1_id, player2_id) or player2_id is null)
  with check (auth.uid() in (player1_id, player2_id));

-- Enable Realtime for games table
alter table games replica identity full;

-- Cleanup function (replaces pg_cron)
create or replace function cleanup_games()
returns void as $$
begin
  -- Close open games older than 48 hours
  update games
  set status = 'closed'
  where status = 'open' and closes_at < now();

  -- Delete finished or closed games older than 7 days
  delete from games
  where status in ('finished', 'closed') and created_at < now() - interval '7 days';
end;
$$ language plpgsql;
