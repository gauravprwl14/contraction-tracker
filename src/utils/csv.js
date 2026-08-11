// Shared CSV + file-download helpers. Both trackers export the same way, so the
// escaping rules live in one place rather than being re-derived per feature.

const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (header, rows) =>
  [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');

export function download(filename, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
