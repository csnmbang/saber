'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Rings2D } from './Rings2D';
import type { Vitals } from '@/lib/metrics/vitals';

// three.js is heavy and only the result view needs it, so it stays out of the
// bundle the drop zone loads.
const Rings3D = dynamic(() => import('./Rings3D'), { ssr: false });

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Renders the rings in 3D, falling back to the flat SVG for reduced-motion
 * users and for anything without WebGL. The SVG carries the same reading, so
 * the fallback loses the depth and nothing else.
 */
export function HarmonicRings({ vitals }: { vitals: Vitals }) {
  const [use3D, setUse3D] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setUse3D(!reduced && supportsWebGL());
  }, []);

  return use3D ? <Rings3D vitals={vitals} /> : <Rings2D vitals={vitals} />;
}
