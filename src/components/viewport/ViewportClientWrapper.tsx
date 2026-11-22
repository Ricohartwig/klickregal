'use client';

import dynamic from 'next/dynamic';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';

const TestScene = dynamic(() => import('./TestScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-sm text-neutral-600">
      3D-Ansicht wird geladen…
    </div>
  ),
});

export function ViewportClientWrapper() {
  return (
    <WebGLErrorBoundary>
      <div className="h-full w-full">
        <TestScene />
      </div>
    </WebGLErrorBoundary>
  );
}
