import { useState } from 'react';
import { LongFormProject } from '@/hooks/useLongFormProjects';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
import {
  Film,
  Trash2,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Edit,
  Upload,
} from 'lucide-react';
import { LongFormPreviewButton } from './LongFormVideoPreview';
import { LongFormPublishDialog } from './LongFormPublishDialog';

interface LongFormProjectsListProps {
  projects: LongFormProject[];
  loading: boolean;
  onDelete: (projectId: string) => Promise<boolean>;
  onTriggerProcessing: (projectId: string) => Promise<boolean>;
  onEdit: (project: LongFormProject) => void;
  onPublish: (projectId: string, scheduledPublishAt: string | null) => Promise<boolean>;
  getLastScheduledTime: (channelId: string | null) => Promise<Date | null>;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: Edit },
  generating_script: { label: 'Generating Script', color: 'bg-blue-500/20 text-blue-500', icon: Loader2 },
  script_ready: { label: 'Script Ready', color: 'bg-blue-500/20 text-blue-500', icon: CheckCircle },
  voiceover_ready: { label: 'Voiceover Ready', color: 'bg-green-500/20 text-green-500', icon: CheckCircle },
  pending_processing: { label: 'Waiting for Runner', color: 'bg-yellow-500/20 text-yellow-500', icon: Clock },
  downloading_clips: { label: 'Downloading Clips', color: 'bg-purple-500/20 text-purple-500', icon: Loader2 },
  assembling: { label: 'Assembling Video', color: 'bg-purple-500/20 text-purple-500', icon: Loader2 },
  ready_for_review: { label: 'Ready for Review', color: 'bg-green-500/20 text-green-500', icon: CheckCircle },
  uploading: { label: 'Uploading to YouTube', color: 'bg-primary/20 text-primary', icon: Loader2 },
  scheduled: { label: 'Scheduled', color: 'bg-primary/20 text-primary', icon: Clock },
  published: { label: 'Published', color: 'bg-green-500/20 text-green-500', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-destructive/20 text-destructive', icon: AlertCircle },
};

export function LongFormProjectsList({
  projects,
  loading,
  onDelete,
  onTriggerProcessing,
  onEdit,
  onPublish,
  getLastScheduledTime,
}: LongFormProjectsListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [publishDialogProject, setPublishDialogProject] = useState<LongFormProject | null>(null);

  const handleDelete = async () => {
    if (!projectToDelete) return;
    setDeletingId(projectToDelete);
    await onDelete(projectToDelete);
    setDeletingId(null);
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const handleTriggerProcessing = async (projectId: string) => {
    setProcessingId(projectId);
    await onTriggerProcessing(projectId);
    setProcessingId(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Film className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
        <p className="text-muted-foreground">Create a new long-form video project to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {projects.map((project) => {
          const status = statusConfig[project.status] || statusConfig.draft;
          const StatusIcon = status.icon;
          const isProcessing = ['pending_processing', 'downloading_clips', 'assembling', 'uploading'].includes(project.status);
          const canStartProcessing = project.status === 'voiceover_ready' && project.voiceover_path;
          const canRetry = project.status === 'failed';
          const isReadyForReview = project.status === 'ready_for_review';

          return (
            <div key={project.id} className="glass-card p-4">
              <div className="flex items-start gap-4">
                {/* Thumbnail or placeholder */}
                <div className="w-32 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {project.thumbnail_path ? (
                    <img
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/videos/${project.thumbnail_path}`}
                      alt={project.topic}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Film className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground truncate">
                      {project.youtube_title || project.topic}
                    </h3>
                    <Badge className={status.color}>
                      <StatusIcon className={`w-3 h-3 mr-1 ${isProcessing ? 'animate-spin' : ''}`} />
                      {status.label}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground truncate mb-2">
                    {project.brief_description || `${project.reference_urls.length} reference videos`}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(project.target_duration_seconds)}
                    </span>
                    <span>{project.reference_urls.length} sources</span>
                    {project.script && (
                      <span className="text-green-500">✓ Script</span>
                    )}
                    {project.voiceover_path && (
                      <span className="text-green-500">✓ Voiceover</span>
                    )}
                    {project.background_music_url ? (
                      <span className="text-green-500">✓ BG Music</span>
                    ) : (
                      <span className="text-muted-foreground/60">— No Music</span>
                    )}
                    {project.youtube_title && project.youtube_description ? (
                      <span className="text-green-500">✓ Metadata</span>
                    ) : (
                      <span className="text-muted-foreground/60">— No Metadata</span>
                    )}
                  </div>

                  {/* Progress bar for processing */}
                  {isProcessing && (
                    <div className="mt-3">
                      <Progress value={project.processing_progress} className="h-2" />
                      <span className="text-xs text-muted-foreground mt-1">
                        {project.processing_progress}% complete
                      </span>
                    </div>
                  )}

                  {/* Error message */}
                  {project.error_message && (
                    <p className="text-xs text-destructive mt-2 truncate">
                      Error: {project.error_message}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Edit button for drafts */}
                  {['draft', 'script_ready', 'voiceover_ready'].includes(project.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(project)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}

                  {/* Start processing button */}
                  {canStartProcessing && (
                    <Button
                      size="sm"
                      onClick={() => handleTriggerProcessing(project.id)}
                      disabled={processingId === project.id}
                    >
                      {processingId === project.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      <span className="ml-1">Process</span>
                    </Button>
                  )}

                  {/* Ready for Review: Preview + Re-process + Upload */}
                  {isReadyForReview && (
                    <>
                      <LongFormPreviewButton project={project} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTriggerProcessing(project.id)}
                        disabled={processingId === project.id}
                        title="Re-process video"
                      >
                        {processingId === project.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setPublishDialogProject(project)}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Upload
                      </Button>
                    </>
                  )}

                  {/* Retry button for failed */}
                  {canRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTriggerProcessing(project.id)}
                      disabled={processingId === project.id}
                    >
                      {processingId === project.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span className="ml-1">Retry</span>
                    </Button>
                  )}

                  {/* View on YouTube */}
                  {project.youtube_video_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`https://youtube.com/watch?v=${project.youtube_video_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setProjectToDelete(project.id);
                      setDeleteDialogOpen(true);
                    }}
                    disabled={deletingId === project.id}
                  >
                    {deletingId === project.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and all associated files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish Dialog */}
      {publishDialogProject && (
        <LongFormPublishDialog
          project={publishDialogProject}
          open={!!publishDialogProject}
          onOpenChange={(open) => !open && setPublishDialogProject(null)}
          onPublish={onPublish}
          getLastScheduledTime={getLastScheduledTime}
        />
      )}
    </>
  );
}
