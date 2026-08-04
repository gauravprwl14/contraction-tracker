// Only one feed session may exist at a time. Starting a second one must never
// silently overwrite the first — the caller renders a confirm dialog instead.
export function decideStart(active, requestedType) {
  if (!active) return { action: 'start', type: requestedType };
  return { action: 'confirm', running: active, requested: requestedType };
}

export function sessionLabel(session) {
  if (!session) return null;
  return session.type === 'breast' ? 'breast feed' : 'bottle feed';
}
