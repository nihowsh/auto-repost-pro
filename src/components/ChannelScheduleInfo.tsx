import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { YouTubeChannel } from '@/hooks/useYouTubeChannel';
import { Clock, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { CountdownTimer } from './CountdownTimer';

interface ChannelScheduleInfoProps {
  channels: YouTubeChannel[];
}

interface ChannelNextUpload {
  channelId: string;
  channelTitle: string;
  channelThumbnail: string | null;
  nextScheduledAt: string | null;
  pendingCount: number;
}

export function ChannelScheduleInfo({ channels }: ChannelScheduleInfoProps) {
  const [schedules, setSchedules] = useState<ChannelNextUpload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (channels.length === 0) {
        setSchedules([]);
        setLoading(false);
        return;
      }

      try {
        // Get next scheduled video for each channel
        const channelSchedules: ChannelNextUpload[] = [];

        for (const channel of channels) {
          // Get next scheduled video
          const { data: nextVideo } = await supabase
            .from('videos')
            .select('scheduled_publish_at')
            .eq('channel_id', channel.id)
            .in('status', ['scheduled', 'pending_download', 'downloading', 'processing', 'uploading'])
            .not('scheduled_publish_at', 'is', null)
            .order('scheduled_publish_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          // Get count of pending videos
          const { count } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', channel.id)
            .in('status', ['scheduled', 'pending_download', 'downloading', 'processing', 'uploading']);

          channelSchedules.push({
            channelId: channel.id,
            channelTitle: channel.channel_title,
            channelThumbnail: channel.channel_thumbnail,
            nextScheduledAt: nextVideo?.scheduled_publish_at || null,
            pendingCount: count || 0,
          });
        }

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
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
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
          </div>
        ))}
      </div>
    </div>
  );
}
