import { cabinetConfigSchema, type CabinetConfig } from '@/core/schema';

export const PRESET_IDS = [
  'golden_master_l1255',
  'camper_wardrobe_2bay',
  'workshop_heavy_40x40',
  'empty_1bay',
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

function pulloutsWithPairs(): CabinetConfig['bays'][number]['levels'] {
  return [0, 1, 2].map((index) => ({
    id: `pull-${index + 1}`,
    yMm: 200 + index * 350,
    type: 'pullout' as const,
    orientation: 'lengthwise' as const,
    boxLengthMm: 1200,
    boxWidthMm: 400,
    targetLoadKg: 80,
    openProgress: 0,
    boxes: [
      { id: `pull-${index + 1}-a`, boxId: 'GR-5' as const, withLid: false, xMm: 0, zMm: 0 },
      { id: `pull-${index + 1}-b`, boxId: 'GR-5' as const, withLid: false, xMm: 0, zMm: 600 },
    ],
  }));
}

const rawPresets: Record<PresetId, unknown> = {
  golden_master_l1255: {
    room: { clearWidthMm: 2000, heightMm: 1300, depthMm: 2000 },
    series: '30x30_B8',
    finish: 'silver',
    footType: 'clamp_both',
    depthMm: 2000,
    bays: [
      {
        id: 'bay-1',
        mode: 'eurobox',
        widthMm: 527,
        levels: pulloutsWithPairs(),
      },
    ],
    accessories: [],
  },
  camper_wardrobe_2bay: {
    room: {
      clearWidthMm: 1400,
      heightMm: 1100,
      depthMm: 700,
      doorOpening: { widthMm: 900, heightMm: 1000 },
    },
    series: '20x20_B6',
    finish: 'black',
    footType: 'clamp_both',
    depthMm: 600,
    bays: [
      {
        id: 'boxes',
        mode: 'eurobox',
        widthMm: 500,
        levels: [
          {
            id: 'box-low',
            yMm: 180,
            type: 'fixed_eurobox',
            boxLengthMm: 400,
            boxWidthMm: 300,
            boxes: [{ id: 'gr-low', boxId: 'GR-2', withLid: false, xMm: 0, zMm: 0 }],
          },
          {
            id: 'box-mid',
            yMm: 460,
            type: 'fixed_eurobox',
            boxLengthMm: 400,
            boxWidthMm: 300,
            boxes: [{ id: 'gr-mid', boxId: 'GR-1A', withLid: false, xMm: 0, zMm: 0 }],
          },
          {
            id: 'box-high',
            yMm: 720,
            type: 'fixed_eurobox',
            boxLengthMm: 400,
            boxWidthMm: 300,
            boxes: [{ id: 'gr-high', boxId: 'GR-1', withLid: true, xMm: 0, zMm: 0 }],
          },
        ],
      },
      {
        id: 'wardrobe',
        mode: 'cabinet',
        widthMm: 560,
        panels: {
          left: 'dibond_anthracite',
          right: 'dibond_anthracite',
          back: 'dibond_anthracite',
          top: 'none',
        },
        door: {
          enabled: true,
          type: 'right',
          material: 'dibond_anthracite',
          gapMm: 3,
          openAngleDeg: 0,
        },
        levels: [
          {
            id: 'rail',
            yMm: 900,
            type: 'clothes_rail',
            boxLengthMm: 500,
            boxWidthMm: 400,
          },
        ],
      },
    ],
    accessories: [],
  },
  workshop_heavy_40x40: {
    room: { clearWidthMm: 3200, heightMm: 2200, depthMm: 900 },
    series: '40x40_I8',
    finish: 'silver',
    footType: 'foot_plates',
    depthMm: 800,
    bays: [
      {
        id: 'heavy-left',
        mode: 'eurobox',
        widthMm: 1200,
        levels: [
          {
            id: 'riffle-left',
            yMm: 400,
            type: 'riffle_plate',
            boxLengthMm: 800,
            boxWidthMm: 1000,
            targetLoadKg: 130,
          },
          {
            id: 'slide-left',
            yMm: 1100,
            type: 'pullout',
            boxLengthMm: 800,
            boxWidthMm: 1000,
            slideLengthMm: 800,
            targetLoadKg: 136,
          },
        ],
      },
      {
        id: 'heavy-right',
        mode: 'eurobox',
        widthMm: 1200,
        levels: [
          {
            id: 'riffle-right',
            yMm: 400,
            type: 'riffle_plate',
            boxLengthMm: 800,
            boxWidthMm: 1000,
            targetLoadKg: 130,
          },
          {
            id: 'slide-right',
            yMm: 1100,
            type: 'pullout',
            boxLengthMm: 800,
            boxWidthMm: 1000,
            slideLengthMm: 800,
            targetLoadKg: 136,
          },
        ],
      },
    ],
    accessories: [],
  },
  empty_1bay: {
    room: { clearWidthMm: 2000, heightMm: 2000, depthMm: 800 },
    series: '30x30_B8',
    finish: 'silver',
    footType: 'clamp_both',
    depthMm: 800,
    bays: [
      {
        id: 'bay-1',
        mode: 'eurobox',
        widthMm: 655,
        levels: [],
      },
    ],
    accessories: [],
  },
};

export const PRESETS: Record<PresetId, CabinetConfig> = {
  golden_master_l1255: cabinetConfigSchema.parse(rawPresets.golden_master_l1255),
  camper_wardrobe_2bay: cabinetConfigSchema.parse(rawPresets.camper_wardrobe_2bay),
  workshop_heavy_40x40: cabinetConfigSchema.parse(rawPresets.workshop_heavy_40x40),
  empty_1bay: cabinetConfigSchema.parse(rawPresets.empty_1bay),
};

export const DEFAULT_PRESET_ID: PresetId = 'golden_master_l1255';
