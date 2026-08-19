import { ringsSvgMarkup } from '@/lib/ui/ringsSvg';
import type { Vitals } from '@/lib/metrics/vitals';

/**
 * The flat rings. Renders the shared SVG builder so the page and the share card
 * cannot drift apart, and needs no client JavaScript — which is what makes it
 * the reduced-motion and no-WebGL fallback.
 */
export function Rings2D({ vitals }: { vitals: Vitals }) {
  return (
    <div
      className="w-full max-w-[480px] [&>svg]:w-full [&>svg]:h-auto"
      role="img"
      aria-label="Harmonic rings: one ring per Camelot key, marked where in the set that key was playing"
      dangerouslySetInnerHTML={{ __html: ringsSvgMarkup(vitals) }}
    />
  );
}
