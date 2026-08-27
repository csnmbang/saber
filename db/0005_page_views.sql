-- One row per page a browser lands on, not just per file dropped. set_reads
-- only fires on a successful drop, which misses every visitor who looked
-- around, browsed an example, or bounced before uploading anything — exactly
-- the visitors a promotional post mostly sends.
--
-- Same privacy shape as set_reads: reader_id is the existing anonymous cookie,
-- and the only other thing stored is the path itself. No query strings, no
-- referrer header, no user agent, no IP.
create table if not exists page_views (
  id          uuid primary key default gen_random_uuid(),
  reader_id   uuid not null,
  created_at  timestamptz not null default now(),
  path        text not null
);

create index if not exists page_views_created_idx on page_views (created_at desc);
create index if not exists page_views_reader_idx on page_views (reader_id, created_at);
