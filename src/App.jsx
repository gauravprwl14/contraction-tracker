import { useState, useEffect } from 'react';
import ContractionsApp from './features/contractions/ContractionsApp';
import BabyApp from './features/baby/BabyApp';
import { loadValue, saveValue } from './utils/storage';

const MODE_KEY = 'app_mode_v1';
const THEME_KEY = 'app_theme_v1';

const MODES = [
  { id: 'baby', label: 'Baby' },
  { id: 'contractions', label: 'Contractions' },
];

const THEMES = [
  { id: 'system', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

function Seg({ label, options, value, onChange }) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          className={`seg__btn ${value === o.id ? 'seg__btn--active' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(() => loadValue(MODE_KEY, 'baby'));
  const [theme, setTheme] = useState(() => loadValue(THEME_KEY, 'system'));

  useEffect(() => { saveValue(MODE_KEY, mode); }, [mode]);

  useEffect(() => {
    saveValue(THEME_KEY, theme);
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">
            {mode === 'baby' ? 'Baby Tracker' : 'Contraction Tracker'}
          </h1>
          <p className="app-subtitle">Offline · all data stays on this device</p>
        </div>
        <Seg label="Theme" options={THEMES} value={theme} onChange={setTheme} />
      </header>

      <Seg label="App mode" options={MODES} value={mode} onChange={setMode} />

      {mode === 'baby' ? <BabyApp /> : <ContractionsApp />}

      <footer className="app-footer">
        All data stored locally in your browser. Nothing leaves this device.
      </footer>
    </div>
  );
}
