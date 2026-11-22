/**
 * Referenzkatalog. Längen in mm, Massen in kg, Preise in EUR.
 * Zubehör darf nur über `compatibleSeries` an eine Profilserie.
 */

export const PROFILE_SERIES_IDS = ['20x20_B6', '30x30_B8', '40x40_I8'] as const;
export type ProfileSeriesId = (typeof PROFILE_SERIES_IDS)[number];

export const PANEL_MATERIAL_IDS = [
  'none',
  'dibond_anthracite',
  'birch_plywood',
  'acrylic_clear',
] as const;
export type PanelMaterialId = (typeof PANEL_MATERIAL_IDS)[number];

export const EUROBOX_IDS = [
  'GR-1',
  'GR-1A',
  'GR-2',
  'GR-3',
  'GR-4',
  'GR-5',
  'GR-6',
  'GR-7',
  'GR-8',
] as const;
export type EuroboxId = (typeof EUROBOX_IDS)[number];

export interface SlideSpec {
  id: string;
  name: string;
  loadKg: number;
  heightMm: number;
  thicknessMm: number;
  lengthsMm: readonly number[];
  screw: string;
  priceEurPerPair: number;
  innerOverhangMm: number;
  outerOverhangMm: number;
  compatibleSeries: readonly ProfileSeriesId[];
}

export interface EdgingSpec {
  id: string;
  name: string;
  slotLabel: '6B' | '8B' | '8I';
  panelMinMm: number;
  panelMaxMm: number;
  insertionDepthMm: number;
  priceEurPerM: number | null;
  compatibleSeries: readonly ProfileSeriesId[];
}

export interface HardwareItem {
  id: string;
  name: string;
  priceEur: number | null;
  weightKg: number | null;
  compatibleSeries: readonly ProfileSeriesId[];
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  thicknessMm?: number;
  diameterMm?: number;
  holeSpacingMm?: number;
  axialLoadKg?: number;
  includesFasteners?: string;
}

export interface ProfileSeries {
  id: ProfileSeriesId;
  label: string;
  sectionMm: number;
  slotWidthMm: number;
  slotType: 'B' | 'I';
  slotDepthMm: number | null;
  coreHoleMm: number | null;
  connection: 'M6' | 'M8';
  weightKgPerM: number;
  ixCm4: number;
  wxCm3: number;
  priceEurPerM: number;
  slideId: string;
  insideBracketId: string | null;
  cornerBracketId: string | null;
  edgingId: string;
  endCapId: string;
}

export interface PanelMaterial {
  id: PanelMaterialId;
  label: string;
  thicknessMm: number;
  priceEurPerM2: number;
  weightKgPerM2: number;
}

export interface EuroboxSpec {
  id: EuroboxId;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  lidExtraMm: number;
}

const ALL_SERIES: readonly ProfileSeriesId[] = PROFILE_SERIES_IDS;
const M8_SERIES: readonly ProfileSeriesId[] = ['30x30_B8', '40x40_I8'];

export const SLIDES: readonly SlideSpec[] = [
  {
    id: 'slide_50kg',
    name: 'Teleskopschiene 50 kg',
    loadKg: 50,
    heightMm: 45,
    thicknessMm: 12.7,
    lengthsMm: [400, 600],
    screw: 'M5x6 Linsenkopf',
    priceEurPerPair: 35.55,
    innerOverhangMm: 17,
    outerOverhangMm: 20,
    compatibleSeries: ['20x20_B6'],
  },
  {
    id: 'slide_136kg',
    name: 'Schwerlastschiene 136 kg',
    loadKg: 136,
    heightMm: 53,
    thicknessMm: 19,
    lengthsMm: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500],
    screw: 'M5x12 Senkkopf',
    priceEurPerPair: 43.39,
    innerOverhangMm: 17,
    outerOverhangMm: 30,
    compatibleSeries: ['30x30_B8', '40x40_I8'],
  },
];

