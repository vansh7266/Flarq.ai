import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../ui/Card'

interface ResponseDatum {
  week: string
  rate: number
}

interface ResponseRateChartProps {
  data?: ResponseDatum[]
}

const placeholder: ResponseDatum[] = [
  { week: 'W1', rate: 12 },
  { week: 'W2', rate: 18 },
  { week: 'W3', rate: 9 },
  { week: 'W4', rate: 22 },
]

export function ResponseRateChart({ data }: ResponseRateChartProps) {
  const chartData = data ?? placeholder

  return (
    <Card className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-text-primary">Response rate</p>
        <p className="text-xs text-text-muted">
          Powered by MongoDB aggregations in Phase 2.
        </p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a24',
                border: '1px solid #2a2a3a',
                borderRadius: 8,
              }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
