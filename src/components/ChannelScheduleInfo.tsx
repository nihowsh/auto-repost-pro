import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { YouTubeChannel } from '@/hooks/useYouTubeChannel';
import { Clock, Timer, Trash2 } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ChannelScheduleInfoProps {
  channels: YouTubeChannel[];
  onVideosDeleted?: () => void;
}

interface ChannelNextUpload {
  channelId: string;
  channelTitle: string;
  channelThumbnail: string | null;
  nextScheduledAt: string | null;
  pendingCount: number;
}

export function ChannelScheduleInfo({ channels, onVideosDeleted }: ChannelScheduleInfoProps) {
  const [schedules, setSchedules] = useState<ChannelNextUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<ChannelNextUpload | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (channels.length === 0) {
        setSchedules([]);
        setLoading(false);
        return;
      }

      try {
        // Batch fetch all video counts and next scheduled times
        const channelIds = channels.map((c) => c.id);

        // Get all pending videos for all channels in one query
        const { data: allVideos } = await supabase
          .from('videos')
          .select('id, channel_id, scheduled_publish_at')
          .in('channel_id', channelIds)
          .in('status', ['scheduled', 'pending_download', 'downloading', 'processing', 'uploading']);

        // Process the data client-side
        const channelSchedules: ChannelNextUpload[] = channels.map((channel) => {
          const channelVideos = (allVideos || []).filter((v) => v.channel_id === channel.id);
          const pendingCount = channelVideos.length;

          // Find next scheduled video
          const scheduledVideos = channelVideos
            .filter((v) => v.scheduled_publish_at)
            .sort((a, b) => 
              new Date(a.scheduled_publish_at!).getTime() - new Date(b.scheduled_publish_at!).getTime()
            );

          const nextScheduledAt = scheduledVideos.length > 0 ? scheduledVideos[0].scheduled_publish_at : null;

          return {
            channelId: channel.id,
            channelTitle: channel.channel_title,
            channelThumbnail: channel.channel_thumbnail,
            nextScheduledAt,
            pendingCount,
          };
        });

        setSchedules(channelSchedules);
      } catch (err) {
        console.error('Error fetching schedules:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();

    // Refresh every minute
    const interval = setInterval(fetchSchedules, 60000);
    return () => clearInterval(interval);
  }, [channels]);

  const handleDeleteClick = (schedule: ChannelNextUpload) => {
    setChannelToDelete(schedule);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!channelToDelete) return;

    setDeleting(true);
    try {
      const { error, count } = await supabase
        .from('videos')
        .delete({ count: 'exact' })
        .eq('channel_id', channelToDelete.channelId)
        .in('status', ['scheduled', 'pending_download', 'downloading', 'processing', 'uploading']);

      if (error) throw error;

      toast.success(`Deleted ${count || 0} scheduled videos from ${channelToDelete.channelTitle}`);
      
      // Update local state
      setSchedules((prev) =>
        prev.map((s) =>
          s.channelId === channelToDelete.channelId
            ? { ...s, pendingCount: 0, nextScheduledAt: null }
            : s
        )
      );

      onVideosDeleted?.();
    } catch (err) {
      console.error('Error deleting videos:', err);
      toast.error('Failed to delete videos');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setChannelToDelete(null);
    }
  };

  if (loading || schedules.length === 0) {
    return null;
  }

  // Only show channels with scheduled content
  const activeSchedules = schedules.filter((s) => s.pendingCount > 0);

  if (activeSchedules.length === 0) {
    return null;
  }

  return (
    <div className="glass-card p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Timer className="w-4 h-4 text-primary" />
        <h3 className="font-medium text-sm">Channel Upload Schedule</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activeSchedules.map((schedule) => (
          <div
            key={schedule.channelId}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group"
          >
            {schedule.channelThumbnail ? (
              <img
                src={schedule.channelThumbnail}
                alt={schedule.channelTitle}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{schedule.channelTitle}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{schedule.pendingCount} video{schedule.pendingCount !== 1 ? 's' : ''} queued</span>
                {schedule.nextScheduledAt && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Next in <CountdownTimer targetDate={schedule.nextScheduledAt} className="font-medium text-foreground" />
                    </span>
                  </>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleDeleteClick(schedule)}
              title={`Delete all scheduled videos for ${schedule.channelTitle}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all scheduled videos?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {channelToDelete?.pendingCount} queued/scheduled videos for{' '}
              <span className="font-medium text-foreground">{channelToDelete?.channelTitle}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete all'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
