import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useYouTubeChannel } from '@/hooks/useYouTubeChannel';
import { ChannelSelector } from '@/components/ChannelSelector';
import { 
  Link2, 
  Loader2, 
  Video,
  Tag,
  FileText,
  Clock,
  Calendar,
  Zap,
  Youtube,
} from 'lucide-react';

interface UploadFormProps {
  onSuccess?: () => void;
}

export function UploadForm({ onSuccess }: UploadFormProps) {
  const { user, session } = useAuth();
  const { channel, channels, selectedChannelId, selectChannel } = useYouTubeChannel();
  const { toast } = useToast();
  
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [useManualSchedule, setUseManualSchedule] = useState(false);
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');

  const detectSourceType = (url: string): 'youtube' | 'instagram' | null => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('instagram.com')) {
      return 'instagram';
    }
    return null;
  };

  const handleFetchMetadata = async () => {
    if (!videoUrl.trim()) {
      toast({
        title: 'Enter a URL',
        description: 'Please enter a YouTube or Instagram video URL',
        variant: 'destructive',
      });
      return;
    }

    const sourceType = detectSourceType(videoUrl);
    if (!sourceType) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid YouTube or Instagram URL',
        variant: 'destructive',
      });
      return;
    }

    if (!session?.access_token) {
      toast({
        title: 'Please sign in again',
        description: 'Your session expired. Sign out and sign back in.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-video-metadata', {
        body: { url: videoUrl, source_type: sourceType, channel_id: selectedChannelId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setMetadata(data);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setTags(data.tags?.join(', ') || '');

      toast({
        title: 'Metadata fetched',
        description: `${sourceType === 'youtube' ? 'YouTube' : 'Instagram'} video detected`,
      });
    } catch (err: any) {
      toast({
        title: 'Failed to fetch metadata',
        description: err.message || 'Could not retrieve video information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async (url: string, sourceType: 'youtube' | 'instagram') => {
    if (!session?.access_token) {
      throw new Error('Please sign in again');
    }

    const { data, error } = await supabase.functions.invoke('fetch-video-metadata', {
      body: { url, source_type: sourceType, channel_id: selectedChannelId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !channel) {
      toast({
        title: 'Not ready',
        description: 'Please connect your YouTube channel first',
        variant: 'destructive',
      });
      return;
    }

    if (!videoUrl.trim()) {
      toast({
        title: 'Enter a URL',
        description: 'Please enter a video URL',
        variant: 'destructive',
      });
      return;
    }

    const sourceType = detectSourceType(videoUrl);
    if (!sourceType) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid YouTube or Instagram URL',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (!session?.access_token) {
        throw new Error('Please sign in again');
      }

      // Ensure we always have metadata saved, even if user didn't click Fetch
      const resolvedMetadata = metadata?.source_url === videoUrl ? metadata : await fetchMetadata(videoUrl, sourceType);
      setMetadata(resolvedMetadata);
      setTitle((prev) => prev || resolvedMetadata.title || '');
      setDescription((prev) => prev || resolvedMetadata.description || '');
      setTags((prev) => prev || resolvedMetadata.tags?.join(', ') || '');

      let manualScheduleTime = null;
      if (useManualSchedule && manualDate && manualTime) {
        manualScheduleTime = new Date(`${manualDate}T${manualTime}`).toISOString();
      }

      const { data, error } = await supabase.functions.invoke('process-video', {
        body: {
          source_url: videoUrl,
          source_type: sourceType,
          title: title || resolvedMetadata?.title || 'Untitled',
          description: description || resolvedMetadata?.description || '',
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          thumbnail_url: resolvedMetadata?.thumbnail_url,
          channel_id: channel.id,
          manual_schedule_time: manualScheduleTime,
          duration_seconds: resolvedMetadata?.duration_seconds || null,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Video queued',
        description: 'Your video is being processed for upload',
      });

      // Reset form
      setVideoUrl('');
      setMetadata(null);
      setTitle('');
      setDescription('');
      setTags('');
      setUseManualSchedule(false);
      setManualDate('');
      setManualTime('');

      onSuccess?.();
    } catch (err: any) {
      toast({
        title: 'Failed to queue video',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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

      {/* URL Input */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          Video Source
        </h3>
        
        <div className="flex gap-3">
          <Input
            type="url"
            placeholder="Paste YouTube or Instagram Reel URL..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
          <Button 
            type="button" 
            variant="secondary"
            onClick={handleFetchMetadata}
            disabled={loading || !videoUrl.trim()}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Fetch'
            )}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          Supports YouTube videos and Instagram Reels
        </p>
      </div>

      {/* Metadata Preview */}
      {metadata && (
        <div className="glass-card p-6 animate-slide-up">
          <div className="flex gap-4 mb-6">
            {metadata.thumbnail_url && (
              <div className="w-32 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img 
                  src={metadata.thumbnail_url} 
                  alt="Thumbnail" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-primary/20 text-primary">
                  {metadata.source_type === 'youtube' ? 'YouTube' : 'Instagram'}
                </span>
                {metadata.is_short && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-warning/20 text-warning">
                    Short
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {metadata.duration_seconds ? `Duration: ${Math.floor(metadata.duration_seconds / 60)}:${String(metadata.duration_seconds % 60).padStart(2, '0')}` : 'Duration unknown'}
              </p>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground flex items-center gap-2">
                <Video className="w-4 h-4 text-muted-foreground" />
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter video title"
                className="bg-input border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter video description"
                rows={4}
                className="bg-input border-border text-foreground resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                Tags
              </Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
                className="bg-input border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground">Separate tags with commas</p>
            </div>
          </div>
        </div>
      )}

      {/* Scheduling Options */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Scheduling
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium text-foreground">Auto-schedule</p>
                <p className="text-sm text-muted-foreground">
                  Publishes immediately or 4 hours after last scheduled video
                </p>
              </div>
            </div>
            <Switch
              checked={!useManualSchedule}
              onCheckedChange={(checked) => setUseManualSchedule(!checked)}
            />
          </div>

          {useManualSchedule && (
            <div className="grid grid-cols-2 gap-4 animate-slide-up">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="bg-input border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="bg-input border-border text-foreground"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        size="lg" 
        className="w-full"
        disabled={loading || !videoUrl.trim() || !channel}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Video className="w-5 h-5" />
            Queue Video for Upload
          </>
        )}
      </Button>
    </form>
  );
}
