import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, BarChart3, HelpCircle } from 'lucide-react';

interface GroupExpense {
  amount: number;
  date: string;
}

interface Group {
  id: string;
  name: string;
  currency: string;
  expenses: GroupExpense[];
}

interface SpendingTrendChartProps {
  groups: Group[];
}

const LINE_COLORS = [
  '#0b4c72', // Signal Blue
  '#cb272f', // Alarm Red
  '#a855f7', // Purple
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#e11d48', // Rose
];

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({ groups }) => {
  // 1. Generate last 6 months chronological list
  const getLast6Months = () => {
    const result = [];
    const d = new Date();
    // Start 5 months ago to land on the current month index
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const monthLabel = targetDate.toLocaleString('default', { month: 'short' });
      const yearLabel = targetDate.getFullYear();
      result.push({
        key: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
        label: `${monthLabel} ${yearLabel}`,
        year: targetDate.getFullYear(),
        month: targetDate.getMonth(),
      });
    }
    return result;
  };

  const monthsList = getLast6Months();

  // 2. Parse expenses and group sums by month
  const chartData = monthsList.map((m) => {
    const dataPoint: { [key: string]: any } = { month: m.label };
    groups.forEach((g) => {
      const totalInMonth = (g.expenses || []).reduce((sum, exp) => {
        if (!exp.date) return sum;
        const expDate = new Date(exp.date);
        if (expDate.getFullYear() === m.year && expDate.getMonth() === m.month) {
          return sum + (exp.amount || 0);
        }
        return sum;
      }, 0);
      
      // Store rounded amount
      dataPoint[g.name] = Number(totalInMonth.toFixed(2));
    });
    return dataPoint;
  });

  // Calculate if there's any expenses logged in the dataset to show friendly placeholder
  const totalSpendAcrossDataset = groups.reduce((total, g) => {
    return total + (g.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  }, 0);

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-paper dark:bg-fog border border-forest-ink/10 dark:border-white/10 p-3 rounded-[10px] shadow-md font-sans text-xs">
          <p className="font-bold text-obsidian mb-1 border-b border-forest-ink/5 dark:border-white/5 pb-1">{label}</p>
          <div className="space-y-1.5 min-w-[120px]">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-charcoal dark:text-gray-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke }} />
                  {entry.name}
                </span>
                <span className="font-mono font-bold text-obsidian">
                  {entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-fog p-5 sm:p-6 rounded-[10px] border border-forest-ink/10 shadow-sm relative overflow-hidden mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <span className="text-[9px] uppercase font-mono tracking-widest font-bold text-slate block mb-1">Visual Analytics</span>
          <h3 className="font-sans font-extrabold text-sm uppercase tracking-tight text-obsidian flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-forest-ink dark:text-lime-voltage" />
            Spending Trends (Last 6 Months)
          </h3>
          <p className="text-xs text-charcoal mt-0.5">Track how each group bill share has accumulated chronologically.</p>
        </div>
        {groups.length > 0 && totalSpendAcrossDataset > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase py-1 px-2.5 bg-paper dark:bg-spruce/30 border border-forest-ink/5 dark:border-white/5 text-forest-ink rounded-full">
            <span className="w-2 h-2 rounded-full bg-forest-ink dark:bg-lime-voltage animate-pulse" />
            Live Sync ACTIVE
          </div>
        )}
      </div>

      {groups.length === 0 || totalSpendAcrossDataset === 0 ? (
        <div className="h-[240px] border border-dashed border-forest-ink/10 rounded-[10px] bg-paper/50 flex flex-col items-center justify-center p-6 text-center">
          <BarChart3 className="w-8 h-8 text-slate mb-2" />
          <p className="text-xs font-bold text-obsidian uppercase tracking-wider">No Spending Data Available</p>
          <p className="text-[11px] text-charcoal max-w-xs mt-1">
            Once you formulate bill sharing groups and record structured split expenses, their monthly chronological trend lines will build automatically.
          </p>
        </div>
      ) : (
        <div className="h-[280px] w-full mt-4 bg-paper/30 dark:bg-white/[0.01] p-2 rounded-lg border border-forest-ink/5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--forest-ink)" stopOpacity={0.06} />
                  <stop offset="95%" stopColor="var(--forest-ink)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="4 4" 
                stroke="var(--color-slate)" 
                opacity={0.15} 
                vertical={false}
              />
              <XAxis
                dataKey="month"
                stroke="var(--color-slate)"
                fontSize={10}
                fontWeight="bold"
                fontFamily="var(--font-mono)"
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis
                stroke="var(--color-slate)"
                fontSize={10}
                fontWeight="bold"
                fontFamily="var(--font-mono)"
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => val.toLocaleString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  fontFamily: 'Inter, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  paddingBottom: '10px'
                }}
              />
              {groups.map((g, idx) => {
                // Get the line color, loop over array if we have more groups than colors
                const strokeColor = LINE_COLORS[idx % LINE_COLORS.length];
                return (
                  <Line
                    key={g.id}
                    type="monotone"
                    dataKey={g.name}
                    name={g.name}
                    stroke={strokeColor}
                    strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 1 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
