'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { CollisionIssue } from '@/core/collision';
import type { CabinetGeometryResult, ProfilePart } from '@/core/geometry';
import { EuroboxMesh } from '@/components/viewport/EuroboxMesh';
import { createUnitProfileGeometry } from '@/components/viewport/ProfileMesh';
import { profileOriginMm } from '@/components/viewport/profilePlacement';
import type { ProfileSeriesId } from '@/core/schema';
import { usePlannerStore } from '@/store/usePlannerStore';

const MM = 0.001;

function exploded(x: number, y: number, z: number, bounds: CabinetGeometryResult['boundingBox'], factor: number) {
  const cx = bounds.widthMm / 2;
  const cy = bounds.heightMm / 2;
  const cz = bounds.depthMm / 2;
  const spread = 1 + factor * 0.45;
  return new THREE.Vector3((cx + (x - cx) * spread) * MM, (cy + (y - cy) * spread) * MM, (cz + (z - cz) * spread) * MM);
}

function PulloutGroup({
  levelId,
  bayId,
  profiles,
  slideLengthMm,
  axis,
  geometry,
  collisions,
  explosionFactor,
}: {
  levelId: string;
  bayId: string | null;
  profiles: ProfilePart[];
  slideLengthMm: number;
  axis: 'x' | 'z';
  geometry: CabinetGeometryResult;
  collisions: CollisionIssue[];
  explosionFactor: number;
}) {
  const group = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const localTarget = useRef<number | null>(null);
  const globalProgress = usePlannerStore((state) => state.globalPulloutProgress);
  const invalidate = useThree((state) => state.invalidate);
  const series = (profiles[0]?.series ?? '30x30_B8') as ProfileSeriesId;
  const profileGeometry = useMemo(() => createUnitProfileGeometry(series), [series]);
  const silver = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c8cdd3', metalness: 0.78, roughness: 0.3 }),
    [],
  );
  const black = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#22252a', metalness: 0.65, roughness: 0.38 }),
    [],
  );

  useEffect(() => {
    localTarget.current = null;
  }, [globalProgress]);

  useEffect(() => {
    return () => {
      profileGeometry.dispose();
      silver.dispose();
      black.dispose();
    };
  }, [black, profileGeometry, silver]);

  useFrame((_, delta) => {
    const goal = localTarget.current ?? globalProgress;
    const gap = goal - progress.current;
    if (Math.abs(gap) < 0.002) {
      return;
    }
    progress.current += Math.sign(gap) * Math.min(Math.abs(gap), delta * 1.6);
    if (group.current) {
      group.current.position.x = axis === 'x' ? progress.current * slideLengthMm * MM : 0;
      group.current.position.z = axis === 'z' ? progress.current * slideLengthMm * MM : 0;
    }
    invalidate();
  });

  const boxes = geometry.euroboxes.filter((box) => box.levelId === levelId && box.isMoving);
  const section = series === '20x20_B6' ? 20 : series === '40x40_I8' ? 40 : 30;

  const toggle = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    const goal = localTarget.current ?? globalProgress;
    localTarget.current = goal > 0.5 ? 0 : 1;
    usePlannerStore.getState().setView({ selectedBayId: bayId, selectedLevelId: levelId });
    invalidate();
  };

  return (
    <group ref={group} onClick={toggle}>
      {profiles.map((part, index) => {
        const euler = new THREE.Euler(
          THREE.MathUtils.degToRad(part.rotation.x),
          THREE.MathUtils.degToRad(part.rotation.y),
          THREE.MathUtils.degToRad(part.rotation.z),
        );
        const centered = profileOriginMm(part.position, part.rotation, section);
        const origin = exploded(centered.x, centered.y, centered.z, geometry.boundingBox, explosionFactor);
        return (
          <mesh
            key={`${part.partCode}-${index}`}
            geometry={profileGeometry}
            material={part.finish === 'black' ? black : silver}
            position={origin}
            rotation={euler}
            scale={[part.lengthMm / 1000, 1, 1]}
            castShadow
            receiveShadow
            onClick={toggle}
          />
        );
      })}
      <EuroboxMesh
        boxes={boxes}
        collisions={collisions}
        onPress={() => {
          const goal = localTarget.current ?? globalProgress;
          localTarget.current = goal > 0.5 ? 0 : 1;
          invalidate();
        }}
      />
    </group>
  );
}

export function PulloutAssembly({
  geometry,
  collisions,
  explosionFactor,
}: {
  geometry: CabinetGeometryResult;
  collisions: CollisionIssue[];
  explosionFactor: number;
}) {
  const levels = new Map<string, ProfilePart[]>();
  for (const part of geometry.profiles) {
    if (!part.isMoving || !part.levelId) {
      continue;
    }
    const list = levels.get(part.levelId) ?? [];
    list.push(part);
    levels.set(part.levelId, list);
  }

  return (
    <group>
      {[...levels.entries()].map(([levelId, profiles]) => {
        const slide = geometry.slides.find((part) => part.levelId === levelId);
        const travelMm = slide
          ? Math.max(0, slide.lengthMm - slide.innerOverhangMm - slide.outerOverhangMm)
          : 0;
        const axis = slide?.axis ?? 'z';
        return (
          <PulloutGroup
            key={levelId}
            levelId={levelId}
            bayId={profiles[0]?.bayId ?? null}
            profiles={profiles}
            slideLengthMm={travelMm}
            axis={axis}
            geometry={geometry}
            collisions={collisions}
            explosionFactor={explosionFactor}
          />
        );
      })}
    </group>
  );
}
