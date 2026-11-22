import { describe, expect, it } from 'vitest';
import { generateBom } from '../bom';
import { generateCabinetGeometry, type PartCode } from '../geometry';
import { cabinetConfigSchema, type CabinetConfig } from '../schema';

function fixedRack(
  series: CabinetConfig['series'],
  boxWidthMm: number,
  boxLengthMm: number,
  bayCount = 1,
): CabinetConfig {
  return cabinetConfigSchema.parse({
    room: { clearWidthMm: 4000, heightMm: 2000, depthMm: 2000 },
    series,
    footType: 'clamp_bottom',
    depthMm: 2000,
    bays: Array.from({ length: bayCount }, (_, index) => ({
      id: `bay-${index + 1}`,
      mode: 'eurobox' as const,
      widthMm: 100,
      levels: [
        {
          id: `level-${index + 1}`,
          yMm: 400,
          type: 'fixed_eurobox' as const,
          boxWidthMm,
          boxLengthMm,
        },
      ],
    })),
  });
}

function counts(config: CabinetConfig, code: PartCode): number[] {
  return generateCabinetGeometry(config)
    .profiles.filter((part) => part.partCode === code)
    .map((part) => part.lengthMm);
}

describe('Golden Master', () => {
  it('rechnet feste Eurobox-Regale und die Erweiterung auf 0 mm', () => {
    const small20 = generateCabinetGeometry(fixedRack('20x20_B6', 600, 400));
    expect(small20.boundingBox.widthMm).toBe(645);
    expect(small20.boundingBox.depthMm).toBe(405);

    const small30 = generateCabinetGeometry(fixedRack('30x30_B8', 600, 400));
    expect(small30.boundingBox.widthMm).toBe(685);
    expect(small30.boundingBox.depthMm).toBe(425);

    const long30 = generateCabinetGeometry(fixedRack('30x30_B8', 900, 400));
    expect(long30.boundingBox.widthMm).toBe(985);
    expect(long30.boundingBox.depthMm).toBe(425);

    const extended = generateCabinetGeometry(fixedRack('30x30_B8', 600, 400, 2));
    expect(extended.boundingBox.widthMm - small30.boundingBox.widthMm).toBe(655);
  });

  it('trifft den Golden Master des 30x30-Auszugsregals L-1255', () => {
    const config = cabinetConfigSchema.parse({
      room: { clearWidthMm: 2000, heightMm: 1300, depthMm: 2000 },
      series: '30x30_B8',
      footType: 'clamp_both',
      depthMm: 2000,
      bays: [
        {
          id: 'bay-1',
          mode: 'eurobox',
          widthMm: 100,
          levels: [0, 1, 2].map((index) => ({
            id: `pull-${index + 1}`,
            yMm: 200 + index * 350,
            type: 'pullout' as const,
            orientation: 'lengthwise' as const,
            boxLengthMm: 1200,
            boxWidthMm: 400,
          })),
        },
      ],
    });
    const geometry = generateCabinetGeometry(config);
    const bom = generateBom(config, geometry);

    expect(counts(config, 'Nr.1')).toEqual([1200, 1200, 1200, 1200]);
    expect(counts(config, 'Nr.2')).toEqual([1225, 1225, 1225, 1225, 1225, 1225]);
    expect(counts(config, 'Nr.3')).toEqual([1160, 1160, 1160, 1160, 1160, 1160]);
    expect(counts(config, 'Nr.4')).toEqual([467, 467]);
    expect(counts(config, 'Nr.5')).toEqual([365, 365, 365, 365, 365, 365]);
    expect(geometry.boundingBox.widthMm).toBe(527);
    expect(bom.profilePieceCount).toBe(24);
    expect(bom.netAluLengthMm).toBe(22234);
    expect(bom.netAluWeightKg).toBeCloseTo(19.34, 2);
    expect(bom.netAluWeightKg).toBeCloseTo((22234 * 0.87) / 1000, 6);
    expect(bom.insideBrackets).toBe(12);
    expect(bom.cornerBrackets).toBe(16);
    expect(bom.clamps).toBe(8);
    expect(bom.slidePairs).toEqual([{ lengthMm: 1200, pairs: 3 }]);
    expect(bom.rotaryLatches).toBe(3);
    expect(bom.handles).toBe(3);
    expect(bom.tNutsM5).toBe(42);
    expect(bom.tNutsM6).toEqual({
      includedInCornerBrackets: 32,
      separateRequired: 6,
      totalRequired: 38,
    });
  });

  it('teilt Mittelsteher und setzt das Türblatt mit 3 mm Spalt', () => {
    const config = cabinetConfigSchema.parse({
      room: { clearWidthMm: 2400, heightMm: 2000, depthMm: 600 },
      series: '30x30_B8',
      footType: 'clamp_both',
      depthMm: 600,
      bays: [
        {
          id: 'left',
          mode: 'cabinet',
          widthMm: 800,
          door: { enabled: true, type: 'left', material: 'birch_plywood', gapMm: 3, openAngleDeg: 0 },
        },
        {
          id: 'right',
          mode: 'cabinet',
          widthMm: 800,
        },
      ],
    });
    const geometry = generateCabinetGeometry(config);
    const posts = geometry.profiles.filter((part) => part.partCode === 'Nr.1');
    const door = geometry.doors[0];
    const hinges = geometry.hardware.filter((part) => part.kind === 'hinge');
    const clearWidth = 800 - 30;
    const clearHeight = 2000 - 100;

    expect(posts).toHaveLength(6);
    expect(posts).not.toHaveLength(8);
    expect(door?.gapMm).toBe(3);
    expect(door?.widthMm).toBe(clearWidth - 2 * 3);
    expect(door?.heightMm).toBe(clearHeight - 2 * 3);
    expect(hinges.length).toBeGreaterThanOrEqual(2);
  });
});
