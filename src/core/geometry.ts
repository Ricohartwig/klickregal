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
  position: Vec3;
  bayId: string | null;
  levelId: string | null;
  isMoving: boolean;
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

const POST_CLEARANCE_MM = 50;
const FALLTHROUGH_MM = 35;
const HINGE_PAIR_MAX_HEIGHT_MM = 1000;

function mm(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function postLength(config: CabinetConfig): number {
  if (config.footType === 'clamp_both') {
    return mm(config.room.heightMm - 100);
  }
  return mm(config.room.heightMm - 50);
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

  const series = getProfileSeries(config.series);
  const cornerId = compatibleHardwareId(config.series, series.cornerBracketId);
  const insideId = compatibleHardwareId(config.series, series.insideBracketId);
  for (const across of [0, frameW]) {
    for (const along of [0, frameD]) {
      const position = { x: frameX, y: frameY, z: frameZ };
      position[widthAxis] += across;
      position[lengthAxis] += along;
      if (cornerId) {
        build.hardware.push({
          kind: 'corner_bracket',
          catalogId: cornerId,
          position,
          bayId: bay.id,
          levelId: level.id,
          isMoving: false,
        });
      }
      if (insideId) {
        build.hardware.push({
          kind: 'inside_bracket',
          catalogId: insideId,
          position: {
            x: position.x + (across === 0 ? p : -p),
            y: position.y,
            z: position.z + (along === 0 ? p : -p),
          },
          bayId: bay.id,
          levelId: level.id,
          isMoving: false,
        });
      }
    }
  }

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
  const travel = level.openProgress * slideLengthFor(config.series, level);
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

  const cornerId = compatibleHardwareId(config.series, series.cornerBracketId);
  const insideId = compatibleHardwareId(config.series, series.insideBracketId);
  if (cornerId) {
    for (const across of [0, p + l4]) {
      for (const along of [0, l3]) {
        build.hardware.push({
          kind: 'corner_bracket',
          catalogId: cornerId,
          position: at(across, along, false),
          bayId: bay.id,
          levelId: level.id,
          isMoving: false,
        });
      }
    }
  }
  if (insideId) {
    for (const across of [0, frameW - p]) {
      for (const along of [0, l2 - p]) {
        build.hardware.push({
          kind: 'inside_bracket',
          catalogId: insideId,
          position: movingAt(across, along),
          bayId: bay.id,
          levelId: level.id,
          isMoving: true,
        });
      }
    }
  }

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
    const travel = level.openProgress * slideLengthFor(config.series, level);
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
  const y = POST_CLEARANCE_MM - (insertion - 1);

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
        y: POST_CLEARANCE_MM + postLen - material.thicknessMm,
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
        y: POST_CLEARANCE_MM + gap,
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
          y: POST_CLEARANCE_MM + gap + hingeY,
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
      y: POST_CLEARANCE_MM + clearH / 2,
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
        y: POST_CLEARANCE_MM + gap + leafHeight / 2,
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
  const frontZ = depthMm - p;
  const series = getProfileSeries(config.series);
  const clampId = compatibleHardwareId(config.series, 'spannteller_m8x80');
  const footId = compatibleHardwareId(config.series, 'foot_plate_m8');
  const capId = compatibleHardwareId(config.series, series.endCapId);

  for (const x of columns) {
    for (const z of [0, frontZ]) {
      addProfile(build, config, {
        partCode: 'Nr.1',
        position: { x, y: POST_CLEARANCE_MM, z },
        rotation: rotationForAxis('y'),
        lengthMm: postLen,
        bayId: null,
        levelId: null,
        isMoving: false,
      });
      const center = { x: x + p / 2, y: POST_CLEARANCE_MM, z: z + p / 2 };
      if (config.footType === 'foot_plates') {
        build.hardware.push({
          kind: 'foot_plate',
          catalogId: footId,
          position: { ...center, y: POST_CLEARANCE_MM - 2.5 },
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
          position: { ...center, y: POST_CLEARANCE_MM + postLen },
          bayId: null,
          levelId: null,
          isMoving: false,
        });
      } else if (capId) {
        build.hardware.push({
          kind: 'end_cap',
          catalogId: capId,
          position: { ...center, y: POST_CLEARANCE_MM + postLen },
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

  return {
    ...build,
    boundingBox: {
      widthMm: mm(outerWidth),
      heightMm: config.room.heightMm,
      depthMm: mm(depthMm),
    },
  };
}
