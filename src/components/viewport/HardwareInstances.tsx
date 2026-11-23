'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CabinetGeometryResult, HardwareKind, HardwarePart } from '@/core/geometry';

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

function sectionMm(series: string | undefined): number {
  if (series === '20x20_B6') {
    return 20;
  }
  if (series === '40x40_I8') {
    return 40;
  }
  return 30;
}

function angleGeometry(armMm: number, stripMm: number, thickMm: number): THREE.BufferGeometry {
  const arm = armMm * MM;
  const strip = stripMm * MM;
  const thick = thickMm * MM;
  const legU = new THREE.BoxGeometry(arm, thick, strip);
  legU.translate(arm / 2, thick / 2, strip / 2);
  const legV = new THREE.BoxGeometry(strip, thick, arm);
  legV.translate(strip / 2, thick / 2, arm / 2);
  const bolt = new THREE.CylinderGeometry(2.4 * MM, 2.4 * MM, 3.2 * MM, 8);
  const boltU = bolt.clone();
  const boltV = bolt.clone();
  boltU.translate(arm * 0.62, thick + 1.6 * MM, strip / 2);
  boltV.translate(strip / 2, thick + 1.6 * MM, arm * 0.62);
  const merged = mergeGeometries([legU, legV, boltU, boltV], false);
  legU.dispose();
  legV.dispose();
  bolt.dispose();
  boltU.dispose();
  boltV.dispose();
  return merged ?? new THREE.BoxGeometry(arm, thick, strip);
}

function bracketMatrix(
  part: HardwarePart,
  bounds: CabinetGeometryResult['boundingBox'],
  explosionFactor: number,
): THREE.Matrix4 {
  const heel = exploded(part.position.x, part.position.y, part.position.z, bounds, explosionFactor);
  const armU = part.armU ?? { x: 1, y: 0, z: 0 };
  const armV = part.armV ?? { x: 0, y: 0, z: 1 };
  const normal = part.normal ?? { x: 0, y: 1, z: 0 };
  const x = new THREE.Vector3(armU.x, armU.y, armU.z).normalize();
  const y = new THREE.Vector3(normal.x, normal.y, normal.z).normalize();
  const z = new THREE.Vector3(armV.x, armV.y, armV.z).normalize();
  if (x.clone().cross(y).dot(z) < 0) {
    z.negate();
  }
  const matrix = new THREE.Matrix4().makeBasis(x, y, z);
  matrix.setPosition(heel);
  return matrix;
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
  const section = sectionMm(geometry.profiles[0]?.series);
  const cornerGeometry = useMemo(
    () => angleGeometry(section + 4, Math.round(section * 0.7), 4),
    [section],
  );
  const insideGeometry = useMemo(
    () => angleGeometry(Math.round(section * 0.8), Math.max(8, Math.round(section * 0.32)), 3.5),
    [section],
  );
  const clampGeometry = useMemo(() => spanntellerGeometry(), []);
  const footGeometry = useMemo(() => boxGeometry(65, 2.5, 65), []);
  const capGeometry = useMemo(() => boxGeometry(30, 3, 30), []);
  const latchGeometry = useMemo(() => boxGeometry(48, 16, 28), []);
  const gripGeometry = useMemo(() => handleGeometry(), []);
  const hingeGeometry = useMemo(() => boxGeometry(65, 5, 40), []);
  const catchGeometry = useMemo(() => boxGeometry(32, 12, 16), []);
  const slideGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const bracketColor = geometry.profiles[0]?.finish === 'black' ? '#9aa0a8' : '#1c1c1c';
  const cornerMaterial = useMemo(() => material(bracketColor, 0.55, 0.38), [bracketColor]);
  const insideMaterial = useMemo(() => material(bracketColor, 0.45, 0.42), [bracketColor]);
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
    const clamps = geometry.hardware
      .filter((part) => part.kind === 'clamp')
      .map((part) => {
        const position = at(part);
        const top = part.position.y > geometry.boundingBox.heightMm / 2;
        return pointMatrix(position, top ? new THREE.Euler(Math.PI, 0, 0) : undefined);
      });
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
      corner: geometry.hardware
        .filter((part) => part.kind === 'corner_bracket' && !part.isMoving)
        .map((part) => bracketMatrix(part, geometry.boundingBox, explosionFactor)),
      inside: geometry.hardware
        .filter((part) => part.kind === 'inside_bracket' && !part.isMoving)
        .map((part) => bracketMatrix(part, geometry.boundingBox, explosionFactor)),
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

export function LevelBrackets({
  geometry,
  levelId,
  explosionFactor,
}: {
  geometry: CabinetGeometryResult;
  levelId: string;
  explosionFactor: number;
}) {
  const section = sectionMm(geometry.profiles[0]?.series);
  const bracketColor = geometry.profiles[0]?.finish === 'black' ? '#9aa0a8' : '#1c1c1c';
  const cornerGeometry = useMemo(() => angleGeometry(section + 4, Math.round(section * 0.7), 4), [section]);
  const insideGeometry = useMemo(
    () => angleGeometry(Math.round(section * 0.8), Math.max(8, Math.round(section * 0.32)), 3.5),
    [section],
  );
  const surface = useMemo(() => material(bracketColor, 0.55, 0.38), [bracketColor]);
  useEffect(() => {
    return () => {
      cornerGeometry.dispose();
      insideGeometry.dispose();
      surface.dispose();
    };
  }, [cornerGeometry, insideGeometry, surface]);
  const moving = geometry.hardware.filter((part) => part.isMoving && part.levelId === levelId);
  const corner = moving
    .filter((part) => part.kind === 'corner_bracket')
    .map((part) => bracketMatrix(part, geometry.boundingBox, explosionFactor));
  const inside = moving
    .filter((part) => part.kind === 'inside_bracket')
    .map((part) => bracketMatrix(part, geometry.boundingBox, explosionFactor));
  return (
    <group>
      <InstancedParts geometry={cornerGeometry} surface={surface} matrices={corner} />
      <InstancedParts geometry={insideGeometry} surface={surface} matrices={inside} />
    </group>
  );
}
