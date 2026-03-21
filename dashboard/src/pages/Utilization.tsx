import { useState } from 'react'
import ChartCard from '../components/ChartCard'
import DateRangePicker, { type RangeKey } from '../components/DateRangePicker'
import FilterPanel from '../components/FilterPanel'
import EmptyState from '../components/EmptyState'

const orgUnitFilters = [
  { key: 'orgUnit', label: 'Org Unit', options: [
    { label: 'City of Charlotte', value: 'city' },
    { label: 'CLT Airport', value: 'airport' },
    { label: 'Water Services', value: 'water' },
  ]},
]

export default function Utilization() {
  const [range, setRange] = useState<RangeKey>('30d')
  const [filters, setFilters] = useState<Record<string, string>>({})

  const emptyDescription = 'Session data will populate once ChargePoint sync is active'

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-charlotte-black">Utilization</h1>
        <div className="flex flex-wrap items-center gap-4">
          <FilterPanel
            filters={orgUnitFilters}
            values={filters}
            onChange={(k, v) => setFilters({ ...filters, [k]: v })}
          />
          <DateRangePicker value={range} onChange={setRange} />
        </div>
      </div>

      {/* Sessions over time */}
      <ChartCard title="Sessions Over Time">
        <EmptyState title="No utilization data available yet" description={emptyDescription} />
      </ChartCard>

      {/* Station rankings */}
      <ChartCard title="Top 20 Stations by Sessions">
        <EmptyState title="No utilization data available yet" description={emptyDescription} />
      </ChartCard>

      {/* Usage Heatmap */}
      <ChartCard title="Usage Heatmap (Sessions by Hour & Day)">
        <EmptyState title="No utilization data available yet" description={emptyDescription} />
      </ChartCard>

      {/* Avg Session Duration */}
      <ChartCard title="Average Session Duration (Minutes)">
        <EmptyState title="No utilization data available yet" description={emptyDescription} />
      </ChartCard>
    </div>
  )
}
