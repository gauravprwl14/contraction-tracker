import { startOfDay, addDays } from '../../../../utils/dates';
import { sideBalance } from '../../feedLogic';

function Bar({ label, left, right }) {
  const total = left + right;
  const leftPct = total > 0 ? (left / total) * 100 : 50;
  const min = (ms) => Math.round(ms / 60000);

  return (
    <div className="balance">
      <div className="balance__head">
        <span>{label}</span>
        <span className="balance__nums">
          {total > 0 ? `L ${min(left)}m · R ${min(right)}m` : 'no breast feeds'}
        </span>
      </div>
      <div className="balance__track" aria-hidden={total === 0}>
        <div className="balance__left" style={{ width: `${leftPct}%` }} />
        <div className="balance__right" style={{ width: `${100 - leftPct}%` }} />
      </div>
    </div>
  );
}

export function SideBalanceChart({ feeds, now }) {
  // `now` comes from the ticking store clock rather than Date.now() here, since
  // calling Date.now() during render trips react-hooks/purity.
  const today = sideBalance(feeds, startOfDay(now));
  const week = sideBalance(feeds, addDays(startOfDay(now), -6));

  return (
    <div className="chart">
      <h3 className="chart__title">Left / right balance</h3>
      <Bar label="Today" left={today.leftMs} right={today.rightMs} />
      <Bar label="Last 7 days" left={week.leftMs} right={week.rightMs} />
      <p className="chart__caption">Purple is left, green is right.</p>
    </div>
  );
}
