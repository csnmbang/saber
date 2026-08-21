# Fixtures

**euro-problem.txt** — a genuine rekordbox export, 10 tracks, fully keyed. The
reference for "does the parser handle the real format": UTF-16LE with a BOM,
the real column order, real accented characters in artist names.

**open-key.txt / classical-de.txt / no-keys.txt** — synthetic, hand-written to
exercise one thing each: Open Key notation, non-English column headers, and an
export too sparse to report harmonic readings.

**asot-demo.txt, and the three files in public/demo — assembled, not exported.**
Read this before using them for anything but tests.

The track order and titles come from published tracklists, transcribed from
screenshots: an *A State of Trance* compilation mixed by Armin van Buuren,
Purple Disco Machine's *Purple Disco Tales*, and a *Global Dance HQ* show with
Pete Tong, Michael Bibi and Tini Gessler. The BPM,
key, length and genre on each row were looked up on Beatport and matched by
title *and* artist *and* remix name — the remix mattered: matching "Fiji" on
title alone returned the Yeadon mix at 123bpm F Minor when the tracklist calls
for the Oliver Smith mix at 130bpm F Major.

What that means for anyone reading numbers off it:

- **Unmatched tracks are `ID - ID`.** Thirteen of forty-three in the ASOT set,
  five of fourteen in Purple Disco Tales, eight of thirty in Global Dance HQ.
  Those are exclusives, edits and unreleased material that are not on Beatport. They keep their place in
  the running order but carry no title, artist, tempo or key — `ID` is what a DJ
  writes for a track nobody has identified, which says unknown out loud instead
  of leaving rows that read as a rendering fault. Key coverage lands at 70%,
  64% and 73%, all above the 60% floor for reporting harmonic readings.
- **The tempo is the released tempo, not the played tempo.** Nobody's pitch
  fader is in this data.
- **One row is corrected, deliberately.** Beatport tags "SPECIAL TOUCH" at 74
  BPM in a set otherwise running 128-150 — a half-time analysis of a 148 track.
  It is stored here at 148. That is the one number in this file that does not
  match its source, and it is recorded here so nobody has to rediscover it: left
  at 74 it dragged the set's floor down by more than fifty BPM and invented a
  fourth peak that was an artifact of the tag rather than the music.

So this is a real tracklist with real metadata attached to it — but it is not a
capture of a performance, and it is not something Armin van Buuren exported.
Fine as a parser fixture. Anything user-facing needs to say what it is.
