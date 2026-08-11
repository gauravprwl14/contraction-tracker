import { startOfDay } from '../../../utils/dates';
import { TimelineStrip } from '../components/charts/TimelineStrip';
import { IntakePerKgChart } from '../components/charts/IntakePerKgChart';
import { GrowthChart } from '../components/charts/GrowthChart';
import { FeedGapChart } from '../components/charts/FeedGapChart';
import { DailyTotalsChart } from '../components/charts/DailyTotalsChart';
import { SideBalanceChart } from '../components/charts/SideBalanceChart';

// Ordered for someone reading it across a desk: the clinical measures first,
// then the day-shape charts, with the parent-facing side balance last.
export function ChartsScreen({ feedStore, diaperStore, growthStore, now }) {
  return (
    <div className="charts">
      <IntakePerKgChart
        feeds={feedStore.feeds}
        measurements={growthStore.measurements}
        now={now}
      />
      <GrowthChart measurements={growthStore.measurements} />
      <DailyTotalsChart feeds={feedStore.feeds} diapers={diaperStore.diapers} now={now} />
      <FeedGapChart feeds={feedStore.feeds} />
      <TimelineStrip
        feeds={feedStore.feeds}
        diapers={diaperStore.diapers}
        initialDayStart={startOfDay(now)}
        now={now}
      />
      <SideBalanceChart feeds={feedStore.feeds} now={now} />
    </div>
  );
}
