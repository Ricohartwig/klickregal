import { getEurobox, getProfileSeries } from './catalog';
import type { CabinetGeometryResult } from './geometry';
import type { CabinetConfig, Level } from './schema';

export type CollisionSeverity = 'error' | 'warning';

export type CollisionCode =
  | 'room_width'
  | 'room_height'
  | 'room_depth'
  | 'door_width'
  | 'door_height'
  | 'eurobox_clearance'
  | 'slide_depth'
  | 'level_overlap';

export interface CollisionIssue {
  code: CollisionCode;
  severity: CollisionSeverity;
  message: string;
  bayId?: string;
  levelId?: string;
  boxId?: string;
  availableMm?: number;
  requiredMm?: number;
}

const GRIP_MM = 15;
const LEVEL_GAP_MM = 20;
const POST_CLEARANCE_MM = 50;

function postTopMm(config: CabinetConfig): number {
  const length =
    config.footType === 'clamp_both' ? config.room.heightMm - 100 : config.room.heightMm - 50;
  return POST_CLEARANCE_MM + length;
}

function issue(
  code: CollisionCode,
  severity: CollisionSeverity,
  message: string,
  details: Partial<Pick<CollisionIssue, 'bayId' | 'levelId' | 'boxId' | 'availableMm' | 'requiredMm'>> = {},
): CollisionIssue {
  return { code, severity, message, ...details };
}

function checkRoom(config: CabinetConfig, geometry: CabinetGeometryResult): CollisionIssue[] {
  const box = geometry.boundingBox;
  const room = config.room;
  const found: CollisionIssue[] = [];

  if (box.widthMm > room.clearWidthMm) {
    found.push(
      issue(
        'room_width',
        'error',
        `Schrankbreite ${box.widthMm} mm überschreitet die lichte Raumbreite ${room.clearWidthMm} mm.`,
        { availableMm: room.clearWidthMm, requiredMm: box.widthMm },
      ),
    );
  }
  if (box.heightMm > room.heightMm) {
    found.push(
      issue(
        'room_height',
        'error',
        `Schrankhöhe ${box.heightMm} mm überschreitet die Raumhöhe ${room.heightMm} mm.`,
        { availableMm: room.heightMm, requiredMm: box.heightMm },
      ),
    );
  }
  if (box.depthMm > room.depthMm) {
    found.push(
      issue(
        'room_depth',
        'error',
        `Schranktiefe ${box.depthMm} mm überschreitet die Raumtiefe ${room.depthMm} mm.`,
        { availableMm: room.depthMm, requiredMm: box.depthMm },
      ),
    );
  }

  const opening = room.doorOpening;
  if (!opening) {
    return found;
  }

  const heightLimit = Math.min(room.heightMm, opening.heightMm);
  if (box.widthMm > opening.widthMm) {
    found.push(
      issue(
        'door_width',
        'error',
        `Schrankbreite ${box.widthMm} mm passt nicht durch die Türöffnung ${opening.widthMm} mm.`,
        { availableMm: opening.widthMm, requiredMm: box.widthMm },
      ),
    );
  }
  if (box.heightMm > heightLimit) {
    found.push(
      issue(
        'door_height',
        'error',
        `Schrankhöhe ${box.heightMm} mm passt nicht durch die Einfahrhöhe ${heightLimit} mm.`,
        { availableMm: heightLimit, requiredMm: box.heightMm },
      ),
    );
  }
  return found;
}

