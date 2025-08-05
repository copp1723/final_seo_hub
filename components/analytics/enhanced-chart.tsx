'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp, BarChart3, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChartData {
  date: string
  value: number
  secondaryValue?: number
  label?: string
}

interface EnhancedChartProps {
  title: string
  description?: string
  data: ChartData[]
  type?: 'line' | 'bar' | 'area'
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'emerald'
  showSecondary?: boolean
  secondaryColor?: 'blue' | 'green' | 'orange' | 'purple' | 'emerald'
  height?: number
  className?: string
  loading?: boolean
}

const colorMap = {
  blue: {
    primary: '#3b82f6',
    gradient: ['#3b82f6', '#1d4ed8'],
    light: '#dbeafe',
    stroke: '#2563eb'
  },
  green: {
    primary: '#10b981',
    gradient: ['#10b981', '#047857'],
    light: '#d1fae5',
    stroke: '#059669'
  },
  orange: {
    primary: '#f97316',
    gradient: ['#f97316', '#c2410c'],
    light: '#fed7aa',
    stroke: '#ea580c'
  },
  purple: {
    primary: '#8b5cf6',
    gradient: ['#8b5cf6', '#7c3aed'],
    light: '#ede9fe',
    stroke: '#7c3aed'
  },
  emerald: {
    primary: '#10b981',
    gradient: ['#10b981', '#047857'],
    light: '#d1fae5',
    stroke: '#059669'
  }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-xl shadow-xl p-3">
        <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-600">{entry.name}:</span>
            <span className="font-semibold text-slate-800">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function EnhancedChart({
  title,
  description,
  data,
  type = 'line',
  color = 'blue',
  showSecondary = false,
  secondaryColor = 'orange',
  height = 300,
  className,
  loading = false
}: EnhancedChartProps) {
  const primaryColors = colorMap[color]
  const secondaryColors = colorMap[secondaryColor]

  const getIcon = () => {
    switch (type) {
      case 'bar':
        return <BarChart3 className="h-4 w-4" />
      case 'area':
        return <Activity className="h-4 w-4" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    }

    const gridProps = {
      strokeDasharray: "3 3",
      stroke: "#f1f5f9",
      strokeOpacity: 0.6
    }

    const axisProps = {
      tick: { fontSize: 12, fill: '#64748b' },
      axisLine: { stroke: '#e2e8f0' },
      tickLine: { stroke: '#e2e8f0' }
    }

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColors.primary} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={primaryColors.primary} stopOpacity={0.05}/>
              </linearGradient>
              {showSecondary && (
                <linearGradient id={`gradient-${secondaryColor}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={secondaryColors.primary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={secondaryColors.primary} stopOpacity={0.05}/>
                </linearGradient>
              )}
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={primaryColors.stroke}
              strokeWidth={2}
              fill={`url(#gradient-${color})`}
              name="Primary"
            />
            {showSecondary && (
              <Area
                type="monotone"
                dataKey="secondaryValue"
                stroke={secondaryColors.stroke}
                strokeWidth={2}
                fill={`url(#gradient-${secondaryColor})`}
                name="Secondary"
              />
            )}
          </AreaChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              fill={primaryColors.primary}
              radius={[4, 4, 0, 0]}
              name="Primary"
            />
            {showSecondary && (
              <Bar
                dataKey="secondaryValue"
                fill={secondaryColors.primary}
                radius={[4, 4, 0, 0]}
                name="Secondary"
              />
            )}
          </BarChart>
        )

      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={primaryColors.stroke}
              strokeWidth={3}
              dot={{ fill: primaryColors.primary, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: primaryColors.stroke, strokeWidth: 2 }}
              name="Primary"
            />
            {showSecondary && (
              <Line
                type="monotone"
                dataKey="secondaryValue"
                stroke={secondaryColors.stroke}
                strokeWidth={3}
                dot={{ fill: secondaryColors.primary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: secondaryColors.stroke, strokeWidth: 2 }}
                name="Secondary"
              />
            )}
          </LineChart>
        )
    }
  }

  return (
    <Card className={cn(
      "relative overflow-hidden group transition-all duration-300 hover:shadow-xl",
      "bg-gradient-to-br from-white via-white to-slate-50/30",
      "border-slate-200/60 hover:border-slate-300/60",
      "hover:-translate-y-0.5",
      className
    )}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
      </div>

      <CardHeader className="relative pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg transition-all duration-300 group-hover:scale-110 bg-gradient-to-br from-violet-500/10 to-violet-600/5">
            {getIcon()}
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-slate-600 group-hover:text-slate-700 transition-colors">
                {description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative pt-0">
        <div style={{ height: `${height}px` }} className="w-full">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse space-y-3 w-full">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
