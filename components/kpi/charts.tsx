'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  MonthlyHoursPoint,
  RevenueMixSlice,
  TopPropertyRow,
} from '@/lib/kpi/charts';

const COLORS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#0ea5e9',
  '#84cc16',
  '#ec4899',
];

function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(0)}h`;
}

function formatCurrency(cents: number): string {
  return `${(cents / 100).toLocaleString('de-CH', { maximumFractionDigits: 0 })}`;
}

export function MonthlyHoursTrendChart({ data }: { data: MonthlyHoursPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={formatHours} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) => [`${(value / 60).toFixed(1)}h`, '']}
          labelStyle={{ color: '#0f172a' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="totalMinutes"
          name="Totale"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="extraMinutes"
          name="EXTRA"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="4 2"
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RevenueMixChart({ data }: { data: RevenueMixSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-slate-500">
        Nessun ricavo nel periodo.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="totalCents"
          nameKey="workType"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`CHF ${formatCurrency(value)}`, '']}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TopPropertiesChart({ data }: { data: TopPropertyRow[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-slate-500">
        Nessun intervento nel periodo.
      </div>
    );
  }

  // Trasforma minuti → ore per il chart, mantiene il label originale
  const chartData = data.map((row) => ({
    name: row.propertyName.length > 20
      ? `${row.propertyName.slice(0, 20)}…`
      : row.propertyName,
    fullName: row.propertyName,
    client: row.clientName,
    hours: Number((row.totalMinutes / 60).toFixed(1)),
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 32)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => `${v}h`} tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value: number) => [`${value}h`, 'Ore']}
          labelFormatter={(label, items) => {
            const row = items?.[0]?.payload as { fullName?: string; client?: string };
            return row ? `${row.fullName} · ${row.client}` : String(label);
          }}
        />
        <Bar dataKey="hours" fill="#2563eb" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
