import { getProfileSeries, getSlideForSeries } from './catalog';
import type { CabinetGeometryResult, PartCode } from './geometry';
import type { CabinetConfig, Level } from './schema';

export const E_N_PER_MM2 = 70000;
export const SIGMA_ALLOWED_MPA = 80;
export const G_M_PER_S2 = 9.81;

export type StaticStatus = 'OK' | 'WARN' | 'FAIL';

export interface ProfileStaticState {
  index: number;
  partCode: PartCode;
  bayId: string | null;
  levelId: string | null;
  status: StaticStatus;
}

export interface LevelStatics {
  bayId: string;
  levelId: string;
  spanMm: number;
  targetLoadKg: number;
  forceN: number;
  fUdlMm: number;
  fPointMm: number;
  sigmaMpa: number;
  status: StaticStatus;
  hints: string[];
  profileIndexes: number[];
}

export interface StaticsReport {
  levels: LevelStatics[];
  profiles: ProfileStaticState[];
}

interface Carrier {
  indexes: number[];
  spanMm: number;
}

function carriersFor(level: Level, geometry: CabinetGeometryResult): Carrier {
  const onLevel = geometry.profiles
    .map((part, index) => ({ part, index }))
    .filter((entry) => entry.part.levelId === level.id);

  if (level.type === 'pullout') {
    const beams = onLevel.filter((entry) => entry.part.partCode === 'Nr.2');
    return {
      indexes: beams.map((entry) => entry.index),
      spanMm: beams[0]?.part.lengthMm ?? 0,
    };
  }

  const longitudinal = onLevel.filter(
    (entry) => entry.part.partCode === 'Korpus' && entry.part.rotation.y !== 0,
  );
  const beams = longitudinal.length >= 2 ? longitudinal : onLevel.filter((entry) => entry.part.partCode === 'Korpus');
  return {
    indexes: beams.slice(0, 2).map((entry) => entry.index),
    spanMm: beams[0]?.part.lengthMm ?? 0,
  };
}

function statusFor(
  fUdlMm: number,
  spanMm: number,
  sigmaMpa: number,
  level: Level,
  slideMaxLoadKg: number,
): StaticStatus {
  const overSlide = level.type === 'pullout' && level.targetLoadKg > slideMaxLoadKg;
  if (fUdlMm > spanMm / 200 || sigmaMpa > SIGMA_ALLOWED_MPA || overSlide) {
    return 'FAIL';
  }
  if (fUdlMm > spanMm / 300) {
    return 'WARN';
  }
  return 'OK';
}

function hintsFor(level: Level, spanMm: number, status: StaticStatus, heavySlide: boolean): string[] {
  if (status !== 'WARN') {
    return [];
  }
  const hints: string[] = [];
  if (level.type === 'pullout' && heavySlide) {
    hints.push(
      'Die 53 mm Stahl-Schwerlastschiene trägt im Verbund mit; die reine Profilrechnung ist konservativ.',
    );
  }
  if (level.type !== 'pullout' && spanMm > 1000) {
    hints.push('Freier Boden über 1000 mm: Mittelstütze oder Serie 40x40_I8 prüfen.');
  }
  return hints;
}

export function evaluateStatics(
  config: CabinetConfig,
  geometry: CabinetGeometryResult,
): StaticsReport {
  const series = getProfileSeries(config.series);
  const slide = getSlideForSeries(config.series);
  const iMm4 = series.ixCm4 * 10000;
  const wMm3 = series.wxCm3 * 1000;
  const profiles: ProfileStaticState[] = geometry.profiles.map((part, index) => ({
    index,
    partCode: part.partCode,
    bayId: part.bayId,
    levelId: part.levelId,
    status: 'OK',
  }));
  const levels: LevelStatics[] = [];

  for (const bay of config.bays) {
    for (const level of bay.levels) {
      const carrier = carriersFor(level, geometry);
      if (carrier.spanMm <= 0 || carrier.indexes.length === 0) {
        continue;
      }
      const forceN = level.targetLoadKg * G_M_PER_S2;
      const share = forceN / 2;
      const spanCubed = carrier.spanMm ** 3;
      const fUdlMm = (5 * share * spanCubed) / (384 * E_N_PER_MM2 * iMm4);
      const fPointMm = (share * spanCubed) / (48 * E_N_PER_MM2 * iMm4);
      const sigmaMpa = (share * carrier.spanMm) / (4 * wMm3);
      const status = statusFor(fUdlMm, carrier.spanMm, sigmaMpa, level, slide.loadKg);
      for (const index of carrier.indexes) {
        const profile = profiles[index];
        if (profile) {
          profile.status = status;
        }
      }
      levels.push({
        bayId: bay.id,
        levelId: level.id,
        spanMm: carrier.spanMm,
        targetLoadKg: level.targetLoadKg,
        forceN,
        fUdlMm,
        fPointMm,
        sigmaMpa,
        status,
        hints: hintsFor(level, carrier.spanMm, status, slide.loadKg >= 136),
        profileIndexes: carrier.indexes,
      });
    }
  }

  return { levels, profiles };
}
