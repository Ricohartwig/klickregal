'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { CabinetGeometryResult } from '@/core/geometry';
import type { ProfileSeriesId } from '@/core/schema';
import type { StaticStatus, StaticsReport } from '@/core/statics';
import { usePlannerStore } from '@/store/usePlannerStore';

const MM = 0.001;

const SERIES_SECTION: Record<
  ProfileSeriesId,
  { sizeMm: number; slotMm: number; slotDepthMm: number; holeMm: number; radiusMm: number }
> = {
  '20x20_B6': { sizeMm: 20, slotMm: 6, slotDepthMm: 6.5, holeMm: 5.5, radiusMm: 1 },
  '30x30_B8': { sizeMm: 30, slotMm: 8, slotDepthMm: 9, holeMm: 6.8, radiusMm: 1.2 },
  '40x40_I8': { sizeMm: 40, slotMm: 8, slotDepthMm: 10, holeMm: 8.5, radiusMm: 1.5 },
};

const FINISH_COLOR = {
  silver: '#c8cdd3',
  black: '#22252a',
} as const;

const STATUS_COLOR: Record<Exclude<StaticStatus, 'OK'>, string> = {
  WARN: '#eab308',
  FAIL: '#ef4444',
};

function tSlotShape(series: ProfileSeriesId): THREE.Shape {
  const spec = SERIES_SECTION[series];
  const s = (spec.sizeMm * MM) / 2;
  const r = Math.min(spec.radiusMm * MM, s * 0.25);
  const sw = (spec.slotMm * MM) / 2;
  const head = sw * 1.7;
  const neck = spec.slotDepthMm * MM * 0.42;
  const cave = spec.slotDepthMm * MM;
  const shape = new THREE.Shape();

  shape.moveTo(-s + r, -s);
  shape.lineTo(-sw, -s);
  shape.lineTo(-sw, -s + neck);
  shape.lineTo(-head, -s + neck);
  shape.lineTo(-head, -s + cave);
  shape.lineTo(head, -s + cave);
  shape.lineTo(head, -s + neck);
  shape.lineTo(sw, -s + neck);
  shape.lineTo(sw, -s);
  shape.lineTo(s - r, -s);
  shape.absarc(s - r, -s + r, r, -Math.PI / 2, 0, false);

  shape.lineTo(s, -sw);
  shape.lineTo(s - neck, -sw);
  shape.lineTo(s - neck, -head);
  shape.lineTo(s - cave, -head);
  shape.lineTo(s - cave, head);
  shape.lineTo(s - neck, head);
  shape.lineTo(s - neck, sw);
  shape.lineTo(s, sw);
  shape.lineTo(s, s - r);
  shape.absarc(s - r, s - r, r, 0, Math.PI / 2, false);

  shape.lineTo(sw, s);
  shape.lineTo(sw, s - neck);
  shape.lineTo(head, s - neck);
  shape.lineTo(head, s - cave);
  shape.lineTo(-head, s - cave);
  shape.lineTo(-head, s - neck);
  shape.lineTo(-sw, s - neck);
  shape.lineTo(-sw, s);
  shape.lineTo(-s + r, s);
  shape.absarc(-s + r, s - r, r, Math.PI / 2, Math.PI, false);

  shape.lineTo(-s, sw);
  shape.lineTo(-s + neck, sw);
  shape.lineTo(-s + neck, head);
  shape.lineTo(-s + cave, head);
  shape.lineTo(-s + cave, -head);
  shape.lineTo(-s + neck, -head);
  shape.lineTo(-s + neck, -sw);
  shape.lineTo(-s, -sw);
  shape.lineTo(-s, -s + r);
  shape.absarc(-s + r, -s + r, r, Math.PI, Math.PI * 1.5, false);

  const hole = new THREE.Path();
  hole.absarc(0, 0, (spec.holeMm * MM) / 2, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

export function createUnitProfileGeometry(series: ProfileSeriesId): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(tSlotShape(series), {
    depth: 1,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.rotateY(Math.PI / 2);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (box) {
    const centerY = (box.min.y + box.max.y) / 2;
    const centerZ = (box.min.z + box.max.z) / 2;
    geometry.translate(-box.min.x, -centerY, -centerZ);
  }
  return geometry;
}

function exploded(x: number, y: number, z: number, bounds: CabinetGeometryResult['boundingBox'], factor: number) {
  const cx = bounds.widthMm / 2;
  const cy = bounds.heightMm / 2;
  const cz = bounds.depthMm / 2;
  const spread = 1 + factor * 0.45;
  return new THREE.Vector3((cx + (x - cx) * spread) * MM, (cy + (y - cy) * spread) * MM, (cz + (z - cz) * spread) * MM);
}

function profileColor(finish: keyof typeof FINISH_COLOR, status: StaticStatus | undefined, overlay: boolean): THREE.Color {
  if (overlay && status && status !== 'OK') {
    return new THREE.Color(STATUS_COLOR[status]);
  }
  return new THREE.Color(FINISH_COLOR[finish]);
}

function ProfileSeriesInstances({
  series,
  finish,
  geometry,
  statics,
  staticsOverlay,
  explosionFactor,
  selectedLevelId,
}: {
  series: ProfileSeriesId;
  finish: 'silver' | 'black';
  geometry: CabinetGeometryResult;
  statics?: StaticsReport | null;
  staticsOverlay: boolean;
  explosionFactor: number;
  selectedLevelId: string | null;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  const profileGeometry = useMemo(() => createUnitProfileGeometry(series), [series]);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        metalness: finish === 'silver' ? 0.78 : 0.65,
        roughness: finish === 'silver' ? 0.3 : 0.38,
      }),
    [finish],
  );
  const entries = useMemo(
    () =>
      geometry.profiles
        .map((part, index) => ({ part, index }))
        .filter(
          (entry) => entry.part.series === series && entry.part.finish === finish && !entry.part.isMoving,
        ),
    [finish, geometry.profiles, series],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || entries.length === 0) {
      return;
    }
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    const section = SERIES_SECTION[series].sizeMm;
    entries.forEach((entry, slot) => {
      const { part, index } = entry;
      const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(part.rotation.x),
        THREE.MathUtils.degToRad(part.rotation.y),
        THREE.MathUtils.degToRad(part.rotation.z),
      );
      quaternion.setFromEuler(euler);
      const origin = exploded(part.position.x, part.position.y, part.position.z, geometry.boundingBox, explosionFactor);
      origin.add(new THREE.Vector3(0, (section * MM) / 2, (section * MM) / 2).applyQuaternion(quaternion));
      scale.set(part.lengthMm / 1000, 1, 1);
      matrix.compose(origin, quaternion, scale);
      mesh.setMatrixAt(slot, matrix);
      const status = statics?.profiles[index]?.status;
      const color = profileColor(part.finish, status, staticsOverlay);
      if (part.levelId && part.levelId === selectedLevelId) {
        color.lerp(new THREE.Color('#ffffff'), 0.28);
      }
      mesh.setColorAt(slot, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
    invalidate();
  }, [entries, explosionFactor, geometry.boundingBox, invalidate, selectedLevelId, series, statics, staticsOverlay]);

  useEffect(() => {
    return () => {
      profileGeometry.dispose();
      material.dispose();
    };
  }, [material, profileGeometry]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      key={`${series}-${finish}-${entries.length}`}
      args={[profileGeometry, material, entries.length]}
      castShadow
      receiveShadow
      onClick={(event) => {
        event.stopPropagation();
        const slot = event.instanceId;
        if (slot === undefined) {
          return;
        }
        const entry = entries[slot];
        if (!entry?.part.bayId && !entry?.part.levelId) {
          return;
        }
        usePlannerStore.getState().setView({
          selectedBayId: entry.part.bayId,
          selectedLevelId: entry.part.levelId,
        });
      }}
    />
  );
}

export function ProfileMesh({
  geometry,
  statics = null,
  staticsOverlay = false,
  explosionFactor = 0,
}: {
  geometry: CabinetGeometryResult;
  statics?: StaticsReport | null;
  staticsOverlay?: boolean;
  explosionFactor?: number;
}) {
  const seriesIds = ['20x20_B6', '30x30_B8', '40x40_I8'] as const;
  const finishes = ['silver', 'black'] as const;
  const selectedLevelId = usePlannerStore((state) => state.selectedLevelId);

  return (
    <group>
      {seriesIds.flatMap((series) =>
        finishes.map((finish) => (
          <ProfileSeriesInstances
            key={`${series}-${finish}`}
            series={series}
            finish={finish}
            geometry={geometry}
            statics={statics}
            staticsOverlay={staticsOverlay}
            explosionFactor={explosionFactor}
            selectedLevelId={selectedLevelId}
          />
        )),
      )}
    </group>
  );
}
