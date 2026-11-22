<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# KlickRegal / AluSchrank CAD

## Projektziel

Browserbasierter, millimetergenauer 3D-Konfigurator für modulare Alu-Nutprofil-Schranksysteme (KlickRegal / AluSchrank CAD; 20x20 B-Typ Nut 6, 30x30 B-Typ Nut 8, 40x40 I-Typ Nut 8) inkl. Stückliste, Statik und 1D-Verschnittoptimierung.

Markennamen Dritter (wie Easysteck) niemals im UI, Code-Branding oder Export verwenden.

## Schichttrennung

- `src/core/`: 100 % reines TypeScript (Katalog, Geometrie, Statik, BOM, Schnittplan, Kollision). KEINE Imports aus `react`, `three`, `@react-three/*` oder Browser-APIs.
- `src/store/`: Zustand-v5-Store mit zundo Undo/Redo und Zod-Validierung aus `src/core/schema.ts`.
- `src/components/viewport/`: React Three Fiber v9 3D-Szene, komplett client-seitig.
- `src/components/ui/`: Tailwind/shadcn-Konfigurator-Panels, Stückliste, Schnittplan-Ansicht.
- `src/lib/`: Client-seitige Exporte (PDF, CSV, JSON/URL-Share).

## Einheiten

In `src/core/` und `src/store/` sind ALLE Längen in Millimetern (mm), Gewichte in kg, Kräfte in N, Preise in EUR.

Erst im 3D-Viewport mit `const MM = 0.001` in Meter umrechnen (Y-up, X = Breite, Z = Tiefe nach vorne).

## Verifizierung

Nach jeder Änderung an `src/core/` zwingend `npx vitest run`.

Vor Abschluss jeder Aufgabe `npm run typecheck && npm run build`.
