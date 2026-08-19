-- Beatport Top 100 chart snapshots. scene-radar's daily cron writes this
-- table directly; Saber only ever reads it. Field names match scene-radar's
-- own ChartEntry (scene_radar/beatport.py) so the writer needs no translation
-- layer on its end.

create table if not exists beatport_chart_entries (
  id            uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  collected_at  timestamptz not null default now(),
  chart_genre   text not null,
  rank          int not null check (rank between 1 and 100),
  track_id      bigint not null,
  track_title   text not null,
  mix_name      text,
  artist_raw    text not null,
  artist_norm   text not null
);

create index if not exists beatport_chart_entries_snapshot_idx
  on beatport_chart_entries (snapshot_date desc);
create index if not exists beatport_chart_entries_genre_idx
  on beatport_chart_entries (chart_genre, snapshot_date desc);

-- A day's run either lands in full or not at all, same as scene-radar's own
-- write_snapshot/replace_snapshot behaves locally — otherwise a failed run
-- could leave one genre from today sitting next to nine from three days ago
-- with nothing to tell them apart later.
