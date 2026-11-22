import {
  getHardware,
  getPanelMaterial,
  getProfileSeries,
  getSlideForSeries,
  TREAD_PLATE,
  type ProfileSeriesId,
} from './catalog';
import type { CabinetGeometryResult, PartCode } from './geometry';
import type { CabinetConfig, Finish } from './schema';

export interface ProfileCutGroup {
  series: ProfileSeriesId;
  finish: Finish;
  partCode: PartCode;
  lengthMm: number;
  count: number;
  totalLengthMm: number;
  weightKg: number;
}

export interface PanelCutGroup {
  materialId: string;
  thicknessMm: number;
  widthMm: number;
  heightMm: number;
  count: number;
  areaM2: number;
  weightKg: number;
  priceEur: number;
}

export interface TNutM6Breakdown {
  includedInCornerBrackets: number;
  separateRequired: number;
  totalRequired: number;
}

export interface SlidePairGroup {
  lengthMm: number;
  pairs: number;
}

export interface BomResult {
  profiles: ProfileCutGroup[];
  profilePieceCount: number;
  netAluLengthMm: number;
  netAluWeightKg: number;
  panels: PanelCutGroup[];
  insideBrackets: number;
  cornerBrackets: number;
  clamps: number;
  footPlates: number;
  slidePairs: SlidePairGroup[];
  rotaryLatches: number;
  handles: number;
  hinges: number;
  magneticCatches: number;
  tNutsM5: number;
  tNutsM6: TNutM6Breakdown;
  euroboxCount: number;
  accessoryCount: number;
  totalWeightKg: number;
  totalPriceEur: number;
}

function unitPrice(
  id: string,
  fallback: number | null,
  customPrices: Record<string, number> | undefined,
): number {
  if (customPrices && Object.prototype.hasOwnProperty.call(customPrices, id)) {
    return customPrices[id] ?? 0;
  }
  return fallback ?? 0;
}

function m5NutsForSlideLength(lengthMm: number): number {
  return lengthMm >= 1200 ? 12 : 8;
}

function panelMaterialFigures(materialId: string): {
  thicknessMm: number;
  priceEurPerM2: number;
  weightKgPerM2: number;
} {
  if (materialId === TREAD_PLATE.id) {
    return {
      thicknessMm: TREAD_PLATE.thicknessMm,
      priceEurPerM2: TREAD_PLATE.priceEurPerM2,
      weightKgPerM2: TREAD_PLATE.weightKgPerM2,
    };
  }
  if (
    materialId === 'none' ||
    materialId === 'dibond_anthracite' ||
    materialId === 'birch_plywood' ||
    materialId === 'acrylic_clear'
  ) {
    const material = getPanelMaterial(materialId);
    return {
      thicknessMm: material.thicknessMm,
      priceEurPerM2: material.priceEurPerM2,
      weightKgPerM2: material.weightKgPerM2,
    };
  }
  return { thicknessMm: 0, priceEurPerM2: 0, weightKgPerM2: 0 };
}

