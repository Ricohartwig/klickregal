'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { AccessoryInstance } from '@/core/geometry';

const MM = 0.001;

const LENGTH_MM: Record<string, number> = {
  safety_set_10: 100,
  safety_set_15: 150,
  safety_set_20: 200,
  clothes_rail: 500,
};

export function AccessoriesMesh({ accessories }: { accessories: AccessoryInstance[] }) {
  const steel = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c5c8ce', metalness: 0.75, roughness: 0.32 }),
    [],
  );
  const black = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1f2937', metalness: 0.4, roughness: 0.5 }),
    [],
  );

  useEffect(() => {
    return () => {
      steel.dispose();
      black.dispose();
    };
  }, [black, steel]);

  const visible = accessories.filter((item) => item.type !== 'clothes_rail');

  return (
    <group>
      {visible.map((item) => {
        const position: [number, number, number] = [
          item.position.x * MM,
          item.position.y * MM,
          item.position.z * MM,
        ];
        if (item.type === 'coat_hook') {
          return (
            <group key={item.id} position={position}>
              <mesh material={black} position={[0, 0, 0.02]} castShadow>
                <boxGeometry args={[28 * MM, 137 * MM, 4 * MM]} />
              </mesh>
              <mesh material={steel} position={[0, -40 * MM, 40 * MM]} rotation={[0.6, 0, 0]} castShadow>
                <boxGeometry args={[12 * MM, 8 * MM, 80 * MM]} />
              </mesh>
            </group>
          );
        }
        if (item.type === 'lashing_eye') {
          return (
            <mesh key={item.id} position={position} material={steel} castShadow>
              <torusGeometry args={[12 * MM, 3 * MM, 10, 18]} />
            </mesh>
          );
        }
        if (item.type === 'eye_bolt') {
          return (
            <group key={item.id} position={position}>
              <mesh material={steel} position={[0, -12 * MM, 0]} castShadow>
                <cylinderGeometry args={[4 * MM, 4 * MM, 28 * MM, 10]} />
              </mesh>
              <mesh material={steel} position={[0, 6 * MM, 0]} castShadow>
                <torusGeometry args={[8 * MM, 2.5 * MM, 8, 16]} />
              </mesh>
            </group>
          );
        }
        const length = LENGTH_MM[item.type] ?? 120;
        return (
          <mesh key={item.id} position={position} material={steel} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[6 * MM, 6 * MM, length * MM, 12]} />
          </mesh>
        );
      })}
    </group>
  );
}
