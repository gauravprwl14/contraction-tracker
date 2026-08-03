import { useState } from 'react';
import { useFeedStore } from './hooks/useFeedStore';
import { useDiaperStore } from './hooks/useDiaperStore';
import { HomeScreen } from './components/HomeScreen';
import { Toast } from './components/Toast';
import { BreastFeedSheet } from './components/BreastFeedSheet';
import { ExternalFeedSheet } from './components/ExternalFeedSheet';
import { LogTab } from './components/LogTab';
import { EditSheet } from './components/EditSheet';
import { ChartsTab } from './components/ChartsTab';
import './baby.css';

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'charts', label: 'Charts' },
  { id: 'log', label: 'Log' },
];

export default function BabyApp() {
  const feedStore = useFeedStore();
  const diaperStore = useDiaperStore();
  const [tab, setTab] = useState('home');
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);
  const [logFilter, setLogFilter] = useState('all');
  // Reopen a running session on mount only — a user who cancels a sheet shouldn't
  // have it snap back on a later re-render, so this is a lazy initializer, not an effect.
  const [sheet, setSheet] = useState(() => {
    if (feedStore.active && !feedStore.staleActive) {
      return feedStore.active.type === 'breast' ? 'breast' : 'external';
    }
    return null;
  });
  // A feed left running for hours shouldn't silently resume its timer — surface it
  // as an edit sheet instead so the user corrects the end time or discards it.
  // Same lazy-initializer pattern as `sheet` above: this must run once at mount,
  // not as an effect that calls setState during render (react-hooks/purity).
  const [staleRecord, setStaleRecord] = useState(() => {
    if (!feedStore.staleActive || !feedStore.active) return null;
    const a = feedStore.active;
    return a.type === 'breast'
      ? {
          id: 'stale',
          type: 'breast',
          startTime: a.startTime,
          endTime: a.startTime + a.leftMs + a.rightMs,
          leftMs: a.leftMs,
          rightMs: a.rightMs,
          lastSide: a.activeSide ?? 'left',
          note: '',
        }
      : { id: 'stale', type: 'external', startTime: a.startTime, endTime: a.startTime, ...a.draft };
  });

  const handleLogDiaper = ({ pee, poop }) => {
    diaperStore.logDiaper({ pee, poop });
    setToast({
      message: pee && poop ? 'Pee + poop logged' : poop ? 'Poop logged' : 'Pee logged',
      onUndo: diaperStore.undoLast,
    });
  };

  return (
    <main className="app-main baby">
      {tab === 'home' && (
        <HomeScreen
          feedStore={feedStore}
          diaperStore={diaperStore}
          onOpenBreast={() => setSheet('breast')}
          onOpenExternal={() => { feedStore.startExternal(); setSheet('external'); }}
          onLogDiaper={handleLogDiaper}
          onEdit={(kind, item) => setEditing({ kind, item })}
        />
      )}
      {tab === 'charts' && <ChartsTab feedStore={feedStore} diaperStore={diaperStore} />}
      {tab === 'log' && (
        <LogTab
          feedStore={feedStore}
          diaperStore={diaperStore}
          filter={logFilter}
          onFilterChange={setLogFilter}
          onEdit={(kind, item) => setEditing({ kind, item })}
        />
      )}

      {sheet === 'breast' && (
        <BreastFeedSheet
          feedStore={feedStore}
          onClose={() => setSheet(null)}
          onSaved={(feed) => setToast({
            message: `Feed saved · ${Math.round((feed.leftMs + feed.rightMs) / 60000)}m`,
            onUndo: feedStore.undoLast,
          })}
        />
      )}

      {sheet === 'external' && (
        <ExternalFeedSheet
          feedStore={feedStore}
          onClose={() => setSheet(null)}
          onSaved={(feed) => setToast({
            message: `Bottle saved · ${feed.takenMl} ml`,
            onUndo: feedStore.undoLast,
          })}
        />
      )}

      {editing && (
        <EditSheet
          kind={editing.kind}
          record={editing.item}
          onSave={(next) =>
            (editing.kind === 'feed'
              ? feedStore.updateFeed(next.id, next)
              : diaperStore.updateDiaper(next.id, next))
          }
          onDelete={(id) =>
            (editing.kind === 'feed' ? feedStore.deleteFeed(id) : diaperStore.deleteDiaper(id))
          }
          onClose={() => setEditing(null)}
        />
      )}

      {staleRecord && (
        <EditSheet
          kind="feed"
          record={staleRecord}
          notice="This feed was left running. Check the end time and save, or delete it."
          onSave={(next) => {
            feedStore.addFeed({ ...next, id: crypto.randomUUID() });
            feedStore.discardActive();
          }}
          onDelete={() => feedStore.discardActive()}
          onClose={() => {
            feedStore.discardActive();
            setStaleRecord(null);
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          onUndo={toast.onUndo}
          onDismiss={() => setToast(null)}
        />
      )}

      <nav className="bottom-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`bottom-tabs__btn ${tab === t.id ? 'bottom-tabs__btn--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </main>
  );
}