export function generateBom(
  config: CabinetConfig,
  geometry: CabinetGeometryResult,
  customPrices?: Record<string, number>,
): BomResult {
  const series = getProfileSeries(config.series);
  const slide = getSlideForSeries(config.series);
  const groups = new Map<string, ProfileCutGroup>();

  for (const part of geometry.profiles) {
    const profile = getProfileSeries(part.series);
    const key = `${part.series}|${part.finish}|${part.partCode}|${part.lengthMm}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalLengthMm += part.lengthMm;
      existing.weightKg += (part.lengthMm / 1000) * profile.weightKgPerM;
      continue;
    }
    groups.set(key, {
      series: part.series,
      finish: part.finish,
      partCode: part.partCode,
      lengthMm: part.lengthMm,
      count: 1,
      totalLengthMm: part.lengthMm,
      weightKg: (part.lengthMm / 1000) * profile.weightKgPerM,
    });
  }

  const profiles = [...groups.values()].sort((a, b) =>
    a.partCode === b.partCode ? a.lengthMm - b.lengthMm : a.partCode.localeCompare(b.partCode),
  );
  const profilePieceCount = profiles.reduce((sum, group) => sum + group.count, 0);
  const netAluLengthMm = profiles.reduce((sum, group) => sum + group.totalLengthMm, 0);
  const netAluWeightKg = profiles.reduce((sum, group) => sum + group.weightKg, 0);

  const panelGroups = new Map<string, PanelCutGroup>();
  const surfaces: Array<{ materialId: string; widthMm: number; heightMm: number; thicknessMm: number }> = [
    ...geometry.panels.map((panel) => ({
      materialId: panel.materialId,
      widthMm: panel.widthMm,
      heightMm: panel.heightMm,
      thicknessMm: panel.thicknessMm,
    })),
    ...geometry.doors.map((door) => ({
      materialId: door.materialId,
      widthMm: door.widthMm,
      heightMm: door.heightMm,
      thicknessMm: door.thicknessMm,
    })),
  ];
  for (const surface of surfaces) {
    if (surface.materialId === 'none') {
      continue;
    }
    const figures = panelMaterialFigures(surface.materialId);
    const thicknessMm = surface.thicknessMm || figures.thicknessMm;
    const key = `${surface.materialId}|${thicknessMm}|${surface.widthMm}|${surface.heightMm}`;
    const areaM2 = (surface.widthMm * surface.heightMm) / 1_000_000;
    const existing = panelGroups.get(key);
    if (existing) {
      existing.count += 1;
      existing.areaM2 += areaM2;
      existing.weightKg += areaM2 * figures.weightKgPerM2;
      existing.priceEur += areaM2 * unitPrice(surface.materialId, figures.priceEurPerM2, customPrices);
      continue;
    }
    panelGroups.set(key, {
      materialId: surface.materialId,
      thicknessMm,
      widthMm: surface.widthMm,
      heightMm: surface.heightMm,
      count: 1,
      areaM2,
      weightKg: areaM2 * figures.weightKgPerM2,
      priceEur: areaM2 * unitPrice(surface.materialId, figures.priceEurPerM2, customPrices),
    });
  }
  const panels = [...panelGroups.values()];

  const pulloutCount = config.bays.reduce(
    (sum, bay) => sum + bay.levels.filter((level) => level.type === 'pullout').length,
    0,
  );
  const fixedEuroboxCount = config.bays.reduce(
    (sum, bay) => sum + bay.levels.filter((level) => level.type === 'fixed_eurobox').length,
    0,
  );
  const fixedShelfCount = config.bays.reduce(
    (sum, bay) =>
      sum +
      bay.levels.filter(
        (level) =>
          level.type === 'fixed_eurobox' ||
          level.type === 'solid_shelf' ||
          level.type === 'riffle_plate',
      ).length,
    0,
  );
  const nr3Count = geometry.profiles.filter((part) => part.partCode === 'Nr.3').length;
  const nr4Count = geometry.profiles.filter((part) => part.partCode === 'Nr.4').length;
  const insideBrackets = 4 * (pulloutCount + fixedEuroboxCount);
  const cornerBrackets = 2 * nr3Count + 2 * nr4Count + 4 * fixedShelfCount;

  const extraLatches = config.accessories.filter((item) => item.type === 'rotary_latch').length;
  const extraHandles = config.accessories.filter((item) => item.type === 'handle').length;
  const rotaryLatches = pulloutCount + extraLatches;
  const handles = pulloutCount + extraHandles;

  const slideMap = new Map<number, number>();
  for (const part of geometry.slides) {
    slideMap.set(part.lengthMm, (slideMap.get(part.lengthMm) ?? 0) + 1);
  }
  const slidePairs = [...slideMap.entries()]
    .map(([lengthMm, count]) => ({ lengthMm, pairs: count / 2 }))
    .sort((a, b) => a.lengthMm - b.lengthMm);

  const tNutsM5 =
    slidePairs.reduce((sum, group) => sum + group.pairs * m5NutsForSlideLength(group.lengthMm), 0) +
    rotaryLatches * 2;
  const includedInCornerBrackets = cornerBrackets * 2;
  const separateRequired = handles * 2;
  const tNutsM6 = {
    includedInCornerBrackets,
    separateRequired,
    totalRequired: includedInCornerBrackets + separateRequired,
  };

  const clamps = geometry.hardware.filter((part) => part.kind === 'clamp').length;
  const footPlates = geometry.hardware.filter((part) => part.kind === 'foot_plate').length;
  const hinges = geometry.hardware.filter((part) => part.kind === 'hinge').length;
  const magneticCatches = geometry.hardware.filter((part) => part.kind === 'magnetic_catch').length;

  const insideId = series.insideBracketId;
  const cornerId = series.cornerBracketId;
  const m5Id =
    config.series === '20x20_B6' ? 't_nut_m5_b6' : config.series === '30x30_B8' ? 't_nut_m5_b8' : 't_nut_m5_i8';
  const m6Id =
    config.series === '20x20_B6' ? 't_nut_m6_b6' : config.series === '30x30_B8' ? 't_nut_m6_b8' : 't_nut_m6_i8';

  const profilePrice = profiles.reduce((sum, group) => {
    const rate = unitPrice(group.series, getProfileSeries(group.series).priceEurPerM, customPrices);
    return sum + (group.totalLengthMm / 1000) * rate;
  }, 0);
  const panelPrice = panels.reduce((sum, group) => sum + group.priceEur, 0);
  const hardwarePrice =
    (insideId ? insideBrackets * unitPrice(insideId, getHardware(insideId).priceEur, customPrices) : 0) +
    (cornerId ? cornerBrackets * unitPrice(cornerId, getHardware(cornerId).priceEur, customPrices) : 0) +
    clamps * unitPrice('spannteller_m8x80', getHardware('spannteller_m8x80').priceEur, customPrices) +
    footPlates * unitPrice('foot_plate_m8', getHardware('foot_plate_m8').priceEur, customPrices) +
    rotaryLatches * unitPrice('rotary_latch_black', getHardware('rotary_latch_black').priceEur, customPrices) +
    handles * unitPrice('handle_plastic', getHardware('handle_plastic').priceEur, customPrices) +
    hinges * unitPrice('hinge_180_plastic', getHardware('hinge_180_plastic').priceEur, customPrices) +
    magneticCatches * unitPrice('magnetic_catch', getHardware('magnetic_catch').priceEur, customPrices) +
    tNutsM5 * unitPrice(m5Id, getHardware(m5Id).priceEur, customPrices) +
    separateRequired * unitPrice(m6Id, getHardware(m6Id).priceEur, customPrices);
  const slidePrice = slidePairs.reduce(
    (sum, group) => sum + group.pairs * unitPrice(slide.id, slide.priceEurPerPair, customPrices),
    0,
  );
  const accessoryPrice = geometry.accessories.reduce((sum, item) => {
    const part = getHardware(item.catalogId);
    return sum + unitPrice(item.catalogId, part.priceEur, customPrices);
  }, 0);
  const euroboxPrice = geometry.euroboxes.reduce(
    (sum, box) => sum + unitPrice(box.boxId, null, customPrices),
    0,
  );

  const panelWeight = panels.reduce((sum, group) => sum + group.weightKg, 0);
  const accessoryWeight = geometry.accessories.reduce((sum, item) => {
    return sum + (getHardware(item.catalogId).weightKg ?? 0);
  }, 0);

  return {
    profiles,
    profilePieceCount,
    netAluLengthMm,
    netAluWeightKg,
    panels,
    insideBrackets,
    cornerBrackets,
    clamps,
    footPlates,
    slidePairs,
    rotaryLatches,
    handles,
    hinges,
    magneticCatches,
    tNutsM5,
    tNutsM6,
    euroboxCount: geometry.euroboxes.length,
    accessoryCount: geometry.accessories.length,
    totalWeightKg: netAluWeightKg + panelWeight + accessoryWeight,
    totalPriceEur: profilePrice + panelPrice + hardwarePrice + slidePrice + accessoryPrice + euroboxPrice,
  };
}
