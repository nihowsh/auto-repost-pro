import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_thumbnail: string | null;
  is_active: boolean;
}

export function useYouTubeChannel() {
  const { user } = useAuth();
  const [channel, setChannel] = useState<YouTubeChannel | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChannel = useCallback(async () => {
    if (!user) {
      setChannel(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching channel:', error);
      }
      
      setChannel(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChannel();
  }, [fetchChannel]);

  const disconnectChannel = async () => {
    if (!channel) return;

    try {
      const { error } = await supabase
        .from('youtube_channels')
        .delete()
        .eq('id', channel.id);

      if (error) throw error;
      setChannel(null);
    } catch (err) {
      console.error('Error disconnecting channel:', err);
      throw err;
    }
  };

  return { channel, loading, refetchChannel: fetchChannel, disconnectChannel };
}
