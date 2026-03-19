import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { Pet } from '../../types/pet';

/** Chart color constants (Tailwind palette references) */
const CHART_EMERALD = '#10b981'; // emerald-500

interface WeightTrendChartProps {
  pet: Pet;
}

export function WeightTrendChart({ pet }: WeightTrendChartProps) {
  const data = useMemo(() => {
    const history = pet.weightHistory ?? [];
    // Include current weight as latest point if not already in history
    const currentWeight = parseFloat(pet.weight);
    const entries = [...history];
    if (!isNaN(currentWeight) && currentWeight > 0) {
      const today = new Date().toISOString().split('T')[0];
      if (!entries.some(e => e.date === today)) {
        entries.push({ date: today, weight: currentWeight });
      }
    }
    return entries
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(e => ({
        date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: e.weight,
      }));
  }, [pet.weightHistory, pet.weight]);

  if (data.length < 2) return null;

  const unit = pet.weightUnit ?? 'lbs';

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Weight Trend</p>
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-700" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-neutral-400" />
            <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} className="text-neutral-400" />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)' }}
              formatter={(value) => {
                const n = Number(value ?? 0);
                return [`${n} ${unit}`, 'Weight'];
              }}
            />
            <Line type="monotone" dataKey="weight" stroke={CHART_EMERALD} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
