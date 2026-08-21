# Fixtures

**euro-problem.txt** — a genuine rekordbox export, 10 tracks, fully keyed. The
reference for "does the parser handle the real format": UTF-16LE with a BOM,
the real column order, real accented characters in artist names.

**open-key.txt / classical-de.txt / no-keys.txt** — synthetic, hand-written to
exercise one thing each: Open Key notation, non-English column headers, and an
export too sparse to report harmonic readings.

**asot-demo.txt — assembled, not exported.** Read this before using it for
anything but tests.

The track order and titles are the published tracklist of an *A State of Trance*
compilation mixed by Armin van Buuren, transcribed from screenshots. The BPM,
key, length and genre on each row were looked up on Beatport and matched by
title *and* artist *and* remix name — the remix mattered: matching "Fiji" on
title alone returned the Yeadon mix at 123bpm F Minor when the tracklist calls
for the Oliver Smith mix at 130bpm F Major.

What that means for anyone reading numbers off it:

- **30% of the tracks carry no key or tempo at all.** Thirteen of forty-three
  are ASOT exclusives or unreleased and simply are not on Beatport. Their rows
  are deliberately blank rather than filled with a near-miss, so the file sits
  at 70% key coverage.
- **The tempo is the released tempo, not the played tempo.** Nobody's pitch
  fader is in this data.
- **One row is likely half-time.** Beatport tags "SPECIAL TOUCH" at 74 BPM in a
  set otherwise running 128-150, which is almost certainly a half-time analysis
  of a 148 track. It is left as Beatport reports it rather than silently
  doubled, because correcting it would mean inventing a number.

So this is a real tracklist with real metadata attached to it — but it is not a
capture of a performance, and it is not something Armin van Buuren exported.
Fine as a parser fixture. Anything user-facing needs to say what it is.
