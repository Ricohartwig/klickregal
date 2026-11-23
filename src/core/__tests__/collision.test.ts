import { describe, expect, it } from 'vitest';
import { checkCollisions } from '../collision';
import { generateCabinetGeometry } from '../geometry';
import { cabinetConfigSchema, type CabinetConfig } from '../schema';

function build(config: CabinetConfig) {
  const geometry = generateCabinetGeometry(config);
  return checkCollisions(config, geometry);
}

describe('checkCollisions', () => {
  it('meldet keine Fehler, wenn der Schrank in die Raumhülle passt', () => {
    const config = cabinetConfigSchema.parse({
      room: { clearWidthMm: 3000, heightMm: 2000, depthMm: 1000 },
      series: '20x20_B6',
      footType: 'clamp_bottom',
      depthMm: 1000,
      bays: [
        {
          id: 'bay-1',
          mode: 'eurobox',
          widthMm: 700,
          levels: [
            {
              id: 'shelf',
              yMm: 400,
              type: 'fixed_eurobox',
              boxWidthMm: 600,
              boxLengthMm: 400,
            },
          ],
        },
      ],
    });

    expect(build(config)).toEqual([]);
  });

  it('meldet einen Fehler, wenn die Türöffnung zu niedrig ist', () => {
    const config = cabinetConfigSchema.parse({
      room: {
        clearWidthMm: 3000,
        heightMm: 2000,
        depthMm: 1000,
        doorOpening: { widthMm: 3000, heightMm: 1000 },
      },
      series: '20x20_B6',
      footType: 'clamp_bottom',
      depthMm: 1000,
      bays: [
        {
          id: 'bay-1',
          mode: 'eurobox',
          widthMm: 700,
          levels: [
            {
              id: 'shelf',
              yMm: 400,
              type: 'fixed_eurobox',
              boxWidthMm: 600,
              boxLengthMm: 400,
            },
          ],
        },
      ],
    });

    const doorErrors = build(config).filter((item) => item.code === 'door_height');
    expect(doorErrors).toHaveLength(1);
    expect(doorErrors[0]?.severity).toBe('error');
    expect(doorErrors[0]?.availableMm).toBe(1000);
    expect(doorErrors[0]?.requiredMm).toBe(2000);
  });

  it('meldet GR-6 in einem 300 mm hohen Fach mit exakten Millimetern', () => {
    const config = cabinetConfigSchema.parse({
      room: { clearWidthMm: 2000, heightMm: 2000, depthMm: 2000 },
      series: '30x30_B8',
      footType: 'clamp_both',
      depthMm: 2000,
      bays: [
        {
          id: 'bay-1',
          mode: 'eurobox',
          widthMm: 500,
          levels: [
            {
              id: 'lower',
              yMm: 100,
              type: 'fixed_eurobox',
              boxWidthMm: 400,
              boxLengthMm: 400,
              boxes: [{ id: 'box-1', boxId: 'GR-6', withLid: false }],
            },
            {
              id: 'upper',
              yMm: 430,
              type: 'fixed_eurobox',
              boxWidthMm: 400,
              boxLengthMm: 400,
            },
          ],
        },
      ],
    });

    const hit = build(config).find((item) => item.code === 'eurobox_clearance');
    expect(hit).toMatchObject({
      severity: 'error',
      bayId: 'bay-1',
      levelId: 'lower',
      boxId: 'GR-6',
      availableMm: 300,
      requiredMm: 335,
    });
  });

  it('meldet eine 1200-mm-Schiene in einem 800 mm tiefen Schrank', () => {
    const config = cabinetConfigSchema.parse({
      room: { clearWidthMm: 2000, heightMm: 2000, depthMm: 2000 },
      series: '30x30_B8',
      footType: 'clamp_bottom',
      depthMm: 800,
      bays: [
        {
          id: 'bay-1',
          mode: 'eurobox',
          widthMm: 500,
          levels: [
            {
              id: 'drawer',
              yMm: 400,
              type: 'pullout',
              boxLengthMm: 400,
              boxWidthMm: 400,
              slideLengthMm: 1200,
            },
          ],
        },
      ],
    });

    const hit = build(config).find(
      (item) => item.code === 'slide_depth' && item.availableMm === 800,
    );
    expect(hit).toMatchObject({
      severity: 'error',
      bayId: 'bay-1',
      levelId: 'drawer',
      availableMm: 800,
      requiredMm: 1200,
    });
  });
});
