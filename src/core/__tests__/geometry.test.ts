import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateCabinetGeometry, type PartCode } from '../geometry';
import { cabinetConfigSchema, type CabinetConfig, type CabinetConfigInput } from '../schema';

function cabinet(overrides: {
  series?: CabinetConfig['series'];
  footType?: CabinetConfig['footType'];
  heightMm?: number;
  bays?: CabinetConfigInput['bays'];
  depthMm?: number;
}): CabinetConfig {
  return cabinetConfigSchema.parse({
    room: {
      clearWidthMm: 2400,
      heightMm: overrides.heightMm ?? 2000,
      depthMm: overrides.depthMm ?? 1400,
    },
    series: overrides.series ?? '30x30_B8',
    footType: overrides.footType ?? 'clamp_both',
    depthMm: overrides.depthMm ?? 1400,
    bays: overrides.bays ?? [
      {
        id: 'bay-1',
        mode: 'eurobox',
        widthMm: 500,
        levels: [
          {
            id: 'level-1',
            yMm: 400,
            type: 'pullout',
            boxLengthMm: 1200,
            boxWidthMm: 400,
          },
        ],
      },
    ],
  });
}

function lengths(config: CabinetConfig, code: PartCode): number[] {
  return generateCabinetGeometry(config)
    .profiles.filter((part) => part.partCode === code)
    .map((part) => part.lengthMm);
}

describe('generateCabinetGeometry', () => {
  it('sizes posts from the foot type and shares center posts', () => {
    const both = generateCabinetGeometry(cabinet({ heightMm: 2000 }));
    const posts = both.profiles.filter((part) => part.partCode === 'Nr.1');
    expect(posts).toHaveLength(4);
    expect(posts.every((part) => part.lengthMm === 1900)).toBe(true);

    const bottom = lengths(cabinet({ footType: 'clamp_bottom', heightMm: 2000 }), 'Nr.1');
    expect(bottom.every((length) => length === 1950)).toBe(true);
    const plates = lengths(cabinet({ footType: 'foot_plates', heightMm: 2000 }), 'Nr.1');
    expect(plates.every((length) => length === 1950)).toBe(true);

    const twoBays = generateCabinetGeometry(
      cabinet({
        bays: [
          { id: 'a', mode: 'eurobox', widthMm: 500, levels: [] },
          { id: 'b', mode: 'eurobox', widthMm: 500, levels: [] },
        ],
      }),
    );
    expect(twoBays.profiles.filter((part) => part.partCode === 'Nr.1')).toHaveLength(6);
  });

  it('cuts 30x30 pull-out profiles including the 900 mm side-frame exception', () => {
    const at = (boxLengthMm: number, boxWidthMm: number) =>
      generateCabinetGeometry(
        cabinet({
          bays: [
            {
              id: 'bay-1',
              mode: 'eurobox',
              widthMm: 500,
              levels: [
                {
                  id: 'level-1',
                  yMm: 400,
                  type: 'pullout',
                  boxLengthMm,
                  boxWidthMm,
                },
              ],
            },
          ],
        }),
      );

    const long = at(1200, 400);
    expect(lengths(cabinet({
      bays: [
        {
          id: 'bay-1',
          mode: 'eurobox',
          widthMm: 500,
          levels: [{ id: 'level-1', yMm: 400, type: 'pullout', boxLengthMm: 1200, boxWidthMm: 400 }],
        },
      ],
    }), 'Nr.2')).toEqual([1225, 1225]);
    expect(long.profiles.filter((part) => part.partCode === 'Nr.3').map((part) => part.lengthMm)).toEqual([
      1160, 1160,
    ]);
    expect(long.profiles.filter((part) => part.partCode === 'Nr.5').map((part) => part.lengthMm)).toEqual([
      365, 365,
    ]);
    expect(long.profiles.filter((part) => part.partCode === 'Nr.4').map((part) => part.lengthMm)).toEqual([
      467, 467,
    ]);

    expect(at(900, 400).profiles.filter((part) => part.partCode === 'Nr.3').map((part) => part.lengthMm)).toEqual([
      860, 860,
    ]);
    expect(at(600, 400).profiles.filter((part) => part.partCode === 'Nr.2').every((part) => part.lengthMm === 625)).toBe(
      true,
    );
    expect(at(600, 400).profiles.filter((part) => part.partCode === 'Nr.3').every((part) => part.lengthMm === 565)).toBe(
      true,
    );
    expect(at(600, 300).profiles.filter((part) => part.partCode === 'Nr.4').every((part) => part.lengthMm === 365)).toBe(
      true,
    );
  });

  it('cuts the 20x20 pull-out cross brace for a 400 mm box', () => {
    const result = generateCabinetGeometry(
      cabinet({
        series: '20x20_B6',
        bays: [
          {
            id: 'bay-1',
            mode: 'eurobox',
            widthMm: 420,
            levels: [
              {
                id: 'level-1',
                yMm: 300,
                type: 'pullout',
                boxLengthMm: 400,
                boxWidthMm: 400,
              },
            ],
          },
        ],
      }),
    );
    const l4 = result.profiles.filter((part) => part.partCode === 'Nr.4').map((part) => part.lengthMm);
    expect(l4).toEqual([435, 435]);
    const l5 = result.profiles.filter((part) => part.partCode === 'Nr.5').map((part) => part.lengthMm);
    expect(l5).toEqual([365, 365]);
  });

  it('builds the fixed eurobox frame from the fall-through formula', () => {
    const result = generateCabinetGeometry(
      cabinet({
        bays: [
          {
            id: 'bay-1',
            mode: 'eurobox',
            widthMm: 500,
            levels: [
              {
                id: 'level-1',
                yMm: 500,
                type: 'fixed_eurobox',
                boxLengthMm: 600,
                boxWidthMm: 400,
              },
            ],
          },
        ],
      }),
    );
    const korpus = result.profiles
      .filter((part) => part.partCode === 'Korpus')
      .map((part) => part.lengthMm)
      .sort((a, b) => a - b);
    expect(korpus).toEqual([425, 425, 565, 565]);
    expect(result.hardware.filter((part) => part.kind === 'inside_bracket')).toHaveLength(4);
    expect(result.hardware.filter((part) => part.kind === 'corner_bracket')).toHaveLength(4);
  });

  it('does not import react, three, or next', () => {
    for (const file of ['geometry.ts', 'catalog.ts', 'schema.ts']) {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
      expect(source).not.toMatch(/from ['"]react['"]/);
      expect(source).not.toMatch(/from ['"]three['"]/);
      expect(source).not.toMatch(/@react-three/);
      expect(source).not.toMatch(/from ['"]next\//);
      expect(source).not.toMatch(/\b(window|document)\b/);
    }
  });
});
