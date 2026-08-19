# SABER — project spec

## What this is

A web tool where a DJ uploads their exported set history and gets back a visual, statistical
portrait of the set they played: harmonic structure, energy climb, risk profile, and a named
archetype.

**It does not score, rank, or roast anyone.** It labels and describes. The shareable moment is
identity ("I'm an Architect"), not judgment ("you got a 62"). Nothing in the copy, the metrics,
or the generated text should read as a verdict on someone's skill. This is a mirror, not a judge.

Audience: DJs. Niche, deep, opinionated. Assume the user knows what Camelot notation is and does
not need BPM explained to them.

## Naming and domains

- `saber.me` — this app. The only thing a public visitor sees.
- `request.saber.me` — existing DJ request app (`csnmbang/dj-request`). Stays live, no cross-links.
- `radar.xtremedigits.com/radar` — Scene Radar. Stays live, unlinked, not in any nav.

Nothing gets deleted. Nothing gets linked from `saber.me`. No "my other projects" footer.

*Saber* = "to know" in Spanish. The tagline should lean on that: the tool tells you what you
actually did.

## Stack

- Next.js (App Router) on Vercel
- Supabase — Postgres, Auth (email magic link), Storage for generated cards
- three.js / react-three-fiber for the 3D visuals
- `@vercel/og` for the static share card
- No audio processing anywhere. Everything is derived from exported metadata.

## Input formats

**v1: rekordbox `.txt` only.** Ship this, then add others.

rekordbox: File > Export a playlist to a file (*.txt). Works on the History playlist too.

Critical parsing details:
- Encoding is **UTF-16LE with a BOM**. Read as `utf16le`, strip the BOM, then split. Reading it
  as utf8 yields interleaved null bytes.
- Tab-delimited, first row is headers.
- Header names vary by rekordbox version and by the user's language setting. Match columns by
  fuzzy header name, not by index. Expect at minimum: `#`, `Track Title`, `Artist`, `BPM`, `Key`,
  `Time`. Do not assume `Key` is populated — many users never analyze their library.
- Key notation may be Camelot (`8A`), Open Key (`1m`), or classical (`Am`). Normalize all three
  to Camelot internally.

Ignore `.m3u8` — it contains file paths only, no BPM or key.

Later: Serato (`.csv`), Traktor (`.nml`, XML).

**Failure behavior:** if fewer than 60% of tracks have a usable key, do not fake it. Show the
BPM-and-structure half of the analysis and tell the user plainly that key data is missing from
their export, with a one-line note on how to analyze their library in rekordbox so the next
upload works. Never silently interpolate missing keys.

## Data model (Supabase)

```
profiles
  id            uuid pk (references auth.users)
  display_name  text
  created_at    timestamptz

sets
  id            uuid pk
  user_id       uuid null references profiles(id)   -- null until claimed
  title         text
  played_at     date null
  venue         text null
  city          text null
  source        text            -- 'rekordbox' | 'serato' | 'traktor'
  is_public     boolean default false               -- ALWAYS false on insert
  archetype     text
  vitals        jsonb           -- computed metric block
  created_at    timestamptz

tracks
  id            uuid pk
  set_id        uuid references sets(id) on delete cascade
  position      int
  title         text
  artist        text
  bpm           numeric null
  camelot       text null       -- normalized, e.g. '8A'
  duration_s    int null
```

RLS on from day one. A row in `sets` is readable by its `user_id`, or by anyone if
`is_public = true`. `tracks` inherit via their parent set. Anonymous uploads get a signed
session token in a cookie so an unclaimed set stays viewable to the uploader only.

**Privacy is a hard requirement, not a preference.** DJs are protective of unreleased IDs and
crate secrets. `is_public` defaults to false, publishing is an explicit toggle with a plain-
language explanation of exactly what becomes visible, and unpublishing is one click and immediate.

## Metrics — the Vitals

There is no single overall score. The panel shows four independent readings, each named, each
neutral in tone. The interest is in the spread between them.

### Camelot compatibility

Normalize every key to `{number: 1-12, letter: A|B}`.

Classify each adjacent transition:
- **Locked** — identical key
- **Smooth** — ±1 on the number, same letter; or same number, opposite letter (relative major/minor)
- **Bold** — +7 on the number, same letter (dominant, energy lift); or ±2 same letter
- **Wide** — anything else

Wrap the number arithmetic modulo 12 (12 → 1). Transitions where either key is unknown are
excluded from the denominator, not counted as failures.

### The four readings

- **Harmonic** — share of transitions that are Locked or Smooth. Describes how tightly the set
  was keyed. High is not "better," it is tighter.
- **Risk** — share of transitions that are Bold or Wide. Reported as its own number, never as a
  penalty against Harmonic.
