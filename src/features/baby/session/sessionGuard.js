// Only a breast feed occupies the single active-session slot, so it is the only
// thing that can conflict. A bottle is a form-and-save entry (see BottleSheet)
// and must never be blocked by, or block, a running feed.
export function decideStart(active, requestedType) {
  if (requestedType !== 'breast') return { action: 'start', type: requestedType };
  if (!active) return { action: 'start', type: requestedType };
  return { action: 'confirm', running: active, requested: requestedType };
}

export function sessionLabel(session) {
  if (!session) return null;
  return session.type === 'breast' ? 'breast feed' : 'bottle feed';
}