export const EDGING: readonly EdgingSpec[] = [
  {
    id: 'edging_6b',
    name: 'Einfassprofil Nut 6B',
    slotLabel: '6B',
    panelMinMm: 2,
    panelMaxMm: 4,
    insertionDepthMm: 4,
    priceEurPerM: null,
    compatibleSeries: ['20x20_B6'],
  },
  {
    id: 'edging_8b',
    name: 'Einfassprofil Nut 8B',
    slotLabel: '8B',
    panelMinMm: 2,
    panelMaxMm: 5,
    insertionDepthMm: 6,
    priceEurPerM: null,
    compatibleSeries: ['30x30_B8'],
  },
  {
    id: 'edging_8i',
    name: 'Einfassprofil Nut 8I',
    slotLabel: '8I',
    panelMinMm: 4,
    panelMaxMm: 6,
    insertionDepthMm: 7,
    priceEurPerM: null,
    compatibleSeries: ['40x40_I8'],
  },
];

export const HARDWARE: readonly HardwareItem[] = [
  {
    id: 'inside_bracket_slot6',
    name: 'Innenwinkel Nut 6',
    priceEur: 2.44,
    weightKg: null,
    compatibleSeries: ['20x20_B6'],
  },
  {
    id: 'inside_bracket_slot8',
    name: 'Innenwinkel Nut 8',
    priceEur: 2.44,
    weightKg: null,
    compatibleSeries: ['30x30_B8'],
  },
  {
    id: 'corner_bracket_20',
    name: 'Eckwinkel 20x20',
    priceEur: 2.94,
    weightKg: null,
    compatibleSeries: ['20x20_B6'],
    includesFasteners: '2x Nutenstein M6 und Schrauben',
  },
  {
    id: 'corner_bracket_30',
    name: 'Eckwinkel 30x30',
    priceEur: 2.94,
    weightKg: null,
    compatibleSeries: ['30x30_B8'],
    includesFasteners: '2x Nutenstein M6 und Schrauben',
  },
  {
    id: 'corner_bracket_40',
    name: 'Eckwinkel 40x40',
    priceEur: 8.48,
    weightKg: 0.06,
    compatibleSeries: ['40x40_I8'],
    includesFasteners: 'Schrauben und Nutensteine',
  },
  {
    id: 'spannteller_m8x80',
    name: 'Spannteller M8x80 rutschhemmend',
    priceEur: 5.32,
    weightKg: null,
    compatibleSeries: M8_SERIES,
    diameterMm: 48,
    heightMm: 11,
    axialLoadKg: 400,
  },
  {
    id: 'foot_plate_m8',
    name: 'Fußplatte M8',
    priceEur: 6.94,
    weightKg: null,
    compatibleSeries: M8_SERIES,
    lengthMm: 65,
    widthMm: 65,
    thicknessMm: 2.5,
  },
  {
    id: 'rotary_latch_black',
    name: 'Drehriegel Druckguss schwarz',
    priceEur: 19.9,
    weightKg: null,
    compatibleSeries: ALL_SERIES,
    includesFasteners: 'benötigt 2x Nutenstein M5 und Senkkopf M5x20/25',
  },
  {
    id: 'handle_plastic',
    name: 'Kunststoffgriff Nut 6/8',
    priceEur: 5.9,
    weightKg: null,
    compatibleSeries: ALL_SERIES,
    lengthMm: 138,
    widthMm: 25,
    heightMm: 40,
    holeSpacingMm: 116,
    includesFasteners: 'benötigt 2x Nutenstein M6',
  },
  {
    id: 'hinge_180_plastic',
    name: 'Anschraubscharnier 180° Kunststoff',
    priceEur: 8.1,
    weightKg: null,
    compatibleSeries: ALL_SERIES,
    lengthMm: 65,
    widthMm: 40,
    thicknessMm: 5,
    includesFasteners: 'M5',
  },
  {
    id: 'magnetic_catch',
    name: 'Magnetschnäpper Nut 8/6',
    priceEur: 2.99,
    weightKg: null,
    compatibleSeries: ALL_SERIES,
  },
  {
    id: 'coat_hook_folding',
    name: 'Klapp-Garderobenhaken',
    priceEur: 29.95,
    weightKg: 0.27,
    compatibleSeries: ALL_SERIES,
    lengthMm: 308,
    widthMm: 28,
    heightMm: 137,
  },
  {
    id: 'clothes_rail',
    name: 'Kleiderstange / Wäscheauszug',
    priceEur: 55.3,
    weightKg: null,
    compatibleSeries: ALL_SERIES,
  },
  {
    id: 'end_cap_20',
    name: 'Endkappe 20x20',
    priceEur: null,
    weightKg: null,
    compatibleSeries: ['20x20_B6'],
  },
  {
    id: 'end_cap_30',
    name: 'Endkappe 30x30',
    priceEur: 0.62,
    weightKg: 0.005,
    compatibleSeries: ['30x30_B8'],
  },
  {
    id: 'end_cap_40',
    name: 'Endkappe 40x40',
    priceEur: 0.69,
    weightKg: 0.006,
    compatibleSeries: ['40x40_I8'],
  },
  {
    id: 't_nut_m5_b6',
    name: 'Nutenstein M5 Nut 6',
    priceEur: null,
    weightKg: null,
    compatibleSeries: ['20x20_B6'],
  },
  {
    id: 't_nut_m6_b6',
    name: 'Nutenstein M6 Nut 6',
    priceEur: null,
    weightKg: null,
    compatibleSeries: ['20x20_B6'],
  },
  {
    id: 't_nut_m5_b8',
    name: 'Nutenstein M5 Nut 8 B-Typ',
    priceEur: 0.89,
    weightKg: null,
    compatibleSeries: ['30x30_B8'],
  },
  {
    id: 't_nut_m6_b8',
    name: 'Nutenstein M6 Nut 8 B-Typ',
    priceEur: 0.59,
    weightKg: null,
    compatibleSeries: ['30x30_B8'],
  },
  {
    id: 't_nut_m5_i8',
    name: 'Nutenstein M5 Nut 8 I-Typ',
    priceEur: null,
    weightKg: null,
    compatibleSeries: ['40x40_I8'],
  },
  {
    id: 't_nut_m6_i8',
    name: 'Nutenstein M6 Nut 8 I-Typ',
    priceEur: null,
    weightKg: null,
    compatibleSeries: ['40x40_I8'],
  },
  {
    id: 'lashing_eye_folding',
    name: 'Klappbare Zurröse',
    priceEur: null,
    weightKg: null,
    compatibleSeries: ALL_SERIES,
  },
  {
    id: 'eye_bolt_m6',
    name: 'Ringschraube M6',
    priceEur: null,
    weightKg: null,
    compatibleSeries: ['20x20_B6'],
  },
  {
    id: 'eye_bolt_m8',
    name: 'Ringschraube M8',
    priceEur: null,
    weightKg: null,
    compatibleSeries: M8_SERIES,
  },
  {
    id: 'safety_set_10',
    name: 'Absturzsicherung 10 cm',
    priceEur: null,
    weightKg: null,
    compatibleSeries: ALL_SERIES,
    lengthMm: 100,
  },
  {
    id: 'safety_set_15',
    name: 'Absturzsicherung 15 cm',
    priceEur: null,
    weightKg: null,
    compatibleSeries: ALL_SERIES,
    lengthMm: 150,
  },
  {
    id: 'safety_set_20',
    name: 'Absturzsicherung 20 cm',
    priceEur: null,
    weightKg: null,
    compatibleSeries: ALL_SERIES,
    lengthMm: 200,
  },
];

