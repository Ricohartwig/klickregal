import {
  defaultSlideClearancePerSideMm,
  euroboxHeightMm,
  getEdgingForSeries,
  getEurobox,
  getPanelMaterial,
  getProfileSeries,
  getSlideForSeries,
  requireHardware,
  type EuroboxId,
  type PanelMaterialId,
  type ProfileSeriesId,
} from './catalog';
import type {
  AccessoryType,
  Bay,
  CabinetAccessory,
  CabinetConfig,
  Finish,
  Level,
} from './schema';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type PartCode = 'Nr.1' | 'Nr.2' | 'Nr.3' | 'Nr.4' | 'Nr.5' | 'Korpus';

export interface ProfilePart {
  partCode: PartCode;
  position: Vec3;
  rotation: Vec3;
  lengthMm: number;
  series: ProfileSeriesId;
  finish: Finish;
  bayId: string | null;
  levelId: string | null;
  isMoving: boolean;
}

export type PanelRole = 'left' | 'right' | 'back' | 'top' | 'shelf' | 'riffle';

export interface PanelPart {
  id: string;
  role: PanelRole;
  materialId: string;
  position: Vec3;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  bayId: string;
  levelId: string | null;
}

export interface DoorPart {
  id: string;
  bayId: string;
  leaf: 'single' | 'left' | 'right';
  materialId: PanelMaterialId;
  position: Vec3;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  hingeSide: 'left' | 'right';
  openAngleDeg: number;
  gapMm: number;
}

export interface SlidePart {
  bayId: string;
  levelId: string;
  side: 'left' | 'right';
  position: Vec3;
  lengthMm: number;
  thicknessMm: number;
  heightMm: number;
  innerOverhangMm: number;
  outerOverhangMm: number;
  travelMm: number;
  axis: 'x' | 'z';
}

export type HardwareKind =
  | 'corner_bracket'
  | 'inside_bracket'
  | 'clamp'
  | 'foot_plate'
  | 'handle'
  | 'hinge'
  | 'magnetic_catch'
  | 'end_cap';

export interface HardwarePart {
  kind: HardwareKind;
  catalogId: string | null;
  /** Heel of a bracket, or the anchor point of any other fitting. */
  position: Vec3;
  bayId: string | null;
  levelId: string | null;
  isMoving: boolean;
  /** Unit direction of the first bracket arm. Absent on fittings that are not angles. */
  armU?: Vec3;
  /** Unit direction of the second bracket arm. */
  armV?: Vec3;
  /** Unit direction of the bracket thickness, pointing off the profile face. */
  normal?: Vec3;
}

export interface EuroboxInstance {
  id: string;
  bayId: string;
  levelId: string;
  boxId: EuroboxId;
  position: Vec3;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  isMoving: boolean;
}

export interface AccessoryInstance {
  id: string;
  type: AccessoryType;
  catalogId: string;
  position: Vec3;
}

export interface BoundingBox {
  widthMm: number;
  heightMm: number;
  depthMm: number;
}

export interface CabinetGeometryResult {
  profiles: ProfilePart[];
  panels: PanelPart[];
  doors: DoorPart[];
  slides: SlidePart[];
  hardware: HardwarePart[];
  euroboxes: EuroboxInstance[];
  accessories: AccessoryInstance[];
  boundingBox: BoundingBox;
}

const FALLTHROUGH_MM = 35;
const HINGE_PAIR_MAX_HEIGHT_MM = 1000;
const CLAMP_DISC_MM = 11;
const DEFAULT_CLAMP_MM = 50;

export function clampGaps(config: CabinetConfig): { bottomMm: number; topMm: number } {
  if (config.footType === 'foot_plates') {
    return { bottomMm: DEFAULT_CLAMP_MM, topMm: 0 };
  }
  const bottomMm = config.clampBottomMm ?? DEFAULT_CLAMP_MM;
  const topMm = config.footType === 'clamp_both' ? (config.clampTopMm ?? DEFAULT_CLAMP_MM) : 0;
  return { bottomMm, topMm };
}

export function postSpan(config: CabinetConfig): { startMm: number; lengthMm: number; topMm: number } {
  const { bottomMm, topMm } = clampGaps(config);
  const lengthMm = mm(Math.max(config.room.heightMm - bottomMm - topMm, getProfileSeries(config.series).sectionMm));
  return { startMm: bottomMm, lengthMm, topMm: mm(bottomMm + lengthMm) };
}

export function maxPulloutTravelMm(lengthMm: number, innerOverhangMm: number, outerOverhangMm: number): number {
  return Math.max(0, lengthMm - innerOverhangMm - outerOverhangMm);
}

