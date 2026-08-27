-- Every read now carries its archetype and full vitals, not just the coarse
-- shape 0003 captured. The founder asked a real question after 0003 shipped:
-- not "how many people used this" but "what did they get" — is the archetype
-- distribution repetitive, do the readings cluster. That needs the actual
-- numbers, not just a count.
--
-- Still no track data. vitals is the same jsonb sets.vitals already stores
-- when someone explicitly saves: the four readings, their components, BPM
-- stats, key and genre shares by category name. Genre share is a share of a
-- genre string the export itself carried, never a track title or an artist.
-- Nothing here can reconstruct what anyone actually played.
alter table set_reads add column if not exists archetype text;
alter table set_reads add column if not exists vitals jsonb;

create index if not exists set_reads_archetype_idx on set_reads (archetype);