export const PROFILE_SERIES: Readonly<Record<ProfileSeriesId, ProfileSeries>> = {
  '20x20_B6': {
    id: '20x20_B6',
    label: '20x20 B-Typ Nut 6',
    sectionMm: 20,
    slotWidthMm: 6,
    slotType: 'B',
    slotDepthMm: null,
    coreHoleMm: 5.5,
    connection: 'M6',
    weightKgPerM: 0.461,
    ixCm4: 0.71,
    wxCm3: 0.71,
    priceEurPerM: 7.9,
    slideId: 'slide_50kg',
    insideBracketId: 'inside_bracket_slot6',
    cornerBracketId: 'corner_bracket_20',
    edgingId: 'edging_6b',
    endCapId: 'end_cap_20',
  },
  '30x30_B8': {
    id: '30x30_B8',
    label: '30x30 B-Typ Nut 8',
    sectionMm: 30,
    slotWidthMm: 8,
    slotType: 'B',
    slotDepthMm: 9,
    coreHoleMm: 6.8,
    connection: 'M8',
    weightKgPerM: 0.87,
    ixCm4: 2.7,
    wxCm3: 1.79,
    priceEurPerM: 11.9,
    slideId: 'slide_136kg',
    insideBracketId: 'inside_bracket_slot8',
    cornerBracketId: 'corner_bracket_30',
    edgingId: 'edging_8b',
    endCapId: 'end_cap_30',
  },
  '40x40_I8': {
    id: '40x40_I8',
    label: '40x40 I-Typ Nut 8',
    sectionMm: 40,
    slotWidthMm: 8,
    slotType: 'I',
    slotDepthMm: 10,
    coreHoleMm: null,
    connection: 'M8',
    weightKgPerM: 1.74,
    ixCm4: 9,
    wxCm3: 4.5,
    priceEurPerM: 18.9,
    slideId: 'slide_136kg',
    insideBracketId: null,
    cornerBracketId: 'corner_bracket_40',
    edgingId: 'edging_8i',
    endCapId: 'end_cap_40',
  },
};

