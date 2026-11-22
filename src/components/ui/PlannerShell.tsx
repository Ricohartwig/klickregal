'use client';

import { useEffect, useState } from 'react';
import { BaysLevelsTab } from '@/components/ui/BaysLevelsTab';
import { BomPanel } from '@/components/ui/BomPanel';
import { CuttingPlanView } from '@/components/ui/CuttingPlanView';
import { PanelsAccessoriesTab } from '@/components/ui/PanelsAccessoriesTab';
import { RoomSystemTab } from '@/components/ui/RoomSystemTab';
import { TopToolbar } from '@/components/ui/TopToolbar';
import { ViewportClientWrapper } from '@/components/viewport/ViewportClientWrapper';
import { redoPlanner, undoPlanner, useCabinetDerived } from '@/store/usePlannerStore';

export function PlannerShell() {
  const [tab, setTab] = useState<'room' | 'bays' | 'panels'>('room');
  const [drawer, setDrawer] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'bom' | 'cutting'>('bom');
  const { collisions } = useCabinetDerived();

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
          <div className="grid grid-cols-3 border-b border-slate-200">
            <button
              type="button"
              className={`px-1 py-2 text-[11px] leading-tight ${tab === 'room' ? 'border-b-2 border-slate-900 font-semibold' : 'text-slate-500'}`}
              onClick={() => setTab('room')}
            >
              Raum & System
            </button>
            <button
              type="button"
              className={`px-1 py-2 text-[11px] leading-tight ${tab === 'bays' ? 'border-b-2 border-slate-900 font-semibold' : 'text-slate-500'}`}
              onClick={() => setTab('bays')}
            >
              Felder & Ebenen
            </button>
            <button
              type="button"
              className={`px-1 py-2 text-[11px] leading-tight ${tab === 'panels' ? 'border-b-2 border-slate-900 font-semibold' : 'text-slate-500'}`}
              onClick={() => setTab('panels')}
            >
              Verkleidung, Türen & Zubehör
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === 'room' ? <RoomSystemTab /> : tab === 'bays' ? <BaysLevelsTab /> : <PanelsAccessoriesTab />}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="relative min-h-0 flex-1">
            <div className="absolute inset-0">
              <ViewportClientWrapper />
            </div>
          </main>
          {drawer ? (
            <section className="flex h-[min(48vh,460px)] min-h-64 shrink-0 flex-col border-t border-slate-200 bg-white">
              <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3">
                <button
                  type="button"
                  className={`h-9 text-sm ${drawerTab === 'bom' ? 'border-b-2 border-slate-900 font-semibold' : 'text-slate-500'}`}
                  onClick={() => setDrawerTab('bom')}
                >
                  Stückliste
                </button>
                <button
                  type="button"
                  className={`h-9 text-sm ${drawerTab === 'cutting' ? 'border-b-2 border-slate-900 font-semibold' : 'text-slate-500'}`}
                  onClick={() => setDrawerTab('cutting')}
                >
                  Schnittplan
                </button>
                <span className="ml-auto text-xs text-slate-500">
                  {collisions.filter((issue) => issue.severity === 'error').length} Kollisionsfehler
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">{drawerTab === 'bom' ? <BomPanel /> : <CuttingPlanView />}</div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
