import { useState, useEffect } from 'react';

export const LIVE_TICK_MS = 500;
export const IDLE_TICK_MS = 60000;

// One clock for the whole app. Two stores each running their own uncleared
// interval re-rendered everything forever, even with nothing running.
export function useNow(isLive) {
  const [now, setNow] = useState(() => Date.now());
  const period = isLive ? LIVE_TICK_MS : IDLE_TICK_MS;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), period);
    return () => clearInterval(id);
  }, [period]);

  return now;
}
