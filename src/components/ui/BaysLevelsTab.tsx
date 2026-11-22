'use client';

import { getSlideForSeries } from '@/core/catalog';
import type { BayMode, LevelType } from '@/core/schema';
import { useCabinetDerived, usePlannerStore } from '@/store/usePlannerStore';

const WIDTHS = [300, 400, 600, 800, 900, 1200];

const LEVELS: Array<{ type: LevelType; label: string }> = [
  { type: 'fixed_eurobox', label: 'Fester Eurobox-Rahmen' },
  { type: 'pullout', label: 'Auszug' },
  { type: 'solid_shelf', label: 'Fester Fachboden' },
  { type: 'riffle_plate', label: 'Riffelblech' },
  { type: 'clothes_rail', label: 'Kleiderstange' },
];

const LEVEL_LABEL: Record<LevelType, string> = {
  fixed_eurobox: 'Eurobox-Rahmen',
  pullout: 'Auszug',
  solid_shelf: 'Fachboden',
  riffle_plate: 'Riffelblech',
  clothes_rail: 'Kleiderstange',
};

function statusClass(status: 'OK' | 'WARN' | 'FAIL'): string {
  if (status === 'FAIL') {
    return 'bg-red-600 text-white';
  }
  if (status === 'WARN') {
    return 'bg-amber-400 text-slate-950';
  }
  return 'bg-emerald-600 text-white';
}

export function BaysLevelsTab() {
  const config = usePlannerStore((state) => state.config);
  const selectedBayId = usePlannerStore((state) => state.selectedBayId);
  const selectedLevelId = usePlannerStore((state) => state.selectedLevelId);
  const setView = usePlannerStore((state) => state.setView);
  const addBay = usePlannerStore((state) => state.addBay);
  const duplicateBay = usePlannerStore((state) => state.duplicateBay);
  const removeBay = usePlannerStore((state) => state.removeBay);
  const updateBay = usePlannerStore((state) => state.updateBay);
  const addLevel = usePlannerStore((state) => state.addLevel);
  const removeLevel = usePlannerStore((state) => state.removeLevel);
  const updateLevel = usePlannerStore((state) => state.updateLevel);
  const { statics, collisions } = useCabinetDerived();
  const bay = config.bays.find((entry) => entry.id === selectedBayId) ?? config.bays[0];
  const slides = getSlideForSeries(config.series).lengthsMm;

  return (
    <div className="flex flex-col gap-5 p-4">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-950">Felder</h2>
          <button type="button" className="h-8 rounded-md bg-slate-900 px-2 text-xs text-white" onClick={() => addBay()}>
            Feld hinzufügen
          </button>
        </div>
        {config.bays.map((entry, index) => {
          const active = entry.id === bay?.id;
          return (
            <div key={entry.id} className={`rounded-md border p-2 ${active ? 'border-slate-900' : 'border-slate-200'}`}>
              <button type="button" className="text-sm font-medium" onClick={() => setView({ selectedBayId: entry.id, selectedLevelId: entry.levels[0]?.id ?? null })}>
                Feld {index + 1}
              </button>
              <div className="mt-2 flex gap-1">
                <button type="button" className="h-7 rounded border border-slate-300 px-2 text-xs" onClick={() => duplicateBay(entry.id)}>
                  Duplizieren
                </button>
                <button type="button" className="h-7 rounded border border-slate-300 px-2 text-xs" onClick={() => removeBay(entry.id)}>
                  Löschen
                </button>
              </div>
              {active ? (
                <div className="mt-3 flex flex-col gap-2">
                  <select
                    className="h-9 rounded-md border border-slate-300 px-2 text-sm"
                    value={entry.mode}
                    onChange={(event) => updateBay(entry.id, { mode: event.target.value as BayMode })}
                  >
                    <option value="eurobox">Eurobox-Regal</option>
                    <option value="cabinet">Schrank-Korpus</option>
                  </select>
                  <label className="flex flex-col gap-1 text-xs text-slate-600">
                    Breite mm
                    <input
                      type="number"
                      className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
                      value={entry.widthMm}
                      onChange={(event) => {
                        const widthMm = Number(event.target.value);
                        if (widthMm > 0) {
                          updateBay(entry.id, { widthMm });
                        }
                      }}
                    />
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {WIDTHS.map((width) => (
                      <button
                        key={width}
                        type="button"
                        className="h-7 rounded border border-slate-300 px-2 text-xs"
                        onClick={() => updateBay(entry.id, { widthMm: width })}
                      >
                        {width}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>
      {bay ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-slate-950">Ebenen</h2>
          <div className="flex flex-wrap gap-1">
            {LEVELS.map((entry) => (
              <button
                key={entry.type}
                type="button"
                className="h-7 rounded border border-slate-300 px-2 text-xs"
                onClick={() => addLevel(bay.id, entry.type)}
              >
                {entry.label}
              </button>
            ))}
          </div>
          {bay.levels.map((level) => {
            const report = statics.levels.find((entry) => entry.levelId === level.id);
            const levelHits = collisions.filter((issue) => issue.levelId === level.id && issue.severity === 'error');
            const active = level.id === selectedLevelId;
            return (
              <div key={level.id} className={`rounded-md border p-2 ${active ? 'border-slate-900' : 'border-slate-200'}`}>
                <button type="button" className="text-sm" onClick={() => setView({ selectedBayId: bay.id, selectedLevelId: level.id })}>
                  {LEVEL_LABEL[level.type]}
                </button>
                <button type="button" className="ml-2 text-xs text-slate-500" onClick={() => removeLevel(bay.id, level.id)}>
                  Entfernen
                </button>
                <label className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
                  Höhe {Math.round(level.yMm)} mm
                  <input
                    type="range"
                    min={0}
                    max={config.room.heightMm}
                    value={level.yMm}
                    onChange={(event) => updateLevel(bay.id, level.id, { yMm: Number(event.target.value) })}
                  />
                  <input
                    type="number"
                    className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
                    value={level.yMm}
                    onChange={(event) => updateLevel(bay.id, level.id, { yMm: Math.max(0, Number(event.target.value)) })}
                  />
                </label>
                <label className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
                  Ausrichtung
                  <select
                    className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
                    value={level.orientation}
                    onChange={(event) => updateLevel(bay.id, level.id, { orientation: event.target.value as 'lengthwise' | 'crosswise' })}
                  >
                    <option value="lengthwise">längs</option>
                    <option value="crosswise">quer</option>
                  </select>
                </label>
                {level.type === 'pullout' ? (
                  <label className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
                    Schienenlänge mm
                    <select
                      className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
                      value={level.slideLengthMm ?? ''}
                      onChange={(event) => updateLevel(bay.id, level.id, { slideLengthMm: Number(event.target.value) })}
                    >
                      <option value="">automatisch</option>
                      {slides.map((length) => (
                        <option key={length} value={length}>
                          {length}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
                  Ziel-Traglast kg
                  <input
                    type="number"
                    min={0}
                    className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
                    value={level.targetLoadKg}
                    onChange={(event) => updateLevel(bay.id, level.id, { targetLoadKg: Math.max(0, Number(event.target.value)) })}
                  />
                </label>
                {report ? (
                  <p className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs ${statusClass(report.status)}`}>
                    {report.status} · {report.fUdlMm.toFixed(2)} mm
                  </p>
                ) : null}
                {levelHits.length > 0 ? (
                  <p className="mt-2 text-xs text-red-700">{levelHits[0]?.message}</p>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
