import { useState } from 'react';
import { useNow } from './hooks/useNow';
import { useFeedStore } from './hooks/useFeedStore';
import { useDiaperStore } from './hooks/useDiaperStore';
import { HomeScreen } from './screens/HomeScreen';
import { ChartsScreen } from './screens/ChartsScreen';
import { LogScreen } from './screens/LogScreen';
import { ActiveSessionBar } from './session/ActiveSessionBar';
import { StartSessionGuard } from './session/StartSessionGuard';
import { decideStart } from './session/sessionGuard';
import { Toast } from './components/Toast';
import { EditSheet } from './components/EditSheet';
import { buildBackup, parseBackup, feedsToCsv, diapersToCsv, download } from './backup';
import { Icon } from './icons/Icon';
import './baby.css';

const TABS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'charts', label: 'Charts', icon: 'chart' },
  { id: 'log', label: 'Log', icon: 'list' },
];

export default function BabyApp() {
  const [liveHint, setLiveHint] = useState(false);
  const now = useNow(liveHint);
  const feedStore = useFeedStore(now);
  const diaperStore = useDiaperStore(now);
  const [tab, setTab] = useState('home');
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);
  const [pendingStart, setPendingStart] = useState(null);
  const [armed, setArmed] = useState(false);

  // Keep the clock's tick rate in step with whether a session is running.
  // useNow is called before the store exists, so this reconciles on the next
  // render rather than being derived inline.
  const isLive = Boolean(feedStore.active);
  if (isLive !== liveHint) setLiveHint(isLive);

  const handleLogDiaper = ({ pee, poop }) => {
    diaperStore.logDiaper({ pee, poop });
    setToast({
      message: pee && poop ? 'Pee + poop logged' : poop ? 'Poop logged' : 'Pee logged',
      onUndo: diaperStore.undoLast,
    });
  };

  const handleSaved = (feed) => setToast({
    message: feed.type === 'breast'
      ? `Feed saved · ${Math.round((feed.leftMs + feed.rightMs) / 60000)}m`
      : `Bottle saved · ${feed.takenMl} ml`,
    onUndo: feedStore.undoLast,
  });

  const handleEditStale = (active) => {
    setEditing({
      kind: 'feed',
      stale: true,
      item: active.type === 'breast'
        ? {
            id: 'stale', type: 'breast', startTime: active.startTime,
            endTime: active.startTime + active.leftMs + active.rightMs,
            leftMs: active.leftMs, rightMs: active.rightMs,
            lastSide: active.activeSide ?? 'left', note: '',
          }
        : {
            id: 'stale', type: 'external', startTime: active.startTime,
            endTime: active.startTime, ...active.draft,
          },
    });
  };

  const today = () => new Date(now).toISOString().slice(0, 10);

  const handleExportJson = () => download(
    `baby-tracker-${today()}.json`,
    JSON.stringify(
      buildBackup(feedStore.feeds, diaperStore.diapers, feedStore.quantityPresets),
      null,
      2
    ),
    'application/json'
  );

  const handleExportFeedsCsv = () =>
    download(`baby-feeds-${today()}.csv`, feedsToCsv(feedStore.feeds), 'text/csv');

  const handleExportDiapersCsv = () =>
    download(`baby-diapers-${today()}.csv`, diapersToCsv(diaperStore.diapers), 'text/csv');

  const handleImport = async (file) => {
    let data;
    try {
      data = parseBackup(await file.text());
    } catch (err) {
      setToast({ message: err.message });
      return;
    }
    const total = data.feeds.length + data.diapers.length;
    if (!window.confirm(
      `Replace all local data with ${data.feeds.length} feeds and ${data.diapers.length} diapers from this backup? This cannot be undone.`
    )) return;
    feedStore.replaceAll(data.feeds);
    diaperStore.replaceAll(data.diapers);
    if (data.presets.length) feedStore.setQuantityPresets(data.presets);
    setToast({ message: `Imported ${total} records` });
  };

  // Tapping "Breast" only arms the card — the timer starts when a side is
  // tapped, so a side is never chosen on the user's behalf. A bottle has no
  // side to pick, so it starts straight away.
  const beginSession = (type) => {
    if (type === 'breast') {
      setArmed(true);
    } else {
      setArmed(false);
      feedStore.startExternal();
    }
  };

  const handlePickSide = (side) => {
    setArmed(false);
    feedStore.startBreast(side);
  };

  const handleStart = (type) => {
    const decision = decideStart(feedStore.active, type);
    if (decision.action === 'start') beginSession(type);
    else setPendingStart(decision);
  };

  const handleSaveAndStart = () => {
    const feed = feedStore.active.type === 'breast'
      ? feedStore.stopBreast()
      : feedStore.saveExternal();
    if (feed) handleSaved(feed);
    beginSession(pendingStart.requested);
    setPendingStart(null);
  };

  const handleDiscardAndStart = () => {
    feedStore.discardActive();
    beginSession(pendingStart.requested);
    setPendingStart(null);
  };

  const handleCancelStart = () => {
    setPendingStart(null);
    setTab('home');
  };

  return (
    <main className="app-main baby">
      {tab === 'home' && (
        <HomeScreen
          feedStore={feedStore}
          diaperStore={diaperStore}
          armed={armed}
          onStart={handleStart}
          onPickSide={handlePickSide}
          onCancelArm={() => setArmed(false)}
          onLogDiaper={handleLogDiaper}
          onEdit={(kind, item) => setEditing({ kind, item })}
          onEditStale={handleEditStale}
          onSaved={handleSaved}
        />
      )}
      {tab === 'charts' && (
        <ChartsScreen feedStore={feedStore} diaperStore={diaperStore} now={now} />
      )}
      {tab === 'log' && (
        <LogScreen
          feedStore={feedStore}
          diaperStore={diaperStore}
          now={now}
          onEdit={(kind, item) => setEditing({ kind, item })}
          onExportJson={handleExportJson}
          onExportFeedsCsv={handleExportFeedsCsv}
          onExportDiapersCsv={handleExportDiapersCsv}
          onImport={handleImport}
        />
      )}

      {editing && (
        <EditSheet
          kind={editing.kind}
          record={editing.item}
          notice={editing.stale
            ? 'This feed was left running. Check the end time and save, or delete it.'
            : undefined}
          onSave={(next) => {
            if (editing.stale) {
              feedStore.addFeed({ ...next, id: crypto.randomUUID() });
              feedStore.discardActive();
            } else if (editing.kind === 'feed') {
              feedStore.updateFeed(next.id, next);
            } else {
              diaperStore.updateDiaper(next.id, next);
            }
          }}
          onDelete={(id) => {
            if (editing.stale) feedStore.discardActive();
            else if (editing.kind === 'feed') feedStore.deleteFeed(id);
            else diaperStore.deleteDiaper(id);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {pendingStart && (
        <StartSessionGuard
          running={pendingStart.running}
          requested={pendingStart.requested}
          elapsedMs={feedStore.elapsedMs}
          onSaveAndStart={handleSaveAndStart}
          onDiscardAndStart={handleDiscardAndStart}
          onCancel={handleCancelStart}
        />
      )}

      {toast && (
        <Toast message={toast.message} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />
      )}

      {tab !== 'home' && (
        <ActiveSessionBar feedStore={feedStore} onOpen={() => setTab('home')} />
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
            <Icon name={t.icon} size={20} />
            {t.label}
          </button>
        ))}
      </nav>
    </main>
  );
}
