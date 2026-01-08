import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, Eye, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface AnalyticsRow {
  date: string;
  views: number;
  watchTimeMinutes: number;
  subscribersGained: number;
  subscribersLost: number;
}

interface GrowthTrendChartProps {
  data: AnalyticsRow[];
  loading?: boolean;
}

type MetricType = 'subscribers' | 'views' | 'watchTime';

const chartConfig = {
  subscribers: { label: 'Net Subscribers', color: 'hsl(var(--primary))' },
  views: { label: 'Views', color: 'hsl(var(--chart-2))' },
  watchTime: { label: 'Watch Time (hrs)', color: 'hsl(var(--chart-3))' },
};

export function GrowthTrendChart({ data, loading }: GrowthTrendChartProps) {
  const [metric, setMetric] = useState<MetricType>('views');

  const chartData = useMemo(() => {
    return data.map((row) => ({
      date: row.date,
      formattedDate: format(parseISO(row.date), 'MMM d'),
      subscribers: row.subscribersGained - row.subscribersLost,
      views: row.views,
      watchTime: Math.round(row.watchTimeMinutes / 60 * 10) / 10, // Convert to hours
    }));
  }, [data]);

  const totals = useMemo(() => {
    return data.reduce(
      (acc, row) => ({
        subscribers: acc.subscribers + row.subscribersGained - row.subscribersLost,
        views: acc.views + row.views,
        watchTimeHours: acc.watchTimeHours + row.watchTimeMinutes / 60,
      }),
      { subscribers: 0, views: 0, watchTimeHours: 0 }
    );
  }, [data]);

  const metrics = [
    { id: 'views' as const, label: 'Views', icon: Eye, value: totals.views.toLocaleString() },
    { id: 'subscribers' as const, label: 'Subscribers', icon: Users, value: `${totals.subscribers >= 0 ? '+' : ''}${totals.subscribers.toLocaleString()}` },
    { id: 'watchTime' as const, label: 'Watch Time', icon: Clock, value: `${Math.round(totals.watchTimeHours).toLocaleString()}h` },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Growth Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Growth Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Growth Trends
            </CardTitle>
            <CardDescription>Daily performance metrics</CardDescription>
          </div>
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {metrics.map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  metric === m.id
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <m.icon className="w-3 h-3" />
                <span className="hidden sm:inline">{m.label}</span>
                <span className="font-bold">{m.value}</span>
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartConfig[metric].color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartConfig[metric].color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="formattedDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs fill-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs fill-muted-foreground"
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={chartConfig[metric].color}
              strokeWidth={2}
              fill={`url(#fill-${metric})`}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
