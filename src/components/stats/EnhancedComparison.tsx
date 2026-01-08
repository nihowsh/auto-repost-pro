import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import {
  GitCompare, Eye, Clock, ThumbsUp, MessageSquare, Users, Trophy, X, Video, TrendingUp
} from 'lucide-react';
import { YouTubeChannel } from '@/hooks/useYouTubeChannel';
import { ChannelStats, AnalyticsRow, VideoAnalytics } from '@/hooks/useYouTubeAnalytics';

interface ChannelWithStats extends YouTubeChannel {
  stats?: ChannelStats;
  analytics?: AnalyticsRow[];
}

interface EnhancedComparisonProps {
  channels: ChannelWithStats[];
  availableVideos: VideoAnalytics[];
  loading?: boolean;
}

const chartColors = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function EnhancedComparison({ channels, availableVideos, loading }: EnhancedComparisonProps) {
  const [compareMode, setCompareMode] = useState<'videos' | 'channels'>('videos');
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  const selectedVideos = useMemo(() => {
    return availableVideos.filter(v => selectedVideoIds.includes(v.videoId));
  }, [availableVideos, selectedVideoIds]);

  const selectedChannels = useMemo(() => {
    return channels.filter(c => selectedChannelIds.includes(c.id));
  }, [channels, selectedChannelIds]);

  const videoChartData = useMemo(() => {
    return selectedVideos.map(video => ({
      name: video.title.length > 15 ? video.title.slice(0, 15) + '...' : video.title,
      fullTitle: video.title,
      views: video.views,
      likes: video.likes,
      comments: video.comments,
      watchTime: Math.round(video.watchTimeMinutes),
      subsGained: video.subscribersGained,
    }));
  }, [selectedVideos]);

  const channelChartData = useMemo(() => {
    return selectedChannels
      .filter(c => c.stats)
      .map(channel => ({
        name: channel.channel_title.length > 12 ? channel.channel_title.slice(0, 12) + '...' : channel.channel_title,
        fullName: channel.channel_title,
        subscribers: channel.stats!.subscriberCount,
        views: channel.stats!.viewCount,
        videos: channel.stats!.videoCount,
        periodViews: channel.analytics?.reduce((sum, r) => sum + r.views, 0) || 0,
        periodSubs: channel.analytics?.reduce((sum, r) => sum + r.subscribersGained - r.subscribersLost, 0) || 0,
      }));
  }, [selectedChannels]);

  const videoWinners = useMemo(() => {
    if (selectedVideos.length < 2) return null;
    const metrics = [
      { key: 'views' as const, label: 'Most Views', icon: Eye },
      { key: 'likes' as const, label: 'Most Likes', icon: ThumbsUp },
      { key: 'comments' as const, label: 'Most Comments', icon: MessageSquare },
      { key: 'watchTimeMinutes' as const, label: 'Most Watch Time', icon: Clock },
      { key: 'subscribersGained' as const, label: 'Most Subs', icon: Users },
    ];
    return metrics.map(metric => {
      const winner = selectedVideos.reduce((best, current) => current[metric.key] > best[metric.key] ? current : best);
      return { ...metric, winner };
    });
  }, [selectedVideos]);

  const channelWinners = useMemo(() => {
    if (selectedChannels.length < 2) return null;
    const data = channelChartData;
    if (data.length < 2) return null;
    const metrics = [
      { key: 'subscribers' as const, label: 'Most Subs' },
      { key: 'views' as const, label: 'Most Views' },
      { key: 'periodViews' as const, label: 'Most Period Views' },
      { key: 'periodSubs' as const, label: 'Most Period Subs' },
    ];
    return metrics.map(metric => {
      const winner = data.reduce((best, current) => current[metric.key] > best[metric.key] ? current : best);
      return { ...metric, winner };
    });
  }, [selectedChannels, channelChartData]);

  const toggleVideo = (videoId: string) => {
    setSelectedVideoIds(prev =>
      prev.includes(videoId) ? prev.filter(id => id !== videoId) : prev.length < 5 ? [...prev, videoId] : prev
    );
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannelIds(prev =>
      prev.includes(channelId) ? prev.filter(id => id !== channelId) : prev.length < 5 ? [...prev, channelId] : prev
    );
  };

  if (loading) {
    return (
      <Card><CardContent className="p-6"><div className="h-64 flex items-center justify-center animate-pulse text-muted-foreground">Loading...</div></CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><GitCompare className="w-5 h-5" />Compare</CardTitle>
            <CardDescription>Compare videos or channels side by side</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setCompareMode('videos')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  compareMode === 'videos' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Video className="w-4 h-4" />Videos
              </button>
              <button
                onClick={() => setCompareMode('channels')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  compareMode === 'channels' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="w-4 h-4" />Channels
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowSelector(!showSelector)}>
              {showSelector ? 'Hide' : 'Select'} ({compareMode === 'videos' ? selectedVideoIds.length : selectedChannelIds.length}/5)
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selector */}
        {showSelector && (
          <div className="border rounded-lg p-3">
            <p className="text-sm text-muted-foreground mb-2">Select up to 5 {compareMode} to compare:</p>
            <ScrollArea className="h-48">
              {compareMode === 'videos' ? (
                <div className="space-y-2">
                  {availableVideos.map(video => (
                    <label key={video.videoId} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={selectedVideoIds.includes(video.videoId)}
                        onCheckedChange={() => toggleVideo(video.videoId)}
                        disabled={!selectedVideoIds.includes(video.videoId) && selectedVideoIds.length >= 5}
                      />
                      {video.thumbnail && <img src={video.thumbnail} alt="" className="w-12 h-7 rounded object-cover" />}
                      <span className="text-sm truncate flex-1">{video.title}</span>
                      <span className="text-xs text-muted-foreground">{video.views.toLocaleString()} views</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {channels.map(channel => (
                    <label key={channel.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={selectedChannelIds.includes(channel.id)}
                        onCheckedChange={() => toggleChannel(channel.id)}
                        disabled={!selectedChannelIds.includes(channel.id) && selectedChannelIds.length >= 5}
                      />
                      {channel.channel_thumbnail && <img src={channel.channel_thumbnail} alt="" className="w-8 h-8 rounded-full" />}
                      <span className="text-sm truncate flex-1">{channel.channel_title}</span>
                      <span className="text-xs text-muted-foreground">{channel.stats?.subscriberCount?.toLocaleString() || 0} subs</span>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Selected Items Chips */}
        {(compareMode === 'videos' ? selectedVideoIds.length : selectedChannelIds.length) > 0 && (
          <div className="flex flex-wrap gap-2">
            {compareMode === 'videos' ? selectedVideos.map(video => (
              <Badge key={video.videoId} variant="secondary" className="pl-2 pr-1 py-1">
                <span className="truncate max-w-[100px]">{video.title}</span>
                <button onClick={() => toggleVideo(video.videoId)} className="ml-1 p-0.5 hover:bg-muted rounded"><X className="w-3 h-3" /></button>
              </Badge>
            )) : selectedChannels.map(channel => (
              <Badge key={channel.id} variant="secondary" className="pl-2 pr-1 py-1">
                <span className="truncate max-w-[100px]">{channel.channel_title}</span>
                <button onClick={() => toggleChannel(channel.id)} className="ml-1 p-0.5 hover:bg-muted rounded"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
        )}

        {/* Video Comparison */}
        {compareMode === 'videos' && (
          <>
            {selectedVideos.length >= 2 ? (
              <div className="space-y-4">
                <ChartContainer config={{ views: { label: 'Views', color: chartColors[0] }, likes: { label: 'Likes', color: chartColors[1] }, comments: { label: 'Comments', color: chartColors[2] } }} className="h-[300px] w-full">
                  <BarChart data={videoChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="views" fill={chartColors[0]} name="Views" />
                    <Bar dataKey="likes" fill={chartColors[1]} name="Likes" />
                    <Bar dataKey="comments" fill={chartColors[2]} name="Comments" />
                  </BarChart>
                </ChartContainer>

                {/* Winners */}
                {videoWinners && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {videoWinners.map(metric => (
                      <div key={metric.key} className="p-3 rounded-lg bg-muted/50 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Trophy className="w-3 h-3 text-amber-500" />
                          <metric.icon className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">{metric.label}</p>
                        <p className="text-xs font-medium truncate" title={metric.winner.title}>{metric.winner.title.slice(0, 12)}...</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                <GitCompare className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Select at least 2 videos to compare</p>
              </div>
            )}
          </>
        )}

        {/* Channel Comparison */}
        {compareMode === 'channels' && (
          <>
            {selectedChannels.length >= 2 && channelChartData.length >= 2 ? (
              <div className="space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {channelChartData.map((channel, idx) => (
                    <div key={channel.name} className="p-4 rounded-lg border" style={{ borderLeftColor: chartColors[idx % chartColors.length], borderLeftWidth: 4 }}>
                      <p className="font-medium truncate mb-2" title={channel.fullName}>{channel.fullName}</p>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <Users className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="font-bold">{channel.subscribers.toLocaleString()}</p>
                          <p className="text-muted-foreground">Subs</p>
                        </div>
                        <div>
                          <Eye className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="font-bold">{channel.views.toLocaleString()}</p>
                          <p className="text-muted-foreground">Views</p>
                        </div>
                        <div>
                          <TrendingUp className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                          <p className={`font-bold ${channel.periodSubs >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {channel.periodSubs >= 0 ? '+' : ''}{channel.periodSubs}
                          </p>
                          <p className="text-muted-foreground">Period</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <ChartContainer config={{ subscribers: { label: 'Subscribers', color: chartColors[0] }, views: { label: 'Views', color: chartColors[1] } }} className="h-[300px] w-full">
                  <BarChart data={channelChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="subscribers" fill={chartColors[0]} name="Subscribers" />
                    <Bar dataKey="periodViews" fill={chartColors[1]} name="Period Views" />
                  </BarChart>
                </ChartContainer>

                {/* Winners */}
                {channelWinners && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {channelWinners.map(metric => (
                      <div key={metric.key} className="p-3 rounded-lg bg-muted/50 text-center">
                        <Trophy className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">{metric.label}</p>
                        <p className="text-xs font-medium truncate">{metric.winner.fullName}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                <GitCompare className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Select at least 2 channels to compare</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
