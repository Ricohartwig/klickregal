'use client';

import { EUROBOX_IDS, euroboxHeightMm, getEurobox } from '@/core/catalog';
import type { CollisionIssue } from '@/core/collision';
import type { EuroboxId, Level } from '@/core/schema';
import { usePlannerStore } from '@/store/usePlannerStore';

function nextBoxId(): string {
  return `box-${crypto.randomUUID()}`;
}

export function EuroboxSelector({
  bayId,
  level,
  collisions,
}: {
  bayId: string;
  level: Level;
  collisions: CollisionIssue[];
}) {
  const updateLevel = usePlannerStore((state) => state.updateLevel);
  const autoFillEuroboxes = usePlannerStore((state) => state.autoFillEuroboxes);
  const bays = usePlannerStore((state) => state.config.bays);
  const bay = bays.find((entry) => entry.id === bayId);
  const hits = collisions.filter((issue) => issue.levelId === level.id && issue.code === 'eurobox_clearance');

  const addBox = (boxId: EuroboxId) => {
    const used = level.boxes.reduce((max, box) => {
      const end = (level.orientation === 'crosswise' ? box.xMm : box.zMm) + getEurobox(box.boxId).lengthMm;
      return Math.max(max, end);
    }, 0);
    updateLevel(bayId, level.id, {
      boxes: [
        ...level.boxes,
        {
          id: nextBoxId(),
          boxId,
          withLid: false,
          xMm: level.orientation === 'crosswise' ? used : 0,
          zMm: level.orientation === 'crosswise' ? 0 : used,
        },
      ],
    });
  };

  const fitLevel = (issue: CollisionIssue) => {
    if (!bay) {
      return;
    }
    const deficit = Math.ceil((issue.requiredMm ?? 0) - (issue.availableMm ?? 0));
    if (deficit <= 0) {
      return;
    }
    const sorted = [...bay.levels].sort((a, b) => a.yMm - b.yMm);
    const index = sorted.findIndex((entry) => entry.id === level.id);
    const next = sorted[index + 1];
    if (next) {
      updateLevel(bayId, next.id, { yMm: next.yMm + deficit });
      return;
    }
    updateLevel(bayId, level.id, { yMm: Math.max(0, level.yMm - deficit) });
  };

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-950">Euroboxen</h3>
        <button
          type="button"
          className="h-7 rounded-md bg-slate-900 px-2 text-xs text-white"
          onClick={() => autoFillEuroboxes(bayId, level.id)}
        >
          Auto-Fill
        </button>
      </div>
      {level.boxes.length === 0 ? <p className="text-xs text-slate-500">Keine Box auf dieser Ebene.</p> : null}
      {level.boxes.map((box, index) => {
        const spec = getEurobox(box.boxId);
        const height = euroboxHeightMm(spec, box.withLid);
        return (
          <div key={box.id} className="rounded-md border border-slate-200 p-2">
            <p className="text-xs text-slate-500">Box {index + 1}</p>
            <select
              aria-label={`Eurobox ${index + 1}`}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
              value={box.boxId}
              onChange={(event) =>
                updateLevel(bayId, level.id, {
                  boxes: level.boxes.map((entry) =>
                    entry.id === box.id ? { ...entry, boxId: event.target.value as EuroboxId } : entry,
                  ),
                })
              }
            >
              {EUROBOX_IDS.map((id) => {
                const item = getEurobox(id);
                return (
                  <option key={id} value={id}>
                    {id} · {item.lengthMm}×{item.widthMm}×{item.heightMm} mm
                  </option>
                );
              })}
            </select>
            <div className="mt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={box.withLid}
                  onChange={(event) =>
                    updateLevel(bayId, level.id, {
                      boxes: level.boxes.map((entry) =>
                        entry.id === box.id ? { ...entry, withLid: event.target.checked } : entry,
                      ),
                    })
                  }
                />
                Deckel (+15 mm)
              </label>
              <span className="text-xs text-slate-500">{height} mm hoch</span>
            </div>
            <button
              type="button"
              className="mt-2 text-xs text-slate-500"
              onClick={() =>
                updateLevel(bayId, level.id, {
                  boxes: level.boxes.filter((entry) => entry.id !== box.id),
                })
              }
            >
              Entfernen
            </button>
          </div>
        );
      })}
      <label className="flex flex-col gap-1 text-xs text-slate-600">
        Box hinzufügen
        <select
          className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
          value=""
          onChange={(event) => {
            if (event.target.value) {
              addBox(event.target.value as EuroboxId);
              event.target.value = '';
            }
          }}
        >
          <option value="">Katalog GR-1 bis GR-8</option>
          {EUROBOX_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      {hits.map((issue, index) => (
        <div key={`${issue.boxId ?? 'box'}-${index}`} className="rounded-md bg-red-600 px-2 py-2 text-xs text-white">
          <p>{issue.message}</p>
          <p className="mt-1">
            Es fehlen {Math.ceil((issue.requiredMm ?? 0) - (issue.availableMm ?? 0))} mm lichte Fachhöhe.
          </p>
          <button type="button" className="mt-2 rounded bg-white px-2 py-1 text-xs font-medium text-red-700" onClick={() => fitLevel(issue)}>
            Ebene automatisch anpassen
          </button>
        </div>
      ))}
    </div>
  );
}
