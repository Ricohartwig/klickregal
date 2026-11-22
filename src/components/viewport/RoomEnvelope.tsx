'use client';

import { Line } from '@react-three/drei';
import type { CollisionIssue } from '@/core/collision';
import type { CabinetConfig } from '@/core/schema';

const MM = 0.001;

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
    (issue) =>
      issue.severity === 'error' && (issue.code.startsWith('room_') || issue.code.startsWith('door_')),
  );
  const color = blocked ? '#ef4444' : '#64748b';
  const opening = room.doorOpening;

  return (
    <group>
      <mesh position={[width / 2, height / 2, depth / 2]}>
        <boxGeometry args={[width, height, depth]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.45} />
      </mesh>
      {opening ? (
        <Line
          points={[
            [(width - opening.widthMm * MM) / 2, 0, depth],
            [(width + opening.widthMm * MM) / 2, 0, depth],
            [(width + opening.widthMm * MM) / 2, opening.heightMm * MM, depth],
            [(width - opening.widthMm * MM) / 2, opening.heightMm * MM, depth],
            [(width - opening.widthMm * MM) / 2, 0, depth],
          ]}
          color={blocked ? '#ef4444' : '#0f172a'}
          lineWidth={2}
        />
      ) : null}
    </group>
  );
}
