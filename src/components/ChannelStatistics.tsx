import { useState, useMemo } from 'react';
import { useYouTubeChannel, YouTubeChannel } from '@/hooks/useYouTubeChannel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  Users,
  Eye,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Film,
  Video,
  Zap,
  ExternalLink,
  AlertCircle,
  Loader2,
} from 'lucide-react';

type ContentFilter = 'all' | 'long' | 'short';

export function ChannelStatistics() {
  const { channels, selectedChannelId, selectChannel } = useYouTubeChannel();
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [isConnecting, setIsConnecting] = useState(false);

  const selectedChannel = useMemo(() => {
    return channels.find(c => c.id === selectedChannelId) || channels[0] || null;
  }, [channels, selectedChannelId]);

  // TODO: This will be replaced with actual YouTube Analytics API integration
  const analyticsEnabled = false;

  if (channels.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No Channels Connected</h3>
        <p className="text-muted-foreground mb-4">
          Connect a YouTube channel to view analytics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Channel Selector and Content Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Channel Selector */}
          <Select
            value={selectedChannel?.id || ''}
            onValueChange={(id) => selectChannel(id)}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  <div className="flex items-center gap-2">
                    {channel.channel_thumbnail && (
                      <img
                        src={channel.channel_thumbnail}
                        alt=""
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span className="truncate max-w-[180px]">{channel.channel_title}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Content Type Filter */}
          <div className="flex gap-1 p-1 bg-card border border-border rounded-lg">
            {[
              { id: 'all' as const, label: 'All', icon: BarChart3 },
              { id: 'long' as const, label: 'Long-Form', icon: Film },
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
        </div>

        {/* Analytics Status */}
        {!analyticsEnabled && (
          <Badge variant="outline" className="text-amber-500 border-amber-500/50">
            <AlertCircle className="w-3 h-3 mr-1" />
            Analytics API not connected
          </Badge>
        )}
      </div>

      {/* Analytics Not Enabled State */}
      {!analyticsEnabled && (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">YouTube Analytics Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We're building a comprehensive analytics dashboard with real-time metrics,
              growth trends, monetization tracking, and detailed video performance analysis.
            </p>

            {/* Feature Preview Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-8">
              {[
                { icon: Users, label: 'Subscribers', desc: 'Real-time tracking' },
                { icon: Eye, label: 'Views', desc: 'Daily/weekly/monthly' },
                { icon: Clock, label: 'Watch Time', desc: 'Hours tracked' },
                { icon: DollarSign, label: 'Revenue', desc: 'If monetized' },
                { icon: TrendingUp, label: 'Growth', desc: 'Trend analysis' },
                { icon: Target, label: 'Goals', desc: 'Custom targets' },
                { icon: Zap, label: 'Alerts', desc: 'Spike detection' },
                { icon: BarChart3, label: 'Comparison', desc: 'Video vs video' },
              ].map((feature) => (
                <div
                  key={feature.label}
                  className="p-4 rounded-lg bg-muted/50 text-left"
                >
                  <feature.icon className="w-5 h-5 text-primary mb-2" />
                  <div className="font-medium text-sm">{feature.label}</div>
                  <div className="text-xs text-muted-foreground">{feature.desc}</div>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground mt-8">
              YouTube Analytics API integration requires additional OAuth scopes.
              <br />
              This feature will be available in a future update.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Placeholder Stats Cards (will show real data when analytics is enabled) */}
      {analyticsEnabled && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              title="Subscribers"
              value="-"
              icon={Users}
              trend={null}
            />
            <StatsCard
              title="Total Views"
              value="-"
              icon={Eye}
              trend={null}
            />
            <StatsCard
              title="Watch Time"
              value="-"
              icon={Clock}
              trend={null}
            />
            <StatsCard
              title="Est. Revenue"
              value="-"
              icon={DollarSign}
              trend={null}
            />
          </div>

          {/* Detailed Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="growth">Growth</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="audience">Audience</TabsTrigger>
              <TabsTrigger value="traffic">Traffic</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Dashboard Overview</CardTitle>
                  <CardDescription>
                    Real-time counters and growth metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Analytics data will appear here</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="growth">
              <Card>
                <CardHeader>
                  <CardTitle>Growth & Trends</CardTitle>
                  <CardDescription>
                    Daily/weekly/monthly trend charts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Growth charts will appear here</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="videos">
              <Card>
                <CardHeader>
                  <CardTitle>Per-Video Analysis</CardTitle>
                  <CardDescription>
                    Scorecard per video with detailed metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Video performance data will appear here</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audience">
              <Card>
                <CardHeader>
                  <CardTitle>Audience & Behavior</CardTitle>
                  <CardDescription>
                    New vs returning viewers, retention analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Audience insights will appear here</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="traffic">
              <Card>
                <CardHeader>
                  <CardTitle>Traffic & Discovery</CardTitle>
                  <CardDescription>
                    Traffic sources, search terms, CTR
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Traffic data will appear here</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revenue">
              <Card>
                <CardHeader>
                  <CardTitle>Monetization & Revenue</CardTitle>
                  <CardDescription>
                    YPP eligibility, revenue breakdown, RPM/CPM
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Revenue data will appear here</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: { value: number; label: string } | null;
}

function StatsCard({ title, value, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${
            trend.value >= 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {trend.value >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
