'use client';

import { useEffect, useState } from 'react';
import { BaysLevelsTab } from '@/components/ui/BaysLevelsTab';
import { RoomSystemTab } from '@/components/ui/RoomSystemTab';
import { TopToolbar } from '@/components/ui/TopToolbar';
import { ViewportClientWrapper } from '@/components/viewport/ViewportClientWrapper';
import { redoPlanner, undoPlanner, useCabinetDerived } from '@/store/usePlannerStore';

export function PlannerShell() {
  const [tab, setTab] = useState<'room' | 'bays'>('room');
  const [drawer, setDrawer] = useState(false);
  const { bom, cuttingPlan, collisions } = useCabinetDerived();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'z' && event.shiftKey) {
        event.preventDefault();
        redoPlanner();
      } else if (key === 'z') {
        event.preventDefault();
        undoPlanner();
      } else if (key === 'y') {
        event.preventDefault();
        redoPlanner();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-100 text-slate-950">
      <TopToolbar onToggleDrawer={() => setDrawer((open) => !open)} />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[380px] min-w-[360px] max-w-[400px] shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              className={`h-10 flex-1 text-sm ${tab === 'room' ? 'border-b-2 border-slate-900 font-semibold' : 'text-slate-500'}`}
              onClick={() => setTab('room')}
            >
              Raum & System
            </button>
            <button
              type="button"
              className={`h-10 flex-1 text-sm ${tab === 'bays' ? 'border-b-2 border-slate-900 font-semibold' : 'text-slate-500'}`}
              onClick={() => setTab('bays')}
            >
              Felder & Ebenen
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{tab === 'room' ? <RoomSystemTab /> : <BaysLevelsTab />}</div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="relative min-h-0 flex-1">
            <div className="absolute inset-0">
              <ViewportClientWrapper />
            </div>
          </main>
          {drawer ? (
            <section className="h-48 shrink-0 overflow-auto border-t border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Stückliste und Schnittplan</h2>
              <p className="mt-2 text-sm text-slate-700">
                {bom.profilePieceCount} Profile, {bom.netAluLengthMm.toFixed(0)} mm netto, {bom.totalWeightKg.toFixed(1)} kg,{' '}
                {bom.totalPriceEur.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Zuschnitt {cuttingPlan.stockLengthMm} mm: {cuttingPlan.barCount} Stangen, {cuttingPlan.wastePercent.toFixed(1)} % Verschnitt
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {collisions.filter((issue) => issue.severity === 'error').length} Kollisionsfehler
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
