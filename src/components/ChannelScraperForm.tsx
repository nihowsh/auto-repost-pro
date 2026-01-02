import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useYouTubeChannel } from '@/hooks/useYouTubeChannel';
import { useAuth } from '@/hooks/useAuth';
import { ChannelSelector } from '@/components/ChannelSelector';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  Link2,
  Youtube,
  Users,
  Info,
  Timer,
} from 'lucide-react';

// Schedule interval options (in hours)
const SCHEDULE_INTERVALS = [
  { value: '1', label: '1 hour' },
  { value: '2', label: '2 hours' },
  { value: '4', label: '4 hours' },
  { value: '6', label: '6 hours' },
  { value: '12', label: '12 hours' },
  { value: '24', label: '1 day' },
  { value: '48', label: '2 days' },
  { value: '72', label: '3 days' },
  { value: '168', label: '1 week' },
  { value: '720', label: '1 month' },
];

interface ChannelScraperFormProps {
  onSuccess?: () => void;
}

export function ChannelScraperForm({ onSuccess }: ChannelScraperFormProps) {
  const { channel, channels, selectedChannelId, selectChannel } = useYouTubeChannel();
  const { session } = useAuth();
  const { toast } = useToast();
  
  const [channelUrl, setChannelUrl] = useState('');
  const [videoCount, setVideoCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [scheduleInterval, setScheduleInterval] = useState('4');

  const detectPlatform = (url: string): 'youtube' | 'instagram' | null => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('instagram.com')) {
      return 'instagram';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!channel) {
      toast({
        title: 'No channel selected',
        description: 'Please connect and select a YouTube channel first',
        variant: 'destructive',
      });
      return;
    }

    const platform = detectPlatform(channelUrl);
    if (!platform) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid YouTube channel or Instagram profile URL',
        variant: 'destructive',
      });
      return;
    }

    if (platform !== 'youtube') {
      toast({
        title: 'Not supported yet',
        description: 'Instagram channel scraping is not yet supported. Please use individual video URLs.',
        variant: 'destructive',
      });
      return;
    }

    if (!session?.access_token) {
      toast({
        title: 'Session expired',
        description: 'Please sign in again',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Call the scrape-channel function which:
      // 1. Resolves the channel URL to individual video URLs using YouTube API
      // 2. Fetches metadata (title, description, thumbnail) for each video
      // 3. Creates unique video records in the database
      const { data, error } = await supabase.functions.invoke('scrape-channel', {
        body: {
          channel_url: channelUrl,
          video_count: videoCount,
          channel_id: channel.id,
          schedule_interval_hours: parseInt(scheduleInterval, 10),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const videosQueued = data?.videos_queued ?? 0;

      if (videosQueued === 0) {
        toast({
          title: 'No Shorts found',
          description: 'Could not find any YouTube Shorts on this channel.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Videos queued for download',
          description: `${videosQueued} unique videos added to queue with metadata. Your Local Runner will process them.`,
        });
      }

      setChannelUrl('');
      setVideoCount(10);
      onSuccess?.();
    } catch (err: any) {
      console.error('Channel scrape error:', err);
      toast({
        title: 'Failed to queue videos',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const platform = detectPlatform(channelUrl);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Channel Selector */}
      {channels.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Youtube className="w-5 h-5 text-primary" />
            Publish To
          </h3>
          <ChannelSelector
            channels={channels}
            selectedChannelId={selectedChannelId}
            onSelectChannel={selectChannel}
            disabled={loading}
          />
        </div>
      )}

      {/* Channel/Profile URL Input */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Source Channel/Profile
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channelUrl" className="text-foreground flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              YouTube Channel or Instagram Profile URL
            </Label>
            <Input
              id="channelUrl"
              type="url"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="https://youtube.com/@channelname or https://instagram.com/username"
              className="bg-input border-border text-foreground"
              disabled={loading}
            />
            {platform && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-primary/20 text-primary">
                {platform === 'youtube' ? 'YouTube Channel' : 'Instagram Profile'}
              </span>
            )}
          </div>

          {/* Video Count Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Videos to fetch</Label>
              <span className="text-sm font-medium text-primary">{videoCount}</span>
            </div>
            <Slider
              value={[videoCount]}
              onValueChange={(value) => setVideoCount(value[0])}
              min={3}
              max={50}
              step={1}
              className="w-full"
              disabled={loading}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3</span>
              <span>50</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="glass-card p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Local Runner Required</p>
            <p className="text-sm text-muted-foreground mt-1">
              Videos will be queued with <code className="px-1 py-0.5 rounded bg-muted text-xs">pending_download</code> status. 
              Your Local Runner will use yt-dlp to scrape and download videos from this channel.
            </p>
          </div>
        </div>
      </div>

      {/* Schedule Interval */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Timer className="w-5 h-5 text-primary" />
          Schedule Interval
        </h3>
        <Select value={scheduleInterval} onValueChange={setScheduleInterval}>
          <SelectTrigger className="bg-input border-border text-foreground">
            <SelectValue placeholder="Select interval" />
          </SelectTrigger>
          <SelectContent>
            {SCHEDULE_INTERVALS.map((interval) => (
              <SelectItem key={interval.value} value={interval.value}>
                {interval.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-2">
          Videos will be automatically spaced apart by this interval
        </p>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        size="lg" 
        className="w-full"
        disabled={loading || !channelUrl.trim() || !channel}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Queueing Videos...
          </>
        ) : (
          <>
            <Users className="w-5 h-5" />
            Queue {videoCount} Videos for Download
          </>
        )}
      </Button>
    </form>
  );
}