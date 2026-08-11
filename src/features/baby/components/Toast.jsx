import { useEffect } from 'react';

export function Toast({ message, onUndo, onDismiss, duration = 5000 }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [onDismiss, duration, message]);

  return (
    <div className="toast" role="status">
      <span className="toast__msg">{message}</span>
      {onUndo && (
        <button
          className="toast__undo"
          onClick={() => { onUndo(); onDismiss(); }}
        >
          Undo
        </button>
      )}
    </div>
  );
}
