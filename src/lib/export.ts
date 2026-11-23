import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getEurobox, getHardware, getProfileSeries, getSlideForSeries } from '@/core/catalog';
import type { BomResult } from '@/core/bom';
import type { CollisionIssue } from '@/core/collision';
import type { CuttingPlanResult } from '@/core/cuttingStock';
import type { CabinetGeometryResult } from '@/core/geometry';
import { cabinetConfigSchema, type CabinetConfig, type EuroboxId } from '@/core/schema';
import type { StaticsReport } from '@/core/statics';

export interface ExportSnapshot {
  config: CabinetConfig;
  bom: BomResult;
  geometry: CabinetGeometryResult;
  cuttingPlan: CuttingPlanResult;
  collisions: CollisionIssue[];
  statics: StaticsReport;
  customPrices?: Record<string, number>;
  previewDataUrl?: string | null;
}

const CHECKLIST = [
  'M6-Nutensteine für Griffe VOR dem Rahmen-Zusammenbau in die Profilnut einschieben!',
  'Schienenüberstand: innen +17 mm, außen +30 mm bei der Schwerlastschiene bzw. +20 mm bei der 50-kg-Schiene.',
  'Spannteller oben und unten gleichmäßig verspannen, bis die Pfosten spielfrei stehen. Fußplatten fest mit dem Untergrund verschrauben.',
] as const;

function rate(id: string, fallback: number | null, custom: Record<string, number> | undefined): number {
  if (custom && Object.prototype.hasOwnProperty.call(custom, id)) {
    return custom[id] ?? 0;
  }
  return fallback ?? 0;
}

