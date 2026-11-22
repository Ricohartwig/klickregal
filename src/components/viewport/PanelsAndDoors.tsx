'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { DoorPart, PanelPart } from '@/core/geometry';
import type { AccessoryInstance } from '@/core/geometry';
import { usePlannerStore } from '@/store/usePlannerStore';

const MM = 0.001;

function usePanelMaterials(xrayMode: boolean) {
  const materials = useMemo(() => {
    const opaque = (color: string, roughness: number, metalness: number) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        transparent: xrayMode,
        opacity: xrayMode ? 0.25 : 1,
      });
    return {
      dibond: opaque('#2f333a', 0.45, 0.22),
      birch: opaque('#d9b98c', 0.7, 0.04),
      riffle: opaque('#c5ccd4', 0.42, 0.55),
      acrylic: new THREE.MeshPhysicalMaterial({
        color: '#e8f1ff',
        roughness: 0.05,
        metalness: 0,
        transmission: 1,
        transparent: true,
        opacity: 0.35,
        thickness: 0.004,
      }),
      rail: new THREE.MeshStandardMaterial({ color: '#d7dbe1', metalness: 0.72, roughness: 0.28 }),
    };
  }, [xrayMode]);

  useEffect(() => {
    return () => {
      Object.values(materials).forEach((entry) => entry.dispose());
    };
  }, [materials]);

  return materials;
}

function materialFor(id: string, materials: ReturnType<typeof usePanelMaterials>) {
  if (id === 'dibond_anthracite') {
    return materials.dibond;
  }
  if (id === 'birch_plywood') {
    return materials.birch;
  }
  if (id === 'acrylic_clear') {
    return materials.acrylic;
  }
  if (id === 'tread_plate_aluminium') {
    return materials.riffle;
  }
  return materials.dibond;
}

function panelSize(panel: PanelPart): [number, number, number] {
  const width = panel.widthMm * MM;
  const height = panel.heightMm * MM;
  const thickness = Math.max(panel.thicknessMm, 1) * MM;
  if (panel.role === 'left' || panel.role === 'right') {
    return [thickness, height, width];
  }
  if (panel.role === 'back') {
    return [width, height, thickness];
  }
  return [width, thickness, height];
}

function panelCenter(panel: PanelPart): [number, number, number] {
  const [sx, sy, sz] = panelSize(panel);
  return [panel.position.x * MM + sx / 2, panel.position.y * MM + sy / 2, panel.position.z * MM + sz / 2];
}

function DoorLeaf({
  door,
  material,
}: {
  door: DoorPart;
  material: THREE.Material;
}) {
  const hinge = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const target = useRef(THREE.MathUtils.degToRad(door.openAngleDeg));
  const invalidate = useThree((state) => state.invalidate);
  const openTarget = THREE.MathUtils.degToRad(door.openAngleDeg >= 180 ? 180 : door.openAngleDeg > 0 ? door.openAngleDeg : 110);
  const direction = door.hingeSide === 'right' ? -1 : 1;
  const hingeX = (door.hingeSide === 'right' ? door.position.x + door.widthMm : door.position.x) * MM;
  const hingeZ = (door.position.z + door.thicknessMm) * MM;

  useFrame((_, delta) => {
    const gap = target.current - angle.current;
    if (Math.abs(gap) < 0.004) {
      return;
    }
    angle.current += Math.sign(gap) * Math.min(Math.abs(gap), delta * 2.4);
    if (hinge.current) {
      hinge.current.rotation.y = direction * angle.current;
    }
    invalidate();
  });

  return (
    <group ref={hinge} position={[hingeX, 0, hingeZ]}>
      <mesh
        position={[
          (door.hingeSide === 'right' ? -door.widthMm / 2 : door.widthMm / 2) * MM,
          (door.position.y + door.heightMm / 2) * MM,
          (-Math.max(door.thicknessMm, 3) / 2) * MM,
        ]}
        castShadow
        material={material}
        onClick={(event) => {
          event.stopPropagation();
          const open = target.current > 0.05 ? 0 : openTarget;
          target.current = open;
          usePlannerStore.getState().setView({ selectedBayId: door.bayId, selectedLevelId: null });
          invalidate();
        }}
      >
        <boxGeometry
          args={[door.widthMm * MM, door.heightMm * MM, Math.max(door.thicknessMm, 3) * MM]}
        />
      </mesh>
    </group>
  );
}

export function PanelsAndDoors({
  panels,
  doors,
  accessories,
}: {
  panels: PanelPart[];
  doors: DoorPart[];
  accessories: AccessoryInstance[];
}) {
  const xrayMode = usePlannerStore((state) => state.xrayMode);
  const selectedBayId = usePlannerStore((state) => state.selectedBayId);
  const materials = usePanelMaterials(xrayMode);
  const rails = accessories.filter((item) => item.type === 'clothes_rail');

  return (
    <group>
      {panels.map((panel) => {
        const [sx, sy, sz] = panelSize(panel);
        const selected = panel.bayId === selectedBayId;
        return (
          <mesh
            key={panel.id}
            position={panelCenter(panel)}
            castShadow
            receiveShadow
            material={materialFor(panel.materialId, materials)}
            onClick={(event) => {
              event.stopPropagation();
              usePlannerStore.getState().setView({
                selectedBayId: panel.bayId,
                selectedLevelId: panel.levelId,
              });
            }}
          >
            <boxGeometry args={[sx * (selected ? 1.01 : 1), sy, sz]} />
          </mesh>
        );
      })}
      {doors.map((door) => (
        <DoorLeaf key={door.id} door={door} material={materialFor(door.materialId, materials)} />
      ))}
      {rails.map((rail) => (
        <mesh
          key={rail.id}
          position={[rail.position.x * MM, rail.position.y * MM, rail.position.z * MM]}
          rotation={[0, 0, Math.PI / 2]}
          material={materials.rail}
          castShadow
        >
          <cylinderGeometry args={[12 * MM, 12 * MM, 480 * MM, 16]} />
        </mesh>
      ))}
    </group>
  );
}
