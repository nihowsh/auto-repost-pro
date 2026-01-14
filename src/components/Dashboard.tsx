import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVideos } from '@/hooks/useVideos';
import { useYouTubeChannel } from '@/hooks/useYouTubeChannel';
import { VideoCard } from './VideoCard';
import { UploadForm } from './UploadForm';
import { BatchUploadForm } from './BatchUploadForm';
import { ChannelScraperForm } from './ChannelScraperForm';
import { ApiKeyManager } from './ApiKeyManager';
import { ChannelScheduleInfo } from './ChannelScheduleInfo';
import { LongFormCreator } from './LongFormCreator';
import { ChannelStatistics } from './ChannelStatistics';
import { PipelineHealthBar } from './PipelineHealthBar';
import { Button } from '@/components/ui/button';
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
  Upload,
  Clock,
  CheckCircle,
  AlertCircle,
  ListVideo,
  Loader2,
  ListPlus,
  Users,
  Terminal,
  Trash2,
  Film,
  BarChart3,
} from 'lucide-react';

export function Dashboard() {
  const {
    queueVideos,
    scheduledVideos,
    publishedVideos,
    failedVideos,
    loading,
    refetchVideos,
    deleteVideo,
    deleteQueueVideos,
  } = useVideos();
  const { channels } = useYouTubeChannel();
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadMode, setUploadMode] = useState<'single' | 'batch' | 'scraper'>('single');
  const [confirmClearQueueOpen, setConfirmClearQueueOpen] = useState(false);
  const [clearingQueue, setClearingQueue] = useState(false);
  const [scheduledChannelFilter, setScheduledChannelFilter] = useState<string | null>(null);

  // Filter scheduled videos by selected channel
  const filteredScheduledVideos = useMemo(() => {
    if (!scheduledChannelFilter) return scheduledVideos;
    return scheduledVideos.filter((v) => v.channel_id === scheduledChannelFilter);
  }, [scheduledVideos, scheduledChannelFilter]);

  const tabs = [
    { id: 'upload', label: 'Upload', icon: Upload, count: null },
    { id: 'create', label: 'Create', icon: Film, count: null },
    { id: 'queue', label: 'Queue', icon: ListVideo, count: queueVideos.length },
    { id: 'scheduled', label: 'Scheduled', icon: Clock, count: scheduledVideos.length },
    { id: 'published', label: 'Published', icon: CheckCircle, count: publishedVideos.length },
    { id: 'failed', label: 'Failed', icon: AlertCircle, count: failedVideos.length },
    { id: 'stats', label: 'Stats', icon: BarChart3, count: null },
    { id: 'runner', label: 'Runner', icon: Terminal, count: null },
  ];

  const uploadModes = [
    { id: 'single', label: 'Single Video', icon: Upload },
    { id: 'batch', label: 'Batch URLs', icon: ListPlus },
    { id: 'scraper', label: 'From Channel', icon: Users },
  ];

  const handleClearQueue = async () => {
    setClearingQueue(true);
    try {
      await deleteQueueVideos();
      setConfirmClearQueueOpen(false);
    } finally {
      setClearingQueue(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <PipelineHealthBar />

      {/* Channel Schedule Info */}
      <ChannelScheduleInfo channels={channels} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8 bg-card border border-border rounded-xl p-1 h-auto">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 py-3 px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground hover:text-foreground transition-all"
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-muted data-[state=active]:bg-primary-foreground/20">
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="upload" className="animate-fade-in space-y-6">
          {/* Upload Mode Selector */}
          <div className="flex gap-2 p-1 bg-card border border-border rounded-lg w-fit">
            {uploadModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setUploadMode(mode.id as 'single' | 'batch' | 'scraper')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  uploadMode === mode.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <mode.icon className="w-4 h-4" />
                {mode.label}
              </button>
            ))}
          </div>

          {/* Upload Forms */}
          {uploadMode === 'single' && (
            <UploadForm
              onSuccess={() => {
                refetchVideos();
                setActiveTab('queue');
              }}
            />
          )}
          {uploadMode === 'batch' && (
            <BatchUploadForm
              onSuccess={() => {
                refetchVideos();
                setActiveTab('queue');
              }}
            />
          )}
          {uploadMode === 'scraper' && (
            <ChannelScraperForm
              onSuccess={() => {
                refetchVideos();
                setActiveTab('queue');
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="create" className="animate-fade-in">
          <LongFormCreator />
        </TabsContent>

        <TabsContent value="queue" className="animate-fade-in space-y-4">
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setConfirmClearQueueOpen(true)}
              disabled={queueVideos.length === 0 || clearingQueue}
            >
              <Trash2 className="w-4 h-4" />
              Remove all
            </Button>
          </div>

          <VideoList
            videos={queueVideos}
            loading={loading}
            emptyMessage="No videos in queue"
            emptyDescription="Upload a video to get started"
            onDelete={deleteVideo}
            onUpdate={refetchVideos}
          />

          <AlertDialog open={confirmClearQueueOpen} onOpenChange={setConfirmClearQueueOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove all queued videos?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all videos currently in your queue (pending, waiting for local runner, downloading, processing, uploading).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={clearingQueue}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearQueue} disabled={clearingQueue}>
                  {clearingQueue ? 'Removing...' : 'Remove all'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="scheduled" className="animate-fade-in space-y-4">
          <div className="glass-card p-4 bg-primary/5 border-primary/20">
            <p className="text-sm text-muted-foreground">
              <Clock className="w-4 h-4 inline mr-2" />
              Videos below will be automatically uploaded to YouTube when their scheduled time arrives. 
              The system checks every 5 minutes.
            </p>
          </div>

          {/* Channel Filter */}
          {channels.length > 1 && (
            <div className="flex gap-2 p-1 bg-card border border-border rounded-lg w-fit">
              <button
                onClick={() => setScheduledChannelFilter(null)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  scheduledChannelFilter === null
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                All Channels
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-muted/50">
                  {scheduledVideos.length}
                </span>
              </button>
              {channels.map((ch) => {
                const count = scheduledVideos.filter((v) => v.channel_id === ch.id).length;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setScheduledChannelFilter(ch.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      scheduledChannelFilter === ch.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {ch.channel_thumbnail && (
                      <img
                        src={ch.channel_thumbnail}
                        alt=""
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span className="max-w-[120px] truncate">{ch.channel_title}</span>
                    <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-muted/50">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <VideoList
            videos={filteredScheduledVideos}
            loading={loading}
            emptyMessage="No scheduled videos"
            emptyDescription={scheduledChannelFilter ? "No videos scheduled for this channel" : "Videos will appear here after processing"}
            onDelete={deleteVideo}
            onUpdate={refetchVideos}
            showCountdown
          />
        </TabsContent>

        <TabsContent value="published" className="animate-fade-in">
          <VideoList
            videos={publishedVideos}
            loading={loading}
            emptyMessage="No published videos"
            emptyDescription="Your published videos will appear here"
            onDelete={deleteVideo}
            onUpdate={refetchVideos}
          />
        </TabsContent>

        <TabsContent value="failed" className="animate-fade-in">
          <VideoList
            videos={failedVideos}
            loading={loading}
            emptyMessage="No failed uploads"
            emptyDescription="Failed uploads will appear here for retry"
            onDelete={deleteVideo}
            onUpdate={refetchVideos}
          />
        </TabsContent>

        <TabsContent value="stats" className="animate-fade-in">
          <ChannelStatistics />
        </TabsContent>

        <TabsContent value="runner" className="animate-fade-in">
          <ApiKeyManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface VideoListProps {
  videos: any[];
  loading: boolean;
  emptyMessage: string;
  emptyDescription: string;
  onDelete?: (videoId: string) => Promise<void>;
  onUpdate?: () => void;
  showCountdown?: boolean;
}

function VideoList({ 
  videos, 
  loading, 
  emptyMessage, 
  emptyDescription, 
  onDelete,
  onUpdate,
  showCountdown = false,
}: VideoListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <ListVideo className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">{emptyMessage}</h3>
        <p className="text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {videos.map((video) => (
        <VideoCard 
          key={video.id} 
          video={video} 
          onDelete={onDelete} 
          onUpdate={onUpdate}
          showCountdown={showCountdown}
        />
      ))}
    </div>
  );
}
