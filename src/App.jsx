import { useState } from 'react';
import { useContractionStore } from './hooks/useContractionStore';
import { TimerButton } from './components/TimerButton';
import { StatsBar } from './components/StatsBar';
import { ContractionGraph } from './components/ContractionGraph';
import { ContractionList } from './components/ContractionList';
import { formatDuration, formatTime, formatDate } from './utils/format';
import './App.css';

function exportCSV(contractions, intervals) {
  const header = ['#', 'Date', 'Start Time', 'End Time', 'Duration (s)', 'Gap Before (s)', 'Intensity', 'Note'];
  const rows = contractions.map((c, i) => [
    contractions.length - i,
    formatDate(c.startTime),
    formatTime(c.startTime),
    formatTime(c.endTime),
    c.duration,
    intervals[i] ?? '',
    c.intensity ?? '',
    c.note ? `"${c.note.replace(/"/g, '""')}"` : '',
  ]);
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contractions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const {
    contractions, isActive, elapsed,
    avgDuration, avgInterval, longestDuration, shortestDuration,
    intervals, timeSinceLast, is511,
    durationTrend, intervalTrend, laborStage, perHour, sessionDuration,
    startContraction, stopContraction,
    updateContraction, deleteContraction, reset,
  } = useContractionStore();

  const [confirmReset, setConfirmReset] = useState(false);
  const [activeTab, setActiveTab] = useState('graph'); // 'graph' | 'history'

  const handleReset = () => {
    if (contractions.length === 0 && !isActive) return;
    if (confirmReset) { reset(); setConfirmReset(false); }
    else { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3000); }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Contraction Tracker</h1>
        <p className="app-subtitle">Offline · All data stays on your device</p>
      </header>

      <main className="app-main">
        <TimerButton
          isActive={isActive}
          elapsed={elapsed}
          onStart={startContraction}
          onStop={stopContraction}
        />

        <StatsBar
          contractions={contractions}
          avgDuration={avgDuration}
          avgInterval={avgInterval}
          longestDuration={longestDuration}
          shortestDuration={shortestDuration}
          timeSinceLast={timeSinceLast}
          is511={is511}
          durationTrend={durationTrend}
          intervalTrend={intervalTrend}
          laborStage={laborStage}
          perHour={perHour}
          sessionDuration={sessionDuration}
        />

        {/* Tab bar */}
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === 'graph' ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab('graph')}
          >
            Graph
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History {contractions.length > 0 && `(${contractions.length})`}
          </button>
        </div>

        {activeTab === 'graph' && (
          <section className="graph-section">
            <ContractionGraph
              contractions={contractions}
              intervals={intervals}
              isActive={isActive}
              elapsed={elapsed}
            />
          </section>
        )}

        {activeTab === 'history' && (
          <section className="history-section">
            <div className="history-header">
              <span />
              <div className="history-actions">
                {contractions.length > 0 && (
                  <button className="action-btn" onClick={() => exportCSV(contractions, intervals)}>
                    Export CSV
                  </button>
                )}
                {(contractions.length > 0 || isActive) && (
                  <button
                    className={`reset-btn ${confirmReset ? 'reset-btn--confirm' : ''}`}
                    onClick={handleReset}
                  >
                    {confirmReset ? 'Confirm?' : 'Reset all'}
                  </button>
                )}
              </div>
            </div>
            <ContractionList
              contractions={contractions}
              intervals={intervals}
              onDelete={deleteContraction}
              onUpdate={updateContraction}
            />
          </section>
        )}
      </main>

      <footer className="app-footer">
        All data stored locally in your browser. Nothing leaves this device.
      </footer>
    </div>
  );
}
