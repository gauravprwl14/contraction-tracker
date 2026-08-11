export function formatDuration(seconds) {
  if (seconds == null) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

export function formatMs(ms) {
  if (ms == null) return '--';
  return formatDuration(Math.round(ms / 1000));
}

// Coarse "how long ago" for banners: 2h 10m, 45m, just now
export function formatGap(ms) {
  if (ms == null) return '--';
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return 'just now';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
