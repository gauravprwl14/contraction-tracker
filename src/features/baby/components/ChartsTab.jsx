import { startOfDay } from '../../../utils/dates';
import { TimelineStrip } from './charts/TimelineStrip';
import { FeedGapChart } from './charts/FeedGapChart';
import { DailyTotalsChart } from './charts/DailyTotalsChart';
import { SideBalanceChart } from './charts/SideBalanceChart';

export function ChartsTab({ feedStore, diaperStore }) {
  // `now` is threaded down from the store's ticking clock instead of calling
  // Date.now() during render, which react-hooks/purity forbids.
  const { now } = feedStore;

  return (
    <div className="charts">
      <TimelineStrip
        feeds={feedStore.feeds}
        diapers={diaperStore.diapers}
        initialDayStart={startOfDay(now)}
        now={now}
      />
      <FeedGapChart feeds={feedStore.feeds} />
      <DailyTotalsChart feeds={feedStore.feeds} diapers={diaperStore.diapers} now={now} />
      <SideBalanceChart feeds={feedStore.feeds} now={now} />
    </div>
  );
}
