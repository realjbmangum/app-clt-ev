import { type ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  dateRange?: { value: string; onChange: (v: string) => void }
  children: ReactNode
  className?: string
}

export default function ChartCard({ title, subtitle, dateRange, children, className = '' }: Props) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-charlotte-black">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {dateRange && (
          <select
            value={dateRange.value}
            onChange={(e) => dateRange.onChange(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        )}
      </div>
      {children}
    </div>
  )
}
