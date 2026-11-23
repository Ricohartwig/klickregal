'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type WebGLErrorBoundaryProps = {
  children: ReactNode;
};

type WebGLErrorBoundaryState = {
  hasError: boolean;
};

export class WebGLErrorBoundary extends Component<
  WebGLErrorBoundaryProps,
  WebGLErrorBoundaryState
> {
  state: WebGLErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WebGLErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('WebGL/Canvas-Fehler', error, info);
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-neutral-100 px-6 text-center text-neutral-900">
          <h1 className="text-xl font-semibold">3D-Ansicht nicht verfügbar</h1>
          <p className="max-w-md text-sm leading-6 text-neutral-600">
            Die WebGL-Darstellung konnte nicht gestartet werden. Bitte laden Sie
            die Seite neu oder prüfen Sie, ob WebGL im Browser aktiv ist.
          </p>
          <button
            type="button"
            onClick={this.reload}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Seite neu laden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
