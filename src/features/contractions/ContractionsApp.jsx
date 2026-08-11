import { useState } from 'react';
import { useContractionStore } from './hooks/useContractionStore';
import { TimerButton } from './components/TimerButton';
import { StatsBar } from './components/StatsBar';
import { ContractionGraph } from './components/ContractionGraph';
import { ContractionList } from './components/ContractionList';
import { buildBackup, parseBackup, contractionsToCsv } from './backup';
import { download } from '../../utils/csv';
import './contractions.css';

export default function ContractionsApp() {
  const {
    contractions, isActive, elapsed,
    avgDuration, avgInterval, longestDuration, shortestDuration,
    intervals, timeSinceLast, is511,
    durationTrend, intervalTrend, laborStage, perHour, sessionDuration,
    startContraction, stopContraction,
    updateContraction, deleteContraction, replaceAll, reset,
  } = useContractionStore();

  const [confirmReset, setConfirmReset] = useState(false);
  const [activeTab, setActiveTab] = useState('graph'); // 'graph' | 'history'
  const [notice, setNotice] = useState(null);

  const stamp = () => new Date().toISOString().slice(0, 10);

  const handleExportJson = () => download(
    `contractions-${stamp()}.json`,
    JSON.stringify(buildBackup(contractions), null, 2),
    'application/json'
  );

  const handleExportCsv = () => download(
    `contractions-${stamp()}.csv`,
    contractionsToCsv(contractions, intervals),
    'text/csv'
  );

  const handleImport = async (file) => {
    let data;
    try {
      data = parseBackup(await file.text());
    } catch (err) {
      setNotice(err.message);
      return;
    }
    if (!window.confirm(
      `Replace all local data with ${data.contractions.length} contractions from this backup? This cannot be undone.`
    )) return;
    replaceAll(data.contractions);
    setNotice(
      data.skipped > 0
        ? `Imported ${data.contractions.length} contractions · skipped ${data.skipped} unreadable`
        : `Imported ${data.contractions.length} contractions`
    );
  };

  const handleReset = () => {
    if (contractions.length === 0 && !isActive) return;
    if (confirmReset) { reset(); setConfirmReset(false); }
    else { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3000); }
  };

  return (
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
                <>
                  <button className="action-btn" onClick={handleExportJson}>
                    Backup (JSON)
                  </button>
                  <button className="action-btn" onClick={handleExportCsv}>
                    Export CSV
                  </button>
                </>
              )}
              <label className="action-btn">
                Import
                <input
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImport(file);
                    e.target.value = '';
                  }}
                />
              </label>
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
          {notice && (
            <p className="history-notice" role="status" onClick={() => setNotice(null)}>
              {notice}
            </p>
          )}
          <ContractionList
            contractions={contractions}
            intervals={intervals}
            onDelete={deleteContraction}
            onUpdate={updateContraction}
          />
        </section>
      )}
    </main>
  );
}
