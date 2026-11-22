'use client';

import { useState } from 'react';
import {
  EUROBOX_IDS,
  TREAD_PLATE,
  getEurobox,
  getHardware,
  getPanelMaterial,
  getProfileSeries,
  getSlideForSeries,
} from '@/core/catalog';
import type { ProfileSeriesId } from '@/core/schema';
import { useCabinetDerived, usePlannerStore } from '@/store/usePlannerStore';

const FINISH_LABEL = { silver: 'Silber eloxiert', black: 'Schwarz eloxiert' } as const;

function eur(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function rate(id: string, fallback: number | null, custom: Record<string, number> | undefined): number {
  if (custom && Object.prototype.hasOwnProperty.call(custom, id)) {
    return custom[id] ?? 0;
  }
  return fallback ?? 0;
}

function materialLabel(id: string): string {
  if (id === TREAD_PLATE.id) {
    return TREAD_PLATE.name;
  }
  if (id === 'dibond_anthracite' || id === 'birch_plywood' || id === 'acrylic_clear' || id === 'none') {
    return getPanelMaterial(id).label;
  }
  return id;
}

function mNutId(series: ProfileSeriesId, size: 'm5' | 'm6'): string {
  if (series === '20x20_B6') {
    return size === 'm5' ? 't_nut_m5_b6' : 't_nut_m6_b6';
  }
  if (series === '40x40_I8') {
    return size === 'm5' ? 't_nut_m5_i8' : 't_nut_m6_i8';
  }
  return size === 'm5' ? 't_nut_m5_b8' : 't_nut_m6_b8';
}

function priceRows(series: ProfileSeriesId) {
  const profile = getProfileSeries(series);
  const slide = getSlideForSeries(series);
  const rows: Array<{ id: string; label: string; unit: string; fallback: number | null }> = [
    { id: profile.id, label: `Profil ${profile.label}`, unit: '€/m', fallback: profile.priceEurPerM },
    { id: slide.id, label: slide.name, unit: '€/Paar', fallback: slide.priceEurPerPair },
  ];
  const addHardware = (id: string | null) => {
    if (!id) {
      return;
    }
    const item = getHardware(id);
    rows.push({ id, label: item.name, unit: '€/Stück', fallback: item.priceEur });
  };
  addHardware(profile.insideBracketId);
  addHardware(profile.cornerBracketId);
  addHardware('spannteller_m8x80');
  addHardware('foot_plate_m8');
  addHardware('rotary_latch_black');
  addHardware('handle_plastic');
  addHardware('hinge_180_plastic');
  addHardware('magnetic_catch');
  addHardware(mNutId(series, 'm5'));
  addHardware(mNutId(series, 'm6'));
  for (const id of ['dibond_anthracite', 'birch_plywood', 'acrylic_clear'] as const) {
    const material = getPanelMaterial(id);
    rows.push({ id, label: material.label, unit: '€/m²', fallback: material.priceEurPerM2 });
  }
  rows.push({ id: TREAD_PLATE.id, label: TREAD_PLATE.name, unit: '€/m²', fallback: TREAD_PLATE.priceEurPerM2 });
  for (const id of EUROBOX_IDS) {
    rows.push({ id, label: `Eurobox ${id}`, unit: '€/Stück', fallback: null });
  }
  return rows;
}

function PriceEditor() {
  const series = usePlannerStore((state) => state.config.series);
  const customPrices = usePlannerStore((state) => state.customPrices);
  const setCustomPrices = usePlannerStore((state) => state.setCustomPrices);
  const [draft, setDraft] = useState(() => JSON.stringify(customPrices, null, 2));
  const [error, setError] = useState<string | null>(null);
  const rows = priceRows(series);

  const write = (next: Record<string, number>) => {
    setCustomPrices(next);
    setDraft(JSON.stringify(next, null, 2));
    setError(null);
  };

  return (
    <div className="mt-3 rounded-md border border-slate-200 p-3">
      <p className="text-xs font-semibold text-slate-950">Eigene Einkaufspreise</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <label key={row.id} className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              {row.label}
              <span className="block text-[10px] text-slate-400">
                {row.unit}
                {row.fallback === null ? ' · kein Referenzpreis' : ` · Referenz ${eur(row.fallback)}`}
              </span>
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              className="h-8 w-24 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
              value={customPrices[row.id] ?? ''}
              placeholder={row.fallback === null ? '—' : String(row.fallback)}
              onChange={(event) => {
                const next = { ...customPrices };
                if (event.target.value === '') {
                  delete next[row.id];
                } else {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value)) {
                    next[row.id] = value;
                  }
                }
                write(next);
              }}
            />
          </label>
        ))}
      </div>
      <label className="mt-3 flex flex-col gap-1 text-xs text-slate-600">
        JSON
        <textarea
          className="h-28 rounded-md border border-slate-300 p-2 font-mono text-xs text-slate-950"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            try {
              const parsed = JSON.parse(draft) as Record<string, unknown>;
              const next = Object.fromEntries(
                Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
              );
              write(next);
            } catch {
              setError('JSON ist ungültig und wurde nicht gespeichert.');
            }
          }}
        />
      </label>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

