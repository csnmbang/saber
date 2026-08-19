'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { DoubleSide, type Group, type PointLight } from 'three';
import { camelotColorThree, camelotColorThreeShaded, EMPTY_RING_THREE } from '@/lib/ui/colors';
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

/**
 * The strobe ring: marks outside the outermost key, the way the pitch strobe
 * sits on the rim of a 1200. It turns with the platter, and unlike the rings it
 * is not rotationally symmetric under a small turn, so it is what actually makes
 * the rotation legible. Every ninth mark is larger, giving four quadrant marks
 * to track.
 *
 * These carry no reading. They are deliberately the only thing on the page
 * drawn in plain cream rather than a key's hue, so nothing here can be mistaken
 * for data.
 *
 * Flat dashes, not spheres — a sphere is round from every angle and catches
 * light all over its surface, which reads as a small glowing thing sitting in
 * space rather than a mark printed on a rim. A thin tangent-aligned box only
 * catches light edge-on, the way an etched line on a platter does.
 */
const STROBE_RADIUS = 5.72;
const STROBE_MARKS = 36;
const MARK_LENGTH = 0.22;
const MARK_WIDTH = 0.05;
const MARK_THICKNESS = 0.02;

function StrobeRing() {
  return (
    <group>
      {Array.from({ length: STROBE_MARKS }, (_, i) => {
        const angle = (i / STROBE_MARKS) * TWO_PI;
        const quadrant = i % 9 === 0;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * STROBE_RADIUS, Math.sin(angle) * STROBE_RADIUS, 0]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[MARK_WIDTH, quadrant ? MARK_LENGTH * 1.6 : MARK_LENGTH, MARK_THICKNESS]} />
            <meshStandardMaterial
              color="#ede7db"
              emissive="#ede7db"
              emissiveIntensity={quadrant ? 0.12 : 0.05}
              roughness={0.35}
              metalness={0.15}
              transparent
              opacity={quadrant ? 0.85 : 0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
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
      <StrobeRing />
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
        const aShare = (keyTimeShareByKey[`${number}A`] ?? 0) / share;
        const hasBothLetters = aShare > 0 && aShare < 1;

        // A real A/B split already gives the ring a seam — two true colors
        // meeting. All-one-letter has no such seam, so it gets a fabricated
        // one: the same hue at two shades, still one closed ring, still one
        // color at a glance, but no longer identical to itself as it turns.
        const [firstColor, secondColor] = hasBothLetters
          ? [camelotColorThree(number, 'A'), camelotColorThree(number, 'B')]
          : (() => {
              const letter = aShare === 1 ? 'A' : 'B';
              return [
                camelotColorThreeShaded(number, letter, 13),
                camelotColorThreeShaded(number, letter, -13),
              ];
            })();
        const firstFraction = hasBothLetters ? aShare : 0.5;

        return (
          <group key={number}>
            <Arc radius={radius} tube={tube} fraction={firstFraction} offset={0} color={firstColor} />
            <Arc
              radius={radius}
              tube={tube}
              fraction={1 - firstFraction}
              offset={firstFraction}
              color={secondColor}
            />
          </group>
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
