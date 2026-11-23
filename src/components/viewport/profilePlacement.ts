import type { Vec3 } from '@/core/geometry';

/** CAD position is the minimum corner. The mesh origin is the center of the start face. */
export function profileOriginMm(position: Vec3, rotation: Vec3, sectionMm: number): Vec3 {
  const half = sectionMm / 2;
  if (Math.abs(rotation.z) === 90) {
    return { x: position.x + half, y: position.y, z: position.z + half };
  }
  if (Math.abs(rotation.y) === 90) {
    return { x: position.x + half, y: position.y + half, z: position.z };
  }
  return { x: position.x, y: position.y + half, z: position.z + half };
}
