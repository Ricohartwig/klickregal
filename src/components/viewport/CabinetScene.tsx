'use client';

import { ContactShadows, Grid } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { RefObject } from 'react';
import * as THREE from 'three';
import { CameraRig } from '@/components/viewport/CameraRig';
import { DimensionLines } from '@/components/viewport/DimensionLines';
import { HardwareInstances } from '@/components/viewport/HardwareInstances';
import { ProfileMesh } from '@/components/viewport/ProfileMesh';
import { RoomEnvelope } from '@/components/viewport/RoomEnvelope';
import { useCabinetDerived, usePlannerStore } from '@/store/usePlannerStore';

export default function CabinetScene({ portal }: { portal: RefObject<HTMLDivElement | null> }) {
  const { config, geometry, collisions, statics } = useCabinetDerived();
  const showDimensions = usePlannerStore((state) => state.showDimensions);
  const showRoomEnvelope = usePlannerStore((state) => state.showRoomEnvelope);
  const staticsOverlay = usePlannerStore((state) => state.staticsOverlay);
  const explosionFactor = usePlannerStore((state) => state.explosionFactor);
  const selectedBayId = usePlannerStore((state) => state.selectedBayId);
  const centerX = (geometry.boundingBox.widthMm / 1000) / 2;
  const centerZ = (geometry.boundingBox.depthMm / 1000) / 2;

  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop="demand"
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ fov: 40, near: 0.05, far: 80, position: [1.6, 1.3, 2.2] }}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <color attach="background" args={['#e7e5e4']} />
      <ambientLight intensity={0.4} color="#ffffff" />
      <hemisphereLight args={['#f8fafc', '#cbd5e1', 0.35]} />
      <directionalLight position={[3.2, 5.5, 2.4]} intensity={1.7} color="#ffffff" castShadow />
      <directionalLight position={[-2.8, 3.2, 1.6]} intensity={0.55} color="#ffffff" />
      <directionalLight position={[0.4, 2.2, -3.2]} intensity={0.32} color="#ffffff" />
      <Grid
        args={[10, 10]}
        cellSize={0.1}
        cellThickness={0.6}
        cellColor="#cbd5e1"
        sectionSize={1}
        sectionThickness={1.1}
        sectionColor="#94a3b8"
        fadeDistance={12}
        infiniteGrid
        position={[centerX, 0, centerZ]}
      />
      <ContactShadows
        position={[centerX, 0, centerZ]}
        opacity={0.35}
        scale={8}
        blur={2.2}
        far={4}
        frames={1}
      />
      <ProfileMesh
        geometry={geometry}
        statics={statics}
        staticsOverlay={staticsOverlay}
        explosionFactor={explosionFactor}
      />
      <HardwareInstances geometry={geometry} explosionFactor={explosionFactor} />
      <DimensionLines
        geometry={geometry}
        config={config}
        selectedBayId={selectedBayId}
        visible={showDimensions}
        portal={portal}
      />
      <RoomEnvelope config={config} collisions={collisions} visible={showRoomEnvelope} />
      <CameraRig bounds={geometry.boundingBox} />
    </Canvas>
  );
}
