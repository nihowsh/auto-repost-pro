import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LongFormProject {
  id: string;
  user_id: string;
  channel_id: string | null;
  status: string;
  topic: string;
  target_duration_seconds: number;
  brief_description: string | null;
  script: string | null;
  script_source: string;
  reference_urls: string[];
  clips_metadata: any | null;
  voiceover_path: string | null;
  background_music_url: string | null;
  background_music_source: string;
  background_music_category: string | null;
  final_video_path: string | null;
  thumbnail_path: string | null;
  youtube_title: string | null;
  youtube_description: string | null;
  youtube_tags: string[] | null;
  youtube_chapters: any | null;
  scheduled_publish_at: string | null;
  scheduling_mode: string;
  scheduling_delay: number | null;
  youtube_video_id: string | null;
  published_at: string | null;
  error_message: string | null;
  processing_progress: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  topic: string;
  target_duration_seconds: number;
  brief_description?: string;
  reference_urls: string[];
  channel_id?: string;
}

export function useLongFormProjects() {
  const [projects, setProjects] = useState<LongFormProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('long_form_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cast the data to our interface since types haven't regenerated yet
      setProjects((data || []) as unknown as LongFormProject[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch projects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('long_form_projects_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'long_form_projects',
        },
        () => {
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProjects]);

  const createProject = useCallback(async (input: CreateProjectInput): Promise<LongFormProject | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('long_form_projects')
        .insert({
          user_id: user.id,
          topic: input.topic,
          target_duration_seconds: input.target_duration_seconds,
          brief_description: input.brief_description || null,
          reference_urls: input.reference_urls,
          channel_id: input.channel_id || null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Project created',
        description: 'Your long-form video project has been created',
      });

      await fetchProjects();
      return data as unknown as LongFormProject;
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create project',
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchProjects, toast]);

  const updateProject = useCallback(async (
    projectId: string,
    updates: Partial<Omit<LongFormProject, 'id' | 'user_id' | 'created_at'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('long_form_projects')
        .update(updates)
        .eq('id', projectId);

      if (error) throw error;

      await fetchProjects();
      return true;
    } catch (error: any) {
      console.error('Error updating project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update project',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchProjects, toast]);

  const deleteProject = useCallback(async (projectId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('long_form_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Project deleted',
        description: 'The project has been removed',
      });

      await fetchProjects();
      return true;
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete project',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchProjects, toast]);

  const triggerProcessing = useCallback(async (projectId: string): Promise<boolean> => {
    try {
      // Update status to pending_processing
      const { error } = await supabase
        .from('long_form_projects')
        .update({ status: 'pending_processing', error_message: null, processing_progress: 0 })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Processing started',
        description: 'Your video is now queued for processing by the local runner',
      });

      await fetchProjects();
      return true;
    } catch (error: any) {
      console.error('Error triggering processing:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start processing',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchProjects, toast]);

  const publishProject = useCallback(async (
    projectId: string,
    scheduledPublishAt: string | null
  ): Promise<boolean> => {
    try {
      // First update the project with scheduled time
      const { error: updateError } = await supabase
        .from('long_form_projects')
        .update({
          scheduled_publish_at: scheduledPublishAt,
          status: 'uploading',
        })
        .eq('id', projectId);

      if (updateError) throw updateError;

      // Trigger the longform-worker
      const { error: invokeError } = await supabase.functions.invoke('longform-worker', {
        body: { project_id: projectId },
      });

      if (invokeError) {
        // Revert status on failure
        await supabase
          .from('long_form_projects')
          .update({ status: 'ready_for_review' })
          .eq('id', projectId);
        throw invokeError;
      }

      toast({
        title: scheduledPublishAt ? 'Video scheduled' : 'Upload started',
        description: scheduledPublishAt
          ? 'Your video will be published at the scheduled time'
          : 'Your video is being uploaded to YouTube',
      });

      await fetchProjects();
      return true;
    } catch (error: any) {
      console.error('Error publishing project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to publish video',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchProjects, toast]);

  const getLastScheduledTime = useCallback(async (channelId: string | null): Promise<Date | null> => {
    try {
      // Get the latest scheduled/published video time from both videos and long_form_projects
      let latestTime: Date | null = null;

      if (channelId) {
        // Check videos table
        const { data: videos } = await supabase
          .from('videos')
          .select('scheduled_publish_at, published_at')
          .eq('channel_id', channelId)
          .or('status.eq.scheduled,status.eq.published')
          .order('scheduled_publish_at', { ascending: false, nullsFirst: false })
          .limit(1);

        if (videos?.[0]) {
          const videoTime = videos[0].scheduled_publish_at || videos[0].published_at;
          if (videoTime) {
            latestTime = new Date(videoTime);
          }
        }

        // Check long_form_projects table
        const { data: projects } = await supabase
          .from('long_form_projects')
          .select('scheduled_publish_at, published_at')
          .eq('channel_id', channelId)
          .or('status.eq.scheduled,status.eq.published')
          .order('scheduled_publish_at', { ascending: false, nullsFirst: false })
          .limit(1);

        if (projects?.[0]) {
          const projectTime = projects[0].scheduled_publish_at || projects[0].published_at;
          if (projectTime) {
            const projectDate = new Date(projectTime);
            if (!latestTime || projectDate > latestTime) {
              latestTime = projectDate;
            }
          }
        }
      }

      return latestTime;
    } catch (error) {
      console.error('Error getting last scheduled time:', error);
      return null;
    }
  }, []);

  const uploadVoiceover = useCallback(async (projectId: string, file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const filePath = `${user.id}/longform/${projectId}/voiceover.${file.name.split('.').pop()}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update project with voiceover path (and invalidate any previously rendered video)
      await updateProject(projectId, {
        voiceover_path: filePath,
        final_video_path: null,
        processing_progress: 0,
        error_message: null,
        status: 'voiceover_ready',
      });

      toast({
        title: 'Voiceover uploaded',
        description: 'Your voiceover audio has been uploaded',
      });

      return filePath;
    } catch (error: any) {
      console.error('Error uploading voiceover:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload voiceover',
        variant: 'destructive',
      });
      return null;
    }
  }, [updateProject, toast]);

  const uploadThumbnail = useCallback(async (projectId: string, file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const filePath = `${user.id}/longform/${projectId}/thumbnail.${file.name.split('.').pop()}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update project with thumbnail path
      await updateProject(projectId, { thumbnail_path: filePath });

      toast({
        title: 'Thumbnail uploaded',
        description: 'Your thumbnail has been uploaded',
      });

      return filePath;
    } catch (error: any) {
      console.error('Error uploading thumbnail:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload thumbnail',
        variant: 'destructive',
      });
      return null;
    }
  }, [updateProject, toast]);

  // Helper to get projects by status
  const getProjectsByStatus = useCallback((statuses: string[]) => {
    return projects.filter(p => statuses.includes(p.status));
  }, [projects]);

  return {
    projects,
    loading,
    refetchProjects: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    triggerProcessing,
    publishProject,
    getLastScheduledTime,
    uploadVoiceover,
    uploadThumbnail,
    getProjectsByStatus,
    // Convenience getters
    draftProjects: getProjectsByStatus(['draft', 'script_ready', 'voiceover_ready']),
    processingProjects: getProjectsByStatus(['pending_processing', 'downloading_clips', 'assembling']),
    readyProjects: getProjectsByStatus(['ready_for_review']),
    publishedProjects: getProjectsByStatus(['scheduled', 'published']),
    failedProjects: getProjectsByStatus(['failed']),
  };
}