- **Range** — BPM spread (p90 − p10) combined with count of distinct Camelot keys touched.
- **Climb** — Spearman correlation between track position and BPM, plus the normalized position
  of the peak BPM in the set. Tells you the shape: front-loaded, steady climb, plateau, or
  wave.

Store all four plus their raw components in `sets.vitals` so the visuals and the archetype logic
read from one place.

### Archetypes

Derived deterministically from thresholds on the four readings — no LLM call, so it is
reproducible and free. Every name must be neutral-to-flattering. None of them can be an insult.

Starting set (tune the thresholds against real sets):

- **The Architect** — high Harmonic, low Risk, steady Climb
- **The Gambler** — high Risk, wide Range
- **The Sprinter** — peak BPM in the first third
- **The Marathon** — peak in the last third, steady Climb
- **The Tightrope** — high Harmonic *and* high Risk (bold moves that still land in key)
- **The Wanderer** — wide Range, flat Climb
- **The Anchor** — narrow Range, high Harmonic, flat Climb

Copy under the archetype describes what it means in one plain sentence, then shows the two
readings that drove it. Descriptive, not evaluative.

## Visuals

Two 3D objects, both driven by the tracklist rather than by audio. Conceptually adapted from
Kenichi Yoneda's *Geom* sound-reactive shapes — his code is **CC BY-SA 4.0**, so build these
from the concepts rather than copying his shaders, and credit him in the footer regardless.

**Harmonic Rings** *(the signature element — build this one first and best)*
Twelve concentric tori, one per Camelot number, arranged on a wheel. Each ring's thickness scales
with how much set time was spent in that key; each is colored by its Camelot hue. A DJ's
harmonic fingerprint, unique per set, static, and it renders straight to the share card.

**The Helix**
The set as a coil climbing upward. Vertical axis = position in the set, tube radius = BPM
relative to the set's own range, color = current Camelot key so the coil shifts hue at every key
change. Slow constant rotation for a loopable Stories GIF.

Both need a reduced-motion fallback and a flat 2D SVG version of the Rings for the OG image, so
links unfurl fast without booting WebGL.

## Design

Dark, in the register of DJ software (rekordbox, Traktor) rather than a SaaS dashboard —
technical, dense, comfortable in a dark room. CrowdVolt is a useful reference for restraint.

- **Background** near-black `#0B0B0C`, surfaces one step up `#141416`
- **Text** cream `#EDE7DB`, muted `#8A8A8F`
- **Accent** is not a single color — the Camelot wheel *is* the palette. Generate the 12 hues
  programmatically: `hue = (n - 1) * 30`, with B keys (major) brighter and more saturated than
  A keys (minor). Use those hues only for key-derived data. Never decorate with them.
- **Display type** Anton, used sparingly and large — the archetype name, the section headers.
  Not Impact; it reads as meme.
- **Data type** a wide mono (Space Mono or JetBrains Mono) for every number, label, and readout.
- Everything is sentence case except the archetype, which is Anton caps.

Spend the boldness on the Harmonic Rings. Keep every panel around it quiet, tabular, and precise.

## Flow

1. Land. One line explaining what it does, one drop zone. No signup, no marketing page.
2. Drop the `.txt`. Parse client-side for instant feedback, persist server-side.
3. Rings render. Vitals panel fills in. Archetype resolves.
4. **Then** — and only then — offer: save this set, get the card, keep your history.
   Email magic link, optional, dismissible. Never gate the result behind it.
5. Publishing is a separate, later, explicit action.

## Copy rules

- Never evaluate. "Peak at track 14" not "you peaked too early."
- Errors say what happened and what to do. No apologizing, no vagueness.
- Empty states invite an action.
- Active voice on every control. The button that says "Publish set" produces "Set published."

## Out of scope for v1

No payments, no public gallery, no map, no leaderboard, no comparison between DJs, no LLM
verdicts, no Serato or Traktor, no audio. Ship the loop — drop a file, see the rings, share the
card — and nothing else.

## Build order

1. Parser + key normalization, with fixtures from real exports. Unit-tested before any UI.
2. Metrics module — pure functions over the parsed tracklist. Also unit-tested.
3. Supabase schema, RLS policies, anonymous-session handling.
4. Upload → result page, with the flat 2D rings only.
5. Harmonic Rings in 3D.
6. OG card via `@vercel/og`.
7. Email claim flow.
8. The Helix.

## Later, once people return

- **Press kit export** — a clean PDF stat sheet across all of a DJ's sets, for pitching
  promoters. This is the paid tier. Getting booked is the one thing DJs pay for.
- **Season recap** — a yearly wrapped, paid, high share spike.
- **Venue view** — what actually works on a given floor across residents. Promoters have budget
  that individual DJs do not.
- Featured placement on the public gallery.

Do not build any of this until the free loop has repeat users.
