'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { DoubleSide, type Group } from 'three';
import { camelotColorThree, EMPTY_RING_THREE } from '@/lib/ui/colors';
import type { Vitals } from '@/lib/metrics/vitals';

const INNER_R = 0.95;
const RING_GAP = 0.4;
const MIN_TUBE = 0.012;
const MAX_TUBE = 0.135;
const TWO_PI = Math.PI * 2;
/** How far the stack leans away from the viewer. Enough to read as an object. */
const TILT = -0.86;
/**
 * The stack turns at the set's own tempo: one full revolution per 16-beat
 * phrase, which is how a DJ counts anyway. A 124 BPM set comes round every
 * 7.7 seconds.
 */
const BEATS_PER_TURN = 16;
/** Nothing to turn at when the export carried no tempo. */
const NO_TEMPO_SPIN = 0.24;

function spinFor(bpm: number | null | undefined): number {
  if (!bpm) return NO_TEMPO_SPIN;
  return ((bpm / 60) * TWO_PI) / BEATS_PER_TURN;
}

/** One arc of one ring: a partial torus, rotated to start where the last arc ended. */
function Arc({
  radius,
  tube,
  fraction,
  offset,
  color,
  opacity = 1,
}: {
  radius: number;
  tube: number;
  fraction: number;
  offset: number;
  color: string;
  opacity?: number;
}) {
  if (fraction <= 0) return null;
  const tubular = Math.max(8, Math.ceil(180 * fraction));
  return (
    <mesh rotation={[0, 0, offset * TWO_PI]}>
      <torusGeometry args={[radius, tube, 14, tubular, fraction * TWO_PI]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.35}
        roughness={0.4}
        metalness={0.15}
        transparent={opacity < 1}
        opacity={opacity}
        side={DoubleSide}
      />
    </mesh>
  );
}

function RingStack({ vitals }: { vitals: Vitals }) {
  const { keyTimeShare, keyTimeShareByKey } = vitals.components;
  const max = Math.max(...Object.values(keyTimeShare));
  const platter = useRef<Group>(null);
  const spin = spinFor(vitals.components.bpm?.mean);

  // The outer group holds the lean; this one turns inside it, so the stack
  // spins in its own plane rather than orbiting the camera.
  useFrame((_, delta) => {
    if (platter.current) platter.current.rotation.z += delta * spin;
  });

  return (
    <group ref={platter}>
      {Array.from({ length: 12 }, (_, i) => {
        const number = i + 1;
        const radius = INNER_R + i * RING_GAP;
        const share = keyTimeShare[number] ?? 0;

        if (share === 0 || max === 0) {
          return (
            <Arc
              key={number}
              radius={radius}
              tube={MIN_TUBE}
              fraction={1}
              offset={0}
              color={EMPTY_RING_THREE}
              opacity={0.09}
            />
          );
        }

        const tube = MIN_TUBE + (share / max) * (MAX_TUBE - MIN_TUBE);
        const aFraction = (keyTimeShareByKey[`${number}A`] ?? 0) / share;
        const bFraction = 1 - aFraction;

        return (
          <group key={number}>
            <Arc
              radius={radius}
              tube={tube}
              fraction={aFraction}
              offset={0}
              color={camelotColorThree(number, 'A')}
            />
            <Arc
              radius={radius}
              tube={tube}
              fraction={bFraction}
              offset={aFraction}
              color={camelotColorThree(number, 'B')}
            />
          </group>
        );
      })}
    </group>
  );
}

/**
 * The Harmonic Rings as geometry, leaning back on a deck and turning slowly.
 * The lean is what earns the third dimension: face-on, a torus reads exactly
 * like the flat SVG. Tilted and turning, the tube catches light and the seam
 * between a key's minor and major halves sweeps past.
 */
export default function Rings3D({ vitals }: { vitals: Vitals }) {
  return (
    <div className="w-full max-w-[480px] aspect-square">
      <Canvas
        camera={{ position: [0, 1.6, 15.2], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[6, 10, 9]} intensity={1.1} />
        <pointLight position={[-9, -4, 7]} intensity={0.6} />
        <group rotation={[TILT, 0, 0]}>
          <RingStack vitals={vitals} />
        </group>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
