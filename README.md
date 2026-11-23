# KlickRegal

klickregal.de

Browserbasierter 3D-Konfigurator für modulare Alu-Nutprofil-Schranksysteme. Planung, Stückliste, Schnittplan und Bauplan laufen vollständig im Browser. Es gibt kein eigenes Backend.

## Setup

```bash
npm install
npm run dev
```

Die Anwendung liegt danach auf [http://localhost:3000](http://localhost:3000).

## Prüfung

```bash
npx vitest run
npm run typecheck
npm run build
```

`npm run test` ist dasselbe wie `npx vitest run`.

## Architektur

- `src/core` ist der reine TypeScript-CAD-Kern: Katalog, Zod-Schema, Geometrie, Stückliste, Kollision, Statik und 1D-Schnittplan. Einheiten sind Millimeter, Kilogramm, Newton und Euro. Diese Schicht importiert weder React noch Three.js.
- `src/store` hält die `CabinetConfig` in Zustand 5. Undo über zundo betrifft nur die Konfiguration. `useCabinetDerived()` leitet Geometrie, Stückliste, Kollision, Statik und Zuschnitt ab.
- `src/components/viewport` zeichnet die Szene mit React Three Fiber 9. Der Canvas läuft nur im Browser (`ssr: false`) und behält den Zeichenpuffer für den PDF-Screenshot.
- `src/components/ui` ist der Split-Screen: Toolbar, Inspektor und die Drawer für Stückliste und Schnittplan. Auf schmalen Viewports ist der Inspektor ein einklappbares Overlay.
- `src/lib/export.ts` erzeugt CSV, PDF, JSON und den teilbaren Link. Der Link trägt die Konfiguration Base64url-kodiert im URL-Hash und wird beim Laden mit `cabinetConfigSchema.safeParse()` geprüft.

## Vercel

Ein Push auf den verbundenen Branch startet das Deployment im verknüpften Vercel-Projekt. Es wird kein zweites Projekt angelegt.

Der **Vercel Hobby**-Tarif ist nur für nicht-kommerzielle, persönliche Nutzung vorgesehen. Sobald KlickRegal gewerblich eingesetzt wird, ist **Vercel Pro** erforderlich.
