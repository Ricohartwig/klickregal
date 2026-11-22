'use client';

import { useState } from 'react';
import type { AccessoryPosition, AccessoryType, DoorType, PanelMaterialId } from '@/core/schema';
import { usePlannerStore } from '@/store/usePlannerStore';

const MATERIALS: Array<{ id: PanelMaterialId; label: string }> = [
  { id: 'none', label: 'Offen' },
  { id: 'dibond_anthracite', label: 'Alu-Dibond Anthrazit 3 mm' },
  { id: 'birch_plywood', label: 'Birke Multiplex 4 mm' },
  { id: 'acrylic_clear', label: 'Acrylglas 4 mm' },
];

const SIDES = [
  { key: 'left' as const, label: 'Linke Wand' },
  { key: 'right' as const, label: 'Rechte Wand' },
  { key: 'back' as const, label: 'Rückwand' },
  { key: 'top' as const, label: 'Deckel' },
];

const DOOR_TYPES: Array<{ id: DoorType; label: string }> = [
  { id: 'left', label: 'Links' },
  { id: 'right', label: 'Rechts' },
  { id: 'double', label: 'Doppeltür' },
];

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
  const updateBay = usePlannerStore((state) => state.updateBay);
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

  const open = bay.door.openAngleDeg > 0;

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
        <h2 className="text-sm font-semibold text-slate-950">Verkleidung</h2>
        {SIDES.map((side) => (
          <label key={side.key} className="flex flex-col gap-1 text-xs text-slate-600">
            {side.label}
            <select
              className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
              value={bay.panels[side.key]}
              onChange={(event) =>
                updateBay(bay.id, {
                  panels: { ...bay.panels, [side.key]: event.target.value as PanelMaterialId },
                })
              }
            >
              {MATERIALS.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-950">Drehtür</h2>
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={bay.door.enabled}
            onChange={(event) =>
              updateBay(bay.id, {
                door: {
                  ...bay.door,
                  enabled: event.target.checked,
                  material:
                    event.target.checked && bay.door.material === 'none' ? 'dibond_anthracite' : bay.door.material,
                },
              })
            }
          />
          Tür aktiv
        </label>
        {bay.door.enabled ? (
          <>
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Anschlag
              <select
                className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
                value={bay.door.type}
                onChange={(event) => updateBay(bay.id, { door: { ...bay.door, type: event.target.value as DoorType } })}
              >
                {DOOR_TYPES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Türmaterial
              <select
                className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
                value={bay.door.material}
                onChange={(event) =>
                  updateBay(bay.id, { door: { ...bay.door, material: event.target.value as PanelMaterialId } })
                }
              >
                {MATERIALS.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Spaltmaß mm
              <input
                type="number"
                min={0}
                className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
                value={bay.door.gapMm}
                onChange={(event) =>
                  updateBay(bay.id, {
                    door: { ...bay.door, gapMm: Math.max(0, Number(event.target.value) || 0) },
                  })
                }
              />
            </label>
            <button
              type="button"
              className="h-9 rounded-md bg-slate-900 text-sm text-white"
              onClick={() =>
                updateBay(bay.id, {
                  door: { ...bay.door, openAngleDeg: open ? 0 : 110 },
                })
              }
            >
              {open ? 'Tür schließen' : 'Tür öffnen'}
            </button>
          </>
        ) : null}
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
