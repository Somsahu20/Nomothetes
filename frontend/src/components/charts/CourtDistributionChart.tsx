import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CourtDistributionItem } from '../../services/analytics';

interface CourtDistributionChartProps {
  data: CourtDistributionItem[];
  isDark?: boolean;
}

export function CourtDistributionChart({ data, isDark = false }: CourtDistributionChartProps) {
  // Theme-aware colors
  const colors = {
    tick: isDark ? '#9CA3AF' : '#6B7280',
    axis: isDark ? '#374151' : '#E5E7EB',
    grid: isDark ? '#374151' : '#E5E7EB',
    tooltipBg: isDark ? '#1F2937' : '#FFFFFF',
    tooltipBorder: isDark ? '#374151' : '#E5E7EB',
    tooltipText: isDark ? '#F3F4F6' : '#111827',
  };

  // Truncate long court names
  const chartData = data.slice(0, 8).map(item => ({
    ...item,
    displayName: item.court_name.length > 25
      ? item.court_name.substring(0, 22) + '...'
      : item.court_name,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis
          dataKey="displayName"
          tick={{ fontSize: 10, fill: colors.tick }}
          axisLine={{ stroke: colors.axis }}
          tickLine={{ stroke: colors.axis }}
          angle={-45}
          textAnchor="end"
          height={60}
          interval={0}
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
          itemStyle={{ color: colors.tooltipText }}
          formatter={(value, _name, props) => [
            `${value} cases (${props.payload.percentage.toFixed(1)}%)`,
            props.payload.court_name
          ]}
          labelFormatter={() => ''}
        />
        <Bar
          dataKey="count"
          fill="#8B5CF6"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