export const PANEL_MATERIALS: Readonly<Record<PanelMaterialId, PanelMaterial>> = {
  none: {
    id: 'none',
    label: 'offen',
    thicknessMm: 0,
    priceEurPerM2: 0,
    weightKgPerM2: 0,
  },
  dibond_anthracite: {
    id: 'dibond_anthracite',
    label: 'Aluverbund anthrazit',
    thicknessMm: 3,
    priceEurPerM2: 63.7,
    weightKgPerM2: 3.8,
  },
  birch_plywood: {
    id: 'birch_plywood',
    label: 'Birkenmultiplex',
    thicknessMm: 4,
    priceEurPerM2: 30.99,
    weightKgPerM2: 2.76,
  },
  acrylic_clear: {
    id: 'acrylic_clear',
    label: 'Acryl klar',
    thicknessMm: 4,
    priceEurPerM2: 48,
    weightKgPerM2: 4.76,
  },
};

export const TREAD_PLATE = {
  id: 'tread_plate_aluminium',
  name: 'Alu-Riffelblechboden',
  thicknessMm: 2.88,
  priceEurPerM2: 52.23,
  weightKgPerM2: 7.8,
  compatibleSeries: ALL_SERIES,
} as const;

export const EUROBOXES: Readonly<Record<EuroboxId, EuroboxSpec>> = {
  'GR-1': { id: 'GR-1', lengthMm: 400, widthMm: 300, heightMm: 120, lidExtraMm: 15 },
  'GR-1A': { id: 'GR-1A', lengthMm: 400, widthMm: 300, heightMm: 170, lidExtraMm: 15 },
  'GR-2': { id: 'GR-2', lengthMm: 400, widthMm: 300, heightMm: 220, lidExtraMm: 15 },
  'GR-3': { id: 'GR-3', lengthMm: 400, widthMm: 300, heightMm: 320, lidExtraMm: 15 },
  'GR-4': { id: 'GR-4', lengthMm: 600, widthMm: 400, heightMm: 170, lidExtraMm: 15 },
  'GR-5': { id: 'GR-5', lengthMm: 600, widthMm: 400, heightMm: 220, lidExtraMm: 15 },
  'GR-6': { id: 'GR-6', lengthMm: 600, widthMm: 400, heightMm: 320, lidExtraMm: 15 },
  'GR-7': { id: 'GR-7', lengthMm: 1200, widthMm: 400, heightMm: 120, lidExtraMm: 15 },
  'GR-8': { id: 'GR-8', lengthMm: 1200, widthMm: 400, heightMm: 230, lidExtraMm: 15 },
};

