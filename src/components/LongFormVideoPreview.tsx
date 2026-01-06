import { useEffect, useState } from 'react';
import { LongFormProject } from '@/hooks/useLongFormProjects';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface LongFormVideoPreviewProps {
  project: LongFormProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LongFormVideoPreview({
  project,
  open,
  onOpenChange,
}: LongFormVideoPreviewProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSignedUrl() {
      if (!open || !project.final_video_path) return;

      setLoading(true);
      setVideoUrl(null);

      const { data, error } = await supabase.storage
        .from('videos')
        .createSignedUrl(project.final_video_path, 60 * 30);

      if (cancelled) return;

      if (error || !data?.signedUrl) {
        console.error('Failed to create signed URL:', error);
        toast({
          title: 'Preview error',
          description: 'Could not load the video preview.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      setVideoUrl(data.signedUrl);
      // keep loading=true until onLoadedData
    }

    loadSignedUrl();

    return () => {
      cancelled = true;
    };
  }, [open, project.final_video_path, toast]);

  if (!project.final_video_path) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="pr-8">
            Preview: {project.youtube_title || project.topic}
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black aspect-video">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}

          {videoUrl && (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full"
              onLoadedData={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          )}
        </div>

        <div className="p-4 text-sm text-muted-foreground">
          <p>
            Review your video. If you're happy with it, close this preview and click "Upload" to
            publish to YouTube.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PreviewButtonProps {
  project: LongFormProject;
}

export function LongFormPreviewButton({ project }: PreviewButtonProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!project.final_video_path) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
        <Play className="w-4 h-4 mr-1" />
        Preview
      </Button>
      <LongFormVideoPreview project={project} open={previewOpen} onOpenChange={setPreviewOpen} />
    </>
  );
}

