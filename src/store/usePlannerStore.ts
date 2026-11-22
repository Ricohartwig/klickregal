'use client';

import { useMemo } from 'react';
import { temporal } from 'zundo';
import { create } from 'zustand';
import { generateBom } from '@/core/bom';
import { checkCollisions } from '@/core/collision';
import { optimizeCuttingStock, type StockLengthMm } from '@/core/cuttingStock';
import { generateCabinetGeometry } from '@/core/geometry';
import { cabinetConfigSchema, type Bay, type CabinetAccessory, type CabinetConfig, type FootType, type Level, type LevelType, type ProfileSeriesId, type Room } from '@/core/schema';
import { getSlideForSeries } from '@/core/catalog';
import { evaluateStatics } from '@/core/statics';
import { DEFAULT_PRESET_ID, PRESETS, type PresetId } from '@/store/presets';

export type CameraPreset = 'iso' | 'front' | 'side' | 'top';

const PRICE_STORAGE_KEY = 'klickregal-custom-prices';
const MAX_BAYS = 5;

export interface PlannerState {
  config: CabinetConfig;
  selectedBayId: string | null;
  selectedLevelId: string | null;
  showRoomEnvelope: boolean;
  showDimensions: boolean;
  explosionFactor: number;
  xrayMode: boolean;
  staticsOverlay: boolean;
  globalPulloutProgress: number;
  cameraPreset: CameraPreset;
  stockLengthMm: StockLengthMm;
  customPrices: Record<string, number>;
  useCustomPrices: boolean;
  loadPreset: (id: PresetId) => void;
  importConfig: (jsonOrObject: string | unknown) => boolean;
  updateRoom: (patch: Partial<Room>) => void;
  setSeries: (series: ProfileSeriesId) => void;
  setFinish: (finish: CabinetConfig['finish']) => void;
  setFootType: (footType: FootType) => void;
  addBay: () => void;
  duplicateBay: (bayId: string) => void;
  removeBay: (bayId: string) => void;
  updateBay: (bayId: string, patch: Partial<Omit<Bay, 'id' | 'levels'>>) => void;
  addLevel: (bayId: string, type: LevelType) => void;
  removeLevel: (bayId: string, levelId: string) => void;
  updateLevel: (bayId: string, levelId: string, patch: Partial<Omit<Level, 'id'>>) => void;
  autoFillEuroboxes: (bayId: string, levelId: string) => void;
  toggleLevelPullout: (bayId: string, levelId: string) => void;
  setAllPullouts: (progress: number) => void;
  toggleDoor: (bayId: string) => void;
  addAccessory: (accessory: Omit<CabinetAccessory, 'id'> & { id?: string }) => void;
  removeAccessory: (id: string) => void;
  setView: (patch: Partial<Pick<PlannerState, 'showRoomEnvelope' | 'showDimensions' | 'xrayMode' | 'staticsOverlay' | 'cameraPreset' | 'selectedBayId' | 'selectedLevelId'>>) => void;
  setExplosionFactor: (value: number) => void;
  setStockLengthMm: (value: StockLengthMm) => void;
  setCustomPrices: (prices: Record<string, number>) => void;
  setUseCustomPrices: (enabled: boolean) => void;
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function readStoredPrices(): Record<string, number> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(PRICE_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
    );
  } catch {
    return {};
  }
}

function writeStoredPrices(prices: Record<string, number>): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(PRICE_STORAGE_KEY, JSON.stringify(prices));
}

function withSeriesSlides(config: CabinetConfig, series: ProfileSeriesId): CabinetConfig {
  const lengths = getSlideForSeries(series).lengthsMm;
  return {
    ...config,
    series,
    bays: config.bays.map((bay) => ({
      ...bay,
      levels: bay.levels.map((level) => {
        if (level.slideLengthMm === undefined || lengths.includes(level.slideLengthMm)) {
          return level;
        }
        const shorter = lengths.filter((length) => length <= level.slideLengthMm!);
        const slideLengthMm = shorter[shorter.length - 1] ?? lengths[0];
        return { ...level, slideLengthMm };
      }),
    })),
  };
}

function selectFirst(config: CabinetConfig): { selectedBayId: string | null; selectedLevelId: string | null } {
  const bay = config.bays[0];
  return {
    selectedBayId: bay?.id ?? null,
    selectedLevelId: bay?.levels[0]?.id ?? null,
  };
}

function applyGlobalPullout(config: CabinetConfig, progress: number): CabinetConfig {
  return {
    ...config,
    bays: config.bays.map((bay) => ({
      ...bay,
      levels: bay.levels.map((level) =>
        level.type === 'pullout' ? { ...level, openProgress: progress } : level,
      ),
    })),
  };
}