function checkLevelOverlap(config: CabinetConfig): CollisionIssue[] {
  const p = getProfileSeries(config.series).sectionMm;
  const minimumGap = p + LEVEL_GAP_MM;
  const found: CollisionIssue[] = [];

  for (const bay of config.bays) {
    const levels = [...bay.levels].sort((a, b) => a.yMm - b.yMm);
    for (let index = 1; index < levels.length; index += 1) {
      const lower = levels[index - 1];
      const upper = levels[index];
      if (!lower || !upper) {
        continue;
      }
      const gap = Math.abs(upper.yMm - lower.yMm);
      if (gap < minimumGap) {
        found.push(
          issue(
            'level_overlap',
            'error',
            `Ebenen ${lower.id} und ${upper.id} überlappen: Abstand ${gap} mm, mindestens ${minimumGap} mm.`,
            {
              bayId: bay.id,
              levelId: lower.id,
              availableMm: gap,
              requiredMm: minimumGap,
            },
          ),
        );
      }
    }
  }
  return found;
}

function clearanceAbove(config: CabinetConfig, levels: readonly Level[], index: number): number {
  const current = levels[index];
  const next = levels[index + 1];
  const p = getProfileSeries(config.series).sectionMm;
  if (!current) {
    return 0;
  }
  if (next) {
    return next.yMm - p - current.yMm;
  }
  return postTopMm(config) - p - current.yMm;
}

function checkEuroboxes(config: CabinetConfig): CollisionIssue[] {
  const found: CollisionIssue[] = [];
  for (const bay of config.bays) {
    const levels = [...bay.levels].sort((a, b) => a.yMm - b.yMm);
    levels.forEach((level, index) => {
      if (level.boxes.length === 0) {
        return;
      }
      const available = clearanceAbove(config, levels, index);
      for (const placement of level.boxes) {
        const box = getEurobox(placement.boxId);
        const body = box.heightMm + (placement.withLid ? box.lidExtraMm : 0);
        const required = body + GRIP_MM;
        if (required <= available) {
          continue;
        }
        const severity: CollisionSeverity = body > available ? 'error' : 'warning';
        found.push(
          issue(
            'eurobox_clearance',
            severity,
            `Eurobox ${placement.boxId} braucht ${required} mm, verfügbar sind ${available} mm.`,
            {
              bayId: bay.id,
              levelId: level.id,
              boxId: placement.boxId,
              availableMm: available,
              requiredMm: required,
            },
          ),
        );
      }
    });
  }
  return found;
}

function checkSlides(config: CabinetConfig, geometry: CabinetGeometryResult): CollisionIssue[] {
  const found: CollisionIssue[] = [];
  for (const bay of config.bays) {
    for (const level of bay.levels) {
      if (level.type !== 'pullout') {
        continue;
      }
      const fromGeometry = geometry.slides.find((part) => part.levelId === level.id)?.lengthMm;
      const slideLength = level.slideLengthMm ?? fromGeometry;
      if (slideLength === undefined) {
        continue;
      }
      if (slideLength > config.depthMm) {
        found.push(
          issue(
            'slide_depth',
            'error',
            `Auszugsschiene ${slideLength} mm ist länger als die Schranktiefe ${config.depthMm} mm.`,
            {
              bayId: bay.id,
              levelId: level.id,
              availableMm: config.depthMm,
              requiredMm: slideLength,
            },
          ),
        );
      }
      const sideFrame = geometry.profiles.find(
        (part) => part.partCode === 'Nr.3' && part.levelId === level.id,
      );
      if (sideFrame && slideLength > sideFrame.lengthMm) {
        found.push(
          issue(
            'slide_depth',
            'error',
            `Auszugsschiene ${slideLength} mm ist länger als der Seitenrahmen ${sideFrame.lengthMm} mm.`,
            {
              bayId: bay.id,
              levelId: level.id,
              availableMm: sideFrame.lengthMm,
              requiredMm: slideLength,
            },
          ),
        );
      }
    }
  }
  return found;
}

export function checkCollisions(
  config: CabinetConfig,
  geometry: CabinetGeometryResult,
): CollisionIssue[] {
  return [
    ...checkRoom(config, geometry),
    ...checkLevelOverlap(config),
    ...checkEuroboxes(config),
    ...checkSlides(config, geometry),
  ];
}
