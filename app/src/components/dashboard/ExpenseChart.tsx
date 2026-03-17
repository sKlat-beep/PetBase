import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { Expense } from '../../contexts/ExpenseContext';

/** Chart color constants (Tailwind palette references) */
const CHART_EMERALD = '#10b981'; // emerald-500

interface ExpenseChartProps {
  expenses: Expense[];
}

export function ExpenseChart({ expenses }: ExpenseChartProps) {
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }

    expenses.forEach(exp => {
      const d = new Date(exp.date);
      if (isNaN(d.getTime())) return;
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (key in months) {
        months[key] += exp.amount;
      }
    });

    return Object.entries(months).map(([month, total]) => ({
      month,
      total: Math.round(total * 100) / 100,
    }));
  }, [expenses]);

  if (expenses.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Monthly Spending (6 months)</p>
      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-700" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} className="text-neutral-400" />
            <YAxis tick={{ fontSize: 10 }} className="text-neutral-400" />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
            />
            <Bar dataKey="total" fill={CHART_EMERALD} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
