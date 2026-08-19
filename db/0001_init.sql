-- Saber schema. Run once against the Neon database:
--   psql "$DATABASE_URL" -f db/0001_init.sql
-- or paste it into the Neon SQL editor.

create extension if not exists "pgcrypto";

create table if not exists sets (
  id          uuid primary key default gen_random_uuid(),
  -- Reserved for when accounts arrive. Until then a set belongs to whoever
  -- holds its claim token, and nothing else.
  user_id     uuid,
  -- Minted on save and kept in the uploader's signed cookie. This is the only
  -- thing that makes an unpublished set readable.
  claim_token uuid not null default gen_random_uuid(),
  title       text,
  played_at   date,
  venue       text,
  city        text,
  source      text not null check (source in ('rekordbox', 'serato', 'traktor')),
  is_public   boolean not null default false,
  archetype   text not null,
  vitals      jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists sets_user_id_idx on sets (user_id, created_at desc);
create index if not exists sets_public_idx on sets (created_at desc) where is_public;

create table if not exists tracks (
  id         uuid primary key default gen_random_uuid(),
  set_id     uuid not null references sets(id) on delete cascade,
  position   int not null,
  title      text not null,
  artist     text,
  bpm        numeric,
  camelot    text,
  duration_s int
);

create index if not exists tracks_set_id_idx on tracks (set_id, position);

-- No row level security here, and that is deliberate rather than an omission.
-- Postgres RLS keys off a database role or a JWT claim, and an anonymous
-- uploader has neither: the set exists before anyone has signed in. Every read
-- goes through a server route that checks the signed cookie first, and the
-- connection string never reaches a browser. When accounts land, user_id gets
-- its foreign key and RLS becomes worth switching on.
