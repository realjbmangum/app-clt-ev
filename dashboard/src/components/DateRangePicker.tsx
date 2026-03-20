import { useState } from 'react'

export type RangeKey = '7d' | '30d' | '90d' | '1y' | 'custom'

interface DateRangePickerProps {
  value: RangeKey
  onChange: (range: RangeKey) => void
}

const options: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '1y', label: '1 Year' },
  { key: 'custom', label: 'Custom' },
]

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            value === opt.key
              ? 'bg-white text-charlotte-navy shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function useFilteredData<T extends { date: string }>(data: T[], range: RangeKey): T[] {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : range === '1y' ? 365 : 90
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return data.filter((d) => d.date >= cutoffStr)
}
