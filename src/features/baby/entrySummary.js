import { formatMs } from '../../utils/format';
import { feedDurationMs } from './feedLogic';

export function feedSummary(feed) {
  if (!feed) return null;
  if (feed.type === 'breast') {
    const parts = [];
    if (feed.leftMs > 0) parts.push(`L ${Math.round(feed.leftMs / 60000)}m`);
    if (feed.rightMs > 0) parts.push(`R ${Math.round(feed.rightMs / 60000)}m`);
    return parts.join(' · ') || formatMs(feedDurationMs(feed));
  }
  return `${feed.takenMl} ml · ${feed.milk === 'formula' ? 'Formula' : 'Expressed'}`;
}

export function diaperSummary(d) {
  if (d.pee && d.poop) return 'Pee + poop';
  return d.poop ? 'Poop' : 'Pee';
}

export function entryIcon(kind, item) {
  if (kind === 'feed') return item.type === 'breast' ? 'breast' : 'bottle';
  return item.poop ? 'poop' : 'pee';
}
