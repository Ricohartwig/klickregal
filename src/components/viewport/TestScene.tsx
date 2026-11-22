'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

export default function TestScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop="demand"
      shadows
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ position: [0.85, 0.6, 1.05], fov: 45 }}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <color attach="background" args={['#e7e5e4']} />
      <ambientLight intensity={0.55} color="#ffffff" />
      <hemisphereLight args={['#ffffff', '#d6d3d1', 0.45]} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={2.2}
        color="#ffffff"
        castShadow
      />
      <directionalLight position={[-3.5, 2.5, 2]} intensity={1.1} color="#ffffff" />
      <directionalLight position={[0, 1.5, -4]} intensity={0.7} color="#ffffff" />
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#f0f0f0" metalness={0.42} roughness={0.24} />
      </mesh>
      <OrbitControls makeDefault enableDamping={false} />
    </Canvas>
  );
}
