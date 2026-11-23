'use client';

import { Html, Line } from '@react-three/drei';
import type { RefObject } from 'react';
import { getProfileSeries } from '@/core/catalog';
import type { CabinetGeometryResult } from '@/core/geometry';
import type { CabinetConfig } from '@/core/schema';

const MM = 0.001;

function Label({
  portal,
  position,
  text,
}: {
  portal: RefObject<HTMLDivElement | null>;
  position: [number, number, number];
  text: string;
}) {
  return (
    <Html portal={portal as RefObject<HTMLElement>} position={position} center pointerEvents="none">
      <span
        style={{
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid #94a3b8',
          borderRadius: 4,
          color: '#0f172a',
          fontSize: 12,
          lineHeight: 1.2,
          padding: '2px 6px',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </span>
    </Html>
  );
}

export function DimensionLines({
  geometry,
  config,
  selectedBayId,
  visible,
  portal,
}: {
  geometry: CabinetGeometryResult;
  config: CabinetConfig;
  selectedBayId: string | null;
  visible: boolean;
  portal: RefObject<HTMLDivElement | null>;
}) {
  if (!visible) {
    return null;
  }

  const { widthMm, heightMm, depthMm } = geometry.boundingBox;
  const width = widthMm * MM;
  const height = heightMm * MM;
  const depth = depthMm * MM;
  const gap = 70 * MM;
  const bay = config.bays.find((entry) => entry.id === selectedBayId) ?? config.bays[0];
  const section = getProfileSeries(config.series).sectionMm;
  const levels = [...(bay?.levels ?? [])].sort((a, b) => a.yMm - b.yMm);

  return (
    <group>
      <Line
        points={[
          [0, -gap, depth + gap],
          [width, -gap, depth + gap],
        ]}
        color="#334155"
        lineWidth={1}
      />
      <Label portal={portal} position={[width / 2, -gap, depth + gap]} text={`${Math.round(widthMm)} mm`} />

      <Line
        points={[
          [width + gap, 0, depth + gap],
          [width + gap, height, depth + gap],
        ]}
        color="#334155"
        lineWidth={1}
      />
      <Label portal={portal} position={[width + gap, height / 2, depth + gap]} text={`${Math.round(heightMm)} mm`} />

      <Line
        points={[
          [-gap, -gap, 0],
          [-gap, -gap, depth],
        ]}
        color="#334155"
        lineWidth={1}
      />
      <Label portal={portal} position={[-gap, -gap, depth / 2]} text={`${Math.round(depthMm)} mm`} />

      {levels.slice(0, -1).map((level, index) => {
        const next = levels[index + 1];
        if (!next) {
          return null;
        }
        const clear = Math.max(0, next.yMm - level.yMm - section);
        const y0 = level.yMm * MM;
        const y1 = next.yMm * MM;
        const x = -gap * 2;
        return (
          <group key={`${level.id}-${next.id}`}>
            <Line points={[[x, y0, 0], [x, y1, 0]]} color="#0f766e" lineWidth={1} />
            <Label portal={portal} position={[x, (y0 + y1) / 2, 0]} text={`${Math.round(clear)} mm`} />
          </group>
        );
      })}
    </group>
  );
}
