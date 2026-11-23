'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { EUROBOXES } from '@/core/catalog';
import type { CollisionIssue } from '@/core/collision';
import type { EuroboxInstance } from '@/core/geometry';
import { usePlannerStore } from '@/store/usePlannerStore';

const MM = 0.001;

export function EuroboxMesh({
  boxes,
  collisions,
  onPress,
}: {
  boxes: EuroboxInstance[];
  collisions: CollisionIssue[];
  onPress?: () => void;
}) {
  const bodyMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#9aa0a6', roughness: 0.62, metalness: 0.04 }),
    [],
  );
  const alertMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ef4444',
        roughness: 0.45,
        metalness: 0.05,
        emissive: '#ef4444',
        emissiveIntensity: 0.35,
      }),
    [],
  );
  const recessMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#6b7076', roughness: 0.8, metalness: 0 }),
    [],
  );
  const lidMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#7d838a', roughness: 0.5, metalness: 0.08 }),
    [],
  );

  useEffect(() => {
    return () => {
      bodyMaterial.dispose();
      alertMaterial.dispose();
      recessMaterial.dispose();
      lidMaterial.dispose();
    };
  }, [alertMaterial, bodyMaterial, lidMaterial, recessMaterial]);

  return (
    <group>
      {boxes.map((box) => {
        const catalog = EUROBOXES[box.boxId];
        const colliding = collisions.some(
          (issue) =>
            issue.code === 'eurobox_clearance' &&
            issue.severity === 'error' &&
            issue.levelId === box.levelId &&
            issue.boxId === box.boxId,
        );
        const width = box.widthMm * MM;
        const length = box.lengthMm * MM;
        const height = box.heightMm * MM;
        const hasLid = box.heightMm > catalog.heightMm;
        return (
          <mesh
            key={box.id}
            position={[
              (box.position.x + box.widthMm / 2) * MM,
              (box.position.y + box.heightMm / 2) * MM,
              (box.position.z + box.lengthMm / 2) * MM,
            ]}
            castShadow
            receiveShadow
            material={colliding ? alertMaterial : bodyMaterial}
            onClick={(event) => {
              event.stopPropagation();
              usePlannerStore.getState().setView({
                selectedBayId: box.bayId,
                selectedLevelId: box.levelId,
              });
              onPress?.();
            }}
          >
            <boxGeometry args={[width * 0.98, height * 0.98, length * 0.98]} />
            <mesh position={[width * 0.42, height * 0.15, 0]} material={recessMaterial}>
              <boxGeometry args={[width * 0.08, height * 0.28, length * 0.55]} />
            </mesh>
            <mesh position={[-width * 0.42, height * 0.15, 0]} material={recessMaterial}>
              <boxGeometry args={[width * 0.08, height * 0.28, length * 0.55]} />
            </mesh>
            {hasLid ? (
              <mesh position={[0, height * 0.46, 0]} material={lidMaterial}>
                <boxGeometry args={[width * 1.02, 8 * MM, length * 1.02]} />
              </mesh>
            ) : null}
          </mesh>
        );
      })}
    </group>
  );
}
