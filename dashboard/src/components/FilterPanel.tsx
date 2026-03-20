type FilterOption = {
  label: string
  value: string
}

type FilterDef = {
  key: string
  label: string
  options: FilterOption[]
}

type Props = {
  filters: FilterDef[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

export default function FilterPanel({ filters, values, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 p-4">
      {filters.map((filter) => (
        <div key={filter.key} className="flex items-center gap-2">
          <label htmlFor={filter.key} className="text-sm text-gray-500 whitespace-nowrap">
            {filter.label}
          </label>
          <select
            id={filter.key}
            value={values[filter.key] || ''}
            onChange={(e) => onChange(filter.key, e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-charlotte-green-dark focus:border-transparent"
          >
            <option value="">All</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
