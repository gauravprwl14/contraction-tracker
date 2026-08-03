import { useState, useEffect } from 'react';
import ContractionsApp from './features/contractions/ContractionsApp';
import BabyApp from './features/baby/BabyApp';
import { loadValue, saveValue } from './utils/storage';

const MODE_KEY = 'app_mode_v1';

export default function App() {
  const [mode, setMode] = useState(() => loadValue(MODE_KEY, 'baby'));

  useEffect(() => {
    saveValue(MODE_KEY, mode);
  }, [mode]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="mode-switch" role="tablist" aria-label="App mode">
          <button
            role="tab"
            aria-selected={mode === 'baby'}
            className={`mode-switch__btn ${mode === 'baby' ? 'mode-switch__btn--active' : ''}`}
            onClick={() => setMode('baby')}
          >
            Baby
          </button>
          <button
            role="tab"
            aria-selected={mode === 'contractions'}
            className={`mode-switch__btn ${mode === 'contractions' ? 'mode-switch__btn--active' : ''}`}
            onClick={() => setMode('contractions')}
          >
            Contractions
          </button>
        </div>
        <h1 className="app-title">
          {mode === 'baby' ? 'Baby Tracker' : 'Contraction Tracker'}
        </h1>
        <p className="app-subtitle">Offline · All data stays on your device</p>
      </header>

      {mode === 'baby' ? <BabyApp /> : <ContractionsApp />}

      <footer className="app-footer">
        All data stored locally in your browser. Nothing leaves this device.
      </footer>
    </div>
  );
}
