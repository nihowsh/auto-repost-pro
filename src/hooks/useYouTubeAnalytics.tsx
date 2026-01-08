import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays } from 'date-fns';

export interface ChannelStats {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  hiddenSubscriberCount: boolean;
}

export interface AnalyticsRow {
  date: string;
  views: number;
  watchTimeMinutes: number;
  subscribersGained: number;
  subscribersLost: number;
}

export interface VideoAnalytics {
  videoId: string;
  title: string;
  thumbnail: string | null;
  publishedAt: string | null;
  duration: string | null;
  views: number;
  watchTimeMinutes: number;
  avgViewDuration: number;
  likes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
}

export function useYouTubeAnalytics() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChannelStats = useCallback(async (channelDbId: string): Promise<ChannelStats | null> => {
    if (!session?.access_token) return null;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-analytics', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: 'channel_stats', channel_db_id: channelDbId },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);
      return data as ChannelStats;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch channel stats';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const fetchAnalyticsReport = useCallback(async (
    channelDbId: string,
    startDate: Date,
    endDate: Date,
    dimensions: string[] = ['day']
  ): Promise<AnalyticsRow[] | null> => {
    if (!session?.access_token) return null;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-analytics', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          action: 'analytics_report',
          channel_db_id: channelDbId,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          metrics: ['views', 'estimatedMinutesWatched', 'subscribersGained', 'subscribersLost'],
          dimensions,
        },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      // Transform rows to typed objects
      const rows: AnalyticsRow[] = (data.rows || []).map((row: any[]) => ({
        date: row[0],
        views: row[1] || 0,
        watchTimeMinutes: row[2] || 0,
        subscribersGained: row[3] || 0,
        subscribersLost: row[4] || 0,
      }));

      return rows;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const fetchVideoAnalytics = useCallback(async (
    channelDbId: string,
    videoIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<VideoAnalytics[] | null> => {
    if (!session?.access_token || videoIds.length === 0) return null;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-analytics', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          action: 'video_analytics',
          channel_db_id: channelDbId,
          video_ids: videoIds,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
        },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      return data.videos || [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch video analytics';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [session]);

  const fetchTopVideos = useCallback(async (
    channelDbId: string,
    startDate: Date,
    endDate: Date
  ): Promise<VideoAnalytics[] | null> => {
    if (!session?.access_token) return null;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-analytics', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          action: 'top_videos',
          channel_db_id: channelDbId,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
        },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      return data.videos || [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch top videos';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [session]);

  return {
    loading,
    error,
    fetchChannelStats,
    fetchAnalyticsReport,
    fetchVideoAnalytics,
    fetchTopVideos,
  };
}
