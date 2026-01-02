import { useState } from 'react';
import { Video } from '@/hooks/useVideos';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ScheduleEditDialogProps {
  video: Video;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ScheduleEditDialog({
  video,
  open,
  onOpenChange,
  onSuccess,
}: ScheduleEditDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Format datetime for input
  const currentSchedule = video.scheduled_publish_at
    ? format(new Date(video.scheduled_publish_at), "yyyy-MM-dd'T'HH:mm")
    : format(new Date(Date.now() + 4 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm");

  const [scheduleTime, setScheduleTime] = useState(currentSchedule);

  const handleSave = async () => {
    if (!scheduleTime) {
      toast({
        title: 'Invalid time',
        description: 'Please select a valid date and time',
        variant: 'destructive',
      });
      return;
    }

    const newDate = new Date(scheduleTime);
    if (newDate <= new Date()) {
      toast({
        title: 'Invalid time',
        description: 'Scheduled time must be in the future',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('videos')
        .update({ scheduled_publish_at: newDate.toISOString() })
        .eq('id', video.id);

      if (error) throw error;

      toast({
        title: 'Schedule updated',
        description: `Video will be published at ${format(newDate, 'MMM d, h:mm a')}`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Schedule</DialogTitle>
          <DialogDescription>
            Change when this video will be uploaded to YouTube.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="scheduleTime">Publish Date & Time</Label>
            <Input
              id="scheduleTime"
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Current schedule:{' '}
            {video.scheduled_publish_at
              ? format(new Date(video.scheduled_publish_at), 'MMM d, yyyy h:mm a')
              : 'Not set'}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
