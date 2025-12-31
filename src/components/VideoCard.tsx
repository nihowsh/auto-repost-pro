import { Video } from '@/hooks/useVideos';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Loader2,
  Film,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

interface VideoCardProps {
  video: Video;
}

const statusConfig: Record<string, { label: string; icon: any; class: string }> = {
  pending: { label: 'Pending', icon: Clock, class: 'status-pending' },
  pending_download: { label: 'Waiting for Desktop App', icon: Clock, class: 'status-pending' },
  downloading: { label: 'Downloading', icon: Loader2, class: 'status-downloading' },
  processing: { label: 'Processing', icon: Loader2, class: 'status-processing' },
  ready: { label: 'Ready', icon: CheckCircle, class: 'status-ready' },
  uploading: { label: 'Uploading', icon: Loader2, class: 'status-uploading' },
  scheduled: { label: 'Scheduled', icon: Clock, class: 'status-scheduled' },
  published: { label: 'Published', icon: CheckCircle, class: 'status-published' },
  failed: { label: 'Failed', icon: AlertCircle, class: 'status-failed' },
};

export function VideoCard({ video }: VideoCardProps) {
  const { toast } = useToast();
  const { session } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const status = statusConfig[video.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const isProcessing = ['downloading', 'processing', 'uploading'].includes(video.status);
  const handleDelete = async () => {
    if (!session) {
      toast({
        title: 'Session expired',
        description: 'Please sign in again',
        variant: 'destructive',
      });
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id);

      if (error) throw error;

      toast({
        title: 'Video removed',
        description: 'The video has been removed from your queue',
      });
    } catch (err: any) {
      console.error('Delete error:', err);
      toast({
        title: 'Delete failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleRetry = async () => {
    if (!session?.access_token) {
      toast({
        title: 'Session expired',
        description: 'Please sign in again',
        variant: 'destructive',
      });
      return;
    }
    
    setRetrying(true);
    try {
      const { error } = await supabase.functions.invoke('process-video', {
        body: {
          video_id: video.id,
          retry: true,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Retrying upload',
        description: 'The video is being reprocessed',
      });
    } catch (err: any) {
      toast({
        title: 'Retry failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setRetrying(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="glass-card p-4 flex gap-4 items-start animate-slide-up">
      {/* Thumbnail */}
      <div className="w-40 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
        {video.thumbnail_url ? (
          <img 
            src={video.thumbnail_url} 
            alt={video.title || 'Video thumbnail'} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        {video.is_short && (
          <span className="absolute top-1 right-1 px-1.5 py-0.5 text-xs font-medium rounded bg-warning text-warning-foreground">
            Short
          </span>
        )}
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs font-medium rounded bg-background/80 text-foreground">
          {formatDuration(video.duration_seconds)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-medium text-foreground truncate">
              {video.title || 'Untitled Video'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {video.description || 'No description'}
            </p>
          </div>

          {/* Status Badge */}
          <div className={`status-badge flex-shrink-0 ${status.class}`}>
            <StatusIcon className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            {status.label}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="capitalize">{video.source_type}</span>
          
          {video.scheduled_publish_at && video.status === 'scheduled' && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(video.scheduled_publish_at), 'MMM d, h:mm a')}
            </span>
          )}
          
          {video.published_at && (
            <span className="flex items-center gap-1 text-success">
              <CheckCircle className="w-3 h-3" />
              Published {format(new Date(video.published_at), 'MMM d, h:mm a')}
            </span>
          )}

          {video.error_message && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="w-3 h-3" />
              {video.error_message}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          {video.youtube_video_id && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              asChild
            >
              <a 
                href={`https://youtube.com/watch?v=${video.youtube_video_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                View on YouTube
              </a>
            </Button>
          )}

          {video.status === 'failed' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              Retry
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive ml-auto"
            onClick={handleDelete}
            disabled={deleting || isProcessing}
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
