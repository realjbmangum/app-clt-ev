import { ArrowUp, ArrowDown } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

type Props = {
  label: string
  value: string | number
  trend?: { direction: 'up' | 'down'; value: string }
  sparklineData?: { value: number }[]
  className?: string
}

export default function KPICard({ label, value, trend, sparklineData, className = '' }: Props) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-charlotte-black">{value}</p>
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${
          trend.direction === 'up' ? 'text-charlotte-green-light' : 'text-charlotte-red'
        }`}>
          {trend.direction === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          <span>{trend.value}</span>
        </div>
      )}
      {sparklineData && sparklineData.length > 0 ? (
        <div className="mt-3 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line type="monotone" dataKey="value" stroke="#24824A" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-3 h-8 bg-gray-50 rounded" />
      )}
    </div>
  )
}
