-- One row per set dropped on the site, whether or not it was ever saved.
--
-- This is the answer to "how many different people actually used it", which
-- neither the sets table nor a page-view count can give: sets only records
-- what someone chose to save, and a visit is not a use.
--
-- Deliberately thin. No track titles, no artists, no tempo, no IP address —
-- a count of uses and the coarse shape of them, nothing that could reconstruct
-- what anyone played. reader_id is a random id in a signed cookie, so it
-- counts returning browsers without identifying anybody.
create table if not exists set_reads (
  id          uuid primary key default gen_random_uuid(),
  reader_id   uuid not null,
  created_at  timestamptz not null default now(),
  source      text not null,
  track_count int not null,
  has_keys    boolean not null
);

create index if not exists set_reads_reader_idx on set_reads (reader_id);
create index if not exists set_reads_created_idx on set_reads (created_at desc);
