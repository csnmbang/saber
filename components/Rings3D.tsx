'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { DoubleSide, type Group, type PointLight } from 'three';
import { camelotColorThree, EMPTY_RING_THREE } from '@/lib/ui/colors';
import { ringSplit } from '@/lib/ui/ringSplit';
import { platterAngle, spinFor } from '@/lib/ui/spin';
import type { Vitals } from '@/lib/metrics/vitals';

const INNER_R = 0.95;
const RING_GAP = 0.4;
const MIN_TUBE = 0.012;
const MAX_TUBE = 0.135;
const TWO_PI = Math.PI * 2;
/** How far the stack leans away from the viewer. Enough to read as an object. */
const TILT = -0.86;
/**
 * The travelling highlight. It orbits close to the stack and burns hard, because
 * it is the only thing carrying the rotation: a closed ring turned about its own
 * axis is pixel-identical frame to frame, so a soft sheen reads as a still
 * image. This one has to be unmistakable.
 */
const GLARE_RADIUS = 7.2;
const GLARE_HEIGHT = 3.2;

/**
 * A ring is rotationally symmetric, so turning it under a fixed lamp looks
 * exactly like not turning it. The motion has to come from the light: this
 * orbits the stack at the same tempo, raking a highlight across the tubes the
 * way a lamp does across vinyl.
 */
function Glare({ spin }: { spin: number }) {
  const light = useRef<PointLight>(null);
  useFrame((state) => {
    const t = platterAngle(state.clock.elapsedTime, spin);
    light.current?.position.set(
      Math.cos(t) * GLARE_RADIUS,
      Math.sin(t) * GLARE_RADIUS,
      GLARE_HEIGHT,
    );
  });
  return <pointLight ref={light} intensity={170} distance={30} decay={1.3} color="#fff4e2" />;
}

/** One arc of one ring: a partial torus, rotated to start where the last ended. */
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
  const tubular = Math.max(6, Math.ceil(180 * fraction));
  return (
    <mesh rotation={[0, 0, offset * TWO_PI]}>
      <torusGeometry args={[radius, tube, 14, tubular, fraction * TWO_PI]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        roughness={0.16}
        metalness={0.7}
        transparent={opacity < 1}
        opacity={opacity}
        side={DoubleSide}
      />
    </mesh>
  );
}

/**
 * The visible break at each end of an arc, as a fraction of the full circle.
 * This is what makes rotation legible: a closed torus turning about its own
 * axis is pixel-identical frame to frame, so without a cut in it a ring looks
 * completely still even while spinning.
 */
const CUT = 0.016;

/**
 * One ring, always drawn as two arcs with a gap at each junction.
 *
 * The two arcs take different colors only when a key was genuinely played in
 * both its minor and its major — that is the sole thing a second color ever
 * means here. When a key was played in only one of them, both arcs are that
 * one color and the ring reads as a single hue; the cut alone carries the
 * motion.
 */
function SplitRing({
  radius,
  tube,
  splitAt,
  firstColor,
  secondColor,
  opacity,
}: {
  radius: number;
  tube: number;
  splitAt: number;
  firstColor: string;
  secondColor: string;
  opacity?: number;
}) {
  return (
    <group>
      <Arc
        radius={radius}
        tube={tube}
        fraction={splitAt - CUT}
        offset={CUT / 2}
        color={firstColor}
        opacity={opacity}
      />
      <Arc
        radius={radius}
        tube={tube}
        fraction={1 - splitAt - CUT}
        offset={splitAt + CUT / 2}
        color={secondColor}
        opacity={opacity}
      />
    </group>
  );
}

function RingStack({ vitals }: { vitals: Vitals }) {
  const { keyTimeShare, keyTimeShareByKey, bpm } = vitals.components;
  const max = Math.max(...Object.values(keyTimeShare));
  const platter = useRef<Group>(null);
  const spin = spinFor(bpm?.mean);

  // The outer group holds the lean; this one turns inside it, so the stack
  // spins in its own plane rather than orbiting the camera.
  useFrame((state) => {
    if (platter.current) platter.current.rotation.z = platterAngle(state.clock.elapsedTime, spin);
  });

  return (
    <group ref={platter}>
      {Array.from({ length: 12 }, (_, i) => {
        const number = i + 1;
        const radius = INNER_R + i * RING_GAP;
        const share = keyTimeShare[number] ?? 0;

        if (share === 0 || max === 0) {
          return (
            <SplitRing
              key={number}
              radius={radius}
              tube={MIN_TUBE}
              splitAt={0.5}
              firstColor={EMPTY_RING_THREE}
              secondColor={EMPTY_RING_THREE}
              opacity={0.09}
            />
          );
        }

        const tube = MIN_TUBE + (share / max) * (MAX_TUBE - MIN_TUBE);
        const aShare = (keyTimeShareByKey[`${number}A`] ?? 0) / share;

        // Two colors mean exactly one thing: this key was played in both its
        // minor and its major. See lib/ui/ringSplit.ts — the rule lives there
        // so it can be tested rather than eyeballed.
        const split = ringSplit(aShare);

        return (
          <SplitRing
            key={number}
            radius={radius}
            tube={tube}
            splitAt={split.splitAt}
            firstColor={camelotColorThree(number, split.firstLetter)}
            secondColor={camelotColorThree(number, split.secondLetter)}
          />
        );
      })}
    </group>
  );
}

/**
 * The Harmonic Rings as geometry, leaning back on a deck and turning at the
 * set's own tempo. The lean is what earns the third dimension: face-on, a torus
 * reads exactly like the flat SVG.
 */
export default function Rings3D({ vitals }: { vitals: Vitals }) {
  return (
    <div className="w-full max-w-[480px] aspect-square">
      <Canvas
        camera={{ position: [0, 1.7, 16.4], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.72} />
        <directionalLight position={[6, 10, 9]} intensity={0.9} />
        <group rotation={[TILT, 0, 0]}>
          <Glare spin={spinFor(vitals.components.bpm?.mean)} />
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
