import { useState } from 'react';
import { useFeedStore } from './hooks/useFeedStore';
import { useDiaperStore } from './hooks/useDiaperStore';
import { HomeScreen } from './components/HomeScreen';
import { Toast } from './components/Toast';
import { BreastFeedSheet } from './components/BreastFeedSheet';
import { ExternalFeedSheet } from './components/ExternalFeedSheet';
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
  // Reopen a running session on mount only — a user who cancels a sheet shouldn't
  // have it snap back on a later re-render, so this is a lazy initializer, not an effect.
  const [sheet, setSheet] = useState(() => {
    if (feedStore.active && !feedStore.staleActive) {
      return feedStore.active.type === 'breast' ? 'breast' : 'external';
    }
    return null;
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
          onEdit={() => {}}
        />
      )}
      {tab === 'charts' && <p className="placeholder">Charts coming up.</p>}
      {tab === 'log' && <p className="placeholder">Log coming up.</p>}

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
