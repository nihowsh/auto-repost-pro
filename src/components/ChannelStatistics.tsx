import { useState, useMemo, useEffect } from 'react';
import { useYouTubeChannel, YouTubeChannel } from '@/hooks/useYouTubeChannel';
import { useYouTubeAnalytics, ChannelStats, AnalyticsRow, VideoAnalytics } from '@/hooks/useYouTubeAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatsOverview, TimePeriod } from './stats/StatsOverview';
import { ChannelAnalyticsView } from './stats/ChannelAnalyticsView';
import { EnhancedComparison } from './stats/EnhancedComparison';
import { BarChart3, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { subDays, subMonths, subHours } from 'date-fns';

interface ChannelWithStats extends YouTubeChannel {
  stats?: ChannelStats;
  analytics?: AnalyticsRow[];
}

export function ChannelStatistics() {
  const { channels } = useYouTubeChannel();
  const { loading, error, fetchChannelStats, fetchAnalyticsReport, fetchTopVideos } = useYouTubeAnalytics();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'channel' | 'compare'>('overview');
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Data states
  const [channelsWithStats, setChannelsWithStats] = useState<ChannelWithStats[]>([]);
  const [allTopVideos, setAllTopVideos] = useState<VideoAnalytics[]>([]);
  const [channelTopVideos, setChannelTopVideos] = useState<VideoAnalytics[]>([]);
  const [scheduledVideos, setScheduledVideos] = useState<{ id: string; title: string; scheduled_publish_at: string }[]>([]);

  const selectedChannel = useMemo(() => {
    return channelsWithStats.find(c => c.id === selectedChannelId) || null;
  }, [channelsWithStats, selectedChannelId]);

  const getDateRange = (period: TimePeriod): { start: Date; end: Date } => {
    const end = new Date();
    let start: Date;
    switch (period) {
      case '1h': start = subHours(end, 1); break;
      case '24h': start = subHours(end, 24); break;
      case '7d': start = subDays(end, 7); break;
      case '28d': start = subDays(end, 28); break;
      case '6m': start = subMonths(end, 6); break;
      case 'all': start = subDays(end, 365); break; // Max 1 year for API
      default: start = subDays(end, 7);
    }
    return { start, end };
  };

  const loadData = async () => {
    if (channels.length === 0) return;
    setRefreshing(true);

    const { start, end } = getDateRange(timePeriod);
    const updatedChannels: ChannelWithStats[] = [];
    let combinedVideos: VideoAnalytics[] = [];

    // Fetch data for all channels in parallel
    await Promise.all(channels.map(async (ch) => {
      const [stats, analytics, videos] = await Promise.all([
        fetchChannelStats(ch.id),
        fetchAnalyticsReport(ch.id, start, end),
        fetchTopVideos(ch.id, start, end),
      ]);
      updatedChannels.push({ ...ch, stats: stats || undefined, analytics: analytics || undefined });
      if (videos) combinedVideos = [...combinedVideos, ...videos];
    }));

    // Sort combined videos by views and take top 10
    combinedVideos.sort((a, b) => b.views - a.views);
    setAllTopVideos(combinedVideos.slice(0, 10));
    setChannelsWithStats(updatedChannels);

    // If a channel is selected, load its specific data
    if (selectedChannelId) {
      await loadChannelData(selectedChannelId);
    }

    setRefreshing(false);
  };

  const loadChannelData = async (channelId: string) => {
    const { start, end } = getDateRange(timePeriod);
    const videos = await fetchTopVideos(channelId, start, end);
    if (videos) setChannelTopVideos(videos);

    // Fetch scheduled videos for this channel
    const { data: scheduled } = await supabase
      .from('videos')
      .select('id, title, scheduled_publish_at')
      .eq('channel_id', channelId)
      .eq('status', 'scheduled')
      .not('scheduled_publish_at', 'is', null)
      .order('scheduled_publish_at', { ascending: true })
      .limit(10);

    const { data: scheduledLongform } = await supabase
      .from('long_form_projects')
      .select('id, youtube_title, scheduled_publish_at')
      .eq('channel_id', channelId)
      .eq('status', 'scheduled')
      .not('scheduled_publish_at', 'is', null)
      .order('scheduled_publish_at', { ascending: true })
      .limit(10);

    const allScheduled = [
      ...(scheduled || []).map(v => ({ id: v.id, title: v.title || 'Untitled', scheduled_publish_at: v.scheduled_publish_at! })),
      ...(scheduledLongform || []).map(v => ({ id: v.id, title: v.youtube_title || 'Untitled', scheduled_publish_at: v.scheduled_publish_at! })),
    ].sort((a, b) => new Date(a.scheduled_publish_at).getTime() - new Date(b.scheduled_publish_at).getTime());

    setScheduledVideos(allScheduled);
  };

  useEffect(() => {
    loadData();
  }, [channels.length, timePeriod]);

  useEffect(() => {
    if (selectedChannelId && viewMode === 'channel') {
      loadChannelData(selectedChannelId);
    }
  }, [selectedChannelId, viewMode]);

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
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-card border border-border rounded-lg">
            {[
              { id: 'overview' as const, label: 'Overview' },
              { id: 'channel' as const, label: 'Channel' },
              { id: 'compare' as const, label: 'Compare' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === mode.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {viewMode === 'channel' && (
            <Select value={selectedChannelId || ''} onValueChange={setSelectedChannelId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    <div className="flex items-center gap-2">
                      {channel.channel_thumbnail && <img src={channel.channel_thumbnail} alt="" className="w-5 h-5 rounded-full" />}
                      <span className="truncate max-w-[150px]">{channel.channel_title}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing}>
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {error && <Badge variant="destructive">{error}</Badge>}

      {/* Content Views */}
      {viewMode === 'overview' && (
        <StatsOverview
          channels={channelsWithStats}
          topVideos={allTopVideos}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          loading={loading || refreshing}
        />
      )}

      {viewMode === 'channel' && selectedChannel && (
        <ChannelAnalyticsView
          channel={selectedChannel}
          stats={selectedChannel.stats || null}
          analytics={selectedChannel.analytics || []}
          topVideos={channelTopVideos}
          scheduledVideos={scheduledVideos}
          loading={loading || refreshing}
        />
      )}

      {viewMode === 'channel' && !selectedChannel && (
        <div className="glass-card p-12 text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Select a channel to view detailed analytics</p>
        </div>
      )}

      {viewMode === 'compare' && (
        <EnhancedComparison
          channels={channelsWithStats}
          availableVideos={allTopVideos}
          loading={loading || refreshing}
        />
      )}
    </div>
  );
}
