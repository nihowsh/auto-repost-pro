import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVideos } from '@/hooks/useVideos';
import { VideoCard } from './VideoCard';
import { UploadForm } from './UploadForm';
import { BatchUploadForm } from './BatchUploadForm';
import { ChannelScraperForm } from './ChannelScraperForm';
import { ApiKeyManager } from './ApiKeyManager';
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
} from 'lucide-react';

export function Dashboard() {
  const { queueVideos, scheduledVideos, publishedVideos, failedVideos, loading, refetchVideos } = useVideos();
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadMode, setUploadMode] = useState<'single' | 'batch' | 'scraper'>('single');

  const tabs = [
    { id: 'upload', label: 'Upload', icon: Upload, count: null },
    { id: 'queue', label: 'Queue', icon: ListVideo, count: queueVideos.length },
    { id: 'scheduled', label: 'Scheduled', icon: Clock, count: scheduledVideos.length },
    { id: 'published', label: 'Published', icon: CheckCircle, count: publishedVideos.length },
    { id: 'failed', label: 'Failed', icon: AlertCircle, count: failedVideos.length },
    { id: 'runner', label: 'Runner', icon: Terminal, count: null },
  ];

  const uploadModes = [
    { id: 'single', label: 'Single Video', icon: Upload },
    { id: 'batch', label: 'Batch URLs', icon: ListPlus },
    { id: 'scraper', label: 'From Channel', icon: Users },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-card border border-border rounded-xl p-1 h-auto">
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
            <UploadForm onSuccess={() => {
              refetchVideos();
              setActiveTab('queue');
            }} />
          )}
          {uploadMode === 'batch' && (
            <BatchUploadForm onSuccess={() => {
              refetchVideos();
              setActiveTab('queue');
            }} />
          )}
          {uploadMode === 'scraper' && (
            <ChannelScraperForm onSuccess={() => {
              refetchVideos();
              setActiveTab('queue');
            }} />
          )}
        </TabsContent>

        <TabsContent value="queue" className="animate-fade-in">
          <VideoList 
            videos={queueVideos} 
            loading={loading} 
            emptyMessage="No videos in queue"
            emptyDescription="Upload a video to get started"
          />
        </TabsContent>

        <TabsContent value="scheduled" className="animate-fade-in">
          <VideoList 
            videos={scheduledVideos} 
            loading={loading} 
            emptyMessage="No scheduled videos"
            emptyDescription="Videos will appear here after processing"
          />
        </TabsContent>

        <TabsContent value="published" className="animate-fade-in">
          <VideoList 
            videos={publishedVideos} 
            loading={loading} 
            emptyMessage="No published videos"
            emptyDescription="Your published videos will appear here"
          />
        </TabsContent>

        <TabsContent value="failed" className="animate-fade-in">
          <VideoList 
            videos={failedVideos} 
            loading={loading} 
            emptyMessage="No failed uploads"
            emptyDescription="Failed uploads will appear here for retry"
          />
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
}

function VideoList({ videos, loading, emptyMessage, emptyDescription }: VideoListProps) {
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
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
