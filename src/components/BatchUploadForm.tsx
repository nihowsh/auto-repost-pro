import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useYouTubeChannel } from '@/hooks/useYouTubeChannel';
import { ChannelSelector } from '@/components/ChannelSelector';
import { 
  Loader2, 
  Link2,
  Youtube,
  ListPlus,
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

interface BatchUploadFormProps {
  onSuccess?: () => void;
}

export function BatchUploadForm({ onSuccess }: BatchUploadFormProps) {
  const { session } = useAuth();
  const { channel, channels, selectedChannelId, selectChannel } = useYouTubeChannel();
  const { toast } = useToast();
  
  const [urlsText, setUrlsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [scheduleInterval, setScheduleInterval] = useState('4');

  const detectSourceType = (url: string): 'youtube' | 'instagram' | null => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('instagram.com')) {
      return 'instagram';
    }
    return null;
  };

  const parseUrls = (text: string): string[] => {
    return text
      .split(/[\n,]/)
      .map(url => url.trim())
      .filter(url => url.length > 0 && detectSourceType(url) !== null);
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

    const urls = parseUrls(urlsText);
    
    if (urls.length === 0) {
      toast({
        title: 'No valid URLs',
        description: 'Please enter at least one valid YouTube or Instagram URL',
        variant: 'destructive',
      });
      return;
    }

    if (urls.length > 50) {
      toast({
        title: 'Too many URLs',
        description: 'Please limit to 50 videos at a time',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setProgress({ current: 0, total: urls.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const sourceType = detectSourceType(url);
      
      if (!sourceType) continue;

      setProgress({ current: i + 1, total: urls.length });

      try {
        const { error } = await supabase.functions.invoke('process-video', {
          body: {
            source_url: url,
            source_type: sourceType,
            channel_id: channel.id,
            schedule_interval_hours: parseInt(scheduleInterval, 10),
          },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (error) throw error;
        successCount++;
      } catch (err: any) {
        console.error(`Failed to queue ${url}:`, err);
        failCount++;
      }
    }

    setLoading(false);
    setProgress({ current: 0, total: 0 });

    if (successCount > 0) {
      toast({
        title: 'Videos queued',
        description: `${successCount} video${successCount > 1 ? 's' : ''} queued successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });
      setUrlsText('');
      onSuccess?.();
    } else {
      toast({
        title: 'Failed to queue videos',
        description: 'None of the videos could be queued. Please check the URLs.',
        variant: 'destructive',
      });
    }
  };

  const urlCount = parseUrls(urlsText).length;

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

      {/* Batch URL Input */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <ListPlus className="w-5 h-5 text-primary" />
          Batch Video URLs
        </h3>
        
        <div className="space-y-2">
          <Label htmlFor="urls" className="text-foreground flex items-center gap-2">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            Paste multiple URLs (one per line or comma-separated)
          </Label>
          <Textarea
            id="urls"
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder={`https://youtube.com/shorts/abc123\nhttps://youtube.com/watch?v=xyz456\nhttps://instagram.com/reel/...`}
            rows={8}
            className="bg-input border-border text-foreground resize-none font-mono text-sm"
            disabled={loading}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Supports YouTube videos, Shorts, and Instagram Reels</span>
            <span className={urlCount > 50 ? 'text-destructive' : ''}>
              {urlCount} valid URL{urlCount !== 1 ? 's' : ''} detected (max 50)
            </span>
          </div>
        </div>
      </div>

      {/* Progress */}
      {loading && progress.total > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-foreground">
              Processing {progress.current} of {progress.total}...
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

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
        disabled={loading || urlCount === 0 || urlCount > 50 || !channel}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Queuing Videos...
          </>
        ) : (
          <>
            <ListPlus className="w-5 h-5" />
            Queue {urlCount} Video{urlCount !== 1 ? 's' : ''} for Upload
          </>
        )}
      </Button>
    </form>
  );
}