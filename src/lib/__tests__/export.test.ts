import { describe, expect, it } from 'vitest';
import { generateBom } from '@/core/bom';
import { optimizeCuttingStock } from '@/core/cuttingStock';
import { checkCollisions } from '@/core/collision';
import { generateCabinetGeometry } from '@/core/geometry';
import { evaluateStatics } from '@/core/statics';
import { decodeConfigFromUrl, encodeConfigToUrl, exportBomCsv, exportPdfBlueprint } from '@/lib/export';
import { PRESETS } from '@/store/presets';

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function snapshot() {
  const config = PRESETS.golden_master_l1255;
  const geometry = generateCabinetGeometry(config);
  const bom = generateBom(config, geometry);
  return {
    config,
    geometry,
    bom,
    cuttingPlan: optimizeCuttingStock(bom, 3000),
    collisions: checkCollisions(config, geometry),
    statics: evaluateStatics(config, geometry),
    previewDataUrl: PNG,
  };
}

describe('client exports', () => {
  it('schreibt eine deutsche CSV mit BOM und Semikolon', () => {
    const csv = exportBomCsv(snapshot());
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Zuschnitt;Nr.2;');
    expect(csv).toContain('M6-Nutensteine');
    expect(csv).toContain('Gesamt;Preis;');
    expect(csv.split('\r\n')[1]).toContain(';');
  });

  it('legt die Konfiguration verlustfrei in den URL-Hash', () => {
    const config = PRESETS.camper_wardrobe_2bay;
    const url = encodeConfigToUrl(config, 'https://klickregal.example/planer');
    expect(url).toContain('#config=');
    expect(decodeConfigFromUrl(url)?.bays).toHaveLength(config.bays.length);
    expect(decodeConfigFromUrl(url)?.series).toBe('20x20_B6');
  });

  it('lehnt einen ungültigen Link ab', () => {
    expect(decodeConfigFromUrl('https://klickregal.example/#config=%%%%')).toBeNull();
    expect(decodeConfigFromUrl('https://klickregal.example/#config=e30')).toBeNull();
  });

  it('packt Screenshot, Stückliste, Schnittplan und Montage in das PDF', () => {
    const doc = exportPdfBlueprint(snapshot());
    const raw = doc.output();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(4);
    expect(raw).toContain('KlickRegal Bauplan');
    expect(raw).toContain('Stückliste');
    expect(raw).toContain('Schnittplan');
    expect(raw).toContain('Montage-Checkliste');
    expect(raw).toContain('M6-Nutensteine für Griffe VOR dem Rahmen-Zusammenbau in die Profilnut einschieben!');
    expect(raw).toContain('+17 mm');
    expect(raw).toContain('+30 mm');
    expect(raw).toContain('+20 mm');
    expect(raw).toContain('Spannteller');
    expect(raw).toContain('/Image');
  });
});
