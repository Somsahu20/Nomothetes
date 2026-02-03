import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TimeSeriesDataPoint } from '../../services/analytics';

interface CasesOverTimeChartProps {
  data: TimeSeriesDataPoint[];
  periodType: string;
  isDark?: boolean;
}

export function CasesOverTimeChart({ data, periodType, isDark = false }: CasesOverTimeChartProps) {
  // Theme-aware colors
  const colors = {
    tick: isDark ? '#9CA3AF' : '#6B7280',
    axis: isDark ? '#374151' : '#E5E7EB',
    grid: isDark ? '#374151' : '#E5E7EB',
    tooltipBg: isDark ? '#1F2937' : '#FFFFFF',
    tooltipBorder: isDark ? '#374151' : '#E5E7EB',
    tooltipText: isDark ? '#F3F4F6' : '#111827',
  };

  // Format period label based on type
  const formatPeriod = (period: string) => {
    if (periodType === 'month') {
      const [year, month] = period.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
    if (periodType === 'week') {
      return period; // e.g., "2024-W05"
    }
    // day format
    const date = new Date(period);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formattedData = data.map(item => ({
    ...item,
    formattedPeriod: formatPeriod(item.period),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={formattedData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis
          dataKey="formattedPeriod"
          tick={{ fontSize: 12, fill: colors.tick }}
          axisLine={{ stroke: colors.axis }}
          tickLine={{ stroke: colors.axis }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: colors.tick }}
          axisLine={{ stroke: colors.axis }}
          tickLine={{ stroke: colors.axis }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: colors.tooltipBg,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            color: colors.tooltipText,
          }}
          labelStyle={{ color: colors.tooltipText, fontWeight: 600 }}
          itemStyle={{ color: colors.tooltipText }}
          formatter={(value) => [value, 'Cases']}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#3B82F6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorCases)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
