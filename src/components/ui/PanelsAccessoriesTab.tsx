'use client';

import { useState } from 'react';
import type { AccessoryPosition, AccessoryType } from '@/core/schema';
import { usePlannerStore } from '@/store/usePlannerStore';

const ACCESSORIES: Array<{ id: AccessoryType; label: string }> = [
  { id: 'coat_hook', label: 'Klappkleiderhaken' },
  { id: 'lashing_eye', label: 'Klappbare Zurröse' },
  { id: 'eye_bolt', label: 'Augenschraube' },
  { id: 'safety_set_10', label: 'Sicherungsset 10 cm' },
  { id: 'safety_set_15', label: 'Sicherungsset 15 cm' },
  { id: 'safety_set_20', label: 'Sicherungsset 20 cm' },
];

const POSITIONS: Array<{ id: AccessoryPosition; label: string }> = [
  { id: 'left', label: 'Außensteher links' },
  { id: 'right', label: 'Außensteher rechts' },
  { id: 'front', label: 'Außensteher vorne' },
  { id: 'back', label: 'Außensteher hinten' },
];

const ACCESSORY_LABEL = Object.fromEntries(ACCESSORIES.map((entry) => [entry.id, entry.label])) as Record<string, string>;
const POSITION_LABEL = Object.fromEntries(POSITIONS.map((entry) => [entry.id, entry.label])) as Record<string, string>;

export function PanelsAccessoriesTab() {
  const config = usePlannerStore((state) => state.config);
  const selectedBayId = usePlannerStore((state) => state.selectedBayId);
  const addAccessory = usePlannerStore((state) => state.addAccessory);
  const removeAccessory = usePlannerStore((state) => state.removeAccessory);
  const setView = usePlannerStore((state) => state.setView);
  const bay = config.bays.find((entry) => entry.id === selectedBayId) ?? config.bays[0];
  const [type, setType] = useState<AccessoryType>('coat_hook');
  const [position, setPosition] = useState<AccessoryPosition>('left');
  const [heightMm, setHeightMm] = useState(400);

  if (!bay) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-950">Feld</h2>
        <select
          aria-label="Feld"
          className="h-9 rounded-md border border-slate-300 px-2 text-sm"
          value={bay.id}
          onChange={(event) => setView({ selectedBayId: event.target.value, selectedLevelId: null })}
        >
          {config.bays.map((entry, index) => (
            <option key={entry.id} value={entry.id}>
              Feld {index + 1}
            </option>
          ))}
        </select>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-950">Zubehör an Außenstehern</h2>
        <label className="flex flex-col gap-1 text-xs text-slate-600">
          Teil
          <select
            className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
            value={type}
            onChange={(event) => setType(event.target.value as AccessoryType)}
          >
            {ACCESSORIES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-600">
          Position
          <select
            className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
            value={position}
            onChange={(event) => setPosition(event.target.value as AccessoryPosition)}
          >
            {POSITIONS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-600">
          Höhe mm
          <input
            type="number"
            min={0}
            className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
            value={heightMm}
            onChange={(event) => setHeightMm(Math.max(0, Number(event.target.value) || 0))}
          />
        </label>
        <button
          type="button"
          className="h-9 rounded-md border border-slate-300 text-sm"
          onClick={() => addAccessory({ type, position, yMm: heightMm })}
        >
          Zubehör hinzufügen
        </button>
        {config.accessories
          .filter((item) => ACCESSORY_LABEL[item.type])
          .map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-2">
              <p className="text-xs text-slate-800">
                {ACCESSORY_LABEL[item.type]} · {POSITION_LABEL[item.position]} · {Math.round(item.yMm)} mm
              </p>
              <button type="button" className="text-xs text-slate-500" onClick={() => removeAccessory(item.id)}>
                Entfernen
              </button>
            </div>
          ))}
      </section>
    </div>
  );
}
