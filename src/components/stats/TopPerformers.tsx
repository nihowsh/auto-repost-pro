import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Eye, Clock, ThumbsUp, MessageSquare, Crown, Medal } from 'lucide-react';
import { YouTubeChannel } from '@/hooks/useYouTubeChannel';

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

interface ChannelWithStats extends YouTubeChannel {
  stats?: {
    subscriberCount: number;
    viewCount: number;
    videoCount: number;
  };
}

interface TopPerformersProps {
  topVideos: VideoAnalytics[];
  topChannels: ChannelWithStats[];
  loading?: boolean;
}

export function TopPerformers({ topVideos, topChannels, loading }: TopPerformersProps) {
  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Top Channels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Top Videos (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rankIcons = [
    <Crown key="1" className="w-4 h-4 text-amber-500" />,
    <Medal key="2" className="w-4 h-4 text-gray-400" />,
    <Medal key="3" className="w-4 h-4 text-amber-700" />,
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Top 3 Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Top 3 Channels
          </CardTitle>
          <CardDescription>By total views</CardDescription>
        </CardHeader>
        <CardContent>
          {topChannels.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No channel data available
            </p>
          ) : (
            <div className="space-y-3">
              {topChannels.slice(0, 3).map((channel, idx) => (
                <div
                  key={channel.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-shrink-0 w-6 flex justify-center">
                    {rankIcons[idx]}
                  </div>
                  {channel.channel_thumbnail ? (
                    <img
                      src={channel.channel_thumbnail}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {channel.channel_title.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{channel.channel_title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {channel.stats?.viewCount?.toLocaleString() || '0'}
                      </span>
                      <span>{channel.stats?.subscriberCount?.toLocaleString() || '0'} subs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top 5 Videos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Top 5 Videos
          </CardTitle>
          <CardDescription>Best performing in past 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {topVideos.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No video data available
            </p>
          ) : (
            <div className="space-y-3">
              {topVideos.slice(0, 5).map((video, idx) => (
                <div
                  key={video.videoId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 text-xs">
                    {idx + 1}
                  </Badge>
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt=""
                      className="w-16 h-9 rounded object-cover"
                    />
                  ) : (
                    <div className="w-16 h-9 rounded bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{video.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {video.views.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {video.likes.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {video.comments.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
