'use client';

import { useStore } from 'zustand';
import { PRESET_IDS, type PresetId } from '@/store/presets';
import { redoPlanner, undoPlanner, useCabinetDerived, usePlannerStore, type CameraPreset } from '@/store/usePlannerStore';

const PRESET_LABEL: Record<PresetId, string> = {
  golden_master_l1255: 'Golden Master L-1255',
  camper_wardrobe_2bay: 'Camper-Schrank 2 Felder',
  workshop_heavy_40x40: 'Werkstatt 40x40',
  empty_1bay: 'Leeres Grundgestell',
};

const CAMERAS: Array<{ id: CameraPreset; label: string }> = [
  { id: 'iso', label: 'Iso' },
  { id: 'front', label: 'Vorne' },
  { id: 'side', label: 'Seite' },
  { id: 'top', label: 'Oben' },
];

function ampel(collisions: number, statics: 'OK' | 'WARN' | 'FAIL'): { label: string; className: string } {
  if (collisions > 0 || statics === 'FAIL') {
    return { label: 'Prüfen', className: 'bg-red-600 text-white' };
  }
  if (statics === 'WARN') {
    return { label: 'Warnung', className: 'bg-amber-400 text-slate-950' };
  }
  return { label: 'OK', className: 'bg-emerald-600 text-white' };
}

export function TopToolbar({ onToggleDrawer }: { onToggleDrawer: () => void }) {
  const past = useStore(usePlannerStore.temporal, (state) => state.pastStates.length);
  const future = useStore(usePlannerStore.temporal, (state) => state.futureStates.length);
  const loadPreset = usePlannerStore((state) => state.loadPreset);
  const cameraPreset = usePlannerStore((state) => state.cameraPreset);
  const setView = usePlannerStore((state) => state.setView);
  const showDimensions = usePlannerStore((state) => state.showDimensions);
  const showRoomEnvelope = usePlannerStore((state) => state.showRoomEnvelope);
  const xrayMode = usePlannerStore((state) => state.xrayMode);
  const staticsOverlay = usePlannerStore((state) => state.staticsOverlay);
  const explosionFactor = usePlannerStore((state) => state.explosionFactor);
  const globalPulloutProgress = usePlannerStore((state) => state.globalPulloutProgress);
  const setExplosionFactor = usePlannerStore((state) => state.setExplosionFactor);
  const setAllPullouts = usePlannerStore((state) => state.setAllPullouts);
  const { geometry, bom, collisions, statics } = useCabinetDerived();
  const worst = statics.levels.some((level) => level.status === 'FAIL')
    ? 'FAIL'
    : statics.levels.some((level) => level.status === 'WARN')
      ? 'WARN'
      : 'OK';
  const errors = collisions.filter((issue) => issue.severity === 'error').length;
  const light = ampel(errors, worst);
  const box = geometry.boundingBox;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3">
      <div className="flex shrink-0 items-center gap-2">
        <p className="text-sm font-semibold tracking-tight text-slate-950">KlickRegal 3D-Planer</p>
        <select
          aria-label="Preset"
          className="h-8 max-w-[11rem] rounded-md border border-slate-300 bg-white px-2 text-sm"
          defaultValue="golden_master_l1255"
          onChange={(event) => loadPreset(event.target.value as PresetId)}
        >
          {PRESET_IDS.map((id) => (
            <option key={id} value={id}>
              {PRESET_LABEL[id]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="h-8 rounded-md border border-slate-300 px-2 text-sm disabled:opacity-40"
          disabled={past === 0}
          onClick={() => undoPlanner()}
        >
          Undo {past}
        </button>
        <button
          type="button"
          className="h-8 rounded-md border border-slate-300 px-2 text-sm disabled:opacity-40"
          disabled={future === 0}
          onClick={() => redoPlanner()}
        >
          Redo {future}
        </button>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          {CAMERAS.map((camera) => (
            <button
              key={camera.id}
              type="button"
              className={`h-8 rounded-md px-2 text-sm ${cameraPreset === camera.id ? 'bg-slate-900 text-white' : 'border border-slate-300'}`}
              onClick={() => setView({ cameraPreset: camera.id })}
            >
              {camera.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-xs text-slate-700">
          <input type="checkbox" checked={showDimensions} onChange={(event) => setView({ showDimensions: event.target.checked })} />
          Maß
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-700">
          <input type="checkbox" checked={showRoomEnvelope} onChange={(event) => setView({ showRoomEnvelope: event.target.checked })} />
          Raum
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-700">
          <input type="checkbox" checked={xrayMode} onChange={(event) => setView({ xrayMode: event.target.checked })} />
          Röntgen
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-700">
          <input type="checkbox" checked={staticsOverlay} onChange={(event) => setView({ staticsOverlay: event.target.checked })} />
          Statik
        </label>
        <label className="flex items-center gap-2 whitespace-nowrap text-xs text-slate-700">
          Explosion {Math.round(explosionFactor * 100)}%
          <input
            className="w-20"
            type="range"
            min={0}
            max={100}
            value={Math.round(explosionFactor * 100)}
            onChange={(event) => setExplosionFactor(Number(event.target.value) / 100)}
          />
        </label>
        <label className="flex items-center gap-2 whitespace-nowrap text-xs text-slate-700">
          Auszüge {Math.round(globalPulloutProgress * 100)}%
          <input
            className="w-20"
            type="range"
            min={0}
            max={100}
            value={Math.round(globalPulloutProgress * 100)}
            onChange={(event) => setAllPullouts(Number(event.target.value) / 100)}
          />
        </label>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-800">
          {Math.round(box.widthMm)} × {Math.round(box.heightMm)} × {Math.round(box.depthMm)} mm
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-800">{bom.totalWeightKg.toFixed(1)} kg</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-800">
          {bom.totalPriceEur.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
        </span>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${light.className}`}>{light.label}</span>
        <button type="button" className="h-8 rounded-md border border-slate-300 px-2 text-sm" onClick={onToggleDrawer}>
          Stückliste
        </button>
      </div>
    </header>
  );
}
