'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CabinetGeometryResult, HardwareKind } from '@/core/geometry';

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

function spanntellerGeometry(): THREE.BufferGeometry {
  const disc = new THREE.CylinderGeometry((48 * MM) / 2, (48 * MM) / 2, 11 * MM, 28);
  const rod = new THREE.CylinderGeometry(4 * MM, 4 * MM, 80 * MM, 12);
  rod.translate(0, 34 * MM, 0);
  const merged = mergeGeometries([disc, rod], false);
  disc.dispose();
  rod.dispose();
  return centerGeometry(merged ?? new THREE.CylinderGeometry((48 * MM) / 2, (48 * MM) / 2, 11 * MM, 28));
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
  const cornerGeometry = useMemo(() => lBracketGeometry(28, 4, 4), []);
  const insideGeometry = useMemo(() => lBracketGeometry(18, 3, 3), []);
  const clampGeometry = useMemo(() => spanntellerGeometry(), []);
  const footGeometry = useMemo(() => boxGeometry(65, 2.5, 65), []);
  const capGeometry = useMemo(() => boxGeometry(30, 3, 30), []);
  const latchGeometry = useMemo(() => boxGeometry(48, 16, 28), []);
  const gripGeometry = useMemo(() => handleGeometry(), []);
  const hingeGeometry = useMemo(() => boxGeometry(65, 5, 40), []);
  const catchGeometry = useMemo(() => boxGeometry(32, 12, 16), []);
  const slideGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const cornerMaterial = useMemo(() => material('#6b7280', 0.45, 0.55), []);
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
    const slides = geometry.slides.map((part) => {
      const rotation =
        part.axis === 'z' ? new THREE.Euler(0, -Math.PI / 2, 0) : new THREE.Euler(0, 0, 0);
      return pointMatrix(
        at(part),
        rotation,
        new THREE.Vector3(part.lengthMm * MM, part.heightMm * MM, part.thicknessMm * MM),
      );
    });
    return {
      corner: ofKind('corner_bracket'),
      inside: explosionFactor > 0 ? ofKind('inside_bracket') : [],
      clamp: ofKind('clamp'),
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
  }, [explosionFactor, geometry.accessories, geometry.boundingBox, geometry.hardware, geometry.slides]);

  useLayoutEffect(() => {
    invalidate();
  }, [invalidate, placed]);

  return (
    <group>
      <InstancedParts geometry={cornerGeometry} surface={cornerMaterial} matrices={placed.corner} />
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