export const usePlannerStore = create<PlannerState>()(
  temporal(
    (set, get) => ({
      config: PRESETS[DEFAULT_PRESET_ID],
      ...selectFirst(PRESETS[DEFAULT_PRESET_ID]),
      showRoomEnvelope: false,
      showDimensions: true,
      explosionFactor: 0,
      xrayMode: false,
      staticsOverlay: false,
      globalPulloutProgress: 0,
      cameraPreset: 'iso' as CameraPreset,
      stockLengthMm: 3000 as StockLengthMm,
      customPrices: readStoredPrices(),
      useCustomPrices: false,
      loadPreset: (id) => {
        const config = PRESETS[id];
        set({ config, ...selectFirst(config), globalPulloutProgress: 0 });
      },
      importConfig: (jsonOrObject) => {
        try {
          const data = typeof jsonOrObject === 'string' ? JSON.parse(jsonOrObject) : jsonOrObject;
          const parsed = cabinetConfigSchema.safeParse(data);
          if (!parsed.success) {
            return false;
          }
          set({ config: parsed.data, ...selectFirst(parsed.data) });
          return true;
        } catch {
          return false;
        }
      },
      updateRoom: (patch) => {
        const config = get().config;
        set({ config: { ...config, room: { ...config.room, ...patch } } });
      },
      setSeries: (series) => set({ config: withSeriesSlides(get().config, series) }),
      setFinish: (finish) => set({ config: { ...get().config, finish } }),
      setFootType: (footType) => set({ config: { ...get().config, footType } }),
      addBay: () => {
        const config = get().config;
        if (config.bays.length >= MAX_BAYS) {
          return;
        }
        const template = config.bays[config.bays.length - 1];
        const bay: Bay = {
          id: nextId('bay'),
          mode: template?.mode ?? 'eurobox',
          widthMm: template?.widthMm ?? 655,
          panels: { left: 'none', right: 'none', back: 'none', top: 'none' },
          door: { enabled: false, type: 'left', material: 'none', gapMm: 3, openAngleDeg: 0 },
          levels: [],
        };
        set({
          config: { ...config, bays: [...config.bays, bay] },
          selectedBayId: bay.id,
          selectedLevelId: null,
        });
      },
      duplicateBay: (bayId) => {
        const config = get().config;
        if (config.bays.length >= MAX_BAYS) {
          return;
        }
        const source = config.bays.find((bay) => bay.id === bayId);
        if (!source) {
          return;
        }
        const copy: Bay = {
          ...source,
          id: nextId('bay'),
          panels: { ...source.panels },
          door: { ...source.door },
          levels: source.levels.map((level) => ({
            ...level,
            id: nextId('level'),
            boxes: level.boxes.map((box) => ({ ...box, id: nextId('box') })),
          })),
        };
        const index = config.bays.findIndex((bay) => bay.id === bayId);
        const bays = [...config.bays];
        bays.splice(index + 1, 0, copy);
        set({ config: { ...config, bays }, selectedBayId: copy.id, selectedLevelId: copy.levels[0]?.id ?? null });
      },
      removeBay: (bayId) => {
        const config = get().config;
        if (config.bays.length <= 1) {
          return;
        }
        const bays = config.bays.filter((bay) => bay.id !== bayId);
        const selected = bays[0];
        set({
          config: { ...config, bays },
          selectedBayId: get().selectedBayId === bayId ? (selected?.id ?? null) : get().selectedBayId,
          selectedLevelId: get().selectedBayId === bayId ? (selected?.levels[0]?.id ?? null) : get().selectedLevelId,
        });
      },
      updateBay: (bayId, patch) => {
        const config = get().config;
        set({
          config: {
            ...config,
            bays: config.bays.map((bay) => (bay.id === bayId ? { ...bay, ...patch, id: bay.id } : bay)),
          },
        });
      },
      addLevel: (bayId, type) => {
        const config = get().config;
        const bay = config.bays.find((entry) => entry.id === bayId);
        if (!bay) {
          return;
        }
        const level: Level = {
          id: nextId('level'),
          yMm: bay.levels.reduce((max, entry) => Math.max(max, entry.yMm), 0) + 280,
          type,
          orientation: 'lengthwise',
          boxLengthMm: 600,
          boxWidthMm: 400,
          targetLoadKg: 0,
          openProgress: 0,
          boxes: [],
        };
        set({
          config: {
            ...config,
            bays: config.bays.map((entry) =>
              entry.id === bayId ? { ...entry, levels: [...entry.levels, level] } : entry,
            ),
          },
          selectedBayId: bayId,
          selectedLevelId: level.id,
        });
      },
      removeLevel: (bayId, levelId) => {
        const config = get().config;
        set({
          config: {
            ...config,
            bays: config.bays.map((bay) =>
              bay.id === bayId ? { ...bay, levels: bay.levels.filter((level) => level.id !== levelId) } : bay,
            ),
          },
          selectedLevelId: get().selectedLevelId === levelId ? null : get().selectedLevelId,
        });
      },
      updateLevel: (bayId, levelId, patch) => {
        const lengths = getSlideForSeries(get().config.series).lengthsMm;
        const config = get().config;
        set({
          config: {
            ...config,
            bays: config.bays.map((bay) => {
              if (bay.id !== bayId) {
                return bay;
              }
              return {
                ...bay,
                levels: bay.levels.map((level) => {
                  if (level.id !== levelId) {
                    return level;
                  }
                  const next = { ...level, ...patch, id: level.id };
                  if (next.slideLengthMm !== undefined && !lengths.includes(next.slideLengthMm)) {
                    const shorter = lengths.filter((length) => length <= next.slideLengthMm!);
                    next.slideLengthMm = shorter[shorter.length - 1] ?? lengths[0];
                  }
                  return next;
                }),
              };
            }),
          },
        });
      },
      autoFillEuroboxes: (bayId, levelId) => {
        const config = get().config;
        set({
          config: {
            ...config,
            bays: config.bays.map((bay) => {
              if (bay.id !== bayId) {
                return bay;
              }
              return {
                ...bay,
                levels: bay.levels.map((level) => {
                  if (level.id !== levelId) {
                    return level;
                  }
                  const candidates = [
                    { boxId: 'GR-8' as const, lengthMm: 1200, widthMm: 400 },
                    { boxId: 'GR-7' as const, lengthMm: 1200, widthMm: 400 },
                    { boxId: 'GR-6' as const, lengthMm: 600, widthMm: 400 },
                    { boxId: 'GR-5' as const, lengthMm: 600, widthMm: 400 },
                    { boxId: 'GR-4' as const, lengthMm: 600, widthMm: 400 },
                    { boxId: 'GR-3' as const, lengthMm: 400, widthMm: 300 },
                    { boxId: 'GR-2' as const, lengthMm: 400, widthMm: 300 },
                    { boxId: 'GR-1A' as const, lengthMm: 400, widthMm: 300 },
                    { boxId: 'GR-1' as const, lengthMm: 400, widthMm: 300 },
                  ].filter((box) => box.widthMm <= level.boxWidthMm && box.lengthMm <= level.boxLengthMm);
                  const choice = candidates[0];
                  if (!choice) {
                    return { ...level, boxes: [] };
                  }
                  const count = Math.max(1, Math.floor(level.boxLengthMm / choice.lengthMm));
                  return {
                    ...level,
                    boxes: Array.from({ length: count }, (_, index) => ({
                      id: nextId('box'),
                      boxId: choice.boxId,
                      withLid: false,
                      xMm: 0,
                      zMm: index * choice.lengthMm,
                    })),
                  };
                }),
              };
            }),
          },
        });
      },
      toggleLevelPullout: (bayId, levelId) => {
        const config = get().config;
        set({
          config: {
            ...config,
            bays: config.bays.map((bay) =>
              bay.id === bayId
                ? {
                    ...bay,
                    levels: bay.levels.map((level) =>
                      level.id === levelId
                        ? { ...level, type: level.type === 'pullout' ? 'fixed_eurobox' : 'pullout' }
                        : level,
                    ),
                  }
                : bay,
            ),
          },
        });
      },
      setAllPullouts: (progress) => set({ globalPulloutProgress: clamp01(progress) }),
      toggleDoor: (bayId) => {
        const config = get().config;
        set({
          config: {
            ...config,
            bays: config.bays.map((bay) =>
              bay.id === bayId ? { ...bay, door: { ...bay.door, enabled: !bay.door.enabled } } : bay,
            ),
          },
        });
      },
      addAccessory: (accessory) => {
        const config = get().config;
        const item: CabinetAccessory = { ...accessory, id: accessory.id ?? nextId('acc') };
        set({ config: { ...config, accessories: [...config.accessories, item] } });
      },
      removeAccessory: (id) => {
        const config = get().config;
        set({ config: { ...config, accessories: config.accessories.filter((item) => item.id !== id) } });
      },
      setView: (patch) => set(patch),
      setExplosionFactor: (value) => set({ explosionFactor: clamp01(value) }),
      setStockLengthMm: (value) => set({ stockLengthMm: value }),
      setCustomPrices: (prices) => {
        writeStoredPrices(prices);
        set({ customPrices: prices });
      },
      setUseCustomPrices: (enabled) => set({ useCustomPrices: enabled }),
    }),
    {
      limit: 50,
      partialize: (state) => ({ config: state.config }),
      equality: (past, current) => past.config === current.config,
    },
  ),
);

export function undoPlanner(): void {
  usePlannerStore.temporal.getState().undo();
}

export function redoPlanner(): void {
  usePlannerStore.temporal.getState().redo();
}

export function useCabinetDerived() {
  const config = usePlannerStore((state) => state.config);
  const globalPulloutProgress = usePlannerStore((state) => state.globalPulloutProgress);
  const stockLengthMm = usePlannerStore((state) => state.stockLengthMm);
  const customPrices = usePlannerStore((state) => state.customPrices);
  const useCustomPrices = usePlannerStore((state) => state.useCustomPrices);

  return useMemo(() => {
    const effective = applyGlobalPullout(config, globalPulloutProgress);
    const geometry = generateCabinetGeometry(effective);
    const bom = generateBom(effective, geometry, useCustomPrices ? customPrices : undefined);
    const collisions = checkCollisions(effective, geometry);
    const statics = evaluateStatics(effective, geometry);
    const cuttingPlan = optimizeCuttingStock(bom, stockLengthMm);
    return { config: effective, geometry, bom, collisions, statics, cuttingPlan };
  }, [config, globalPulloutProgress, stockLengthMm, customPrices, useCustomPrices]);
}
