'use client';

import { useMemo, useState } from 'react';
import type { CutBar, StockLengthMm } from '@/core/cuttingStock';
import { optimizeCuttingStock } from '@/core/cuttingStock';
import type { PartCode } from '@/core/geometry';
import { useCabinetDerived, usePlannerStore } from '@/store/usePlannerStore';

const STOCKS: StockLengthMm[] = [1500, 2000, 3000, 6000];

const CUT_COLOR: Record<PartCode, string> = {
  'Nr.1': 'bg-slate-700',
  'Nr.2': 'bg-sky-700',
  'Nr.3': 'bg-amber-600',
  'Nr.4': 'bg-emerald-700',
  'Nr.5': 'bg-violet-700',
  Korpus: 'bg-stone-600',
};

function percent(lengthMm: number, stockMm: number): string {
  return `${(lengthMm / stockMm) * 100}%`;
}

function Bar({ bar, stockMm }: { bar: CutBar; stockMm: number }) {
  const last = bar.cuts[bar.cuts.length - 1];
  const restStart = last ? last.offsetMm + last.lengthMm : 0;
  const restMm = Math.max(0, stockMm - restStart);
  const overflow = bar.cuts.some((cut) => cut.offsetMm + cut.lengthMm > stockMm);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px] text-slate-500">
        <span>Stange {bar.barIndex + 1}</span>
        <span>
          {bar.usedMm} mm netto · Rest {Math.round(restMm)} mm
        </span>
      </div>
      <div className="relative h-10 w-full overflow-hidden rounded-md bg-slate-200">
        {bar.cuts.map((cut, index) => (
          <div
            key={`${cut.partCode}-${cut.offsetMm}-${index}`}
            className={`absolute inset-y-0 flex items-center overflow-hidden px-1 text-[10px] font-medium text-white ${CUT_COLOR[cut.partCode]}`}
            style={{ left: percent(cut.offsetMm, stockMm), width: percent(cut.lengthMm, stockMm) }}
            title={`${cut.partCode}: ${cut.lengthMm} mm`}
          >
            {cut.partCode}: {cut.lengthMm} mm
          </div>
        ))}
        {restMm > 0 ? (
          <div
            className="absolute inset-y-0 flex items-center overflow-hidden bg-[repeating-linear-gradient(135deg,#e2e8f0_0_6px,#cbd5e1_6px_12px)] px-1 text-[10px] text-slate-700"
            style={{ left: percent(restStart, stockMm), width: percent(restMm, stockMm) }}
          >
            Rest: {Math.round(restMm)} mm
          </div>
        ) : null}
      </div>
      {overflow ? <p className="text-[11px] text-red-700">Ein Zuschnitt ist länger als die Rohstange.</p> : null}
    </div>
  );
}

export function CuttingPlanView() {
  const { bom } = useCabinetDerived();
  const stockLengthMm = usePlannerStore((state) => state.stockLengthMm);
  const setStockLengthMm = usePlannerStore((state) => state.setStockLengthMm);
  const [kerfMm, setKerfMm] = useState(3);
  const [trimLossMm, setTrimLossMm] = useState(15);
  const plan = useMemo(
    () => optimizeCuttingStock(bom, stockLengthMm, Math.max(0, kerfMm), Math.max(0, trimLossMm)),
    [bom, kerfMm, stockLengthMm, trimLossMm],
  );
  const grossMm = plan.barCount * plan.stockLengthMm;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Rohstange</span>
          <div className="flex gap-1">
            {STOCKS.map((length) => (
              <button
                key={length}
                type="button"
                className={`h-8 rounded-md px-2 text-xs ${stockLengthMm === length ? 'bg-slate-900 text-white' : 'border border-slate-300'}`}
                onClick={() => setStockLengthMm(length)}
              >
                {length} mm
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Sägeblattbreite mm
          <input
            type="number"
            min={0}
            className="h-8 w-24 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
            value={kerfMm}
            onChange={(event) => setKerfMm(Math.max(0, Number(event.target.value) || 0))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Anschnittverlust mm
          <input
            type="number"
            min={0}
            className="h-8 w-24 rounded-md border border-slate-300 px-2 text-sm text-slate-950"
            value={trimLossMm}
            onChange={(event) => setTrimLossMm(Math.max(0, Number(event.target.value) || 0))}
          />
        </label>
      </div>

      <div className="grid gap-2 rounded-md bg-slate-50 p-3 text-xs text-slate-800 sm:grid-cols-4">
        <p>
          <span className="block text-slate-500">Stangen</span>
          {plan.barCount}
        </p>
        <p>
          <span className="block text-slate-500">Netto / Brutto</span>
          {Math.round(plan.netLengthMm)} / {grossMm} mm
        </p>
        <p>
          <span className="block text-slate-500">Verschnitt</span>
          {plan.wastePercent.toFixed(1).replace('.', ',')} %
        </p>
        <p>
          <span className="block text-slate-500">Säge / Anschnitt</span>
          {plan.kerfMm} / {plan.trimLossMm} mm
        </p>
      </div>
      {plan.shippingHint ? <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950">{plan.shippingHint}</p> : null}
      <p className="text-xs text-slate-700">{plan.comparisonTip}</p>

      {plan.groups.map((group) => (
        <section key={`${group.series}-${group.finish}`} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-950">
            {group.series} · {group.finish === 'black' ? 'Schwarz eloxiert' : 'Silber eloxiert'} · {group.barCount} Stangen
          </h3>
          {group.bars.map((bar) => (
            <Bar key={bar.barIndex} bar={bar} stockMm={plan.stockLengthMm} />
          ))}
        </section>
      ))}
    </div>
  );
}
