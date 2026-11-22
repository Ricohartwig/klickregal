'use client';

import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { BoundingBox } from '@/core/geometry';
import { usePlannerStore, type CameraPreset } from '@/store/usePlannerStore';

const MM = 0.001;

function presetOffset(preset: CameraPreset, span: number): THREE.Vector3 {
  const distance = Math.max(span * 1.7, 1.4);
  if (preset === 'front') {
    return new THREE.Vector3(0, span * 0.15, distance);
  }
  if (preset === 'side') {
    return new THREE.Vector3(distance, span * 0.2, 0);
  }
  if (preset === 'top') {
    return new THREE.Vector3(0, distance, 0.01);
  }
  return new THREE.Vector3(distance * 0.75, distance * 0.55, distance * 0.85);
}

export function CameraRig({ bounds }: { bounds: BoundingBox }) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const cameraPreset = usePlannerStore((state) => state.cameraPreset);
  const center = useMemo(
    () =>
      new THREE.Vector3(
        (bounds.widthMm * MM) / 2,
        (bounds.heightMm * MM) / 2,
        (bounds.depthMm * MM) / 2,
      ),
    [bounds.depthMm, bounds.heightMm, bounds.widthMm],
  );
  const span = Math.max(bounds.widthMm, bounds.heightMm, bounds.depthMm) * MM;

  useEffect(() => {
    const offset = presetOffset(cameraPreset, span);
    const next = center.clone().add(offset);
    camera.up.set(0, cameraPreset === 'top' ? 0 : 1, cameraPreset === 'top' ? -1 : 0);
    camera.position.copy(next);
    camera.lookAt(center);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
    invalidate();
  }, [camera, cameraPreset, center, invalidate, span]);

  useEffect(() => usePlannerStore.subscribe(() => invalidate()), [invalidate]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      target={center}
    />
  );
}
