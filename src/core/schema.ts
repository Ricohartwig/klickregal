import { z } from 'zod';
import { EUROBOX_IDS, PANEL_MATERIAL_IDS, PROFILE_SERIES_IDS } from './catalog';

export const profileSeriesIdSchema = z.enum(PROFILE_SERIES_IDS);
export const panelMaterialIdSchema = z.enum(PANEL_MATERIAL_IDS);
export const euroboxIdSchema = z.enum(EUROBOX_IDS);
export const finishSchema = z.enum(['silver', 'black']);
export const footTypeSchema = z.enum(['clamp_both', 'clamp_bottom', 'foot_plates']);
export const bayModeSchema = z.enum(['eurobox', 'cabinet']);
export const doorTypeSchema = z.enum(['left', 'right', 'double']);
export const levelTypeSchema = z.enum([
  'fixed_eurobox',
  'pullout',
  'solid_shelf',
  'riffle_plate',
  'clothes_rail',
]);
export const orientationSchema = z.enum(['lengthwise', 'crosswise']);
export const accessoryPositionSchema = z.enum(['left', 'right', 'front', 'back']);
export const accessoryTypeSchema = z.enum([
  'rotary_latch',
  'handle',
  'hinge_180',
  'magnetic_catch',
  'coat_hook',
  'clothes_rail',
  'lashing_eye',
  'eye_bolt',
  'safety_set_10',
  'safety_set_15',
  'safety_set_20',
]);

export const doorOpeningSchema = z.object({
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
});

export const roomSchema = z.object({
  clearWidthMm: z.number().positive(),
  heightMm: z.number().positive(),
  depthMm: z.number().positive(),
  doorOpening: doorOpeningSchema.optional(),
});

export const euroboxPlacementSchema = z.object({
  id: z.string().min(1),
  boxId: euroboxIdSchema,
  withLid: z.boolean().default(false),
  xMm: z.number().nonnegative().default(0),
  zMm: z.number().nonnegative().default(0),
});

export const levelSchema = z.object({
  id: z.string().min(1),
  yMm: z.number().nonnegative(),
  type: levelTypeSchema,
  orientation: orientationSchema.default('lengthwise'),
  boxLengthMm: z.number().positive(),
  boxWidthMm: z.number().positive(),
  slideLengthMm: z.number().positive().optional(),
  targetLoadKg: z.number().nonnegative().default(0),
  openProgress: z.number().min(0).max(1).default(0),
  boxes: z.array(euroboxPlacementSchema).default([]),
});

export const doorSchema = z.object({
  enabled: z.boolean().default(false),
  type: doorTypeSchema.default('left'),
  material: panelMaterialIdSchema.default('none'),
  gapMm: z.number().nonnegative().default(3),
  openAngleDeg: z.number().min(0).max(180).default(0),
});

export const bayPanelsSchema = z.object({
  left: panelMaterialIdSchema.default('none'),
  right: panelMaterialIdSchema.default('none'),
  back: panelMaterialIdSchema.default('none'),
  top: panelMaterialIdSchema.default('none'),
});

export const baySchema = z.object({
  id: z.string().min(1),
  mode: bayModeSchema,
  widthMm: z.number().positive(),
  slideClearancePerSideMm: z.number().nonnegative().optional(),
  panels: bayPanelsSchema.default({
    left: 'none',
    right: 'none',
    back: 'none',
    top: 'none',
  }),
  door: doorSchema.default({
    enabled: false,
    type: 'left',
    material: 'none',
    gapMm: 3,
    openAngleDeg: 0,
  }),
  levels: z.array(levelSchema).default([]),
});

export const cabinetAccessorySchema = z.object({
  id: z.string().min(1),
  type: accessoryTypeSchema,
  position: accessoryPositionSchema,
  yMm: z.number().nonnegative(),
});

export const cabinetConfigSchema = z.object({
  room: roomSchema,
  series: profileSeriesIdSchema,
  finish: finishSchema.default('silver'),
  footType: footTypeSchema,
  depthMm: z.number().positive(),
  bays: z.array(baySchema).min(1).max(5),
  accessories: z.array(cabinetAccessorySchema).default([]),
});

export type ProfileSeriesId = z.output<typeof profileSeriesIdSchema>;
export type PanelMaterialId = z.output<typeof panelMaterialIdSchema>;
export type EuroboxId = z.output<typeof euroboxIdSchema>;
export type Finish = z.output<typeof finishSchema>;
export type FootType = z.output<typeof footTypeSchema>;
export type BayMode = z.output<typeof bayModeSchema>;
export type DoorType = z.output<typeof doorTypeSchema>;
export type LevelType = z.output<typeof levelTypeSchema>;
export type Orientation = z.output<typeof orientationSchema>;
export type AccessoryPosition = z.output<typeof accessoryPositionSchema>;
export type AccessoryType = z.output<typeof accessoryTypeSchema>;
export type DoorOpening = z.output<typeof doorOpeningSchema>;
export type Room = z.output<typeof roomSchema>;
export type EuroboxPlacement = z.output<typeof euroboxPlacementSchema>;
export type Level = z.output<typeof levelSchema>;
export type Door = z.output<typeof doorSchema>;
export type BayPanels = z.output<typeof bayPanelsSchema>;
export type Bay = z.output<typeof baySchema>;
export type CabinetAccessory = z.output<typeof cabinetAccessorySchema>;
export type CabinetConfig = z.output<typeof cabinetConfigSchema>;
export type CabinetConfigInput = z.input<typeof cabinetConfigSchema>;
