import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { computeStats } from '../../utils/complaintStats';

type Stats = ReturnType<typeof computeStats>;
const STATUS_COLORS = { pending: '#F59E0B', in_progress: '#2563EB', resolved: '#16A34A' };
const tooltipStyle = { borderRadius: 10, border: '1px solid #EFE7D2', boxShadow: '0 4px 16px rgba(60,40,10,0.08)' };

interface TipProps { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }

function TrendTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <div className="chart-tip-title">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="chart-tip-row">
          <i style={{ background: p.color }} />
          <span>{p.name}</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ stats }: { stats: Stats }) {
  const summary = stats.trendData.map((d) => `${d.month}: ${d.reported} reported, ${d.resolved} resolved`).join('; ');
  return (
    <div className="chart-box chart-box-tall" role="img" aria-label={`Area chart of complaints reported and resolved per month. ${summary}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={stats.trendData} margin={{ top: 12, right: 14, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="gReported" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FACC15" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#FACC15" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16A34A" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#16A34A" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#EFE7D2" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#EFE7D2' }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} width={42} />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#5B1020', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Area type="monotone" dataKey="reported" name="Reported" stroke="#5B1020" strokeWidth={2.75} fill="url(#gReported)" dot={{ r: 3.5, fill: '#fff', stroke: '#5B1020', strokeWidth: 2 }} activeDot={{ r: 6.5, fill: '#FACC15', stroke: '#5B1020', strokeWidth: 2.5 }} isAnimationActive={false} />
          <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#16A34A" strokeWidth={2.5} fill="url(#gResolved)" dot={{ r: 3, fill: '#fff', stroke: '#16A34A', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#16A34A', stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusChart({ stats }: { stats: Stats }) {
  const data = stats.statusData.filter((d) => d.value > 0);
  return (
    <div className="chart-box" role="img" aria-label="Donut chart of complaints by status">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={2} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TickProps { x?: number; y?: number; payload?: { value: string }; narrow?: boolean }

// One-line category label (no wrapping). On narrow screens long names are cut; the tooltip still shows the full name.
function CategoryTick({ x = 0, y = 0, payload, narrow }: TickProps) {
  const full = payload?.value ?? '';
  const text = narrow && full.length > 15 ? `${full.slice(0, 14)}…` : full;
  return <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill="#374151">{text}</text>;
}

export function CategoryChart({ stats }: { stats: Stats }) {
  const [narrow, setNarrow] = useState(false);
  const summary = stats.categoryData.map((d) => `${d.name}: ${d.count}`).join('; ');
  return (
    <div className="chart-box chart-box-cat" role="img" aria-label={`Bar chart of complaints by category. ${summary}`}>
      <ResponsiveContainer width="100%" height="100%" onResize={(w) => setNarrow(w < 430)}>
        <BarChart data={stats.categoryData} layout="vertical" margin={{ top: 4, right: 18, left: 0, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EFE7D2" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={narrow ? 118 : 196} tick={<CategoryTick narrow={narrow} />} tickLine={false} axisLine={false} interval={0} />
          <Tooltip cursor={{ fill: '#FFF8E8' }} contentStyle={tooltipStyle} />
          <Bar dataKey="count" name="Complaints" fill="#FACC15" stroke="#EAB308" radius={[0, 6, 6, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
