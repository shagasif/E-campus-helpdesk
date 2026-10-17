import { Icon, type IconName } from './Icon';

export function StatCard({ label, value, icon, tone, hint }: { label: string; value: number | string; icon: IconName; tone?: 'pending' | 'in_progress' | 'resolved' | 'gold'; hint?: string }) {
  return (
    <div className={`card stat-card stat-${tone ?? 'neutral'}`}>
      <span className="stat-icon"><Icon name={icon} size={20} /></span>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}
