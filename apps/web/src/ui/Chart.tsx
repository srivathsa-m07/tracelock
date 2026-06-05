import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS: Record<string, string> = {
  LOW: '#2ecc71',
  MEDIUM: '#f1c40f',
  HIGH: '#f39c12',
  CRITICAL: '#d64545',
};
const FALLBACK_COLORS = ['#2b6cb0', '#60a5fa', '#7c3aed', '#c084fc'];

export default function Chart({ data }: { data: Array<{ name: string; value: number }> }) {
  const nonZero = data.filter((d) => d.value > 0);
  if (!nonZero.length) return null;

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={nonZero} dataKey="value" nameKey="name" innerRadius={44} outerRadius={72} paddingAngle={3}>
            {nonZero.map((entry, i) => (
              <Cell key={entry.name} fill={COLORS[entry.name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [value, name]} />
          <Legend iconType="circle" iconSize={10} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
