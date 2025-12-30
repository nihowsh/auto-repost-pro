import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_thumbnail: string | null;
  is_active: boolean;
}

export function useYouTubeChannel() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChannels = useCallback(async () => {
    if (!user) {
      setChannels([]);
      setSelectedChannelId(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching channels:', error);
        return;
      }
      
      setChannels(data || []);
      
      // Auto-select first channel if none selected
      if (data && data.length > 0 && !selectedChannelId) {
        setSelectedChannelId(data[0].id);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedChannelId]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const selectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  const disconnectChannel = async (channelId: string) => {
    try {
      const { error } = await supabase
        .from('youtube_channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;
      
      // Remove from local state
      setChannels(prev => prev.filter(c => c.id !== channelId));
      
      // If we deleted the selected channel, select another
      if (selectedChannelId === channelId) {
        const remaining = channels.filter(c => c.id !== channelId);
        setSelectedChannelId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Error disconnecting channel:', err);
      throw err;
    }
  };

  // Computed: currently selected channel
  const channel = channels.find(c => c.id === selectedChannelId) || null;

  return { 
    channel, 
    channels, 
    loading, 
    selectChannel,
    selectedChannelId,
    refetchChannel: fetchChannels, 
    disconnectChannel 
  };
}
