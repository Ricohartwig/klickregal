'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';

const CabinetScene = dynamic(() => import('./CabinetScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-sm text-neutral-600">
      3D-Ansicht wird geladen…
    </div>
  ),
});

export function ViewportClientWrapper() {
  const portalRef = useRef<HTMLDivElement>(null);
  return (
    <WebGLErrorBoundary>
      <div className="relative h-full w-full">
        <div ref={portalRef} className="pointer-events-none absolute inset-0" />
        <CabinetScene portal={portalRef} />
      </div>
    </WebGLErrorBoundary>
  );
}
