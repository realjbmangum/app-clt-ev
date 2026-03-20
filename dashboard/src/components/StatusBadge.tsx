const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  OCCUPIED: 'bg-blue-100 text-blue-800',
  UNREACHABLE: 'bg-orange-100 text-orange-800',
  FAULTED: 'bg-red-100 text-red-800',
}

type Props = {
  status: string
  className?: string
}

export default function StatusBadge({ status, className = '' }: Props) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-800'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style} ${className}`}>
      {status}
    </span>
  )
}
