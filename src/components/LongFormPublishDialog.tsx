import { useState, useEffect } from 'react';
import { LongFormProject } from '@/hooks/useLongFormProjects';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { CalendarIcon, Upload, Clock, Loader2 } from 'lucide-react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface LongFormPublishDialogProps {
  project: LongFormProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (projectId: string, scheduledPublishAt: string | null) => Promise<boolean>;
  getLastScheduledTime: (channelId: string | null, longFormOnly?: boolean) => Promise<Date | null>;
}

type ScheduleMode = 'immediate' | 'specific' | 'relative';

interface RelativeOption {
  label: string;
  value: string;
  getDays: () => number;
}

const relativeOptions: RelativeOption[] = [
  { label: '1 day after', value: '1d', getDays: () => 1 },
  { label: '2 days after', value: '2d', getDays: () => 2 },
  { label: '3 days after', value: '3d', getDays: () => 3 },
  { label: '4 days after', value: '4d', getDays: () => 4 },
  { label: '5 days after', value: '5d', getDays: () => 5 },
  { label: '1 week after', value: '1w', getDays: () => 7 },
  { label: '2 weeks after', value: '2w', getDays: () => 14 },
  { label: '3 weeks after', value: '3w', getDays: () => 21 },
  { label: '1 month after', value: '1m', getDays: () => 30 },
  { label: '2 months after', value: '2m', getDays: () => 60 },
  { label: '3 months after', value: '3m', getDays: () => 90 },
  { label: '6 months after', value: '6m', getDays: () => 180 },
];

export function LongFormPublishDialog({
  project,
  open,
  onOpenChange,
  onPublish,
  getLastScheduledTime,
}: LongFormPublishDialogProps) {
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('immediate');
  const [specificDate, setSpecificDate] = useState<Date | undefined>(undefined);
  const [specificTime, setSpecificTime] = useState('12:00');
  const [relativeOption, setRelativeOption] = useState('1d');
  const [lastScheduledTime, setLastScheduledTime] = useState<Date | null>(null);
  const [loadingLastTime, setLoadingLastTime] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Fetch last scheduled time when dialog opens
  // Use longFormOnly=true so we only check long-form videos for scheduling
  useEffect(() => {
    if (open && project.channel_id) {
      setLoadingLastTime(true);
      getLastScheduledTime(project.channel_id, true).then((time) => {
        setLastScheduledTime(time);
        setLoadingLastTime(false);
      });
    }
  }, [open, project.channel_id, getLastScheduledTime]);

  const calculateScheduledTime = (): string | null => {
    if (scheduleMode === 'immediate') {
      return null;
    }

    if (scheduleMode === 'specific' && specificDate) {
      const [hours, minutes] = specificTime.split(':').map(Number);
      const date = new Date(specificDate);
      date.setHours(hours, minutes, 0, 0);
      return date.toISOString();
    }

    if (scheduleMode === 'relative') {
      const option = relativeOptions.find((o) => o.value === relativeOption);
      if (!option) return null;

      const baseTime = lastScheduledTime || new Date();
      const days = option.getDays();

      let scheduledDate: Date;
      if (relativeOption.endsWith('m')) {
        const months = parseInt(relativeOption);
        scheduledDate = addMonths(baseTime, months);
      } else if (relativeOption.endsWith('w')) {
        const weeks = parseInt(relativeOption);
        scheduledDate = addWeeks(baseTime, weeks);
      } else {
        scheduledDate = addDays(baseTime, days);
      }

      return scheduledDate.toISOString();
    }

    return null;
  };

  // Check if metadata is missing
  const missingMetadata = !project.youtube_title || !project.youtube_description;

  const handlePublish = async () => {
    if (missingMetadata) return;
    setPublishing(true);
    const scheduledAt = calculateScheduledTime();
    const success = await onPublish(project.id, scheduledAt);
    setPublishing(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const getPreviewTime = (): string => {
    const time = calculateScheduledTime();
    if (!time) return 'Immediately (public)';
    return format(new Date(time), 'PPP p');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish to YouTube</DialogTitle>
          <DialogDescription>
            Choose when to publish "{project.youtube_title || project.topic}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={scheduleMode}
            onValueChange={(v) => setScheduleMode(v as ScheduleMode)}
            className="space-y-3"
          >
            {/* Immediate */}
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="immediate" id="immediate" />
              <Label htmlFor="immediate" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" />
                  <span className="font-medium">Upload immediately</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Video will be public right away
                </p>
              </Label>
            </div>

            {/* Specific date */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="specific" id="specific" className="mt-1" />
              <Label htmlFor="specific" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  <span className="font-medium">Schedule for specific date</span>
                </div>
                {scheduleMode === 'specific' && (
                  <div className="flex gap-2 mt-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'justify-start text-left font-normal',
                            !specificDate && 'text-muted-foreground'
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {specificDate ? format(specificDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={specificDate}
                          onSelect={setSpecificDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={specificTime}
                      onChange={(e) => setSpecificTime(e.target.value)}
                      className="w-28"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </Label>
            </div>

            {/* Relative to last video */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="relative" id="relative" className="mt-1" />
              <Label htmlFor="relative" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-medium">Schedule after last video</span>
                </div>
                {loadingLastTime ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                    Checking last scheduled video...
                  </p>
                ) : lastScheduledTime ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    Last scheduled: {format(lastScheduledTime, 'PPP p')}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    No scheduled videos found - will use current time
                  </p>
                )}
                {scheduleMode === 'relative' && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {relativeOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant={relativeOption === option.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRelativeOption(option.value);
                        }}
                        className="text-xs"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                )}
              </Label>
            </div>
          </RadioGroup>

          {/* Preview */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <span className="text-muted-foreground">Publish time: </span>
            <span className="font-medium text-foreground">{getPreviewTime()}</span>
          </div>
        </div>

        {missingMetadata && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
            <strong>Missing metadata:</strong> Please go back and generate or enter a title and description before uploading.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={publishing || missingMetadata}>
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Publishing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {scheduleMode === 'immediate' ? 'Upload Now' : 'Schedule'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
