create table public.liquidity_pools (
  id uuid not null default gen_random_uuid (),
  market_id uuid not null,
  yes_reserve numeric(12, 6) not null default 0,
  no_reserve numeric(12, 6) not null default 0,
  constant_product numeric(24, 12) not null default 0,
  total_liquidity numeric(12, 2) not null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  outcome_reserves jsonb not null default '{}'::jsonb,
  outcome_prices jsonb not null default '{}'::jsonb,
  draw_reserve numeric(12, 6) null default 0,
  constraint liquidity_pools_pkey primary key (id),
  constraint liquidity_pools_market_id_key unique (market_id),
  constraint liquidity_pools_market_id_fkey foreign KEY (market_id) references markets (id) on delete CASCADE,
  constraint positive_draw_reserve check ((draw_reserve >= (0)::numeric)),
  constraint positive_reserves check (
    (
      (yes_reserve >= (0)::numeric)
      and (no_reserve >= (0)::numeric)
    )
  )
) TABLESPACE pg_default;

create table public.market_positions (
  id uuid not null default gen_random_uuid (),
  market_id uuid not null,
  user_id uuid not null,
  outcome text not null,
  shares numeric(12, 6) not null default 0,
  average_price numeric(6, 4) not null,
  total_invested numeric(12, 2) not null default 0,
  realized_profit numeric(12, 2) null default 0,
  unrealized_profit numeric(12, 2) null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint market_positions_pkey primary key (id),
  constraint market_positions_market_id_user_id_outcome_key unique (market_id, user_id, outcome),
  constraint market_positions_market_id_fkey foreign KEY (market_id) references markets (id) on delete CASCADE,
  constraint market_positions_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint positive_price check ((average_price > (0)::numeric)),
  constraint positive_shares check ((shares >= (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_positions_market_user on public.market_positions using btree (market_id, user_id) TABLESPACE pg_default;

create index IF not exists idx_positions_user on public.market_positions using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_positions_market on public.market_positions using btree (market_id) TABLESPACE pg_default;

create index IF not exists idx_positions_user_updated on public.market_positions using btree (user_id, updated_at desc) TABLESPACE pg_default;

create trigger trigger_update_position_timestamp BEFORE
update on market_positions for EACH row
execute FUNCTION update_position_timestamp ();

create table public.market_trades (
  id uuid not null default gen_random_uuid (),
  market_id uuid not null,
  user_id uuid not null,
  trade_type text not null,
  outcome text not null,
  shares numeric(12, 6) not null,
  price_per_share numeric(6, 4) not null,
  total_amount numeric(12, 2) not null,
  platform_fee numeric(12, 2) null default 0,
  status text null default 'completed'::text,
  created_at timestamp with time zone not null default now(),
  position_id uuid null,
  constraint market_trades_pkey primary key (id, created_at),
  constraint market_trades_market_id_fkey foreign KEY (market_id) references markets (id) on delete CASCADE,
  constraint market_trades_position_id_fkey foreign KEY (position_id) references market_positions (id),
  constraint market_trades_user_id_fkey foreign KEY (user_id) references auth.users (id)
)
partition by
  RANGE (created_at);

create index IF not exists idx_market_trades_position_id on only public.market_trades using btree (position_id);

create table public.profiles (
  id uuid not null,
  username text null,
  email text null,
  region text null default 'Africa'::text,
  phone_number text null default 'not_provided'::text,
  balance numeric(10, 2) null default 5.00,
  avatar_url text null,
  is_verified boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  games_played integer null default 0,
  tournaments_created integer null default 0,
  tournaments_won integer null default 0,
  rating integer null default 1000,
  country text null,
  state text null,
  user_type text not null default 'player'::text,
  date_of_birth date null,
  gender text null,
  preferred_language text null default 'fr'::text,
  timezone text null default 'Africa/Brazzaville'::text,
  notification_preferences jsonb null default '{"sms": true, "push": true, "email": true}'::jsonb,
  security_questions jsonb null,
  referral_code text null,
  referred_by uuid null,
  terms_accepted boolean null default false,
  privacy_policy_accepted boolean null default false,
  auto_tontine_payment boolean null default true,
  constraint profiles_pkey primary key (id),
  constraint profiles_username_key unique (username),
  constraint profiles_referred_by_fkey foreign KEY (referred_by) references profiles (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint chk_profiles_balance_non_negative check ((balance >= (0)::numeric)),
  constraint valid_email_format check (
    (
      email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text
    )
  ),
  constraint valid_username_format check ((username ~ '^[a-zA-Z0-9_]{3,20}$'::text))
) TABLESPACE pg_default;

create index IF not exists idx_profiles_email_lower on public.profiles using btree (lower(email)) TABLESPACE pg_default;

create index IF not exists idx_profiles_region on public.profiles using btree (region) TABLESPACE pg_default;

create index IF not exists idx_profiles_user_id on public.profiles using btree (id) TABLESPACE pg_default;

create index IF not exists idx_profiles_username_lower on public.profiles using btree (lower(username)) TABLESPACE pg_default;

create index IF not exists idx_profiles_rating on public.profiles using btree (rating) TABLESPACE pg_default;

create trigger on_profile_created_welcome_bonus
after INSERT on profiles for EACH row when (new.balance = 5.00)
execute FUNCTION create_welcome_bonus ();

create trigger update_profiles_updated_at BEFORE
update on profiles for EACH row
execute FUNCTION update_updated_at ();

This is my markey table


create table public.markets (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text null,
  category text not null default 'general'::text,
  image_url text null,
  status public.market_status not null default 'pending'::market_status,
  created_at timestamp with time zone null default now(),
  start_date timestamp with time zone null,
  end_date timestamp with time zone null,
  resolution_date timestamp with time zone null,
  resolved_at timestamp with time zone null,
  winning_outcome public.outcome_type null,
  resolution_source text null,
  resolved_by uuid null,
  created_by uuid null,
  initial_liquidity numeric(12, 2) null default 100.00,
  min_bet_amount numeric(12, 2) null default 1.00,
  max_bet_amount numeric(12, 2) null default 10000.00,
  total_volume numeric(12, 2) null default 0,
  total_yes_shares numeric(12, 6) null default 0,
  total_no_shares numeric(12, 6) null default 0,
  total_liquidity numeric(12, 2) null default 0,
  unique_traders integer null default 0,
  yes_price numeric(6, 4) null default 0.5000,
  no_price numeric(6, 4) null default 0.5000,
  deleted_at timestamp with time zone null,
  current_volume numeric GENERATED ALWAYS as (
    (
      COALESCE((total_yes_shares * yes_price), (0)::numeric) + COALESCE((total_no_shares * no_price), (0)::numeric)
    )
  ) STORED (12, 2) null,
  is_active boolean GENERATED ALWAYS as (
    (
      (status = 'active'::market_status)
      and (deleted_at is null)
    )
  ) STORED null,
  market_type public.market_type not null default 'binary'::market_type,
  outcomes jsonb null,
  country_code text null,
  sport_type text null,
  game_type text null,
  league text null,
  team_type text null,
  match_type text null,
  tournament_name text null,
  team_a_name text null,
  team_b_name text null,
  team_a_image text null,
  team_b_image text null,
  country_id uuid null,
  category_id uuid null,
  sport_type_id uuid null,
  league_id uuid null,
  match_type_id uuid null,
  team_a_id uuid null,
  team_b_id uuid null,
  game_date timestamp with time zone null,
  constraint markets_pkey primary key (id),
  constraint markets_country_id_fkey foreign KEY (country_id) references countries (id) on delete set null,
  constraint markets_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint markets_league_id_fkey foreign KEY (league_id) references leagues (id) on delete set null,
  constraint markets_match_type_id_fkey foreign KEY (match_type_id) references match_types (id) on delete set null,
  constraint markets_resolved_by_fkey foreign KEY (resolved_by) references auth.users (id),
  constraint markets_sport_type_id_fkey foreign KEY (sport_type_id) references sport_types (id) on delete set null,
  constraint markets_team_a_id_fkey foreign KEY (team_a_id) references teams (id) on delete set null,
  constraint markets_category_id_fkey foreign KEY (category_id) references categories (id) on delete set null,
  constraint markets_team_b_id_fkey foreign KEY (team_b_id) references teams (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_markets_category on public.markets using btree (category) TABLESPACE pg_default;

create index IF not exists idx_markets_created_at on public.markets using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_markets_end_date on public.markets using btree (end_date) TABLESPACE pg_default;

create index IF not exists idx_markets_deleted_at on public.markets using btree (deleted_at) TABLESPACE pg_default
where
  (deleted_at is null);

create index IF not exists idx_markets_status on public.markets using btree (status) TABLESPACE pg_default;

create index IF not exists idx_markets_resolution_status on public.markets using btree (resolution_date, status) TABLESPACE pg_default
where
  (
    status = any (
      array['active'::market_status, 'pending'::market_status]
    )
  );

create index IF not exists idx_markets_country_code on public.markets using btree (country_code) TABLESPACE pg_default;

create index IF not exists idx_markets_sport_type on public.markets using btree (sport_type) TABLESPACE pg_default;

create index IF not exists idx_markets_league on public.markets using btree (league) TABLESPACE pg_default;

create index IF not exists idx_markets_tournament_name on public.markets using btree (tournament_name) TABLESPACE pg_default;

create trigger trigger_initialize_liquidity_pool
after INSERT on markets for EACH row
execute FUNCTION initialize_liquidity_pool_with_draw ();