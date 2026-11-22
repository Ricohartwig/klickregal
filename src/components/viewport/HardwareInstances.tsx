'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CabinetGeometryResult, HardwareKind, ProfilePart, Vec3 } from '@/core/geometry';
import { profileOriginMm } from '@/components/viewport/profilePlacement';

const MM = 0.001;

function exploded(x: number, y: number, z: number, bounds: CabinetGeometryResult['boundingBox'], factor: number) {
  const cx = bounds.widthMm / 2;
  const cy = bounds.heightMm / 2;
  const cz = bounds.depthMm / 2;
  const spread = 1 + factor * 0.45;
  return new THREE.Vector3((cx + (x - cx) * spread) * MM, (cy + (y - cy) * spread) * MM, (cz + (z - cz) * spread) * MM);
}

function centerGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (box) {
    geometry.translate(
      -((box.min.x + box.max.x) / 2),
      -((box.min.y + box.max.y) / 2),
      -((box.min.z + box.max.z) / 2),
    );
  }
  return geometry;
}

function lBracketGeometry(armMm: number, thickMm: number, depthMm: number): THREE.ExtrudeGeometry {
  const arm = armMm * MM;
  const thick = thickMm * MM;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(arm, 0);
  shape.lineTo(arm, thick);
  shape.lineTo(thick, thick);
  shape.lineTo(thick, arm);
  shape.lineTo(0, arm);
  shape.closePath();
  return centerGeometry(
    new THREE.ExtrudeGeometry(shape, { depth: depthMm * MM, bevelEnabled: false, steps: 1 }),
  ) as THREE.ExtrudeGeometry;
}

function handleGeometry(): THREE.ExtrudeGeometry {
  const width = 138 * MM;
  const height = 40 * MM;
  const wall = 8 * MM;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(width, 0);
  shape.lineTo(width, height);
  shape.lineTo(width - wall, height);
  shape.lineTo(width - wall, wall);
  shape.lineTo(wall, wall);
  shape.lineTo(wall, height);
  shape.lineTo(0, height);
  shape.closePath();
  return centerGeometry(
    new THREE.ExtrudeGeometry(shape, { depth: 25 * MM, bevelEnabled: false, steps: 1 }),
  ) as THREE.ExtrudeGeometry;
}

const CLAMP_DISC_MM = 11;

function spanntellerGeometry(): THREE.BufferGeometry {
  const discH = CLAMP_DISC_MM * MM;
  const rodH = 80 * MM;
  const disc = new THREE.CylinderGeometry((48 * MM) / 2, (48 * MM) / 2, discH, 28);
  disc.translate(0, discH / 2, 0);
  const rod = new THREE.CylinderGeometry(4 * MM, 4 * MM, rodH, 12);
  rod.translate(0, discH + rodH / 2, 0);
  const merged = mergeGeometries([disc, rod], false);
  disc.dispose();
  rod.dispose();
  return merged ?? new THREE.CylinderGeometry((48 * MM) / 2, (48 * MM) / 2, discH, 28);
}

function boxGeometry(xMm: number, yMm: number, zMm: number): THREE.BoxGeometry {
  return new THREE.BoxGeometry(xMm * MM, yMm * MM, zMm * MM);
}

function material(color: string, metalness: number, roughness: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function InstancedParts({
  geometry,
  surface,
  matrices,
}: {
  geometry: THREE.BufferGeometry;
  surface: THREE.Material;
  matrices: THREE.Matrix4[];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [invalidate, matrices]);

  if (matrices.length === 0) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      key={matrices.length}
      args={[geometry, surface, matrices.length]}
      castShadow
      receiveShadow
    />
  );
}

function profileAxis(rotation: Vec3): THREE.Vector3 {
  if (Math.abs(rotation.z) === 90) {
    return new THREE.Vector3(0, rotation.z > 0 ? 1 : -1, 0);
  }
  if (Math.abs(rotation.y) === 90) {
    return new THREE.Vector3(0, 0, rotation.y < 0 ? 1 : -1);
  }
  return new THREE.Vector3(1, 0, 0);
}

function sectionMm(part: ProfilePart): number {
  if (part.series === '20x20_B6') {
    return 20;
  }
  if (part.series === '40x40_I8') {
    return 40;
  }
  return 30;
}

function endConnectorGeometry(section: number): THREE.BufferGeometry {
  const size = section * MM * 0.96;
  const length = Math.max(36, section + 8) * MM;
  const body = new THREE.BoxGeometry(length, size, size);
  body.translate(length / 2, 0, 0);
  const bolt = new THREE.CylinderGeometry(3.2 * MM, 3.2 * MM, 5 * MM, 10);
  const boltA = bolt.clone();
  const boltB = bolt.clone();
  boltA.translate(length * 0.32, size / 2 + 2.5 * MM, -size * 0.22);
  boltB.translate(length * 0.72, size / 2 + 2.5 * MM, size * 0.22);
  const merged = mergeGeometries([body, boltA, boltB], false);
  body.dispose();
  bolt.dispose();
  boltA.dispose();
  boltB.dispose();
  return merged ?? new THREE.BoxGeometry(length, size, size);
}

