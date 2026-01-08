import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Users, Eye, Video, GitCompare } from 'lucide-react';
import { YouTubeChannel } from '@/hooks/useYouTubeChannel';

interface ChannelWithStats extends YouTubeChannel {
  stats?: {
    subscriberCount: number;
    viewCount: number;
    videoCount: number;
  };
}

interface ChannelComparisonProps {
  channels: ChannelWithStats[];
  loading?: boolean;
}

const chartConfig = {
  subscribers: { label: 'Subscribers', color: 'hsl(var(--primary))' },
  views: { label: 'Views', color: 'hsl(var(--chart-2))' },
  videos: { label: 'Videos', color: 'hsl(var(--chart-3))' },
};

export function ChannelComparison({ channels, loading }: ChannelComparisonProps) {
  const chartData = useMemo(() => {
    return channels
      .filter((c) => c.stats)
      .map((channel) => ({
        name: channel.channel_title.length > 15
          ? channel.channel_title.slice(0, 15) + '...'
          : channel.channel_title,
        fullName: channel.channel_title,
        subscribers: channel.stats!.subscriberCount,
        views: channel.stats!.viewCount,
        videos: channel.stats!.videoCount,
      }));
  }, [channels]);

  // Normalize data for radar chart (0-100 scale)
  const radarData = useMemo(() => {
    if (chartData.length === 0) return [];

    const maxSubs = Math.max(...chartData.map((c) => c.subscribers));
    const maxViews = Math.max(...chartData.map((c) => c.views));
    const maxVideos = Math.max(...chartData.map((c) => c.videos));

    const metrics = ['Subscribers', 'Views', 'Videos'];
    return metrics.map((metric) => {
      const row: any = { metric };
      chartData.forEach((channel) => {
        let value = 0;
        if (metric === 'Subscribers') value = (channel.subscribers / maxSubs) * 100;
        if (metric === 'Views') value = (channel.views / maxViews) * 100;
        if (metric === 'Videos') value = (channel.videos / maxVideos) * 100;
        row[channel.name] = Math.round(value);
      });
      return row;
    });
  }, [chartData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            Channel Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (channels.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            Channel Comparison
          </CardTitle>
          <CardDescription>Compare performance across your channels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
            <GitCompare className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Connect at least 2 channels to compare</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            Channel Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            No statistics available for comparison
          </div>
        </CardContent>
      </Card>
    );
  }

  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="w-5 h-5" />
          Channel Comparison
        </CardTitle>
        <CardDescription>Compare performance across your {channels.length} channels</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {chartData.map((channel, idx) => (
            <div
              key={channel.name}
              className="p-4 rounded-lg border"
              style={{ borderLeftColor: colors[idx % colors.length], borderLeftWidth: 4 }}
            >
              <p className="font-medium truncate mb-2" title={channel.fullName}>
                {channel.fullName}
              </p>
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
                  <Video className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="font-bold">{channel.videos.toLocaleString()}</p>
                  <p className="text-muted-foreground">Videos</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bar Chart */}
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
            <YAxis className="text-xs fill-muted-foreground" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="subscribers" fill="hsl(var(--primary))" name="Subscribers" />
            <Bar dataKey="views" fill="hsl(var(--chart-2))" name="Views" />
            <Bar dataKey="videos" fill="hsl(var(--chart-3))" name="Videos" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
