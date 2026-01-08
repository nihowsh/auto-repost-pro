import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend, LineChart, Line } from 'recharts';
import {
  Users, Eye, Clock, TrendingUp, TrendingDown, Target, CheckCircle, AlertCircle,
  ThumbsUp, MessageSquare, Bell, Play, DollarSign, Calendar, Video
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { YouTubeChannel } from '@/hooks/useYouTubeChannel';
import { ChannelStats, AnalyticsRow, VideoAnalytics } from '@/hooks/useYouTubeAnalytics';

interface ChannelAnalyticsViewProps {
  channel: YouTubeChannel;
  stats: ChannelStats | null;
  analytics: AnalyticsRow[];
  topVideos: VideoAnalytics[];
  scheduledVideos: { id: string; title: string; scheduled_publish_at: string }[];
  loading?: boolean;
}

const YPP_SUBS_THRESHOLD = 1000;
const YPP_WATCH_HOURS_THRESHOLD = 4000;
const YPP_SHORTS_VIEWS_THRESHOLD = 10000000; // 10M for Shorts path

const chartConfig = {
  views: { label: 'Views', color: 'hsl(var(--primary))' },
  subscribers: { label: 'Net Subscribers', color: 'hsl(var(--chart-2))' },
  watchTime: { label: 'Watch Hours', color: 'hsl(var(--chart-3))' },
};

export function ChannelAnalyticsView({ channel, stats, analytics, topVideos, scheduledVideos, loading }: ChannelAnalyticsViewProps) {
  const chartData = useMemo(() => {
    return analytics.map(row => ({
      date: row.date,
      formattedDate: format(parseISO(row.date), 'MMM d'),
      views: row.views,
      subscribers: row.subscribersGained - row.subscribersLost,
      watchTime: Math.round(row.watchTimeMinutes / 60 * 10) / 10,
    }));
  }, [analytics]);

  const totals = useMemo(() => {
    return analytics.reduce(
      (acc, row) => ({
        views: acc.views + row.views,
        subsGained: acc.subsGained + row.subscribersGained,
        subsLost: acc.subsLost + row.subscribersLost,
        watchHours: acc.watchHours + row.watchTimeMinutes / 60,
      }),
      { views: 0, subsGained: 0, subsLost: 0, watchHours: 0 }
    );
  }, [analytics]);

  const netSubs = totals.subsGained - totals.subsLost;
  const watchHours = Math.round(totals.watchHours);

  // YPP Eligibility calculations (assuming 365-day watch hours)
  const yppEligibility = useMemo(() => {
    const subs = stats?.subscriberCount || 0;
    const subsProgress = Math.min((subs / YPP_SUBS_THRESHOLD) * 100, 100);
    const watchProgress = Math.min((watchHours / YPP_WATCH_HOURS_THRESHOLD) * 100, 100);
    const subsRemaining = Math.max(YPP_SUBS_THRESHOLD - subs, 0);
    const watchRemaining = Math.max(YPP_WATCH_HOURS_THRESHOLD - watchHours, 0);
    const isEligible = subs >= YPP_SUBS_THRESHOLD && watchHours >= YPP_WATCH_HOURS_THRESHOLD;

    // Estimate time to goal based on current pace
    const avgDailyWatchHours = analytics.length > 0 ? watchHours / analytics.length : 0;
    const avgDailySubs = analytics.length > 0 ? netSubs / analytics.length : 0;
    const daysToSubsGoal = avgDailySubs > 0 ? Math.ceil(subsRemaining / avgDailySubs) : null;
    const daysToWatchGoal = avgDailyWatchHours > 0 ? Math.ceil(watchRemaining / avgDailyWatchHours) : null;

    return {
      subs,
      subsProgress,
      watchProgress,
      subsRemaining,
      watchRemaining,
      isEligible,
      daysToSubsGoal,
      daysToWatchGoal,
    };
  }, [stats, watchHours, analytics.length, netSubs]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-6"><div className="h-32 animate-pulse bg-muted rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Channel Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Subscribers" value={stats?.subscriberCount?.toLocaleString() || '0'} icon={Users} />
        <StatCard title="Total Views" value={stats?.viewCount?.toLocaleString() || '0'} icon={Eye} />
        <StatCard title="Videos" value={stats?.videoCount?.toLocaleString() || '0'} icon={Video} />
        <StatCard 
          title="Net Subs (Period)" 
          value={`${netSubs >= 0 ? '+' : ''}${netSubs.toLocaleString()}`} 
          icon={netSubs >= 0 ? TrendingUp : TrendingDown}
          className={netSubs >= 0 ? 'text-green-500' : 'text-red-500'}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="monetization">Monetization</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Growth Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Growth Trends</CardTitle>
              <CardDescription>Daily views, subscribers, and watch time</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="formattedDate" tickLine={false} axisLine={false} tickMargin={8} className="text-xs fill-muted-foreground" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Views" />
                    <Line type="monotone" dataKey="watchTime" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="Watch Hours" />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">No data for this period</div>
              )}
            </CardContent>
          </Card>

          {/* Top Videos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Play className="w-4 h-4" /> Top Performing Videos</CardTitle>
            </CardHeader>
            <CardContent>
              {topVideos.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No video data available</p>
              ) : (
                <div className="space-y-3">
                  {topVideos.slice(0, 5).map((video, idx) => (
                    <div key={video.videoId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 text-xs">{idx + 1}</Badge>
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt="" className="w-20 h-11 rounded object-cover" />
                      ) : (
                        <div className="w-20 h-11 rounded bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{video.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span><Eye className="w-3 h-3 inline mr-1" />{video.views.toLocaleString()}</span>
                          <span><ThumbsUp className="w-3 h-3 inline mr-1" />{video.likes.toLocaleString()}</span>
                          <span><MessageSquare className="w-3 h-3 inline mr-1" />{video.comments.toLocaleString()}</span>
                          <span><Users className="w-3 h-3 inline mr-1" />+{video.subscribersGained}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audience Tab */}
        <TabsContent value="audience" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audience Insights</CardTitle>
              <CardDescription>Viewer behavior and engagement metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avg View Duration */}
              {topVideos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Avg View Duration</p>
                    <p className="text-2xl font-bold">
                      {Math.round(topVideos.reduce((sum, v) => sum + v.avgViewDuration, 0) / topVideos.length)}s
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Total Engagement</p>
                    <p className="text-2xl font-bold">
                      {(topVideos.reduce((sum, v) => sum + v.likes + v.comments, 0)).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">likes + comments</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Subs from Videos</p>
                    <p className="text-2xl font-bold text-green-500">
                      +{topVideos.reduce((sum, v) => sum + v.subscribersGained, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Placeholder for advanced audience metrics */}
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Advanced audience metrics (new vs returning, demographics) require YouTube Analytics API access.</p>
                <p className="text-xs mt-1">Re-authorize your channel to enable all analytics features.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monetization Tab */}
        <TabsContent value="monetization" className="space-y-4">
          {/* YPP Eligibility */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" /> YPP Eligibility</CardTitle>
                  <CardDescription>YouTube Partner Program requirements</CardDescription>
                </div>
                {yppEligibility.isEligible ? (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Eligible</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/20"><AlertCircle className="w-3 h-3 mr-1" />In Progress</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Subscribers Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>Subscribers</span>
                    {yppEligibility.subs >= YPP_SUBS_THRESHOLD && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>
                  <span className="font-medium">{yppEligibility.subs.toLocaleString()} / {YPP_SUBS_THRESHOLD.toLocaleString()}</span>
                </div>
                <Progress value={yppEligibility.subsProgress} className="h-2" />
                {yppEligibility.subsRemaining > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {yppEligibility.subsRemaining.toLocaleString()} more needed
                    {yppEligibility.daysToSubsGoal && <span> • ~{yppEligibility.daysToSubsGoal} days at current pace</span>}
                  </p>
                )}
              </div>

              {/* Watch Hours Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>Public Watch Hours (365d)</span>
                    {watchHours >= YPP_WATCH_HOURS_THRESHOLD && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>
                  <span className="font-medium">{watchHours.toLocaleString()} / {YPP_WATCH_HOURS_THRESHOLD.toLocaleString()}</span>
                </div>
                <Progress value={yppEligibility.watchProgress} className="h-2" />
                {yppEligibility.watchRemaining > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round(yppEligibility.watchRemaining).toLocaleString()} more hours needed
                    {yppEligibility.daysToWatchGoal && <span> • ~{yppEligibility.daysToWatchGoal} days at current pace</span>}
                  </p>
                )}
              </div>

              {yppEligibility.isEligible && (
                <div className="p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">
                  🎉 Congratulations! You meet the YouTube Partner Program requirements. Apply through YouTube Studio to start monetizing.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4" /> Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Revenue data requires YouTube Analytics Monetary Reports scope.</p>
                <p className="text-xs mt-1">This feature is available for monetized channels only.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4" /> Upcoming Scheduled Videos</CardTitle>
            </CardHeader>
            <CardContent>
              {scheduledVideos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No scheduled videos for this channel</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledVideos.map(video => (
                    <div key={video.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{video.title || 'Untitled'}</p>
                        <p className="text-xs text-muted-foreground">
                          Scheduled: {format(new Date(video.scheduled_publish_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <Badge variant="outline">Scheduled</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, className }: { 
  title: string; 
  value: string; 
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{title}</span>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className={`text-xl font-bold ${className || ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
