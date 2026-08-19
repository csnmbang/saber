# Saber

A DJ drops an exported set history and gets back a visual, statistical portrait of what they
actually played: harmonic structure, energy climb, risk profile, and a named archetype.

It labels and describes. It does not score, rank, or roast anyone. See [CLAUDE.md](CLAUDE.md)
for the full spec — product rules, design system, data model, and build order.

## Status

Build order steps 1–2 are done and unit-tested; nothing is wired to a UI yet.

- [x] 1. Parser + key normalization (`lib/parse`)
- [x] 2. Metrics — the four readings and the archetypes (`lib/metrics`)
- [ ] 3. Supabase schema, RLS, anonymous sessions
- [ ] 4. Upload → result page, flat 2D rings
- [ ] 5. Harmonic Rings in 3D
- [ ] 6. OG card
- [ ] 7. Email claim flow
- [ ] 8. The Helix

## Layout

```
lib/parse/key.ts         Camelot / Open Key / classical -> Camelot
lib/parse/rekordbox.ts   UTF-16LE .txt export -> tracks
lib/metrics/transitions.ts  locked / smooth / bold / wide
lib/metrics/vitals.ts    harmonic, risk, range, climb (+ raw components)
lib/metrics/archetype.ts deterministic archetype resolution
lib/metrics/thresholds.ts every tunable number, in one file
test/fixtures/rekordbox/ real and synthetic exports
```

## Commands

```bash
npm run dev        # next dev
npm test           # vitest run
npm run typecheck  # tsc --noEmit
```

## Fixtures

`test/fixtures/rekordbox/euro-problem.txt` is a real rekordbox export (10 tracks, fully keyed) —
it is what proves the UTF-16LE decoding and header matching work against the actual format.
The others are synthetic, covering Open Key notation, non-English headers, and sparse key data.

Adding a fixture from someone else's set means committing their tracklist to this repo. Only do
it with their say-so.

## Credit

The 3D visuals are adapted conceptually from Kenichi Yoneda's *Geom* (CC BY-SA 4.0) — built from
the concepts, not his shaders, and credited in the footer.
