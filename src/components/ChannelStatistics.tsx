import { useState, useMemo, useEffect } from 'react';
import { useYouTubeChannel, YouTubeChannel } from '@/hooks/useYouTubeChannel';
import { useYouTubeAnalytics, ChannelStats, AnalyticsRow, VideoAnalytics } from '@/hooks/useYouTubeAnalytics';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GrowthTrendChart } from './stats/GrowthTrendChart';
import { YPPEligibilityTracker } from './stats/YPPEligibilityTracker';
import { TopPerformers } from './stats/TopPerformers';
import { VideoComparison } from './stats/VideoComparison';
import { ChannelComparison } from './stats/ChannelComparison';
import {
  BarChart3,
  Users,
  Eye,
  Clock,
  TrendingUp,
  TrendingDown,
  Film,
  Video,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from './ui/button';
import { subDays } from 'date-fns';

type ContentFilter = 'all' | 'long' | 'short';
type DateRange = '7d' | '28d' | '90d' | '365d';

interface ChannelWithStats extends YouTubeChannel {
  stats?: ChannelStats;
}

export function ChannelStatistics() {
  const { channels, selectedChannelId, selectChannel } = useYouTubeChannel();
  const { loading, error, fetchChannelStats, fetchAnalyticsReport, fetchTopVideos } = useYouTubeAnalytics();
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [channelStats, setChannelStats] = useState<Record<string, ChannelStats>>({});
  const [analyticsData, setAnalyticsData] = useState<AnalyticsRow[]>([]);
  const [topVideos, setTopVideos] = useState<VideoAnalytics[]>([]);

  const selectedChannel = useMemo(() => {
    return channels.find(c => c.id === selectedChannelId) || channels[0] || null;
  }, [channels, selectedChannelId]);

  const channelsWithStats: ChannelWithStats[] = useMemo(() => {
    return channels.map(c => ({ ...c, stats: channelStats[c.id] }));
  }, [channels, channelStats]);

  const topChannels = useMemo(() => {
    return [...channelsWithStats]
      .filter(c => c.stats)
      .sort((a, b) => (b.stats?.viewCount || 0) - (a.stats?.viewCount || 0));
  }, [channelsWithStats]);

  const dateRanges: { id: DateRange; label: string; days: number }[] = [
    { id: '7d', label: '7 Days', days: 7 },
    { id: '28d', label: '28 Days', days: 28 },
    { id: '90d', label: '90 Days', days: 90 },
    { id: '365d', label: '1 Year', days: 365 },
  ];

  const loadData = async () => {
    if (!selectedChannel) return;
    setRefreshing(true);

    const days = dateRanges.find(r => r.id === dateRange)?.days || 7;
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    // Fetch all data in parallel
    const [stats, analytics, videos] = await Promise.all([
      fetchChannelStats(selectedChannel.id),
      fetchAnalyticsReport(selectedChannel.id, startDate, endDate),
      fetchTopVideos(selectedChannel.id, startDate, endDate),
    ]);

    if (stats) {
      setChannelStats(prev => ({ ...prev, [selectedChannel.id]: stats }));
    }
    if (analytics) setAnalyticsData(analytics);
    if (videos) setTopVideos(videos);

    // Also fetch stats for all other channels for comparison
    for (const ch of channels) {
      if (ch.id !== selectedChannel.id && !channelStats[ch.id]) {
        const chStats = await fetchChannelStats(ch.id);
        if (chStats) {
          setChannelStats(prev => ({ ...prev, [ch.id]: chStats }));
        }
      }
    }

    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedChannel?.id, dateRange]);

  const currentStats = selectedChannel ? channelStats[selectedChannel.id] : null;
  const watchTimeHours = analyticsData.reduce((sum, r) => sum + r.watchTimeMinutes / 60, 0);

  if (channels.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No Channels Connected</h3>
        <p className="text-muted-foreground mb-4">Connect a YouTube channel to view analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select value={selectedChannel?.id || ''} onValueChange={selectChannel}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  <div className="flex items-center gap-2">
                    {channel.channel_thumbnail && (
                      <img src={channel.channel_thumbnail} alt="" className="w-5 h-5 rounded-full" />
                    )}
                    <span className="truncate max-w-[180px]">{channel.channel_title}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1 p-1 bg-card border border-border rounded-lg">
            {[
              { id: 'all' as const, label: 'All', icon: BarChart3 },
              { id: 'long' as const, label: 'Long', icon: Film },
              { id: 'short' as const, label: 'Shorts', icon: Video },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setContentFilter(filter.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  contentFilter === filter.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <filter.icon className="w-4 h-4" />
                {filter.label}
              </button>
            ))}
          </div>

          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateRanges.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing}>
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {error && (
        <Badge variant="destructive">{error}</Badge>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Subscribers" value={currentStats?.subscriberCount?.toLocaleString() || '-'} icon={Users} />
        <StatsCard title="Total Views" value={currentStats?.viewCount?.toLocaleString() || '-'} icon={Eye} />
        <StatsCard title="Videos" value={currentStats?.videoCount?.toLocaleString() || '-'} icon={Video} />
        <StatsCard title="Watch Time" value={watchTimeHours > 0 ? `${Math.round(watchTimeHours).toLocaleString()}h` : '-'} icon={Clock} />
      </div>

      {/* Top Performers */}
      <TopPerformers topVideos={topVideos} topChannels={topChannels} loading={loading} />

      {/* Tabs */}
      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="videos">Video Comparison</TabsTrigger>
          <TabsTrigger value="channels">Channel Comparison</TabsTrigger>
          <TabsTrigger value="ypp">YPP Eligibility</TabsTrigger>
        </TabsList>

        <TabsContent value="growth">
          <GrowthTrendChart data={analyticsData} loading={loading} />
        </TabsContent>

        <TabsContent value="videos">
          <VideoComparison availableVideos={topVideos} loading={loading} />
        </TabsContent>

        <TabsContent value="channels">
          <ChannelComparison channels={channelsWithStats} loading={loading} />
        </TabsContent>

        <TabsContent value="ypp">
          <YPPEligibilityTracker
            subscriberCount={currentStats?.subscriberCount || 0}
            watchTimeHours={watchTimeHours}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
