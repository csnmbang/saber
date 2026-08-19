import { parseCamelot } from '@/lib/parse/key';
import type { ParsedTrack } from '@/lib/parse/types';
import { camelotColor } from '@/lib/ui/colors';

function KeyChip({ camelot }: { camelot: string | null }) {
  const parsed = parseCamelot(camelot);
  if (!parsed) return <span className="text-muted">—</span>;
  return (
    <span style={{ color: camelotColor(parsed.number, parsed.letter) }}>{camelot}</span>
  );
}

export function Tracklist({ tracks }: { tracks: ParsedTrack[] }) {
  return (
    <section>
      <h2 className="display text-2xl mb-2">Tracklist</h2>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="label border-t border-line">
            <th className="text-left font-normal py-2 w-8">#</th>
            <th className="text-left font-normal py-2">Track</th>
            <th className="text-right font-normal py-2 w-16">BPM</th>
            <th className="text-right font-normal py-2 w-14">Key</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track) => (
            <tr key={track.position} className="border-t border-line align-top">
              <td className="readout py-2 text-muted">{track.position}</td>
              <td className="py-2 pr-4">
                {track.title}
                {track.artist && <span className="text-muted"> · {track.artist}</span>}
              </td>
              <td className="readout py-2 text-right">{track.bpm?.toFixed(0) ?? '—'}</td>
              <td className="readout py-2 text-right">
                <KeyChip camelot={track.camelot} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
