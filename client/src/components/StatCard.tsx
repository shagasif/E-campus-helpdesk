import { Icon, type IconName } from './Icon';
import type { Trend } from '../utils/trend';

interface Props {
  label: string;
  value: number | string;
  icon: IconName;
  tone?: 'pending' | 'in_progress' | 'resolved' | 'gold';
  hint?: string;
  trend?: Trend;
  /** Whether a rising number is good news (green) or something to watch (amber). Omit for neutral. */
  upIsGood?: boolean;
}

function TrendChip({ trend, upIsGood }: { trend: Trend; upIsGood?: boolean }) {
  if (trend.dir === 'flat' && trend.pct === null) return <span className="trend trend-flat"><Icon name="minus" size={13} /> No change</span>;
  const icon: IconName = trend.dir === 'up' ? 'arrowup' : trend.dir === 'down' ? 'arrowdown' : 'minus';
  const good = upIsGood === undefined || trend.dir === 'flat' ? 'neutral' : (trend.dir === 'up') === upIsGood ? 'good' : 'watch';
  const text = trend.pct === null ? 'New' : `${trend.pct}%`;
  const word = trend.dir === 'up' ? 'up' : trend.dir === 'down' ? 'down' : 'unchanged';
  return (
    <span className={`trend trend-${good}`} title={`${trend.cur} created this month, ${trend.prev} last month`}>
      <Icon name={icon} size={13} /> {text}
      <span className="visually-hidden"> {word} compared with last month</span>
    </span>
  );
}

export function StatCard({ label, value, icon, tone, hint, trend, upIsGood }: Props) {
  return (
    <div className={`card stat-card stat-${tone ?? 'neutral'}`}>
      <span className="stat-icon"><Icon name={icon} size={18} /></span>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-row">
          <span className="stat-value">{value}</span>
          {trend && <TrendChip trend={trend} upIsGood={upIsGood} />}
        </div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}
