import { useState } from 'react';
import { useFeedStore } from './hooks/useFeedStore';
import { useDiaperStore } from './hooks/useDiaperStore';
import { HomeScreen } from './components/HomeScreen';
import { Toast } from './components/Toast';
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
          onOpenBreast={() => {}}
          onOpenExternal={() => {}}
          onLogDiaper={handleLogDiaper}
          onEdit={() => {}}
        />
      )}
      {tab === 'charts' && <p className="placeholder">Charts coming up.</p>}
      {tab === 'log' && <p className="placeholder">Log coming up.</p>}

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
