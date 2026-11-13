import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export const COLORS = ['#1E40AF', '#0D9488', '#F59E0B', '#DC2626', '#7C3AED', '#0891B2', '#65A30D', '#DB2777', '#64748B', '#EA580C']
const axis = { stroke: '#94a3b8', fontSize: 11, tickLine: false, axisLine: false } as const
const tip = { contentStyle: { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#0f172a' } }
const fmt = (v: any) => (typeof v === 'number' && v >= 1000 ? `${(v / 1000).toFixed(v >= 1e5 ? 0 : 1)}k` : v)
type P = { data: any[]; x?: string; keys?: string[]; height?: number; stacked?: boolean; colors?: string[] }

export function AreaC({ data, x = 'name', keys = ['value'], height = 260, colors = COLORS }: P) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <defs>{keys.map((k, i) => <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={colors[i]} stopOpacity={0.35} /><stop offset="95%" stopColor={colors[i]} stopOpacity={0} /></linearGradient>)}</defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} /><XAxis dataKey={x} {...axis} /><YAxis {...axis} tickFormatter={fmt} /><Tooltip {...tip} />{keys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {keys.map((k, i) => <Area key={k} type="monotone" dataKey={k} stroke={colors[i]} strokeWidth={2} fill={`url(#g-${k})`} />)}
      </AreaChart>
    </ResponsiveContainer>
  )
}
export function BarC({ data, x = 'name', keys = ['value'], height = 260, stacked, colors = COLORS, horizontal }: P & { horizontal?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: horizontal ? 24 : -12, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={!!horizontal} horizontal={!horizontal} />
        {horizontal ? <><XAxis type="number" {...axis} tickFormatter={fmt} /><YAxis type="category" dataKey={x} {...axis} width={96} /></> : <><XAxis dataKey={x} {...axis} interval={0} tick={{ fontSize: 10 }} /><YAxis {...axis} tickFormatter={fmt} /></>}
        <Tooltip {...tip} cursor={{ fill: '#94a3b81a' }} />{keys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {keys.map((k, i) => <Bar key={k} dataKey={k} stackId={stacked ? 'a' : undefined} fill={colors[i]} radius={stacked ? 0 : 4} maxBarSize={36} />)}
      </BarChart>
    </ResponsiveContainer>
  )
}
export function LineC({ data, x = 'name', keys = ['value'], height = 260, colors = COLORS }: P) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} /><XAxis dataKey={x} {...axis} /><YAxis {...axis} tickFormatter={fmt} domain={['auto', 'auto']} /><Tooltip {...tip} />{keys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={colors[i]} strokeWidth={2} dot={{ r: 3 }} />)}
      </LineChart>
    </ResponsiveContainer>
  )
}
export function PieC({ data, height = 260, colors = COLORS, donut = true, center }: { data: { name: string; value: number }[]; height?: number; colors?: string[]; donut?: boolean; center?: React.ReactNode }) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={donut ? '58%' : 0} outerRadius="82%" paddingAngle={2} strokeWidth={0}>{data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip {...tip} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /></PieChart>
      </ResponsiveContainer>
      {center && <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center pb-7" style={{ height: height - 28 }}><div className="text-center">{center}</div></div>}
    </div>
  )
}
