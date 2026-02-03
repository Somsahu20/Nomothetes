import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TopEntityItem } from '../../services/analytics';

interface TopEntitiesChartProps {
  data: TopEntityItem[];
  isDark?: boolean;
}

// Color palette for entity types
const ENTITY_COLORS: Record<string, string> = {
  PERSON: '#3B82F6',
  ORG: '#EC4899',
  COURT: '#8B5CF6',
  DATE: '#10B981',
  LOCATION: '#F97316',
  GPE: '#F97316',
  MONEY: '#EAB308',
  LAW: '#6366F1',
  UNKNOWN: '#6B7280',
};

export function TopEntitiesChart({ data, isDark = false }: TopEntitiesChartProps) {
  // Theme-aware colors
  const colors = {
    tick: isDark ? '#9CA3AF' : '#6B7280',
    tickLabel: isDark ? '#D1D5DB' : '#374151',
    axis: isDark ? '#374151' : '#E5E7EB',
    grid: isDark ? '#374151' : '#E5E7EB',
    tooltipBg: isDark ? '#1F2937' : '#FFFFFF',
    tooltipBorder: isDark ? '#374151' : '#E5E7EB',
    tooltipText: isDark ? '#F3F4F6' : '#111827',
  };

  const getColor = (type: string) => {
    return ENTITY_COLORS[type.toUpperCase()] || '#6B7280';
  };

  // Truncate long names more aggressively to prevent overlap
  const chartData = data.slice(0, 8).map(item => ({
    ...item,
    displayName: item.name.length > 15 ? item.name.substring(0, 12) + '...' : item.name,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        barCategoryGap="15%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={true} vertical={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: colors.tick }}
          axisLine={{ stroke: colors.axis }}
          tickLine={{ stroke: colors.axis }}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="displayName"
          tick={{ fontSize: 10, fill: colors.tickLabel }}
          axisLine={{ stroke: colors.axis }}
          tickLine={false}
          width={100}
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
            `${value} cases (${props.payload.occurrence_count} mentions)`,
            props.payload.name
          ]}
          labelFormatter={() => ''}
        />
        <Bar dataKey="case_count" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.entity_type)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
