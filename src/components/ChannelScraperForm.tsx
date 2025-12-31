import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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
} from 'lucide-react';

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
        // Create video rows with pending_download status for the local runner to process.
        // We encode scrape parameters into source_url so the local runner can:
        // 1) extract candidate IDs from the channel feed
        // 2) randomly pick N IDs (based on limit)
        // 3) download ONLY individual video URLs (never the /shorts feed)
        const videoPromises = [];
        for (let i = 0; i < videoCount; i++) {
          videoPromises.push(
            supabase.functions.invoke('process-video', {
              body: {
                source_url: `${channelUrl}#limit=${videoCount}#index=${i}`,
                source_type: platform,
                title: `Video ${i + 1} from channel`,
                description: `Queued from channel scrape - waiting for local runner`,
                tags: [],
                thumbnail_url: null,
                channel_id: channel.id,
                is_channel_scrape: true,
                scrape_index: i,
                scrape_total: videoCount,
                scrape_channel_url: channelUrl,
              },
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            })
          );
        }

      await Promise.all(videoPromises);

      toast({
        title: 'Videos queued for download',
        description: `${videoCount} videos added to queue. Your Local Runner will process them with yt-dlp.`,
      });

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

      {/* Auto-scheduling Info */}
      <div className="glass-card p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Auto-scheduling:</strong> Fetched videos will be automatically 
          scheduled 4 hours apart, starting immediately if no videos are currently scheduled.
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