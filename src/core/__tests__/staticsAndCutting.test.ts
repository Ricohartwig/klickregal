import { describe, expect, it } from 'vitest';
import { generateBom } from '../bom';
import { optimizeCuttingStock } from '../cuttingStock';
import { generateCabinetGeometry } from '../geometry';
import { cabinetConfigSchema, type CabinetConfig, type ProfileSeriesId } from '../schema';
import { evaluateStatics } from '../statics';

function pullout(series: ProfileSeriesId, boxLengthMm: number, targetLoadKg: number): CabinetConfig {
  return cabinetConfigSchema.parse({
    room: { clearWidthMm: 4000, heightMm: 2000, depthMm: 4000 },
    series,
    footType: 'clamp_bottom',
    depthMm: 4000,
    bays: [
      {
        id: 'bay-1',
        mode: 'eurobox',
        widthMm: 800,
        levels: [
          {
            id: 'span',
            yMm: 400,
            type: 'pullout',
            boxLengthMm,
            boxWidthMm: 400,
            targetLoadKg,
          },
        ],
      },
    ],
  });
}

function goldenCabinet(): CabinetConfig {
  return cabinetConfigSchema.parse({
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
          boxLengthMm: 1200,
          boxWidthMm: 400,
        })),
      },
    ],
  });
}

describe('Statik und Verschnitt', () => {
  it('packt den Golden Master 30x30 L-1255 auf 16, 8 und 4 Stangen', () => {
    const config = goldenCabinet();
    const bom = generateBom(config, generateCabinetGeometry(config));
    expect(bom.profilePieceCount).toBe(24);
    expect(bom.netAluLengthMm).toBe(22234);

    const at2000 = optimizeCuttingStock(bom, 2000, 3, 15);
    const at3000 = optimizeCuttingStock(bom, 3000, 3, 15);
    const at6000 = optimizeCuttingStock(bom, 6000, 3, 15);

    expect(at2000.barCount).toBe(16);
    expect(at2000.wastePercent).toBeCloseTo(30.5, 1);
    expect(at2000.shippingHint).toBeNull();

    expect(at3000.barCount).toBe(8);
    expect(at3000.wastePercent).toBeCloseTo(7.4, 1);
    expect(at3000.shippingHint).toContain('Speditionsversand');

    expect(at6000.barCount).toBe(4);
    expect(at6000.wastePercent).toBeCloseTo(7.4, 1);
    expect(at3000.comparisonTip).toContain('3000 mm');
    expect(at3000.comparisonTip).toContain('2000 mm');
  });

  it('trifft die Gleichlast-Durchbiegung auf zwei Profilen', () => {
    const small = evaluateStatics(pullout('20x20_B6', 1195, 50), generateCabinetGeometry(pullout('20x20_B6', 1195, 50)));
    const mid = evaluateStatics(pullout('30x30_B8', 575, 130), generateCabinetGeometry(pullout('30x30_B8', 575, 130)));
    const large = evaluateStatics(pullout('40x40_I8', 1155, 130), generateCabinetGeometry(pullout('40x40_I8', 1155, 130)));

    expect(small.levels[0]?.spanMm).toBe(1200);
    expect(small.levels[0]?.fUdlMm).toBeCloseTo(11.1, 2);
    expect(small.levels[0]?.status).toBe('FAIL');
    expect(small.profiles.filter((part) => part.levelId === 'span' && part.partCode === 'Nr.2').every((part) => part.status === 'FAIL')).toBe(true);

    expect(mid.levels[0]?.spanMm).toBe(600);
    expect(mid.levels[0]?.fUdlMm).toBeCloseTo(0.95, 2);
    expect(mid.levels[0]?.status).toBe('OK');

    expect(large.levels[0]?.spanMm).toBe(1200);
    expect(large.levels[0]?.fUdlMm).toBeCloseTo(2.28, 2);
    expect(large.levels[0]?.status).toBe('OK');
  });
});
