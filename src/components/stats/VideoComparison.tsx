import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import {
  GitCompare,
  Eye,
  Clock,
  ThumbsUp,
  MessageSquare,
  Share2,
  Users,
  Trophy,
  X,
} from 'lucide-react';

interface VideoAnalytics {
  videoId: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string | null;
  views: number;
  watchTimeMinutes: number;
  avgViewDuration: number;
  likes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
}

interface VideoComparisonProps {
  availableVideos: VideoAnalytics[];
  loading?: boolean;
}

const chartConfig = {
  views: { label: 'Views', color: 'hsl(var(--primary))' },
  likes: { label: 'Likes', color: 'hsl(var(--chart-2))' },
  comments: { label: 'Comments', color: 'hsl(var(--chart-3))' },
  watchTime: { label: 'Watch Time (min)', color: 'hsl(var(--chart-4))' },
  subs: { label: 'Subs Gained', color: 'hsl(var(--chart-5))' },
};

export function VideoComparison({ availableVideos, loading }: VideoComparisonProps) {
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  const selectedVideos = useMemo(() => {
    return availableVideos.filter((v) => selectedVideoIds.includes(v.videoId));
  }, [availableVideos, selectedVideoIds]);

  const chartData = useMemo(() => {
    return selectedVideos.map((video) => ({
      name: video.title.length > 20 ? video.title.slice(0, 20) + '...' : video.title,
      fullTitle: video.title,
      views: video.views,
      likes: video.likes,
      comments: video.comments,
      watchTime: Math.round(video.watchTimeMinutes),
      subs: video.subscribersGained,
    }));
  }, [selectedVideos]);

  const winners = useMemo(() => {
    if (selectedVideos.length < 2) return null;

    const metrics = [
      { key: 'views' as const, label: 'Most Views', icon: Eye },
      { key: 'likes' as const, label: 'Most Likes', icon: ThumbsUp },
      { key: 'comments' as const, label: 'Most Comments', icon: MessageSquare },
      { key: 'watchTimeMinutes' as const, label: 'Most Watch Time', icon: Clock },
      { key: 'subscribersGained' as const, label: 'Most Subs', icon: Users },
    ];

    return metrics.map((metric) => {
      const winner = selectedVideos.reduce((best, current) =>
        current[metric.key] > best[metric.key] ? current : best
      );
      return {
        ...metric,
        winner,
      };
    });
  }, [selectedVideos]);

  const toggleVideo = (videoId: string) => {
    setSelectedVideoIds((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : prev.length < 5
        ? [...prev, videoId]
        : prev
    );
  };

  const removeVideo = (videoId: string) => {
    setSelectedVideoIds((prev) => prev.filter((id) => id !== videoId));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            Video Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading videos...</div>
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
              <GitCompare className="w-5 h-5" />
              Video Comparison
            </CardTitle>
            <CardDescription>Compare performance across multiple videos (max 5)</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSelector(!showSelector)}
          >
            {showSelector ? 'Hide' : 'Select Videos'} ({selectedVideoIds.length}/5)
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Selector */}
        {showSelector && (
          <div className="border rounded-lg p-3">
            <p className="text-sm text-muted-foreground mb-2">
              Select up to 5 videos to compare:
            </p>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {availableVideos.map((video) => (
                  <label
                    key={video.videoId}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedVideoIds.includes(video.videoId)}
                      onCheckedChange={() => toggleVideo(video.videoId)}
                      disabled={
                        !selectedVideoIds.includes(video.videoId) &&
                        selectedVideoIds.length >= 5
                      }
                    />
                    {video.thumbnail && (
                      <img
                        src={video.thumbnail}
                        alt=""
                        className="w-12 h-7 rounded object-cover"
                      />
                    )}
                    <span className="text-sm truncate flex-1">{video.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {video.views.toLocaleString()} views
                    </span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Selected Videos Chips */}
        {selectedVideoIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedVideos.map((video) => (
              <Badge key={video.videoId} variant="secondary" className="pl-2 pr-1 py-1">
                <span className="truncate max-w-[120px]">{video.title}</span>
                <button
                  onClick={() => removeVideo(video.videoId)}
                  className="ml-1 p-0.5 hover:bg-muted rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Comparison Chart */}
        {selectedVideos.length >= 2 && (
          <>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" />
                <Bar dataKey="likes" fill="hsl(var(--chart-2))" name="Likes" />
                <Bar dataKey="comments" fill="hsl(var(--chart-3))" name="Comments" />
              </BarChart>
            </ChartContainer>

            {/* Winners Section */}
            {winners && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {winners.map((metric) => (
                  <div
                    key={metric.key}
                    className="p-3 rounded-lg bg-muted/50 text-center"
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Trophy className="w-3 h-3 text-amber-500" />
                      <metric.icon className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="text-xs font-medium truncate" title={metric.winner.title}>
                      {metric.winner.title.slice(0, 15)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {selectedVideos.length < 2 && (
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
            <GitCompare className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Select at least 2 videos to compare</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
