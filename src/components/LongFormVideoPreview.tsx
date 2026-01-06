import { useState } from 'react';
import { LongFormProject } from '@/hooks/useLongFormProjects';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Play, X, Loader2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  if (!project.final_video_path) return null;

  const videoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/videos/${project.final_video_path}`;

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
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-full"
            onLoadedData={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPreviewOpen(true)}
      >
        <Play className="w-4 h-4 mr-1" />
        Preview
      </Button>
      <LongFormVideoPreview
        project={project}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}