function bracketCapGeometry(section: number): THREE.BoxGeometry {
  const size = section * MM + 1.5 * MM;
  const cap = new THREE.BoxGeometry(6 * MM, size, size);
  cap.translate(-3 * MM, 0, 0);
  return cap;
}

function seatedBracket(
  target: Vec3,
  profiles: ProfilePart[],
  bounds: CabinetGeometryResult['boundingBox'],
  explosionFactor: number,
): { body: THREE.Matrix4; cap: THREE.Matrix4 } | null {
  let bestDistance = 45;
  let best: { end: Vec3; inward: THREE.Vector3 } | null = null;
  for (const profile of profiles) {
    if (Math.abs(profile.rotation.z) === 90) {
      continue;
    }
    const axis = profileAxis(profile.rotation);
    const start = profileOriginMm(profile.position, profile.rotation, sectionMm(profile));
    const end = {
      x: start.x + axis.x * profile.lengthMm,
      y: start.y + axis.y * profile.lengthMm,
      z: start.z + axis.z * profile.lengthMm,
    };
    for (const candidate of [
      { end: start, inward: axis.clone() },
      { end, inward: axis.clone().negate() },
    ]) {
      const distance = Math.hypot(candidate.end.x - target.x, candidate.end.y - target.y, candidate.end.z - target.z);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }
  }
  if (!best) {
    return null;
  }
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), best.inward.clone().normalize());
  const end = exploded(best.end.x, best.end.y, best.end.z, bounds, explosionFactor);
  const body = end.clone().add(best.inward.clone().normalize().multiplyScalar(18 * MM));
  return {
    body: new THREE.Matrix4().compose(body, quaternion, new THREE.Vector3(1, 1, 1)),
    cap: new THREE.Matrix4().compose(end, quaternion, new THREE.Vector3(1, 1, 1)),
  };
}

function pointMatrix(position: THREE.Vector3, rotation?: THREE.Euler, scale?: THREE.Vector3): THREE.Matrix4 {
  const quaternion = new THREE.Quaternion();
  if (rotation) {
    quaternion.setFromEuler(rotation);
  }
  return new THREE.Matrix4().compose(position, quaternion, scale ?? new THREE.Vector3(1, 1, 1));
}

