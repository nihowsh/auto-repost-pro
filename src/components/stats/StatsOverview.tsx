import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trophy, Crown, Medal, Eye, ThumbsUp, MessageSquare, Users, TrendingUp, TrendingDown, Clock, DollarSign, Play } from 'lucide-react';
import { YouTubeChannel } from '@/hooks/useYouTubeChannel';
import { ChannelStats, AnalyticsRow, VideoAnalytics } from '@/hooks/useYouTubeAnalytics';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';

export type TimePeriod = '1h' | '24h' | '7d' | '28d' | '6m' | 'all';

interface ChannelWithStats extends YouTubeChannel {
  stats?: ChannelStats;
  analytics?: AnalyticsRow[];
}

interface StatsOverviewProps {
  channels: ChannelWithStats[];
  topVideos: VideoAnalytics[];
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
  loading?: boolean;
}

const chartConfig = {
  views: { label: 'Views', color: 'hsl(var(--primary))' },
  subscribers: { label: 'Subscribers', color: 'hsl(var(--chart-2))' },
};

const timePeriodLabels: Record<TimePeriod, string> = {
  '1h': 'Last Hour',
  '24h': 'Last 24 Hours',
  '7d': '7 Days',
  '28d': '28 Days',
  '6m': '6 Months',
  'all': 'All Time',
};

export function StatsOverview({ channels, topVideos, timePeriod, onTimePeriodChange, loading }: StatsOverviewProps) {
  const aggregatedStats = useMemo(() => {
    let totalViews = 0;
    let totalSubs = 0;
    let netSubsChange = 0;
    let totalWatchHours = 0;
    let totalEarnings = 0; // Placeholder for monetized channels

    channels.forEach(ch => {
      if (ch.stats) {
        totalViews += ch.stats.viewCount || 0;
        totalSubs += ch.stats.subscriberCount || 0;
      }
      if (ch.analytics) {
        ch.analytics.forEach(row => {
          netSubsChange += (row.subscribersGained || 0) - (row.subscribersLost || 0);
          totalWatchHours += (row.watchTimeMinutes || 0) / 60;
        });
      }
    });

    return {
      totalViews,
      totalSubs,
      netSubsChange,
      totalWatchHours: Math.round(totalWatchHours),
      totalEarnings,
    };
  }, [channels]);

  const combinedChartData = useMemo(() => {
    const dateMap = new Map<string, { views: number; subscribers: number }>();
    
    channels.forEach(ch => {
      if (ch.analytics) {
        ch.analytics.forEach(row => {
          const existing = dateMap.get(row.date) || { views: 0, subscribers: 0 };
          dateMap.set(row.date, {
            views: existing.views + row.views,
            subscribers: existing.subscribers + (row.subscribersGained - row.subscribersLost),
          });
        });
      }
    });

    return Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        formattedDate: format(parseISO(date), 'MMM d'),
        ...data,
      }));
  }, [channels]);

  const topChannels = useMemo(() => {
    return [...channels]
      .filter(c => c.stats)
      .sort((a, b) => {
        const aViews = a.analytics?.reduce((sum, r) => sum + r.views, 0) || 0;
        const bViews = b.analytics?.reduce((sum, r) => sum + r.views, 0) || 0;
        return bViews - aViews;
      })
      .slice(0, 3);
  }, [channels]);

  const rankIcons = [
    <Crown key="1" className="w-4 h-4 text-amber-500" />,
    <Medal key="2" className="w-4 h-4 text-gray-400" />,
    <Medal key="3" className="w-4 h-4 text-amber-700" />,
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">All Channels Overview</h2>
        <Select value={timePeriod} onValueChange={(v) => onTimePeriodChange(v as TimePeriod)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(timePeriodLabels).map(([id, label]) => (
              <SelectItem key={id} value={id}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Aggregated Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard 
          title="Total Views" 
          value={aggregatedStats.totalViews.toLocaleString()} 
          icon={Eye} 
          trend={null}
        />
        <StatCard 
          title="Total Subscribers" 
          value={aggregatedStats.totalSubs.toLocaleString()} 
          icon={Users} 
          trend={null}
        />
        <StatCard 
          title="Net Subs Change" 
          value={`${aggregatedStats.netSubsChange >= 0 ? '+' : ''}${aggregatedStats.netSubsChange.toLocaleString()}`} 
          icon={aggregatedStats.netSubsChange >= 0 ? TrendingUp : TrendingDown}
          trend={aggregatedStats.netSubsChange >= 0 ? 'up' : 'down'}
        />
        <StatCard 
          title="Watch Time" 
          value={`${aggregatedStats.totalWatchHours.toLocaleString()}h`} 
          icon={Clock} 
          trend={null}
        />
        <StatCard 
          title="Est. Revenue" 
          value={aggregatedStats.totalEarnings > 0 ? `$${aggregatedStats.totalEarnings.toFixed(2)}` : 'N/A'} 
          icon={DollarSign} 
          trend={null}
          muted={aggregatedStats.totalEarnings === 0}
        />
      </div>

      {/* Combined Chart */}
      {combinedChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Growth Trend (All Channels)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <AreaChart data={combinedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="formattedDate" tickLine={false} axisLine={false} tickMargin={8} className="text-xs fill-muted-foreground" />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs fill-muted-foreground" tickFormatter={(v) => v.toLocaleString()} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#fillViews)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Performers Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top 3 Channels */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-4 h-4 text-amber-500" />
              Top 3 Channels
            </CardTitle>
            <CardDescription>By views in {timePeriodLabels[timePeriod].toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            {topChannels.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No channel data available</p>
            ) : (
              <div className="space-y-3">
                {topChannels.map((channel, idx) => {
                  const periodViews = channel.analytics?.reduce((sum, r) => sum + r.views, 0) || 0;
                  const periodSubs = channel.analytics?.reduce((sum, r) => sum + r.subscribersGained - r.subscribersLost, 0) || 0;
                  return (
                    <div key={channel.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex-shrink-0 w-6 flex justify-center">{rankIcons[idx]}</div>
                      {channel.channel_thumbnail ? (
                        <img src={channel.channel_thumbnail} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {channel.channel_title.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{channel.channel_title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{periodViews.toLocaleString()}</span>
                          <span className={periodSubs >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {periodSubs >= 0 ? '+' : ''}{periodSubs} subs
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Videos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="w-4 h-4 text-amber-500" />
              Top 5 Videos
            </CardTitle>
            <CardDescription>Best performing in {timePeriodLabels[timePeriod].toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            {topVideos.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No video data available</p>
            ) : (
              <div className="space-y-2">
                {topVideos.slice(0, 5).map((video, idx) => (
                  <div key={video.videoId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 text-xs flex-shrink-0">
                      {idx + 1}
                    </Badge>
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt="" className="w-14 h-8 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-8 rounded bg-muted flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{video.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{video.views.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{video.likes.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, muted }: { 
  title: string; 
  value: string; 
  icon: React.ComponentType<{ className?: string }>; 
  trend: 'up' | 'down' | null;
  muted?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{title}</span>
          <Icon className={`w-4 h-4 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}`} />
        </div>
        <div className={`text-xl font-bold ${muted ? 'text-muted-foreground' : ''} ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : ''}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