export function BomPanel() {
  const { bom, geometry, config } = useCabinetDerived();
  const useCustomPrices = usePlannerStore((state) => state.useCustomPrices);
  const setUseCustomPrices = usePlannerStore((state) => state.setUseCustomPrices);
  const customPrices = usePlannerStore((state) => state.customPrices);
  const prices = useCustomPrices ? customPrices : undefined;
  const series = getProfileSeries(config.series);
  const slide = getSlideForSeries(config.series);
  const profileRate = rate(config.series, series.priceEurPerM, prices);
  const slideRate = rate(slide.id, slide.priceEurPerPair, prices);
  const m5 = getHardware(mNutId(config.series, 'm5'));
  const m6 = getHardware(mNutId(config.series, 'm6'));
  const m5Rate = rate(m5.id, m5.priceEur, prices);
  const m6Rate = rate(m6.id, m6.priceEur, prices);

  const hardware: Array<{ label: string; count: number; unit: number }> = [];
  const pushHardware = (id: string | null, count: number) => {
    if (!id || count <= 0) {
      return;
    }
    const item = getHardware(id);
    hardware.push({ label: item.name, count, unit: rate(id, item.priceEur, prices) });
  };
  pushHardware(series.insideBracketId, bom.insideBrackets);
  pushHardware(series.cornerBracketId, bom.cornerBrackets);
  pushHardware('spannteller_m8x80', bom.clamps);
  pushHardware('foot_plate_m8', bom.footPlates);
  if (bom.tNutsM5 > 0) {
    hardware.push({ label: m5.name, count: bom.tNutsM5, unit: m5Rate });
  }

  const accessoryGroups = new Map<string, { name: string; count: number; unit: number }>();
  for (const item of geometry.accessories) {
    const part = getHardware(item.catalogId);
    const existing = accessoryGroups.get(item.catalogId);
    if (existing) {
      existing.count += 1;
    } else {
      accessoryGroups.set(item.catalogId, {
        name: part.name,
        count: 1,
        unit: rate(item.catalogId, part.priceEur, prices),
      });
    }
  }

  const boxes = new Map<string, { id: (typeof EUROBOX_IDS)[number]; heightMm: number; count: number }>();
  for (const box of geometry.euroboxes) {
    const key = `${box.boxId}|${box.heightMm}`;
    const existing = boxes.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      boxes.set(key, { id: box.boxId, heightMm: box.heightMm, count: 1 });
    }
  }

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`h-8 rounded-md px-3 text-xs ${useCustomPrices ? 'border border-slate-300' : 'bg-slate-900 text-white'}`}
          onClick={() => setUseCustomPrices(false)}
        >
          Standard-Referenzpreise
        </button>
        <button
          type="button"
          className={`h-8 rounded-md px-3 text-xs ${useCustomPrices ? 'bg-slate-900 text-white' : 'border border-slate-300'}`}
          onClick={() => setUseCustomPrices(true)}
        >
          Eigene Einkaufspreise
        </button>
        <p className="ml-auto text-sm font-semibold text-slate-950">
          {eur(bom.totalPriceEur)} · {bom.totalWeightKg.toFixed(1)} kg
        </p>
      </div>
      {useCustomPrices ? <PriceEditor /> : null}

      <section className="mt-4">
        <h3 className="text-sm font-semibold text-slate-950">Alu-Profilzuschnitte</h3>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 font-medium">Serie</th>
              <th className="font-medium">Finish</th>
              <th className="font-medium">Nr.</th>
              <th className="font-medium">Länge</th>
              <th className="font-medium">Winkel</th>
              <th className="font-medium">Stück</th>
              <th className="font-medium">Einzel</th>
              <th className="font-medium">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {bom.profiles.map((group) => {
              const unit = (group.lengthMm / 1000) * profileRate;
              return (
                <tr key={`${group.partCode}-${group.lengthMm}-${group.finish}`} className="border-t border-slate-100">
                  <td className="py-1">{series.label}</td>
                  <td>{FINISH_LABEL[group.finish]}</td>
                  <td>{group.partCode}</td>
                  <td>{group.lengthMm} mm</td>
                  <td>90°</td>
                  <td>{group.count}</td>
                  <td>{eur(unit)}</td>
                  <td>{eur(unit * group.count)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-semibold text-slate-950">Flächenelemente</h3>
        {bom.panels.length === 0 ? <p className="mt-1 text-xs text-slate-500">Keine Platten oder Türen.</p> : null}
        <table className="mt-2 w-full text-left text-xs">
          <tbody>
            {bom.panels.map((panel) => (
              <tr key={`${panel.materialId}-${panel.widthMm}-${panel.heightMm}`} className="border-t border-slate-100">
                <td className="py-1">{materialLabel(panel.materialId)}</td>
                <td>{panel.thicknessMm} mm</td>
                <td>
                  {panel.widthMm} × {panel.heightMm} mm
                </td>
                <td>{panel.count}×</td>
                <td>{panel.areaM2.toFixed(3)} m²</td>
                <td>{eur(panel.priceEur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-semibold text-slate-950">Verbinder, Schrauben und Nutensteine</h3>
        <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {bom.tNutsM6.includedInCornerBrackets} M6-Nutensteine sind bereits in den Eckwinkel-Sets enthalten.{' '}
          {bom.tNutsM6.separateRequired} werden separat benötigt. Zusammen {bom.tNutsM6.totalRequired}.
        </div>
        <table className="mt-2 w-full text-left text-xs">
          <tbody>
            {hardware.map((line) => (
              <tr key={line.label} className="border-t border-slate-100">
                <td className="py-1">{line.label}</td>
                <td>{line.count}</td>
                <td>{eur(line.unit)}</td>
                <td>{eur(line.unit * line.count)}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-100">
              <td className="py-1">{m6.name} separat</td>
              <td>{bom.tNutsM6.separateRequired}</td>
              <td>{eur(m6Rate)}</td>
              <td>{eur(m6Rate * bom.tNutsM6.separateRequired)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-semibold text-slate-950">Auszüge, Türen, Griffe und Zubehör</h3>
        <table className="mt-2 w-full text-left text-xs">
          <tbody>
            {bom.slidePairs.map((group) => (
              <tr key={group.lengthMm} className="border-t border-slate-100">
                <td className="py-1">
                  {slide.name} {group.lengthMm} mm
                </td>
                <td>{group.pairs} Paar</td>
                <td>{eur(slideRate)}</td>
                <td>{eur(slideRate * group.pairs)}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-100">
              <td className="py-1">Drehtüren</td>
              <td>{geometry.doors.length} Flügel</td>
              <td colSpan={2}>Flächenpreis steht bei den Flächenelementen</td>
            </tr>
            {bom.rotaryLatches > 0 ? (
              <HardwareRow id="rotary_latch_black" count={bom.rotaryLatches} prices={prices} />
            ) : null}
            {bom.handles > 0 ? <HardwareRow id="handle_plastic" count={bom.handles} prices={prices} /> : null}
            {bom.hinges > 0 ? <HardwareRow id="hinge_180_plastic" count={bom.hinges} prices={prices} /> : null}
            {bom.magneticCatches > 0 ? (
              <HardwareRow id="magnetic_catch" count={bom.magneticCatches} prices={prices} />
            ) : null}
            {[...accessoryGroups.values()].map((group) => (
              <tr key={group.name} className="border-t border-slate-100">
                <td className="py-1">{group.name}</td>
                <td>{group.count}</td>
                <td>{eur(group.unit)}</td>
                <td>{eur(group.unit * group.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-semibold text-slate-950">Euroboxen</h3>
        {boxes.size === 0 ? <p className="mt-1 text-xs text-slate-500">Keine Euroboxen.</p> : null}
        <table className="mt-2 w-full text-left text-xs">
          <tbody>
            {[...boxes.values()].map((box) => {
              const spec = getEurobox(box.id);
              const unit = rate(box.id, null, prices);
              const withLid = box.heightMm > spec.heightMm;
              return (
                <tr key={`${box.id}-${box.heightMm}`} className="border-t border-slate-100">
                  <td className="py-1">
                    {box.id}
                    {withLid ? ' mit Deckel' : ''} · {spec.lengthMm}×{spec.widthMm}×{box.heightMm} mm
                  </td>
                  <td>{box.count}</td>
                  <td>{unit === 0 ? 'kein Referenzpreis' : eur(unit)}</td>
                  <td>{eur(unit * box.count)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function HardwareRow({
  id,
  count,
  prices,
}: {
  id: string;
  count: number;
  prices: Record<string, number> | undefined;
}) {
  const item = getHardware(id);
  const unit = rate(id, item.priceEur, prices);
  return (
    <tr className="border-t border-slate-100">
      <td className="py-1">{item.name}</td>
      <td>{count}</td>
      <td>{eur(unit)}</td>
      <td>{eur(unit * count)}</td>
    </tr>
  );
}