export function HardwareInstances({
  geometry,
  explosionFactor = 0,
}: {
  geometry: CabinetGeometryResult;
  explosionFactor?: number;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const section = geometry.profiles[0] ? sectionMm(geometry.profiles[0]) : 30;
  const cornerGeometry = useMemo(() => endConnectorGeometry(section), [section]);
  const bracketCapGeometryMemo = useMemo(() => bracketCapGeometry(section), [section]);
  const insideGeometry = useMemo(() => lBracketGeometry(18, 3, 3), []);
  const clampGeometry = useMemo(() => spanntellerGeometry(), []);
  const footGeometry = useMemo(() => boxGeometry(65, 2.5, 65), []);
  const capGeometry = useMemo(() => boxGeometry(30, 3, 30), []);
  const latchGeometry = useMemo(() => boxGeometry(48, 16, 28), []);
  const gripGeometry = useMemo(() => handleGeometry(), []);
  const hingeGeometry = useMemo(() => boxGeometry(65, 5, 40), []);
  const catchGeometry = useMemo(() => boxGeometry(32, 12, 16), []);
  const slideGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const cornerMaterial = useMemo(() => material('#d5d8de', 0.72, 0.32), []);
  const insideMaterial = useMemo(() => material('#d5d8de', 0.72, 0.32), []);
  const clampMaterial = useMemo(() => material('#1c1c1c', 0.2, 0.72), []);
  const footMaterial = useMemo(() => material('#b8b8b8', 0.7, 0.35), []);
  const capMaterial = useMemo(() => material('#22252a', 0.4, 0.5), []);
  const latchMaterial = useMemo(() => material('#111111', 0.35, 0.55), []);
  const gripMaterial = useMemo(() => material('#1a1a1a', 0.15, 0.62), []);
  const hingeMaterial = useMemo(() => material('#161616', 0.4, 0.48), []);
  const catchMaterial = useMemo(() => material('#3f3f46', 0.55, 0.4), []);
  const slideMaterial = useMemo(() => material('#c5c8ce', 0.82, 0.28), []);

  useEffect(() => {
    const geometries = [
      cornerGeometry,
      bracketCapGeometryMemo,
      insideGeometry,
      clampGeometry,
      footGeometry,
      capGeometry,
      latchGeometry,
      gripGeometry,
      hingeGeometry,
      catchGeometry,
      slideGeometry,
    ];
    const materials = [
      cornerMaterial,
      insideMaterial,
      clampMaterial,
      footMaterial,
      capMaterial,
      latchMaterial,
      gripMaterial,
      hingeMaterial,
      catchMaterial,
      slideMaterial,
    ];
    return () => {
      geometries.forEach((entry) => entry.dispose());
      materials.forEach((entry) => entry.dispose());
    };
  }, [
    bracketCapGeometryMemo,
    capGeometry,
    capMaterial,
    catchGeometry,
    catchMaterial,
    clampGeometry,
    clampMaterial,
    cornerGeometry,
    cornerMaterial,
    footGeometry,
    footMaterial,
    gripGeometry,
    gripMaterial,
    hingeGeometry,
    hingeMaterial,
    insideGeometry,
    insideMaterial,
    latchGeometry,
    latchMaterial,
    slideGeometry,
    slideMaterial,
  ]);

  const placed = useMemo(() => {
    const at = (part: { position: { x: number; y: number; z: number } }) =>
      exploded(part.position.x, part.position.y, part.position.z, geometry.boundingBox, explosionFactor);
    const ofKind = (kind: HardwareKind) =>
      geometry.hardware.filter((part) => part.kind === kind).map((part) => pointMatrix(at(part)));
    const clamps = geometry.hardware
      .filter((part) => part.kind === 'clamp')
      .map((part) => {
        const position = at(part);
        const top = part.position.y > geometry.boundingBox.heightMm / 2;
        return pointMatrix(position, top ? new THREE.Euler(Math.PI, 0, 0) : undefined);
      });
    const seated = geometry.hardware
      .filter((part) => part.kind === 'corner_bracket')
      .map((part) => seatedBracket(part.position, geometry.profiles, geometry.boundingBox, explosionFactor))
      .filter((entry): entry is { body: THREE.Matrix4; cap: THREE.Matrix4 } => entry !== null);
    const slides = geometry.slides.map((part) => {
      const position = at(part);
      const alongZ = part.axis === 'z';
      if (alongZ) {
        position.x += (part.thicknessMm * MM) / 2;
        position.y += (part.heightMm * MM) / 2;
        position.z += (part.lengthMm * MM) / 2;
      } else {
        position.x += (part.lengthMm * MM) / 2;
        position.y += (part.heightMm * MM) / 2;
        position.z += (part.thicknessMm * MM) / 2;
      }
      return pointMatrix(
        position,
        alongZ ? new THREE.Euler(0, -Math.PI / 2, 0) : undefined,
        new THREE.Vector3(part.lengthMm * MM, part.heightMm * MM, part.thicknessMm * MM),
      );
    });
    return {
      corner: seated.map((entry) => entry.body),
      bracketCaps: seated.map((entry) => entry.cap),
      inside: explosionFactor > 0 ? ofKind('inside_bracket') : [],
      clamp: clamps,
      foot: ofKind('foot_plate'),
      cap: ofKind('end_cap'),
      latch: geometry.accessories
        .filter((part) => part.type === 'rotary_latch')
        .map((part) => pointMatrix(at(part))),
      grip: ofKind('handle'),
      hinge: ofKind('hinge'),
      catch: ofKind('magnetic_catch'),
      slides,
    };
  }, [explosionFactor, geometry.accessories, geometry.boundingBox, geometry.hardware, geometry.profiles, geometry.slides]);

  useLayoutEffect(() => {
    invalidate();
  }, [invalidate, placed]);

  return (
    <group>
      <InstancedParts geometry={cornerGeometry} surface={cornerMaterial} matrices={placed.corner} />
      <InstancedParts geometry={bracketCapGeometryMemo} surface={capMaterial} matrices={placed.bracketCaps} />
      <InstancedParts geometry={insideGeometry} surface={insideMaterial} matrices={placed.inside} />
      <InstancedParts geometry={clampGeometry} surface={clampMaterial} matrices={placed.clamp} />
      <InstancedParts geometry={footGeometry} surface={footMaterial} matrices={placed.foot} />
      <InstancedParts geometry={capGeometry} surface={capMaterial} matrices={placed.cap} />
      <InstancedParts geometry={latchGeometry} surface={latchMaterial} matrices={placed.latch} />
      <InstancedParts geometry={gripGeometry} surface={gripMaterial} matrices={placed.grip} />
      <InstancedParts geometry={hingeGeometry} surface={hingeMaterial} matrices={placed.hinge} />
      <InstancedParts geometry={catchGeometry} surface={catchMaterial} matrices={placed.catch} />
      <InstancedParts geometry={slideGeometry} surface={slideMaterial} matrices={placed.slides} />
    </group>
  );
}
