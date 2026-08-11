import { useState } from 'react';
import { startOfDay } from '../../../utils/dates';
import { DEFAULT_CHART_RANGE, resolveChartRange } from '../chartRange';
import { ChartRangeBar } from '../components/charts/ChartRangeBar';
import { TimelineStrip } from '../components/charts/TimelineStrip';
import { IntakePerKgChart } from '../components/charts/IntakePerKgChart';
import { GrowthChart } from '../components/charts/GrowthChart';
import { FeedGapChart } from '../components/charts/FeedGapChart';
import { DailyTotalsChart } from '../components/charts/DailyTotalsChart';
import { SideBalanceChart } from '../components/charts/SideBalanceChart';

// Ordered for someone reading it across a desk: the clinical measures first,
// then the day-shape charts, with the parent-facing side balance last.
export function ChartsScreen({ feedStore, diaperStore, growthStore, now }) {
  const [range, setRange] = useState(DEFAULT_CHART_RANGE);
  const resolved = resolveChartRange(range, now);

  return (
    <div className="charts">
      <ChartRangeBar range={range} onChange={setRange} now={now} resolved={resolved} />

      <IntakePerKgChart
        feeds={feedStore.feeds}
        measurements={growthStore.measurements}
        anchor={resolved.anchor}
        days={resolved.days}
      />
      <GrowthChart measurements={growthStore.measurements} />
      <DailyTotalsChart
        feeds={feedStore.feeds}
        diapers={diaperStore.diapers}
        anchor={resolved.anchor}
        days={resolved.days}
      />
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
