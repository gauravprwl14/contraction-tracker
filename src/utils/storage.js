const VERSION = 1;

function backupCorrupt(key, raw) {
  try {
    localStorage.setItem(`${key}__corrupt_backup`, raw);
  } catch {
    // storage full — nothing useful we can do
  }
}

export function loadItems(key) {
  const raw = localStorage.getItem(key);
  if (raw == null) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    backupCorrupt(key, raw);
    return [];
  }
  if (Array.isArray(parsed)) return parsed; // legacy bare array
  if (parsed && Array.isArray(parsed.items)) return parsed.items;
  return [];
}

export function saveItems(key, items) {
  localStorage.setItem(key, JSON.stringify({ version: VERSION, items }));
}

export function loadValue(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    backupCorrupt(key, raw);
    return fallback;
  }
}

export function saveValue(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
