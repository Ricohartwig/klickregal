import type { ProfileSeriesId } from './catalog';
import type { BomResult } from './bom';
import type { PartCode } from './geometry';
import type { Finish } from './schema';

export type StockLengthMm = 1500 | 2000 | 3000 | 6000;

export interface CutPiece {
  partCode: PartCode;
  lengthMm: number;
  offsetMm: number;
}

export interface CutBar {
  barIndex: number;
  cuts: CutPiece[];
  usedMm: number;
  wasteMm: number;
}

export interface CuttingGroupPlan {
  series: ProfileSeriesId;
  finish: Finish;
  bars: CutBar[];
  barCount: number;
  netLengthMm: number;
  wastePercent: number;
}

export interface CuttingPlanResult {
  stockLengthMm: StockLengthMm;
  kerfMm: number;
  trimLossMm: number;
  groups: CuttingGroupPlan[];
  barCount: number;
  netLengthMm: number;
  wastePercent: number;
  shippingHint: string | null;
  comparisonTip: string;
}

interface DemandPiece {
  partCode: PartCode;
  lengthMm: number;
}

const SHIPPING_HINT =
  'Ab ca. 2000–2400 mm Stangenlänge fällt meist Speditionsversand an';

function expandPieces(bom: BomResult): Map<string, { series: ProfileSeriesId; finish: Finish; pieces: DemandPiece[] }> {
  const groups = new Map<string, { series: ProfileSeriesId; finish: Finish; pieces: DemandPiece[] }>();
  for (const group of bom.profiles) {
    const key = `${group.series}|${group.finish}`;
    const bucket = groups.get(key) ?? { series: group.series, finish: group.finish, pieces: [] };
    for (let index = 0; index < group.count; index += 1) {
      bucket.pieces.push({ partCode: group.partCode, lengthMm: group.lengthMm });
    }
    groups.set(key, bucket);
  }
  return groups;
}

function packGroup(
  pieces: DemandPiece[],
  stockLengthMm: number,
  kerfMm: number,
  trimLossMm: number,
): CutBar[] {
  const usable = stockLengthMm - trimLossMm;
  const sorted = [...pieces].sort((a, b) => b.lengthMm - a.lengthMm || a.partCode.localeCompare(b.partCode));
  const bars: Array<{ usedMm: number; cuts: DemandPiece[] }> = [];

  for (const piece of sorted) {
    let best = -1;
    let bestRemainder = Number.POSITIVE_INFINITY;
    for (let index = 0; index < bars.length; index += 1) {
      const bar = bars[index];
      if (!bar) {
        continue;
      }
      const kerf = bar.cuts.length === 0 ? 0 : kerfMm;
      const need = piece.lengthMm + kerf;
      const remainder = usable - bar.usedMm;
      if (need <= remainder && remainder - need < bestRemainder) {
        best = index;
        bestRemainder = remainder - need;
      }
    }

    if (best < 0) {
      bars.push({ usedMm: piece.lengthMm, cuts: [piece] });
      continue;
    }
    const chosen = bars[best];
    if (!chosen) {
      continue;
    }
    chosen.usedMm += piece.lengthMm + (chosen.cuts.length === 0 ? 0 : kerfMm);
    chosen.cuts.push(piece);
  }

  return bars.map((bar, barIndex) => {
    let cursor = trimLossMm;
    const cuts = bar.cuts.map((cut, cutIndex) => {
      const placed: CutPiece = { partCode: cut.partCode, lengthMm: cut.lengthMm, offsetMm: cursor };
      cursor += cut.lengthMm + (cutIndex === bar.cuts.length - 1 ? 0 : kerfMm);
      return placed;
    });
    const net = bar.cuts.reduce((sum, cut) => sum + cut.lengthMm, 0);
    return {
      barIndex,
      cuts,
      usedMm: net,
      wasteMm: stockLengthMm - net,
    };
  });
}

function wastePercent(netLengthMm: number, barCount: number, stockLengthMm: number): number {
  if (barCount === 0 || stockLengthMm === 0) {
    return 0;
  }
  return ((barCount * stockLengthMm - netLengthMm) / (barCount * stockLengthMm)) * 100;
}

function summarize(
  bom: BomResult,
  stockLengthMm: StockLengthMm,
  kerfMm: number,
  trimLossMm: number,
): { groups: CuttingGroupPlan[]; barCount: number; netLengthMm: number; wastePercent: number } {
  const groups: CuttingGroupPlan[] = [];
  for (const bucket of expandPieces(bom).values()) {
    const bars = packGroup(bucket.pieces, stockLengthMm, kerfMm, trimLossMm);
    const netLengthMm = bucket.pieces.reduce((sum, piece) => sum + piece.lengthMm, 0);
    groups.push({
      series: bucket.series,
      finish: bucket.finish,
      bars,
      barCount: bars.length,
      netLengthMm,
      wastePercent: wastePercent(netLengthMm, bars.length, stockLengthMm),
    });
  }
  const barCount = groups.reduce((sum, group) => sum + group.barCount, 0);
  const netLengthMm = groups.reduce((sum, group) => sum + group.netLengthMm, 0);
  return {
    groups,
    barCount,
    netLengthMm,
    wastePercent: wastePercent(netLengthMm, barCount, stockLengthMm),
  };
}

function formatPercent(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

export function optimizeCuttingStock(
  bom: BomResult,
  stockLengthMm: StockLengthMm,
  kerfMm = 3,
  trimLossMm = 15,
): CuttingPlanResult {
  const plan = summarize(bom, stockLengthMm, kerfMm, trimLossMm);
  const at2000 = summarize(bom, 2000, kerfMm, trimLossMm);
  const at3000 = summarize(bom, 3000, kerfMm, trimLossMm);
  const better = at3000.wastePercent < at2000.wastePercent ? '3000 mm' : '2000 mm';

  return {
    stockLengthMm,
    kerfMm,
    trimLossMm,
    groups: plan.groups,
    barCount: plan.barCount,
    netLengthMm: plan.netLengthMm,
    wastePercent: plan.wastePercent,
    shippingHint: stockLengthMm > 2000 ? SHIPPING_HINT : null,
    comparisonTip: `Vergleich: 2000 mm braucht ${at2000.barCount} Stangen (${formatPercent(at2000.wastePercent)} % Verschnitt), 3000 mm braucht ${at3000.barCount} Stangen (${formatPercent(at3000.wastePercent)} % Verschnitt). Sparsamer ist ${better}.`,
  };
}