function mm(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function postLength(config: CabinetConfig): number {
  return postSpan(config).lengthMm;
}

function crossBraceLength(config: CabinetConfig, bay: Bay, level: Level): number {
  const p = getProfileSeries(config.series).sectionMm;
  const slide = getSlideForSeries(config.series);
  const frameW = level.boxWidthMm - FALLTHROUGH_MM + 2 * p;
  return frameW + 2 * slide.thicknessMm + 2 * playPerSide(config.series, bay, level);
}

function bayCenterMm(config: CabinetConfig, bay: Bay): number {
  const p = getProfileSeries(config.series).sectionMm;
  const pullout = bay.levels.find((level) => level.type === 'pullout');
  if (pullout) {
    return crossBraceLength(config, bay, pullout) + p;
  }
  const framed = bay.levels.find(
    (level) =>
      level.type === 'fixed_eurobox' ||
      level.type === 'solid_shelf' ||
      level.type === 'riffle_plate',
  );
  if (framed) {
    return framed.boxWidthMm - FALLTHROUGH_MM + 3 * p;
  }
  return bay.widthMm;
}

function columnOuterLefts(config: CabinetConfig): number[] {
  const xs = [0];
  let x = 0;
  for (const bay of config.bays) {
    x += bayCenterMm(config, bay);
    xs.push(x);
  }
  return xs;
}

function structuralDepthMm(config: CabinetConfig): number {
  const p = getProfileSeries(config.series).sectionMm;
  let depth = 0;
  for (const bay of config.bays) {
    for (const level of bay.levels) {
      if (level.type === 'clothes_rail') {
        continue;
      }
      depth = Math.max(depth, level.boxLengthMm - FALLTHROUGH_MM + 2 * p);
    }
  }
  return depth > 0 ? depth : config.depthMm;
}

function compatibleHardwareId(series: ProfileSeriesId, id: string | null): string | null {
  if (!id) {
    return null;
  }
  try {
    return requireHardware(id, series).id;
  } catch {
    return null;
  }
}

function rotationForAxis(axis: 'x' | 'y' | 'z'): Vec3 {
  if (axis === 'y') {
    return { x: 0, y: 0, z: 90 };
  }
  if (axis === 'z') {
    return { x: 0, y: -90, z: 0 };
  }
  return { x: 0, y: 0, z: 0 };
}

function slideLengthFor(series: ProfileSeriesId, level: Level): number {
  const slide = getSlideForSeries(series);
  if (level.slideLengthMm !== undefined) {
    return level.slideLengthMm;
  }
  const fitting = slide.lengthsMm.filter((length) => length <= level.boxLengthMm);
  if (fitting.length > 0) {
    return fitting[fitting.length - 1] ?? slide.lengthsMm[0];
  }
  return slide.lengthsMm[0];
}

function playPerSide(series: ProfileSeriesId, bay: Bay, level: Level): number {
  if (bay.slideClearancePerSideMm !== undefined) {
    return bay.slideClearancePerSideMm;
  }
  return defaultSlideClearancePerSideMm(series, level.boxWidthMm);
}

function hingeCount(leafHeightMm: number): number {
  return leafHeightMm <= HINGE_PAIR_MAX_HEIGHT_MM ? 2 : 3;
}

function panelSpan(clearMm: number, insertionMm: number): number {
  return mm(clearMm + 2 * insertionMm - 2);
}

interface Build {
  profiles: ProfilePart[];
  panels: PanelPart[];
  doors: DoorPart[];
  slides: SlidePart[];
  hardware: HardwarePart[];
  euroboxes: EuroboxInstance[];
  accessories: AccessoryInstance[];
}

function addProfile(
  build: Build,
  config: CabinetConfig,
  part: Omit<ProfilePart, 'series' | 'finish' | 'lengthMm'> & { lengthMm: number },
): void {
  build.profiles.push({
    ...part,
    lengthMm: mm(part.lengthMm),
    series: config.series,
    finish: config.finish,
  });
}

function addSupportFrame(
  build: Build,
  config: CabinetConfig,
  bay: Bay,
  level: Level,
  frameX: number,
  frameY: number,
  frameZ: number,
  alongLength: 'x' | 'z',
): { frameW: number; frameD: number } {
  const p = getProfileSeries(config.series).sectionMm;
  const boxW = level.boxWidthMm;
  const boxL = level.boxLengthMm;
  const clearW = boxW - FALLTHROUGH_MM;
  const clearL = boxL - FALLTHROUGH_MM;
  const frameW = clearW + 2 * p;
  const frameD = clearL + 2 * p;
  const widthAxis = alongLength === 'z' ? 'x' : 'z';
  const lengthAxis = alongLength;

  const cross = (offsetAlongLength: number) => {
    const position = { x: frameX, y: frameY, z: frameZ };
    position[lengthAxis] += offsetAlongLength;
    addProfile(build, config, {
      partCode: 'Korpus',
      position,
      rotation: rotationForAxis(widthAxis),
      lengthMm: frameW,
      bayId: bay.id,
      levelId: level.id,
      isMoving: false,
    });
  };

  const longitudinal = (offsetAcross: number) => {
    const position = { x: frameX, y: frameY, z: frameZ };
    position[widthAxis] += offsetAcross;
    position[lengthAxis] += p;
    addProfile(build, config, {
      partCode: 'Korpus',
      position,
      rotation: rotationForAxis(lengthAxis),
      lengthMm: clearL,
      bayId: bay.id,
      levelId: level.id,
      isMoving: false,
    });
  };

  cross(0);
  cross(frameD - p);
  longitudinal(0);
  longitudinal(frameW - p);

  return { frameW: mm(frameW), frameD: mm(frameD) };
}

function addShelfPanel(
  build: Build,
  bay: Bay,
  level: Level,
  frameX: number,
  frameZ: number,
  frameW: number,
  frameD: number,
  alongLength: 'x' | 'z',
): void {
  const riffle = level.type === 'riffle_plate';
  const thickness = riffle ? 2.88 : getPanelMaterial('birch_plywood').thicknessMm;
  build.panels.push({
    id: `${level.id}-shelf`,
    role: riffle ? 'riffle' : 'shelf',
    materialId: riffle ? 'tread_plate_aluminium' : 'birch_plywood',
    position: { x: frameX, y: level.yMm, z: frameZ },
    widthMm: alongLength === 'z' ? frameW : frameD,
    heightMm: alongLength === 'z' ? frameD : frameW,
    thicknessMm: thickness,
    bayId: bay.id,
    levelId: level.id,
  });
}

function addPullout(
  build: Build,
  config: CabinetConfig,
  bay: Bay,
  level: Level,
  clearX: number,
  clearZ: number,
  clearW: number,
  clearD: number,
): { x: number; z: number } {
  const series = getProfileSeries(config.series);
  const p = series.sectionMm;
  const slide = getSlideForSeries(config.series);
  const boxL = level.boxLengthMm;
  const boxW = level.boxWidthMm;
  const l2 = boxL - FALLTHROUGH_MM + 2 * p;
  const l5 = boxW - FALLTHROUGH_MM;
  const frameW = l5 + 2 * p;
  const l3 = l2 - 2 * p - (config.series === '30x30_B8' && boxL >= 900 ? 5 : 0);
  const play = playPerSide(config.series, bay, level);
  const l4 = crossBraceLength(config, bay, level);
  const alongLength = level.orientation === 'crosswise' ? 'x' : 'z';
  const widthAxis = alongLength === 'z' ? 'x' : 'z';
  const clearOrigin = alongLength === 'z' ? clearX : clearZ;
  const clearSpan = alongLength === 'z' ? clearW : clearD;
  const lengthOrigin = alongLength === 'z' ? clearZ : clearX;
  const fixedOuter = l4 + 2 * p;
  const fixedStart = clearOrigin + (clearSpan - fixedOuter) / 2;
  const movingStart = fixedStart + p + play + slide.thicknessMm;
  const travel = level.openProgress * maxPulloutTravelMm(slideLengthFor(config.series, level), slide.innerOverhangMm, slide.outerOverhangMm);
  const yRail = level.yMm;

  const at = (across: number, along: number, moving: boolean): Vec3 => {
    const position = { x: 0, y: yRail, z: 0 };
    position[widthAxis] = fixedStart + across;
    position[alongLength] = lengthOrigin + along + (moving ? travel : 0);
    return position;
  };

  const movingAt = (acrossFromMoving: number, along: number): Vec3 => {
    const position = { x: 0, y: yRail, z: 0 };
    position[widthAxis] = movingStart + acrossFromMoving;
    position[alongLength] = lengthOrigin + along + travel;
    return position;
  };

  addProfile(build, config, {
    partCode: 'Nr.3',
    position: at(0, 0, false),
    rotation: rotationForAxis(alongLength),
    lengthMm: l3,
    bayId: bay.id,
    levelId: level.id,
    isMoving: false,
  });
  addProfile(build, config, {
    partCode: 'Nr.3',
    position: at(p + l4, 0, false),
    rotation: rotationForAxis(alongLength),
    lengthMm: l3,
    bayId: bay.id,
    levelId: level.id,
    isMoving: false,
  });

  addProfile(build, config, {
    partCode: 'Nr.2',
    position: movingAt(0, 0),
    rotation: rotationForAxis(alongLength),
    lengthMm: l2,
    bayId: bay.id,
    levelId: level.id,
    isMoving: true,
  });
  addProfile(build, config, {
    partCode: 'Nr.2',
    position: movingAt(frameW - p, 0),
    rotation: rotationForAxis(alongLength),
    lengthMm: l2,
    bayId: bay.id,
    levelId: level.id,
    isMoving: true,
  });
  addProfile(build, config, {
    partCode: 'Nr.5',
    position: movingAt(p, 0),
    rotation: rotationForAxis(widthAxis),
    lengthMm: l5,
    bayId: bay.id,
    levelId: level.id,
    isMoving: true,
  });
  addProfile(build, config, {
    partCode: 'Nr.5',
    position: movingAt(p, l2 - p),
    rotation: rotationForAxis(widthAxis),
    lengthMm: l5,
    bayId: bay.id,
    levelId: level.id,
    isMoving: true,
  });

  const chosen = slideLengthFor(config.series, level);
  for (const side of ['left', 'right'] as const) {
    const across = side === 'left' ? -slide.thicknessMm : frameW;
    build.slides.push({
      bayId: bay.id,
      levelId: level.id,
      side,
      position: movingAt(across, 0),
      lengthMm: chosen,
      thicknessMm: slide.thicknessMm,
      heightMm: slide.heightMm,
      innerOverhangMm: slide.innerOverhangMm,
      outerOverhangMm: slide.outerOverhangMm,
      travelMm: mm(travel),
      axis: alongLength,
    });
  }
  const outer = { x: 0, z: 0 };
  outer[widthAxis] = movingStart;
  outer[alongLength] = lengthOrigin;
  return outer;
}

function addSharedCrossBraces(
  build: Build,
  config: CabinetConfig,
  bay: Bay,
  clearX: number,
  clearZ: number,
  clearW: number,
  clearD: number,
): void {
  const level = bay.levels.find((entry) => entry.type === 'pullout');
  if (!level) {
    return;
  }
  const p = getProfileSeries(config.series).sectionMm;
  const slide = getSlideForSeries(config.series);
  const l4 = crossBraceLength(config, bay, level);
  const alongLength = level.orientation === 'crosswise' ? 'x' : 'z';
  const widthAxis = alongLength === 'z' ? 'x' : 'z';
  const clearOrigin = alongLength === 'z' ? clearX : clearZ;
  const clearSpan = alongLength === 'z' ? clearW : clearD;
  const lengthOrigin = alongLength === 'z' ? clearZ : clearX;
  const fixedStart = clearOrigin + (clearSpan - (l4 + 2 * p)) / 2;
  for (const y of [level.yMm - p, level.yMm + slide.heightMm]) {
    const position = { x: 0, y, z: 0 };
    position[widthAxis] = fixedStart + p;
    position[alongLength] = lengthOrigin;
    addProfile(build, config, {
      partCode: 'Nr.4',
      position,
      rotation: rotationForAxis(widthAxis),
      lengthMm: l4,
      bayId: bay.id,
      levelId: null,
      isMoving: false,
    });
  }
}

function placeBoxes(
  build: Build,
  bay: Bay,
  level: Level,
  originX: number,
  originZ: number,
  moving: boolean,
  travelX: number,
  travelZ: number,
  shelfY: number,
): void {
  for (const placement of level.boxes) {
    const box = getEurobox(placement.boxId);
    build.euroboxes.push({
      id: placement.id,
      bayId: bay.id,
      levelId: level.id,
      boxId: placement.boxId,
      position: {
        x: mm(originX + placement.xMm + travelX),
        y: shelfY,
        z: mm(originZ + placement.zMm + travelZ),
      },
      lengthMm: box.lengthMm,
      widthMm: box.widthMm,
      heightMm: euroboxHeightMm(box, placement.withLid),
      isMoving: moving,
    });
  }
}

function addLevel(
  build: Build,
  config: CabinetConfig,
  bay: Bay,
  level: Level,
  clearX: number,
  clearZ: number,
  clearW: number,
  clearD: number,
): void {
  const p = getProfileSeries(config.series).sectionMm;
  const alongLength = level.orientation === 'crosswise' ? 'x' : 'z';
  if (level.type === 'pullout') {
    const outer = addPullout(build, config, bay, level, clearX, clearZ, clearW, clearD);
    const slide = getSlideForSeries(config.series);
    const travel = level.openProgress * maxPulloutTravelMm(slideLengthFor(config.series, level), slide.innerOverhangMm, slide.outerOverhangMm);
    const inset = p - FALLTHROUGH_MM / 2;
    placeBoxes(
      build,
      bay,
      level,
      outer.x + inset,
      outer.z + inset,
      true,
      alongLength === 'x' ? travel : 0,
      alongLength === 'z' ? travel : 0,
      level.yMm + p,
    );
    return;
  }

  if (level.type === 'clothes_rail') {
    build.accessories.push({
      id: `${level.id}-clothes-rail`,
      type: 'clothes_rail',
      catalogId: 'clothes_rail',
      position: {
        x: mm(clearX + clearW / 2),
        y: level.yMm,
        z: mm(clearZ + clearD / 2),
      },
    });
    return;
  }

  const frameY = level.yMm - p;
  const frameX = alongLength === 'z' ? clearX + (clearW - (level.boxWidthMm - FALLTHROUGH_MM + 2 * p)) / 2 : clearX;
  const frameZ = alongLength === 'z' ? clearZ + (clearD - (level.boxLengthMm - FALLTHROUGH_MM + 2 * p)) / 2 : clearZ;
  const frame = addSupportFrame(build, config, bay, level, frameX, frameY, frameZ, alongLength);
  if (level.type === 'solid_shelf' || level.type === 'riffle_plate') {
    addShelfPanel(build, bay, level, frameX, frameZ, frame.frameW, frame.frameD, alongLength);
  }
  const inset = p - FALLTHROUGH_MM / 2;
  placeBoxes(build, bay, level, frameX + inset, frameZ + inset, false, 0, 0, level.yMm);
}

function addCarcass(
  build: Build,
  config: CabinetConfig,
  bay: Bay,
  bayIndex: number,
  columns: readonly number[],
  clearX: number,
  clearZ: number,
  clearW: number,
  clearD: number,
  postLen: number,
): void {
  const insertion = getEdgingForSeries(config.series).insertionDepthMm;
  const p = getProfileSeries(config.series).sectionMm;
  const materials = bay.panels;
  const height = panelSpan(postLen, insertion);
  const span = postSpan(config);
  const y = span.startMm - (insertion - 1);

  if (materials.left !== 'none') {
    const material = getPanelMaterial(materials.left);
    build.panels.push({
      id: `${bay.id}-left`,
      role: 'left',
      materialId: material.id,
      position: { x: columns[bayIndex] + p - material.thicknessMm, y, z: clearZ - (insertion - 1) },
      widthMm: panelSpan(clearD, insertion),
      heightMm: height,
      thicknessMm: material.thicknessMm,
      bayId: bay.id,
      levelId: null,
    });
  }
  if (materials.right !== 'none') {
    const material = getPanelMaterial(materials.right);
    build.panels.push({
      id: `${bay.id}-right`,
      role: 'right',
      materialId: material.id,
      position: { x: columns[bayIndex + 1], y, z: clearZ - (insertion - 1) },
      widthMm: panelSpan(clearD, insertion),
      heightMm: height,
      thicknessMm: material.thicknessMm,
      bayId: bay.id,
      levelId: null,
    });
  }
  if (materials.back !== 'none') {
    const material = getPanelMaterial(materials.back);
    build.panels.push({
      id: `${bay.id}-back`,
      role: 'back',
      materialId: material.id,
      position: { x: clearX - (insertion - 1), y, z: 0 },
      widthMm: panelSpan(clearW, insertion),
      heightMm: height,
      thicknessMm: material.thicknessMm,
      bayId: bay.id,
      levelId: null,
    });
  }
  if (materials.top !== 'none') {
    const material = getPanelMaterial(materials.top);
    build.panels.push({
      id: `${bay.id}-top`,
      role: 'top',
      materialId: material.id,
      position: {
        x: clearX - (insertion - 1),
        y: span.startMm + postLen - material.thicknessMm,
        z: clearZ - (insertion - 1),
      },
      widthMm: panelSpan(clearW, insertion),
      heightMm: panelSpan(clearD, insertion),
      thicknessMm: material.thicknessMm,
      bayId: bay.id,
      levelId: null,
    });
  }

  if (!bay.door.enabled) {
    return;
  }

  const gap = bay.door.gapMm;
  const clearH = postLen;
  const leafHeight = mm(clearH - 2 * gap);
  const leafWidth =
    bay.door.type === 'double' ? mm((clearW - 3 * gap) / 2) : mm(clearW - 2 * gap);
  const material = getPanelMaterial(bay.door.material);
  const leaves: Array<{ leaf: DoorPart['leaf']; hinge: 'left' | 'right'; x: number }> =
    bay.door.type === 'double'
      ? [
          { leaf: 'left', hinge: 'left', x: clearX + gap },
          { leaf: 'right', hinge: 'right', x: clearX + gap + leafWidth + gap },
        ]
      : [
          {
            leaf: 'single',
            hinge: bay.door.type === 'right' ? 'right' : 'left',
            x: clearX + gap,
          },
        ];

  for (const leaf of leaves) {
    build.doors.push({
      id: `${bay.id}-door-${leaf.leaf}`,
      bayId: bay.id,
      leaf: leaf.leaf,
      materialId: bay.door.material,
      position: {
        x: mm(leaf.x),
        y: span.startMm + gap,
        z: mm(config.depthMm - Math.max(material.thicknessMm, 1)),
      },
      widthMm: leafWidth,
      heightMm: leafHeight,
      thicknessMm: material.thicknessMm,
      hingeSide: leaf.hinge,
      openAngleDeg: bay.door.openAngleDeg,
      gapMm: gap,
    });
    const count = hingeCount(leafHeight);
    const inset = Math.min(80, leafHeight / 4);
    const ys =
      count === 2
        ? [inset, leafHeight - inset]
        : [inset, leafHeight / 2, leafHeight - inset];
    for (const hingeY of ys) {
      build.hardware.push({
        kind: 'hinge',
        catalogId: 'hinge_180_plastic',
        position: {
          x: leaf.hinge === 'left' ? leaf.x : leaf.x + leafWidth,
          y: span.startMm + gap + hingeY,
          z: config.depthMm,
        },
        bayId: bay.id,
        levelId: null,
        isMoving: false,
      });
    }
  }

  build.hardware.push({
    kind: 'magnetic_catch',
    catalogId: 'magnetic_catch',
    position: {
      x: bay.door.type === 'left' ? clearX + clearW - gap : clearX + clearW / 2,
      y: span.startMm + clearH / 2,
      z: config.depthMm,
    },
    bayId: bay.id,
    levelId: null,
    isMoving: false,
  });
  const handleLeaf = leaves[leaves.length - 1];
  if (handleLeaf) {
    build.hardware.push({
      kind: 'handle',
      catalogId: 'handle_plastic',
      position: {
        x: handleLeaf.x + leafWidth / 2,
        y: span.startMm + gap + leafHeight / 2,
        z: config.depthMm,
      },
      bayId: bay.id,
      levelId: null,
      isMoving: false,
    });
  }
}

function addPosts(
  build: Build,
  config: CabinetConfig,
  columns: readonly number[],
  postLen: number,
  depthMm: number,
): void {
  const p = getProfileSeries(config.series).sectionMm;
  const span = postSpan(config);
  const frontZ = depthMm - p;
  const series = getProfileSeries(config.series);
  const clampId = compatibleHardwareId(config.series, 'spannteller_m8x80');
  const footId = compatibleHardwareId(config.series, 'foot_plate_m8');
  const capId = compatibleHardwareId(config.series, series.endCapId);

  for (const x of columns) {
    for (const z of [0, frontZ]) {
      addProfile(build, config, {
        partCode: 'Nr.1',
        position: { x, y: span.startMm, z },
        rotation: rotationForAxis('y'),
        lengthMm: postLen,
        bayId: null,
        levelId: null,
        isMoving: false,
      });
      const center = { x: x + p / 2, y: span.startMm, z: z + p / 2 };
      if (config.footType === 'foot_plates') {
        build.hardware.push({
          kind: 'foot_plate',
          catalogId: footId,
          position: { ...center, y: span.startMm - 2.5 },
          bayId: null,
          levelId: null,
          isMoving: false,
        });
      } else {
        build.hardware.push({
          kind: 'clamp',
          catalogId: clampId,
          position: { ...center, y: 0 },
          bayId: null,
          levelId: null,
          isMoving: false,
        });
      }
      if (config.footType === 'clamp_both') {
        build.hardware.push({
          kind: 'clamp',
          catalogId: clampId,
          position: { ...center, y: config.room.heightMm },
          bayId: null,
          levelId: null,
          isMoving: false,
        });
      } else if (capId) {
        build.hardware.push({
          kind: 'end_cap',
          catalogId: capId,
          position: { ...center, y: span.startMm + postLen },
          bayId: null,
          levelId: null,
          isMoving: false,
        });
      }
    }
  }
}

function accessoryCatalogId(type: AccessoryType, series: ProfileSeriesId): string {
  if (type === 'eye_bolt') {
    return series === '20x20_B6' ? 'eye_bolt_m6' : 'eye_bolt_m8';
  }
  const ids: Record<Exclude<AccessoryType, 'eye_bolt'>, string> = {
    rotary_latch: 'rotary_latch_black',
    handle: 'handle_plastic',
    hinge_180: 'hinge_180_plastic',
    magnetic_catch: 'magnetic_catch',
    coat_hook: 'coat_hook_folding',
    clothes_rail: 'clothes_rail',
    lashing_eye: 'lashing_eye_folding',
    safety_set_10: 'safety_set_10',
    safety_set_15: 'safety_set_15',
    safety_set_20: 'safety_set_20',
  };
  return ids[type];
}

function addAccessory(
  build: Build,
  config: CabinetConfig,
  accessory: CabinetAccessory,
  outerWidth: number,
): void {
  const p = getProfileSeries(config.series).sectionMm;
  const catalogId = accessoryCatalogId(accessory.type, config.series);
  requireHardware(catalogId, config.series);
  const y = accessory.yMm;
  const midX = outerWidth / 2;
  const midZ = config.depthMm / 2;
  const position =
    accessory.position === 'left'
      ? { x: p / 2, y, z: midZ }
      : accessory.position === 'right'
        ? { x: outerWidth - p / 2, y, z: midZ }
        : accessory.position === 'back'
          ? { x: midX, y, z: p / 2 }
          : { x: midX, y, z: config.depthMm - p / 2 };
  build.accessories.push({
    id: accessory.id,
    type: accessory.type,
    catalogId,
    position,
  });
}

type AxisName = 'x' | 'y' | 'z';

const AXES: readonly AxisName[] = ['x', 'y', 'z'];
const JOINT_GAP_MM = 8;

interface ProfileBox {
  min: Vec3;
  max: Vec3;
  axis: AxisName;
  moving: boolean;
  bayId: string | null;
  levelId: string | null;
}

function axisName(rotation: Vec3): AxisName {
  if (Math.abs(rotation.z) === 90) {
    return 'y';
  }
  if (Math.abs(rotation.y) === 90) {
    return 'z';
  }
  return 'x';
}

function profileBox(part: ProfilePart, section: number): ProfileBox {
  const axis = axisName(part.rotation);
  const max = { ...part.position };
  max[axis] += part.lengthMm;
  for (const key of AXES) {
    if (key !== axis) {
      max[key] += section;
    }
  }
  return {
    min: { ...part.position },
    max,
    axis,
    moving: part.isMoving,
    bayId: part.bayId,
    levelId: part.levelId,
  };
}

function overlap1d(a0: number, a1: number, b0: number, b1: number): number {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

function unitOn(axis: AxisName, sign: number): Vec3 {
  return { x: axis === 'x' ? sign : 0, y: axis === 'y' ? sign : 0, z: axis === 'z' ? sign : 0 };
}

function coverage(box: ProfileBox, axis: AxisName, origin: number, sign: number, section: number): number {
  const slack = JOINT_GAP_MM;
  const reach =
    sign > 0
      ? origin < box.min[axis] - slack || origin > box.max[axis] + slack
        ? 0
        : Math.max(0, box.max[axis] - origin)
      : origin > box.max[axis] + slack || origin < box.min[axis] - slack
        ? 0
        : Math.max(0, origin - box.min[axis]);
  return Math.min(reach, section * 2);
}

function placeProfileJoints(build: Build, config: CabinetConfig): void {
  const series = getProfileSeries(config.series);
  const section = series.sectionMm;
  const cornerId = compatibleHardwareId(config.series, series.cornerBracketId);
  const insideId = compatibleHardwareId(config.series, series.insideBracketId);
  if (!cornerId && !insideId) {
    return;
  }
  const boxes = build.profiles.map((part) => profileBox(part, section));
  if (boxes.length === 0) {
    return;
  }
  const center = boxes.reduce(
    (sum, box) => ({
      x: sum.x + (box.min.x + box.max.x) / 2,
      y: sum.y + (box.min.y + box.max.y) / 2,
      z: sum.z + (box.min.z + box.max.z) / 2,
    }),
    { x: 0, y: 0, z: 0 },
  );
  center.x /= boxes.length;
  center.y /= boxes.length;
  center.z /= boxes.length;
  const seen = new Set<string>();

  const pushBracket = (
    kind: 'corner_bracket' | 'inside_bracket',
    catalogId: string,
    heel: Vec3,
    armU: Vec3,
    armV: Vec3,
    normal: Vec3,
    box: ProfileBox,
  ) => {
    const key = [
      kind,
      Math.round(heel.x),
      Math.round(heel.y),
      Math.round(heel.z),
      normal.x,
      normal.y,
      normal.z,
    ].join(':');
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    build.hardware.push({
      kind,
      catalogId,
      position: { x: mm(heel.x), y: mm(heel.y), z: mm(heel.z) },
      bayId: box.bayId,
      levelId: box.levelId,
      isMoving: box.moving,
      armU,
      armV,
      normal,
    });
  };

  const orient = (a: ProfileBox, b: ProfileBox, planeAxis: AxisName, planePos: number, sign: number) => {
    const free = AXES.filter((axis) => axis !== planeAxis);
    const heel: Vec3 = { x: planePos, y: planePos, z: planePos };
    const arms: Vec3[] = [];
    for (const axis of free) {
      const lo = Math.max(a.min[axis], b.min[axis]);
      const hi = Math.min(a.max[axis], b.max[axis]);
      if (hi < lo - JOINT_GAP_MM) {
        return;
      }
      const spanLo = Math.min(lo, hi);
      const spanHi = Math.max(lo, hi);
      let origin = spanLo;
      let sign = 1;
      if (spanHi - spanLo < section * 0.4) {
        const plus = coverage(a, axis, spanLo, 1, section) + coverage(b, axis, spanLo, 1, section);
        const minus = coverage(a, axis, spanHi, -1, section) + coverage(b, axis, spanHi, -1, section);
        if (minus > plus) {
          origin = spanHi;
          sign = -1;
        }
      }
      heel[axis] = origin;
      arms.push(unitOn(axis, sign));
    }
    const armU = arms[0];
    const armV = arms[1];
    if (!armU || !armV) {
      return;
    }
    const normal = unitOn(planeAxis, sign);
    const owner = a.levelId ? a : b;
    if (cornerId) {
      pushBracket('corner_bracket', cornerId, heel, armU, armV, normal, owner);
    }
    const frameCorner = a.axis !== 'y' && b.axis !== 'y';
    if (insideId && frameCorner) {
      const inset = section * 0.45;
      pushBracket(
        'inside_bracket',
        insideId,
        {
          x: heel.x + (armU.x + armV.x) * inset,
          y: heel.y + (armU.y + armV.y) * inset,
          z: heel.z + (armU.z + armV.z) * inset,
        },
        armU,
        armV,
        normal,
        owner,
      );
    }
  };

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (!a || !b || a.moving !== b.moving || a.axis === b.axis) {
        continue;
      }
      const planeAxis = AXES.find((axis) => axis !== a.axis && axis !== b.axis);
      if (!planeAxis) {
        continue;
      }
      let joined = false;
      for (const ender of [a, b]) {
        const other = ender === a ? b : a;
        const ends = [ender.min[ender.axis], ender.max[ender.axis]];
        const faces = [other.min[ender.axis], other.max[ender.axis]];
        for (const end of ends) {
          for (const face of faces) {
            if (Math.abs(end - face) > JOINT_GAP_MM) {
              continue;
            }
            const cross = AXES.filter((axis) => axis !== ender.axis);
            const overlaps = cross.map((axis) => overlap1d(ender.min[axis], ender.max[axis], other.min[axis], other.max[axis]));
            const touching = overlaps.every((value) => value > -1);
            const supported = overlaps.some((value) => value > section * 0.4);
            if (touching && supported) {
              joined = true;
            }
          }
        }
      }
      if (!joined) {
        continue;
      }
      const shared: Array<{ pos: number; sign: number }> = [];
      for (const sign of [-1, 1]) {
        const aPos = sign < 0 ? a.min[planeAxis] : a.max[planeAxis];
        const bPos = sign < 0 ? b.min[planeAxis] : b.max[planeAxis];
        if (Math.abs(aPos - bPos) <= 2) {
          shared.push({ pos: (aPos + bPos) / 2, sign });
        }
      }
      const vertical = planeAxis !== 'y' ? shared : [];
      const pool = vertical.length > 0 ? vertical : shared.filter((face) => face.sign < 0);
      let chosen = pool[0];
      let bestToward = -Infinity;
      for (const face of pool) {
        const toward = (center[planeAxis] - face.pos) * face.sign;
        if (toward > bestToward) {
          bestToward = toward;
          chosen = face;
        }
      }
      if (!chosen) {
        continue;
      }
      orient(a, b, planeAxis, chosen.pos, chosen.sign);
    }
  }
}