/** Boxbreite bis zu diesem Maß gilt als klein und nutzt 1,0 mm Seitenspiel. */
export const SMALL_BOX_WIDTH_MM = 300;

export const SLIDE_CLEARANCE_PER_SIDE_MM: Readonly<Record<ProfileSeriesId, number>> = {
  '20x20_B6': 2.3,
  '30x30_B8': 2.0,
  '40x40_I8': 2.0,
};

const SMALL_CLEARANCE_MM = 1;

function indexById<T extends { id: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.id)) {
      throw new Error(`Doppelte Katalog-ID: ${item.id}`);
    }
    map.set(item.id, item);
  }
  return map;
}

const SLIDE_BY_ID = indexById(SLIDES);
const EDGING_BY_ID = indexById(EDGING);
const HARDWARE_BY_ID = indexById(HARDWARE);

function includesSeries(seriesList: readonly ProfileSeriesId[], series: ProfileSeriesId): boolean {
  return seriesList.includes(series);
}

export function getProfileSeries(id: ProfileSeriesId): ProfileSeries {
  return PROFILE_SERIES[id];
}

export function getSlide(id: string): SlideSpec {
  const slide = SLIDE_BY_ID.get(id);
  if (!slide) {
    throw new Error(`Unbekannte Schiene: ${id}`);
  }
  return slide;
}

export function getSlideForSeries(series: ProfileSeriesId): SlideSpec {
  const slide = getSlide(getProfileSeries(series).slideId);
  if (!includesSeries(slide.compatibleSeries, series)) {
    throw new Error(`Schiene ${slide.id} ist nicht mit ${series} kompatibel`);
  }
  return slide;
}

export function getEdging(id: string): EdgingSpec {
  const edging = EDGING_BY_ID.get(id);
  if (!edging) {
    throw new Error(`Unbekanntes Einfassprofil: ${id}`);
  }
  return edging;
}

export function getEdgingForSeries(series: ProfileSeriesId): EdgingSpec {
  const edging = getEdging(getProfileSeries(series).edgingId);
  if (!includesSeries(edging.compatibleSeries, series)) {
    throw new Error(`Einfassprofil ${edging.id} ist nicht mit ${series} kompatibel`);
  }
  return edging;
}

export function getHardware(id: string): HardwareItem {
  const item = HARDWARE_BY_ID.get(id);
  if (!item) {
    throw new Error(`Unbekanntes Zubehör: ${id}`);
  }
  return item;
}

export function requireHardware(id: string, series: ProfileSeriesId): HardwareItem {
  const item = getHardware(id);
  if (!includesSeries(item.compatibleSeries, series)) {
    throw new Error(`Zubehör ${id} ist nicht mit ${series} kompatibel`);
  }
  return item;
}

export function hardwareForSeries(series: ProfileSeriesId): HardwareItem[] {
  return HARDWARE.filter((item) => includesSeries(item.compatibleSeries, series));
}

export function getPanelMaterial(id: PanelMaterialId): PanelMaterial {
  return PANEL_MATERIALS[id];
}

export function getEurobox(id: EuroboxId): EuroboxSpec {
  return EUROBOXES[id];
}

export function euroboxHeightMm(box: EuroboxSpec, withLid: boolean): number {
  return box.heightMm + (withLid ? box.lidExtraMm : 0);
}

export function defaultSlideClearancePerSideMm(
  series: ProfileSeriesId,
  boxWidthMm: number,
): number {
  if (boxWidthMm <= SMALL_BOX_WIDTH_MM) {
    return SMALL_CLEARANCE_MM;
  }
  return SLIDE_CLEARANCE_PER_SIDE_MM[series];
}

function assertSeriesParts(): void {
  for (const series of PROFILE_SERIES_IDS) {
    getSlideForSeries(series);
    getEdgingForSeries(series);
    const profile = getProfileSeries(series);
    if (profile.insideBracketId) {
      requireHardware(profile.insideBracketId, series);
    }
    if (profile.cornerBracketId) {
      requireHardware(profile.cornerBracketId, series);
    }
    requireHardware(profile.endCapId, series);
  }
}

assertSeriesParts();