function eur(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function csvCell(value: string | number): string {
  const text = String(value).replaceAll('"', '""');
  return /[;"\r\n]/.test(text) ? `"${text}"` : text;
}

function csvRow(cells: Array<string | number>): string {
  return cells.map(csvCell).join(';');
}

export function exportBomCsv(snapshot: ExportSnapshot): string {
  const { config, bom, geometry, cuttingPlan, customPrices } = snapshot;
  const series = getProfileSeries(config.series);
  const slide = getSlideForSeries(config.series);
  const profileRate = rate(config.series, series.priceEurPerM, customPrices);
  const slideRate = rate(slide.id, slide.priceEurPerPair, customPrices);
  const rows: string[] = [
    csvRow(['KlickRegal Stückliste']),
    csvRow(['Abschnitt', 'Bezeichnung', 'Detail', 'Menge', 'Einheit', 'Einzel EUR', 'Gesamt EUR']),
  ];

  for (const group of bom.profiles) {
    const unit = (group.lengthMm / 1000) * profileRate;
    rows.push(
      csvRow([
        'Zuschnitt',
        group.partCode,
        `${series.label}; ${group.finish}; ${group.lengthMm} mm; 90 Grad`,
        group.count,
        'Stück',
        eur(unit),
        eur(unit * group.count),
      ]),
    );
  }

  for (const bar of cuttingPlan.groups.flatMap((group) => group.bars)) {
    const last = bar.cuts[bar.cuts.length - 1];
    const rest = last ? cuttingPlan.stockLengthMm - (last.offsetMm + last.lengthMm) : cuttingPlan.stockLengthMm;
    rows.push(
      csvRow([
        'Rohstange',
        `Stange ${bar.barIndex + 1}`,
        bar.cuts.map((cut) => `${cut.partCode} ${cut.lengthMm} mm`).join(' | '),
        1,
        `${cuttingPlan.stockLengthMm} mm`,
        '',
        `Rest ${Math.round(rest)} mm`,
      ]),
    );
  }

  for (const panel of bom.panels) {
    rows.push(
      csvRow([
        'Fläche',
        panel.materialId,
        `${panel.thicknessMm} mm; ${panel.widthMm} x ${panel.heightMm} mm; ${panel.areaM2.toFixed(3)} m2`,
        panel.count,
        'Stück',
        eur(panel.count > 0 ? panel.priceEur / panel.count : 0),
        eur(panel.priceEur),
      ]),
    );
  }

  const hardware: Array<[string, number, string]> = [
    [series.insideBracketId ?? '', bom.insideBrackets, 'Stück'],
    [series.cornerBracketId ?? '', bom.cornerBrackets, 'Stück'],
    ['spannteller_m8x80', bom.clamps, 'Stück'],
    ['foot_plate_m8', bom.footPlates, 'Stück'],
  ];
  for (const [id, count] of hardware) {
    if (!id || count <= 0) {
      continue;
    }
    const item = getHardware(id);
    const unit = rate(id, item.priceEur, customPrices);
    rows.push(csvRow(['Hardware', item.name, id, count, 'Stück', eur(unit), eur(unit * count)]));
  }
  rows.push(
    csvRow([
      'Hardware',
      'M6-Nutensteine',
      `${bom.tNutsM6.includedInCornerBrackets} in Eckwinkel-Sets enthalten; ${bom.tNutsM6.separateRequired} separat`,
      bom.tNutsM6.totalRequired,
      'Stück',
      '',
      eur(rate(config.series === '20x20_B6' ? 't_nut_m6_b6' : config.series === '40x40_I8' ? 't_nut_m6_i8' : 't_nut_m6_b8', null, customPrices) * bom.tNutsM6.separateRequired),
    ]),
  );

  for (const group of bom.slidePairs) {
    rows.push(
      csvRow(['Auszug', slide.name, `${group.lengthMm} mm`, group.pairs, 'Paar', eur(slideRate), eur(slideRate * group.pairs)]),
    );
  }

  const boxes = new Map<string, number>();
  for (const box of geometry.euroboxes) {
    boxes.set(box.boxId, (boxes.get(box.boxId) ?? 0) + 1);
  }
  for (const [id, count] of boxes) {
    const spec = getEurobox(id as EuroboxId);
    const unit = rate(id, null, customPrices);
    rows.push(
      csvRow(['Eurobox', id, `${spec.lengthMm} x ${spec.widthMm} x ${spec.heightMm} mm`, count, 'Stück', unit ? eur(unit) : '', eur(unit * count)]),
    );
  }

  rows.push(csvRow(['Gesamt', 'Preis', '', '', 'EUR', '', eur(bom.totalPriceEur)]));
  rows.push(csvRow(['Gesamt', 'Gewicht', '', '', 'kg', '', bom.totalWeightKg.toFixed(2).replace('.', ',')]));
  rows.push(
    csvRow([
      'Gesamt',
      'Zuschnitt',
      `${cuttingPlan.barCount} Stangen à ${cuttingPlan.stockLengthMm} mm`,
      '',
      '',
      '',
      `${cuttingPlan.wastePercent.toFixed(1).replace('.', ',')} % Verschnitt`,
    ]),
  );

  return `\uFEFF${rows.join('\r\n')}`;
}

function worstStatus(statics: StaticsReport): string {
  if (statics.levels.some((level) => level.status === 'FAIL')) {
    return 'FAIL';
  }
  if (statics.levels.some((level) => level.status === 'WARN')) {
    return 'WARN';
  }
  return 'OK';
}

export function exportPdfBlueprint(snapshot: ExportSnapshot): jsPDF {
  const { config, bom, geometry, cuttingPlan, collisions, statics, previewDataUrl } = snapshot;
  const series = getProfileSeries(config.series);
  const slide = getSlideForSeries(config.series);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: false });
  const box = geometry.boundingBox;
  const errors = collisions.filter((issue) => issue.severity === 'error').length;
  const warnings = collisions.filter((issue) => issue.severity === 'warning').length;

  doc.setFontSize(18);
  doc.text('KlickRegal Bauplan', 14, 16);
  doc.setFontSize(10);
  doc.text(new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }), 14, 22);

  let cursor = 28;
  if (previewDataUrl) {
    doc.addImage(previewDataUrl, 'PNG', 14, cursor, 180, 80);
    cursor += 86;
  }
  const summary = [
    `Gesamtmaß: ${Math.round(box.widthMm)} x ${Math.round(box.heightMm)} x ${Math.round(box.depthMm)} mm`,
    `Profilserie: ${series.label}, ${config.finish === 'black' ? 'schwarz eloxiert' : 'silber eloxiert'}`,
    `Gesamtgewicht: ${bom.totalWeightKg.toFixed(1)} kg`,
    `Preis: ${eur(bom.totalPriceEur)} EUR`,
    `Statik: ${worstStatus(statics)}`,
    `Kollisionen: ${errors} Fehler, ${warnings} Warnungen`,
  ];
  for (const line of summary) {
    doc.text(line, 14, cursor);
    cursor += 6;
  }

  doc.addPage();
  doc.setFontSize(14);
  doc.text('Stückliste', 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [['Abschnitt', 'Bezeichnung', 'Menge', 'Preis EUR']],
    body: [
      ...bom.profiles.map((group) => [group.partCode, `${group.lengthMm} mm, 90 Grad`, String(group.count), '']),
      ...bom.panels.map((panel) => [panel.materialId, `${panel.widthMm} x ${panel.heightMm} mm`, String(panel.count), eur(panel.priceEur)]),
      ['Eckwinkel', series.cornerBracketId ?? '', String(bom.cornerBrackets), ''],
      [
        'M6-Nutensteine',
        `${bom.tNutsM6.includedInCornerBrackets} in Sets, ${bom.tNutsM6.separateRequired} separat`,
        String(bom.tNutsM6.totalRequired),
        '',
      ],
      ...bom.slidePairs.map((group) => [slide.name, `${group.lengthMm} mm`, `${group.pairs} Paar`, '']),
      ['Gesamt', `${bom.totalWeightKg.toFixed(1)} kg`, '', eur(bom.totalPriceEur)],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  doc.addPage();
  doc.setFontSize(14);
  doc.text('Schnittplan', 14, 16);
  const cutRows = cuttingPlan.groups.flatMap((group) =>
    group.bars.flatMap((bar) => {
      const last = bar.cuts[bar.cuts.length - 1];
      const rest = last ? cuttingPlan.stockLengthMm - (last.offsetMm + last.lengthMm) : cuttingPlan.stockLengthMm;
      return bar.cuts.map((cut) => [
        `Stange ${bar.barIndex + 1}`,
        cut.partCode,
        `${cut.lengthMm} mm`,
        `${Math.round(cut.offsetMm)} mm`,
        `Rest ${Math.round(rest)} mm`,
      ]);
    }),
  );
  autoTable(doc, {
    startY: 22,
    head: [['Rohstange', 'Zuschnitt', 'Länge', 'Position', 'Rest']],
    body: cutRows.length > 0 ? cutRows : [['—', 'keine Zuschnitte', '', '', '']],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  });
  doc.setFontSize(10);
  const afterTable = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40;
  let noteY = afterTable + 8;
  if (noteY > 270) {
    doc.addPage();
    noteY = 16;
  }
  doc.text(
    `${cuttingPlan.barCount} Stangen à ${cuttingPlan.stockLengthMm} mm, Verschnitt ${cuttingPlan.wastePercent.toFixed(1)} %. ${cuttingPlan.comparisonTip}`,
    14,
    noteY,
    { maxWidth: 180 },
  );

  doc.addPage();
  doc.setFontSize(14);
  doc.text('Montage-Checkliste', 14, 16);
  doc.setFontSize(11);
  let y = 28;
  for (const item of CHECKLIST) {
    const lines = doc.splitTextToSize(`• ${item}`, 180);
    doc.text(lines, 14, y);
    y += lines.length * 6 + 4;
  }
  doc.text(
    `Diese Serie: Schienenüberstand innen +${slide.innerOverhangMm} mm, außen +${slide.outerOverhangMm} mm.`,
    14,
    y,
    { maxWidth: 180 },
  );

  return doc;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function readShareToken(href: string): string | null {
  const url = new URL(href, 'http://localhost');
  const query = url.searchParams.get('config');
  if (query) {
    return query;
  }
  const hash = url.hash.replace(/^#/, '');
  if (!hash) {
    return null;
  }
  const params = new URLSearchParams(hash);
  return params.get('config');
}

export function encodeConfigToUrl(config: CabinetConfig, baseHref: string): string {
  const url = new URL(baseHref, 'http://localhost');
  url.searchParams.delete('config');
  url.hash = `config=${toBase64Url(JSON.stringify(config))}`;
  return url.toString();
}

export function decodeConfigFromUrl(href: string): CabinetConfig | null {
  const token = readShareToken(href);
  if (!token) {
    return null;
  }
  try {
    const parsed = cabinetConfigSchema.safeParse(JSON.parse(fromBase64Url(token)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function captureViewportPng(): string | null {
  const canvas = document.querySelector('canvas');
  if (!(canvas instanceof HTMLCanvasElement) || canvas.width === 0) {
    return null;
  }
  return canvas.toDataURL('image/png');
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  downloadBlob(filename, new Blob([content], { type: mime }));
}