export function generateCabinetGeometry(config: CabinetConfig): CabinetGeometryResult {
  const series = getProfileSeries(config.series);
  const p = series.sectionMm;
  const columns = columnOuterLefts(config);
  const postLen = postLength(config);
  const depthMm = structuralDepthMm(config);
  const outerWidth = (columns[columns.length - 1] ?? 0) + p;
  const build: Build = {
    profiles: [],
    panels: [],
    doors: [],
    slides: [],
    hardware: [],
    euroboxes: [],
    accessories: [],
  };

  addPosts(build, config, columns, postLen, depthMm);

  config.bays.forEach((bay, index) => {
    const clearX = (columns[index] ?? 0) + p;
    const clearZ = p;
    const clearW = bayCenterMm(config, bay) - p;
    const clearD = depthMm - 2 * p;
    for (const level of bay.levels) {
      addLevel(build, config, bay, level, clearX, clearZ, clearW, clearD);
    }
    addSharedCrossBraces(build, config, bay, clearX, clearZ, clearW, clearD);
    addCarcass(build, config, bay, index, columns, clearX, clearZ, clearW, clearD, postLen);
  });

  for (const accessory of config.accessories) {
    addAccessory(build, config, accessory, outerWidth);
  }

  placeProfileJoints(build, config);

  return {
    ...build,
    boundingBox: {
      widthMm: mm(outerWidth),
      heightMm: config.room.heightMm,
      depthMm: mm(depthMm),
    },
  };
}
