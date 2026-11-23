'use client';

import { useEffect, useState } from 'react';
import { BaysLevelsTab } from '@/components/ui/BaysLevelsTab';
import { BomPanel } from '@/components/ui/BomPanel';
import { CuttingPlanView } from '@/components/ui/CuttingPlanView';
import { PanelsAccessoriesTab } from '@/components/ui/PanelsAccessoriesTab';
import { RoomSystemTab } from '@/components/ui/RoomSystemTab';
import { TopToolbar } from '@/components/ui/TopToolbar';
import { ViewportClientWrapper } from '@/components/viewport/ViewportClientWrapper';
import { decodeConfigFromUrl } from '@/lib/export';
import { redoPlanner, undoPlanner, useCabinetDerived, usePlannerStore } from '@/store/usePlannerStore';

export function PlannerShell() {
  const [tab, setTab] = useState<'room' | 'bays' | 'panels'>('room');
  const [drawer, setDrawer] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'bom' | 'cutting'>('bom');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
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

  useEffect(() => {
    if (!window.location.href.includes('config=')) {
      return;
    }
    const config = decodeConfigFromUrl(window.location.href);
    if (!config || !usePlannerStore.getState().importConfig(config)) {
      usePlannerStore.getState().loadPreset('golden_master_l1255');
      setToast('Der Link ist ungültig. Das Standard-Preset wurde geladen.');
      return;
    }
    setToast('Konfiguration aus dem Link geladen.');
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div className="flex h-dvh w-screen flex-col bg-slate-100 text-slate-950">
      <TopToolbar
        onToggleDrawer={() => setDrawer((open) => !open)}
        onToggleInspector={() => setInspectorOpen((open) => !open)}
        onNotify={setToast}
      />
      <div className="relative flex min-h-0 flex-1">
        {inspectorOpen ? (
          <button
            type="button"
            aria-label="Inspektor schließen"
            className="absolute inset-0 z-20 bg-slate-900/30 md:hidden"
            onClick={() => setInspectorOpen(false)}
          />
        ) : null}
        <aside
          className={`${inspectorOpen ? 'absolute inset-y-0 left-0 z-30 flex shadow-xl' : 'hidden'} w-[min(100%,380px)] shrink-0 flex-col border-r border-slate-200 bg-white md:static md:z-auto md:flex md:w-[380px] md:min-w-[360px] md:max-w-[400px] md:shadow-none`}
        >
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
              Zubehör
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
            <section className="flex h-[min(48vh,460px)] min-h-48 shrink-0 flex-col border-t border-slate-200 bg-white">
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
      {toast ? (
        <div role="status" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
