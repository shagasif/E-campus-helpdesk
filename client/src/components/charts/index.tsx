import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { computeStats } from '../../utils/complaintStats';
import { chartColors, useTheme } from '../../context/ThemeContext';

type Stats = ReturnType<typeof computeStats>;

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
  const c = chartColors(useTheme().theme);
  const summary = stats.trendData.map((d) => `${d.month}: ${d.reported} reported, ${d.resolved} resolved`).join('; ');
  return (
    <div className="chart-box chart-box-tall" role="img" aria-label={`Area chart of complaints reported and resolved per month. ${summary}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={stats.trendData} margin={{ top: 12, right: 14, left: -14, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 4" vertical={false} stroke={c.grid} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: c.axis }} tickLine={false} axisLine={{ stroke: c.grid }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: c.axis }} tickLine={false} axisLine={false} width={42} />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: c.primary, strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Area type="monotone" dataKey="reported" name="Reported" stroke={c.primary} strokeWidth={2.5} fill={c.primary} fillOpacity={0.12} dot={{ r: 3.5, fill: c.surface, stroke: c.primary, strokeWidth: 2 }} activeDot={{ r: 6, fill: c.primary, stroke: c.surface, strokeWidth: 2 }} isAnimationActive={false} />
          <Area type="monotone" dataKey="resolved" name="Resolved" stroke={c.resolved} strokeWidth={2.25} fill={c.resolved} fillOpacity={0.1} dot={{ r: 3, fill: c.surface, stroke: c.resolved, strokeWidth: 2 }} activeDot={{ r: 6, fill: c.resolved, stroke: c.surface, strokeWidth: 2 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusChart({ stats }: { stats: Stats }) {
  const c = chartColors(useTheme().theme);
  const tooltipStyle = { borderRadius: 10, background: c.surface, border: `1px solid ${c.border}`, color: c.label };
  const data = stats.statusData.filter((d) => d.value > 0);
  return (
    <div className="chart-box" role="img" aria-label="Donut chart of complaints by status">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={2} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.key} fill={c.status[d.key]} stroke={c.surface} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" formatter={(v) => <span style={{ color: c.label }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TickProps { x?: number; y?: number; payload?: { value: string }; narrow?: boolean; color?: string }

// One-line category label (no wrapping). On narrow screens long names are cut; the tooltip still shows the full name.
function CategoryTick({ x = 0, y = 0, payload, narrow, color }: TickProps) {
  const full = payload?.value ?? '';
  const text = narrow && full.length > 15 ? `${full.slice(0, 14)}…` : full;
  return <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill={color}>{text}</text>;
}

export function CategoryChart({ stats }: { stats: Stats }) {
  const c = chartColors(useTheme().theme);
  const tooltipStyle = { borderRadius: 10, background: c.surface, border: `1px solid ${c.border}`, color: c.label };
  const [narrow, setNarrow] = useState(false);
  const summary = stats.categoryData.map((d) => `${d.name}: ${d.count}`).join('; ');
  return (
    <div className="chart-box chart-box-cat" role="img" aria-label={`Bar chart of complaints by category. ${summary}`}>
      <ResponsiveContainer width="100%" height="100%" onResize={(w) => setNarrow(w < 430)}>
        <BarChart data={stats.categoryData} layout="vertical" margin={{ top: 4, right: 18, left: 0, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={c.grid} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: c.axis }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={narrow ? 118 : 196} tick={<CategoryTick narrow={narrow} color={c.label} />} tickLine={false} axisLine={false} interval={0} />
          <Tooltip cursor={{ fill: c.grid }} contentStyle={tooltipStyle} />
          <Bar dataKey="count" name="Complaints" fill={c.primary} radius={[0, 6, 6, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyBarChart({ months }: { months: { month: string; count: number }[] }) {
  const c = chartColors(useTheme().theme);
  const tooltipStyle = { borderRadius: 10, background: c.surface, border: `1px solid ${c.border}`, color: c.label };
  const summary = months.map((d) => `${d.month}: ${d.count}`).join('; ');
  return (
    <div className="chart-box chart-box-report" role="img" aria-label={`Bar chart of requests per month. ${summary}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={months} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 4" vertical={false} stroke={c.grid} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: c.axis }} tickLine={false} axisLine={{ stroke: c.grid }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: c.axis }} tickLine={false} axisLine={false} width={42} />
          <Tooltip cursor={{ fill: c.grid }} contentStyle={tooltipStyle} />
          <Bar dataKey="count" name="Requests" fill={c.primary} radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TypeStatusChart({ data }: { data: { name: string; open: number; in_progress: number; awaiting: number; completed: number }[] }) {
  const c = chartColors(useTheme().theme);
  const tooltipStyle = { borderRadius: 10, background: c.surface, border: `1px solid ${c.border}`, color: c.label };
  const summary = data.map((d) => `${d.name}: ${d.open} open, ${d.in_progress} in progress, ${d.awaiting} awaiting, ${d.completed} completed`).join('; ');
  return (
    <div className="chart-box chart-box-report" role="img" aria-label={`Stacked bar chart of status by request type. ${summary}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 4" vertical={false} stroke={c.grid} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: c.axis }} tickLine={false} axisLine={{ stroke: c.grid }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: c.axis }} tickLine={false} axisLine={false} width={42} />
          <Tooltip cursor={{ fill: c.grid }} contentStyle={tooltipStyle} />
          <Legend iconType="circle" formatter={(v) => <span style={{ color: c.label }}>{v}</span>} />
          <Bar dataKey="open" name="Open" stackId="s" fill={c.status.pending} isAnimationActive={false} />
          <Bar dataKey="in_progress" name="In progress" stackId="s" fill={c.status.in_progress} isAnimationActive={false} />
          <Bar dataKey="awaiting" name="Awaiting reply" stackId="s" fill={c.primary} isAnimationActive={false} />
          <Bar dataKey="completed" name="Completed" stackId="s" fill={c.status.resolved} radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OverallStatusPie({ data }: { data: { name: string; value: number; color: 'pending' | 'in_progress' | 'primary' | 'resolved' }[] }) {
  const c = chartColors(useTheme().theme);
  const tooltipStyle = { borderRadius: 10, background: c.surface, border: `1px solid ${c.border}`, color: c.label };
  const shown = data.filter((d) => d.value > 0);
  const fill = (k: string) => (k === 'primary' ? c.primary : c.status[k as 'pending' | 'in_progress' | 'resolved']);
  const summary = shown.map((d) => `${d.name}: ${d.value}`).join('; ');
  return (
    <div className="chart-box chart-box-report" role="img" aria-label={`Pie chart of all requests by status. ${summary}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={shown} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="80%" paddingAngle={2} isAnimationActive={false}>
            {shown.map((d) => <Cell key={d.name} fill={fill(d.color)} stroke={c.surface} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" formatter={(v) => <span style={{ color: c.label }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
