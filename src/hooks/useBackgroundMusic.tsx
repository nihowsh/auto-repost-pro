import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { MusicTrack } from '@/data/backgroundMusic';

export function useBackgroundMusic() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userTracks, setUserTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch user-uploaded tracks from DB + storage
  const fetchUserTracks = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('background_music_tracks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map to MusicTrack format
      const tracks: MusicTrack[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.title,
        url: getPublicUrl(row.file_path),
        source: 'user' as const,
      }));

      setUserTracks(tracks);
    } catch (error: any) {
      console.error('Error fetching user tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get public URL for a file in background-music bucket
  const getPublicUrl = (filePath: string): string => {
    const { data } = supabase.storage
      .from('background-music')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Upload a new music file
  const uploadTrack = async (file: File, title: string): Promise<MusicTrack | null> => {
    if (!user) return null;

    try {
      // Upload to storage
      const ext = file.name.split('.').pop() || 'mp3';
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('background-music')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Insert record into DB
      const { data, error: dbError } = await supabase
        .from('background_music_tracks')
        .insert({
          user_id: user.id,
          title,
          file_path: filePath,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      const newTrack: MusicTrack = {
        id: data.id,
        name: data.title,
        url: getPublicUrl(data.file_path),
        source: 'user',
      };

      setUserTracks(prev => [newTrack, ...prev]);

      toast({ title: 'Track uploaded', description: `"${title}" added to your library` });

      return newTrack;
    } catch (error: any) {
      console.error('Error uploading track:', error);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  // Delete a user track
  const deleteTrack = async (trackId: string) => {
    if (!user) return;

    try {
      // Find the track to get file_path
      const { data: trackData, error: fetchError } = await supabase
        .from('background_music_tracks')
        .select('file_path')
        .eq('id', trackId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      if (trackData?.file_path) {
        await supabase.storage.from('background-music').remove([trackData.file_path]);
      }

      // Delete from DB
      const { error: deleteError } = await supabase
        .from('background_music_tracks')
        .delete()
        .eq('id', trackId);

      if (deleteError) throw deleteError;

      setUserTracks(prev => prev.filter(t => t.id !== trackId));
      toast({ title: 'Track deleted' });
    } catch (error: any) {
      console.error('Error deleting track:', error);
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserTracks();
    } else {
      setUserTracks([]);
    }
  }, [user]);

  return {
    userTracks,
    loading,
    uploadTrack,
    deleteTrack,
    refetch: fetchUserTracks,
  };
}
