import type { Vitals } from './vitals';
import {
  BOLD_HIGH,
  CLIMB_FLAT,
  CLIMB_STEADY,
  HARMONIC_HIGH,
  PEAK_EARLY,
  PEAK_LATE,
  RANGE_NARROW,
  RANGE_WIDE,
  RISK_HIGH,
  WIDE_LOW,
} from './thresholds';

export type ArchetypeId =
  | 'architect'
  | 'gambler'
  | 'sprinter'
  | 'marathon'
  | 'tightrope'
  | 'wanderer'
  | 'anchor';

export type ReadingKey = 'harmonic' | 'risk' | 'range' | 'climb';

export type Archetype = {
  id: ArchetypeId;
  name: string;
  /** One plain sentence. Describes the set, never grades it. */
  blurb: string;
  /** The two readings that put the set here. */
  drivers: [ReadingKey, ReadingKey];
};

const ARCHETYPES: Record<ArchetypeId, Omit<Archetype, 'drivers'>> = {
  architect: {
    id: 'architect',
    name: 'The Architect',
    blurb: 'Tightly keyed, few big jumps, tempo moving one direction all night.',
  },
  gambler: {
    id: 'gambler',
    name: 'The Gambler',
    blurb: 'Big key moves across a wide tempo spread — this set kept changing rooms.',
  },
  sprinter: {
    id: 'sprinter',
    name: 'The Sprinter',
    blurb: 'The fastest track landed in the first third and the set worked outward from there.',
  },
  marathon: {
    id: 'marathon',
    name: 'The Marathon',
    blurb: 'Tempo climbed steadily and peaked in the last third.',
  },
  tightrope: {
    id: 'tightrope',
    name: 'The Tightrope',
    blurb: 'Bold key moves that still landed in key — high wire, no falls.',
  },
  wanderer: {
    id: 'wanderer',
    name: 'The Wanderer',
    blurb: 'Wide spread of tempos and keys with no single direction of travel.',
  },
  anchor: {
    id: 'anchor',
    name: 'The Anchor',
    blurb: 'Narrow tempo band, tightly keyed, holding one pocket the whole way.',
  },
};

/**
 * Resolve an archetype from the four readings. Deterministic and ordered — no
 * model call, so the same set always comes back the same, for free.
 *
 * Note on Tightrope: Harmonic and Risk are complements by construction (every
 * transition is one or the other), so "high Harmonic and high Risk" can only be
 * read off the components. Tightrope keys off the Bold share specifically —
 * deliberate big moves — against a low Wide share, which is what the name
 * actually describes.
 */
export function resolveArchetype(vitals: Vitals): Archetype {
  const { harmonic, risk, range, climb } = vitals;
  const { boldShare, wideShare, peakPosition } = vitals.components;
  const at = (id: ArchetypeId, drivers: [ReadingKey, ReadingKey]): Archetype => ({
    ...ARCHETYPES[id],
    drivers,
  });

  const flat = climb !== null && Math.abs(climb) < CLIMB_FLAT;
  const climbing = climb !== null && climb >= CLIMB_STEADY;

  if (
    harmonic !== null &&
    boldShare !== null &&
    wideShare !== null &&
    boldShare >= BOLD_HIGH &&
    wideShare <= WIDE_LOW
  ) {
    return at('tightrope', ['harmonic', 'risk']);
  }

  if (harmonic !== null && harmonic >= HARMONIC_HIGH && range !== null && range <= RANGE_NARROW && flat) {
    return at('anchor', ['harmonic', 'range']);
  }

  if (harmonic !== null && harmonic >= HARMONIC_HIGH && climbing) {
    return at('architect', ['harmonic', 'climb']);
  }

  if (peakPosition !== null && peakPosition >= PEAK_LATE && climbing) {
    return at('marathon', ['climb', 'range']);
  }

  if (peakPosition !== null && peakPosition <= PEAK_EARLY) {
    return at('sprinter', ['climb', 'range']);
  }

  if (risk !== null && risk >= RISK_HIGH && range !== null && range >= RANGE_WIDE) {
    return at('gambler', ['risk', 'range']);
  }

  if (range !== null && range >= RANGE_WIDE && flat) {
    return at('wanderer', ['range', 'climb']);
  }

  // Nothing matched cleanly — fall back to whichever reading is most extreme so
  // every set still gets a name.
  if (risk !== null && risk >= RISK_HIGH) return at('gambler', ['risk', 'range']);
  if (range !== null && range <= RANGE_NARROW) return at('anchor', ['range', 'harmonic']);
  if (harmonic !== null && harmonic >= HARMONIC_HIGH) return at('architect', ['harmonic', 'climb']);
  return at('wanderer', ['range', 'climb']);
}

export function archetypeById(id: ArchetypeId): Omit<Archetype, 'drivers'> {
  return ARCHETYPES[id];
}
