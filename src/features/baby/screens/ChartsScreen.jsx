import { startOfDay } from '../../../utils/dates';
import { TimelineStrip } from '../components/charts/TimelineStrip';
import { FeedGapChart } from '../components/charts/FeedGapChart';
import { DailyTotalsChart } from '../components/charts/DailyTotalsChart';
import { SideBalanceChart } from '../components/charts/SideBalanceChart';

export function ChartsScreen({ feedStore, diaperStore, now }) {
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
