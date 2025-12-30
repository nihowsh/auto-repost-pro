import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Video {
  id: string;
  source_url: string;
  source_type: 'youtube' | 'instagram';
  title: string | null;
  description: string | null;
  tags: string[] | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  is_short: boolean;
  status: 'pending' | 'downloading' | 'processing' | 'ready' | 'uploading' | 'scheduled' | 'published' | 'failed';
  youtube_video_id: string | null;
  scheduled_publish_at: string | null;
  published_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useVideos() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    if (!user) {
      setVideos([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data as Video[]);
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('videos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchVideos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchVideos]);

  const getVideosByStatus = useCallback((statuses: string[]) => {
    return videos.filter(v => statuses.includes(v.status));
  }, [videos]);

  const queueVideos = getVideosByStatus(['pending', 'pending_download', 'downloading', 'processing', 'ready', 'uploading']);
  const scheduledVideos = getVideosByStatus(['scheduled']);
  const publishedVideos = getVideosByStatus(['published']);
  const failedVideos = getVideosByStatus(['failed']);

  return {
    videos,
    loading,
    refetchVideos: fetchVideos,
    queueVideos,
    scheduledVideos,
    publishedVideos,
    failedVideos,
  };
}
