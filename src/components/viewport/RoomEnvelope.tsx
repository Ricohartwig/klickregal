'use client';

import { Line } from '@react-three/drei';
import type { CollisionIssue } from '@/core/collision';
import type { CabinetConfig } from '@/core/schema';

const MM = 0.001;
const WALL = 0.02;

export function RoomEnvelope({
  config,
  collisions,
  visible,
}: {
  config: CabinetConfig;
  collisions: CollisionIssue[];
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  const room = config.room;
  const width = room.clearWidthMm * MM;
  const height = room.heightMm * MM;
  const depth = room.depthMm * MM;
  const blocked = collisions.some(
    (issue) => issue.severity === 'error' && issue.code.startsWith('room_'),
  );
  const color = blocked ? '#ef4444' : '#94a3b8';
  const corners: Array<[number, number, number]> = [
    [0, 0, 0],
    [width, 0, 0],
    [width, 0, depth],
    [0, 0, depth],
    [0, height, 0],
    [width, height, 0],
    [width, height, depth],
    [0, height, depth],
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];

  return (
    <group>
      <mesh position={[width / 2, -WALL / 2, depth / 2]} receiveShadow>
        <boxGeometry args={[width, WALL, depth]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[width / 2, height / 2, -WALL / 2]}>
        <boxGeometry args={[width, height, WALL]} />
        <meshStandardMaterial color={color} transparent opacity={0.22} />
      </mesh>
      <mesh position={[-WALL / 2, height / 2, depth / 2]}>
        <boxGeometry args={[WALL, height, depth]} />
        <meshStandardMaterial color={color} transparent opacity={0.16} />
      </mesh>
      <mesh position={[width + WALL / 2, height / 2, depth / 2]}>
        <boxGeometry args={[WALL, height, depth]} />
        <meshStandardMaterial color={color} transparent opacity={0.16} />
      </mesh>
      {edges.map(([from, to]) => (
        <Line
          key={`${from}-${to}`}
          points={[corners[from] ?? [0, 0, 0], corners[to] ?? [0, 0, 0]]}
          color={blocked ? '#ef4444' : '#334155'}
          lineWidth={1}
        />
      ))}
    </group>
  );
}
