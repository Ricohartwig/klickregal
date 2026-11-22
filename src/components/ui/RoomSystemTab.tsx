'use client';

import { usePlannerStore } from '@/store/usePlannerStore';
import type { FootType, ProfileSeriesId } from '@/core/schema';

const SERIES: Array<{ id: ProfileSeriesId; label: string; detail: string }> = [
  { id: '20x20_B6', label: '20x20 B6 Ultra Leicht', detail: 'Nut 6 mm, B-Typ, Teleskopschiene 50 kg' },
  { id: '30x30_B8', label: '30x30 B8 Profi-Line', detail: 'Nut 8 mm, B-Typ, Tiefe 9 mm, Schwerlastschiene 136 kg' },
  { id: '40x40_I8', label: '40x40 I8 Schwerlast', detail: 'Nut 8 mm, I-Typ, Tiefe 10 mm, Schwerlastschiene 136 kg' },
];

const FEET: Array<{ id: FootType; label: string }> = [
  { id: 'clamp_both', label: 'Spannteller oben und unten' },
  { id: 'clamp_bottom', label: 'Spannteller nur unten' },
  { id: 'foot_plates', label: 'Fußplatten' },
];

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-600">
      {label}
      <input
        type="number"
        min={1}
        className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && next > 0) {
            onChange(next);
          }
        }}
      />
    </label>
  );
}

export function RoomSystemTab() {
  const config = usePlannerStore((state) => state.config);
  const updateRoom = usePlannerStore((state) => state.updateRoom);
  const setSeries = usePlannerStore((state) => state.setSeries);
  const setFinish = usePlannerStore((state) => state.setFinish);
  const setFootType = usePlannerStore((state) => state.setFootType);
  const showRoomEnvelope = usePlannerStore((state) => state.showRoomEnvelope);
  const setView = usePlannerStore((state) => state.setView);
  const seriesInfo = SERIES.find((entry) => entry.id === config.series);
  const door = config.room.doorOpening;

  return (
    <div className="flex flex-col gap-5 p-4">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-950">Einbauraum</h2>
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Breite mm" value={config.room.clearWidthMm} onChange={(clearWidthMm) => updateRoom({ clearWidthMm })} />
          <NumberField label="Höhe mm" value={config.room.heightMm} onChange={(heightMm) => updateRoom({ heightMm })} />
          <NumberField label="Tiefe mm" value={config.room.depthMm} onChange={(depthMm) => updateRoom({ depthMm })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={Boolean(door)}
            onChange={(event) =>
              updateRoom({
                doorOpening: event.target.checked ? { widthMm: 900, heightMm: 1900 } : undefined,
              })
            }
          />
          Türöffnung
        </label>
        {door ? (
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Türbreite mm"
              value={door.widthMm}
              onChange={(widthMm) => updateRoom({ doorOpening: { ...door, widthMm } })}
            />
            <NumberField
              label="Türhöhe mm"
              value={door.heightMm}
              onChange={(heightMm) => updateRoom({ doorOpening: { ...door, heightMm } })}
            />
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={showRoomEnvelope}
            onChange={(event) => setView({ showRoomEnvelope: event.target.checked })}
          />
          Raumhülle im 3D anzeigen
        </label>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-950">Profilserie</h2>
        <select
          className="h-9 rounded-md border border-slate-300 px-2 text-sm"
          value={config.series}
          onChange={(event) => setSeries(event.target.value as ProfileSeriesId)}
        >
          {SERIES.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
        <p className="text-xs leading-5 text-slate-600">{seriesInfo?.detail}</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={`h-9 flex-1 rounded-md text-sm ${config.finish === 'silver' ? 'bg-slate-900 text-white' : 'border border-slate-300'}`}
            onClick={() => setFinish('silver')}
          >
            Silber eloxiert
          </button>
          <button
            type="button"
            className={`h-9 flex-1 rounded-md text-sm ${config.finish === 'black' ? 'bg-slate-900 text-white' : 'border border-slate-300'}`}
            onClick={() => setFinish('black')}
          >
            Schwarz eloxiert
          </button>
        </div>
        <label className="flex flex-col gap-1 text-xs text-slate-600">
          Fußtyp
          <select
            className="h-9 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
            value={config.footType}
            onChange={(event) => setFootType(event.target.value as FootType)}
          >
            {FEET.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      </section>
    </div>
  );
}
