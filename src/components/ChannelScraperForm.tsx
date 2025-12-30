import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useYouTubeChannel } from '@/hooks/useYouTubeChannel';
import { ChannelSelector } from '@/components/ChannelSelector';
import { 
  Loader2, 
  Link2,
  Youtube,
  Users,
  AlertTriangle,
} from 'lucide-react';

interface ChannelScraperFormProps {
  onSuccess?: () => void;
}

export function ChannelScraperForm({ onSuccess }: ChannelScraperFormProps) {
  const { channel, channels, selectedChannelId, selectChannel } = useYouTubeChannel();
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

    setLoading(true);

    // This feature requires desktop app with yt-dlp for actual implementation
    // For now, show a placeholder message
    setTimeout(() => {
      setLoading(false);
      toast({
        title: 'Desktop App Required',
        description: 'Channel scraping requires the desktop app with yt-dlp. This feature will work once you wrap this app in Electron/Tauri.',
        variant: 'default',
      });
    }, 1500);
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

      {/* Desktop App Notice */}
      <div className="glass-card p-4 bg-warning/10 border-warning/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Desktop App Required</p>
            <p className="text-sm text-muted-foreground mt-1">
              Channel scraping requires running yt-dlp locally. This feature will be available 
              when you wrap this app with Electron or Tauri and integrate yt-dlp.
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="glass-card p-4 bg-primary/5 border-primary/20">
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
            Fetching Videos...
          </>
        ) : (
          <>
            <Users className="w-5 h-5" />
            Fetch {videoCount} Videos from {platform === 'instagram' ? 'Profile' : 'Channel'}
          </>
        )}
      </Button>
    </form>
  );
}