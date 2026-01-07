import { useState, useRef } from 'react';
import { useLongFormProjects, LongFormProject, CreateProjectInput } from '@/hooks/useLongFormProjects';
import { useYouTubeChannel } from '@/hooks/useYouTubeChannel';
import { LongFormProjectsList } from './LongFormProjectsList';
import { getBundledTracks, MusicTrack } from '@/data/backgroundMusic';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { YOUTUBE_CATEGORIES, YOUTUBE_PRIVACY_OPTIONS } from '@/data/youtubeCategories';
import { videoFilters, getFiltersByCategory, getCategoryDisplayName, getFilterCategories } from '@/data/videoFilters';
import { FilterPreviewCompare } from './FilterPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Film,
  Plus,
  Trash2,
  Loader2,
  Wand2,
  Upload,
  Music,
  FileText,
  Mic,
  Image,
  Send,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Palette,
  Play,
  Pause,
} from 'lucide-react';

const STEPS = [
  { id: 'setup', label: 'Project Setup', icon: Film },
  { id: 'script', label: 'Script', icon: FileText },
  { id: 'voiceover', label: 'Voiceover', icon: Mic },
  { id: 'music', label: 'Background Music', icon: Music },
  { id: 'filter', label: 'Video Filter', icon: Palette },
  { id: 'metadata', label: 'Metadata', icon: FileText },
  { id: 'publish', label: 'Publish Settings', icon: Send },
];

export function LongFormCreator() {
  const {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    triggerProcessing,
    publishProject,
    getLastScheduledTime,
    uploadVoiceover,
    uploadThumbnail,
  } = useLongFormProjects();
  const { channels } = useYouTubeChannel();
  const { userTracks, uploadTrack, deleteTrack } = useBackgroundMusic();
  const { toast } = useToast();

  const [showCreator, setShowCreator] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [editingProject, setEditingProject] = useState<LongFormProject | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [topic, setTopic] = useState('');
  const [targetDuration, setTargetDuration] = useState(10); // minutes
  const [briefDescription, setBriefDescription] = useState('');
  const [referenceUrls, setReferenceUrls] = useState<string[]>(['']);
  const [useAiScript, setUseAiScript] = useState(true);
  const [customApiKey, setCustomApiKey] = useState('');
  const [script, setScript] = useState('');
  const [scriptChapters, setScriptChapters] = useState<{ title: string; start_seconds: number }[]>([]);
  const [voiceoverFile, setVoiceoverFile] = useState<File | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeDescription, setYoutubeDescription] = useState('');
  const [youtubeTags, setYoutubeTags] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [schedulingMode, setSchedulingMode] = useState<'immediate' | 'manual' | 'auto_hours' | 'auto_days' | 'auto_weeks' | 'auto_month'>('manual');
  const [schedulingDelay, setSchedulingDelay] = useState(1);
  const [scheduledDate, setScheduledDate] = useState('');
  const [youtubeCategory, setYoutubeCategory] = useState('24'); // Default: Entertainment
  const [youtubePrivacy, setYoutubePrivacy] = useState('public');
  const [madeForKids, setMadeForKids] = useState(false);
  const [notifySubscribers, setNotifySubscribers] = useState(true);
  const [videoFilter, setVideoFilter] = useState('none');
  
  // Audio preview state
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Music upload state
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [newMusicTitle, setNewMusicTitle] = useState('');
  const [newMusicFile, setNewMusicFile] = useState<File | null>(null);
  const musicUploadRef = useRef<HTMLInputElement>(null);

  const voiceoverInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTopic('');
    setTargetDuration(10);
    setBriefDescription('');
    setReferenceUrls(['']);
    setUseAiScript(true);
    setCustomApiKey('');
    setScript('');
    setScriptChapters([]);
    setVoiceoverFile(null);
    setSelectedTrackId('');
    setPlayingTrackId(null);
    if (audioRef.current) audioRef.current.pause();
    setYoutubeTitle('');
    setYoutubeDescription('');
    setYoutubeTags('');
    setThumbnailFile(null);
    setSelectedChannel('');
    setSchedulingMode('manual');
    setSchedulingDelay(1);
    setScheduledDate('');
    setYoutubeCategory('24');
    setYoutubePrivacy('public');
    setMadeForKids(false);
    setNotifySubscribers(true);
    setVideoFilter('none');
    setCurrentStep(0);
    setEditingProject(null);
  };

  const handleStartNew = () => {
    resetForm();
    setShowCreator(true);
  };

  const handleEdit = (project: LongFormProject) => {
    setEditingProject(project);
    setTopic(project.topic);
    setTargetDuration(Math.round(project.target_duration_seconds / 60));
    setBriefDescription(project.brief_description || '');
    setReferenceUrls(project.reference_urls.length > 0 ? project.reference_urls : ['']);
    setScript(project.script || '');
    setScriptChapters(project.youtube_chapters || []);

    // Restore selected background track (supports both public storage URLs and legacy URLs)
    const allTracks = [...getBundledTracks(), ...userTracks];
    const projectBgUrl = project.background_music_url || '';

    const matchingTrack = allTracks.find((t) => {
      if (!projectBgUrl) return false;
      if (t.source === 'bundled') {
        // Our bundled tracks are persisted to storage as: .../background-music/<userId>/bundled/<trackId>.mp3
        // so matching by track id is more reliable than URL equality.
        return projectBgUrl.includes(`/bundled/${t.id}.`) || projectBgUrl.endsWith(`/${t.id}.mp3`);
      }
      return t.url === projectBgUrl;
    });

    setSelectedTrackId(matchingTrack?.id || '');
    setYoutubeTitle(project.youtube_title || '');
    setYoutubeDescription(project.youtube_description || '');
    setYoutubeTags(project.youtube_tags?.join(', ') || '');
    setSelectedChannel(project.channel_id || '');
    setSchedulingMode((project.scheduling_mode as any) || 'manual');
    setSchedulingDelay(project.scheduling_delay || 1);
    setYoutubeCategory((project as any).youtube_category || '24');
    setYoutubePrivacy((project as any).youtube_privacy || 'public');
    setMadeForKids((project as any).youtube_made_for_kids || false);
    setNotifySubscribers((project as any).youtube_notify_subscribers ?? true);
    setVideoFilter((project as any).video_filter || 'none');
    setShowCreator(true);
    setCurrentStep(0);
  };

  const handleAddReferenceUrl = () => {
    if (referenceUrls.length < 10) {
      setReferenceUrls([...referenceUrls, '']);
    }
  };

  const handleRemoveReferenceUrl = (index: number) => {
    setReferenceUrls(referenceUrls.filter((_, i) => i !== index));
  };

  const handleReferenceUrlChange = (index: number, value: string) => {
    const newUrls = [...referenceUrls];
    newUrls[index] = value;
    setReferenceUrls(newUrls);
  };

  const handleGenerateScript = async () => {
    if (!topic) {
      toast({ title: 'Error', description: 'Please enter a topic first', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const validUrls = referenceUrls.filter(url => url.trim());
      
      const response = await supabase.functions.invoke('generate-script', {
        body: {
          topic,
          target_duration_seconds: targetDuration * 60,
          brief_description: briefDescription,
          reference_urls: validUrls,
          custom_api_key: customApiKey || null,
        },
      });

      if (response.error) throw response.error;
      
      const data = response.data;
      setScript(data.script);
      setScriptChapters(data.chapters || []);
      
      toast({
        title: 'Script generated',
        description: `Generated ${data.word_count} words (~${Math.round(data.estimated_duration_seconds / 60)} min)`,
      });
    } catch (error: any) {
      console.error('Error generating script:', error);
      toast({
        title: 'Generation failed',
        description: error.message || 'Failed to generate script',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMetadata = async () => {
    if (!topic) {
      toast({ title: 'Error', description: 'Please enter a topic first', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-metadata', {
        body: {
          topic,
          brief_description: briefDescription,
          script,
          chapters: scriptChapters,
          custom_api_key: customApiKey || null,
        },
      });

      if (response.error) {
        const contextBody = (response.error as any)?.context?.body;
        const contextStatus = (response.error as any)?.context?.status;
        const details =
          typeof contextBody === 'string' && contextBody.trim()
            ? ` (status ${contextStatus ?? 'unknown'}): ${contextBody}`
            : '';
        throw new Error(`${response.error.message}${details}`);
      }

      const data = response.data;
      setYoutubeTitle(data.title);
      setYoutubeDescription(data.description);
      setYoutubeTags(data.tags?.join(', ') || '');
      if (data.chapters?.length > 0) {
        setScriptChapters(data.chapters);
      }

      toast({ title: 'Metadata generated', description: 'Title, description, and tags have been generated' });
    } catch (error: any) {
      console.error('Error generating metadata:', error);
      toast({
        title: 'Generation failed',
        description: error.message || 'Failed to generate metadata',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProject = async () => {
    if (!topic) {
      toast({ title: 'Error', description: 'Topic is required', variant: 'destructive' });
      return;
    }

    const validUrls = referenceUrls.filter(url => url.trim());
    if (validUrls.length === 0) {
      toast({ title: 'Error', description: 'At least one reference URL is required', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      // Determine background music from selected track
      const allTracks = [...getBundledTracks(), ...userTracks];
      const selectedTrack = allTracks.find(t => t.id === selectedTrackId);

      let bgMusicUrl = '';
      let bgMusicSource: 'bundled' | 'user' = 'bundled';

      if (selectedTrack) {
        if (selectedTrack.source === 'bundled') {
          // IMPORTANT: the local runner cannot reliably fetch from the app's origin.
          // So we mirror bundled tracks into the backend "background-music" bucket and save that public URL.
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const bundledPath = `${user.id}/bundled/${selectedTrack.id}.mp3`;

          const res = await fetch(selectedTrack.url);
          if (!res.ok) throw new Error(`Failed to read bundled track (${res.status})`);
          const blob = await res.blob();

          const { error: upErr } = await supabase.storage
            .from('background-music')
            .upload(bundledPath, blob, { upsert: true, contentType: 'audio/mpeg' });
          if (upErr) throw upErr;

          const { data: pub } = supabase.storage.from('background-music').getPublicUrl(bundledPath);
          bgMusicUrl = pub.publicUrl;
          bgMusicSource = 'bundled';
        } else {
          bgMusicUrl = selectedTrack.url;
          bgMusicSource = 'user';
        }
      }

      // Determine status based on what's complete
      let status = 'draft';
      if (script) status = 'script_ready';

      const projectData = {
        topic,
        target_duration_seconds: targetDuration * 60,
        brief_description: briefDescription || null,
        reference_urls: validUrls,
        script: script || null,
        script_source: useAiScript ? 'ai_generated' : 'manual',
        background_music_url: bgMusicUrl || null,
        background_music_source: bgMusicSource,
        background_music_category: null,
        youtube_title: youtubeTitle || null,
        youtube_description: youtubeDescription || null,
        youtube_tags: youtubeTags ? youtubeTags.split(',').map(t => t.trim()) : null,
        youtube_chapters: scriptChapters.length > 0 ? scriptChapters : null,
        youtube_category: youtubeCategory,
        youtube_privacy: youtubePrivacy,
        youtube_made_for_kids: madeForKids,
        youtube_notify_subscribers: notifySubscribers,
        video_filter: videoFilter,
        channel_id: selectedChannel || null,
        scheduling_mode: schedulingMode,
        scheduling_delay: schedulingDelay,
        scheduled_publish_at: schedulingMode === 'manual' && scheduledDate ? new Date(scheduledDate).toISOString() : null,
        status,
      };

      let projectId: string;

      if (editingProject) {
        await updateProject(editingProject.id, projectData as any);
        projectId = editingProject.id;
      } else {
        const newProject = await createProject({
          topic,
          target_duration_seconds: targetDuration * 60,
          brief_description: briefDescription,
          reference_urls: validUrls,
          channel_id: selectedChannel,
        });
        if (!newProject) throw new Error('Failed to create project');
        projectId = newProject.id;
        
        // Update with full data
        await updateProject(projectId, projectData as any);
      }

      // Upload voiceover if provided
      if (voiceoverFile) {
        const voPath = await uploadVoiceover(projectId, voiceoverFile);
        if (voPath) {
          await updateProject(projectId, { status: 'voiceover_ready' });
        }
      }

      // Upload thumbnail if provided
      if (thumbnailFile) {
        await uploadThumbnail(projectId, thumbnailFile);
      }

      toast({ title: 'Project saved', description: 'Your project has been saved' });
      setShowCreator(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving project:', error);
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save project',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Setup
        return topic.trim() && referenceUrls.some(url => url.trim());
      case 1: // Script
        return script.trim();
      case 2: // Voiceover
        return voiceoverFile || (editingProject?.voiceover_path);
      case 3: // Music
        return !!selectedTrackId;
      case 4: // Filter
        return true; // Filter is always optional
      case 5: // Metadata
        return youtubeTitle.trim();
      case 6: // Publish
        return selectedChannel;
      default:
        return true;
    }
  };

  const wordCount = script.split(/\s+/).filter(Boolean).length;
  const estimatedMinutes = Math.round(wordCount / 150);

  if (showCreator) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => { setShowCreator(false); resetForm(); }}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <h2 className="text-xl font-semibold">
            {editingProject ? 'Edit Project' : 'Create Long-Form Video'}
          </h2>
          <div className="w-24" />
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-between px-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStep
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
                <span className="hidden lg:inline text-sm">{step.label}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${index < currentStep ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-6">
            {/* Step 0: Setup */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="topic">Topic / Title *</Label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., How to Build a Gaming PC"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Target Duration: {targetDuration} minutes</Label>
                  <Slider
                    value={[targetDuration]}
                    onValueChange={([val]) => setTargetDuration(val)}
                    min={5}
                    max={30}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Brief Description</Label>
                  <Textarea
                    id="description"
                    value={briefDescription}
                    onChange={(e) => setBriefDescription(e.target.value)}
                    placeholder="Describe what you want the video to cover..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Reference Videos (1-10 YouTube URLs) *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddReferenceUrl}
                      disabled={referenceUrls.length >= 10}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add URL
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {referenceUrls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={url}
                          onChange={(e) => handleReferenceUrlChange(index, e.target.value)}
                          placeholder="https://youtube.com/watch?v=..."
                        />
                        {referenceUrls.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveReferenceUrl(index)}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Script */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={useAiScript}
                        onCheckedChange={setUseAiScript}
                      />
                      <Label>Generate with AI</Label>
                    </div>
                  </div>
                  {useAiScript && (
                    <Button
                      onClick={handleGenerateScript}
                      disabled={isGenerating || !topic}
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4 mr-2" />
                      )}
                      Generate Script
                    </Button>
                  )}
                </div>

                {useAiScript && (
                  <div>
                    <Label htmlFor="apiKey">Custom API Key (optional - uses free AI if empty)</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder="sk-... (OpenAI API key)"
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="script">Script *</Label>
                    <span className="text-sm text-muted-foreground">
                      {wordCount} words (~{estimatedMinutes} min)
                    </span>
                  </div>
                  <Textarea
                    id="script"
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="Enter your script here or generate with AI..."
                    className="mt-1 font-mono text-sm"
                    rows={15}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Voiceover */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="glass-card p-6 text-center">
                  <Mic className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Upload Voiceover Audio</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload your TTS audio file (MP3 or WAV)
                  </p>
                  
                  <input
                    ref={voiceoverInputRef}
                    type="file"
                    accept="audio/mp3,audio/wav,audio/mpeg"
                    onChange={(e) => setVoiceoverFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  
                  <Button onClick={() => voiceoverInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Select Audio File
                  </Button>

                  {voiceoverFile && (
                    <div className="mt-4 p-3 bg-green-500/10 rounded-lg flex items-center justify-between">
                      <span className="text-green-500">{voiceoverFile.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => setVoiceoverFile(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {editingProject?.voiceover_path && !voiceoverFile && (
                    <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                      <span className="text-primary">Voiceover already uploaded</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Background Music */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Audio element for previews */}
                <audio ref={audioRef} onEnded={() => setPlayingTrackId(null)} />
                
                {/* Bundled Tracks */}
                <div>
                  <Label className="text-base font-medium mb-3 block">Bundled Tracks</Label>
                  <div className="grid gap-2">
                    {getBundledTracks().map((track) => (
                      <div
                        key={track.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedTrackId === track.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedTrackId(track.id)}
                      >
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (playingTrackId === track.id) {
                              audioRef.current?.pause();
                              setPlayingTrackId(null);
                            } else {
                              if (audioRef.current) {
                                audioRef.current.src = track.url;
                                audioRef.current.play();
                              }
                              setPlayingTrackId(track.id);
                            }
                          }}
                        >
                          {playingTrackId === track.id ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <span className="font-medium flex-1">{track.name}</span>
                        {selectedTrackId === track.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* User Uploaded Tracks */}
                <div>
                  <Label className="text-base font-medium mb-3 block">Your Tracks</Label>
                  {userTracks.length > 0 ? (
                    <div className="grid gap-2 mb-4">
                      {userTracks.map((track) => (
                        <div
                          key={track.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedTrackId === track.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedTrackId(track.id)}
                        >
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (playingTrackId === track.id) {
                                audioRef.current?.pause();
                                setPlayingTrackId(null);
                              } else {
                                if (audioRef.current) {
                                  audioRef.current.src = track.url;
                                  audioRef.current.play();
                                }
                                setPlayingTrackId(track.id);
                              }
                            }}
                          >
                            {playingTrackId === track.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <span className="font-medium flex-1">{track.name}</span>
                          {selectedTrackId === track.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedTrackId === track.id) setSelectedTrackId('');
                              deleteTrack(track.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">No custom tracks yet.</p>
                  )}
                  
                  {/* Upload new track */}
                  <div className="p-4 border border-dashed rounded-lg space-y-3">
                    <Label>Add New Track</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Track name"
                        value={newMusicTitle}
                        onChange={(e) => setNewMusicTitle(e.target.value)}
                      />
                      <input
                        ref={musicUploadRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setNewMusicFile(file);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => musicUploadRef.current?.click()}
                      >
                        {newMusicFile ? newMusicFile.name.slice(0, 15) + '...' : 'Choose File'}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      disabled={!newMusicTitle.trim() || !newMusicFile || uploadingMusic}
                      onClick={async () => {
                        if (!newMusicTitle.trim() || !newMusicFile) return;
                        setUploadingMusic(true);
                        const track = await uploadTrack(newMusicFile, newMusicTitle.trim());
                        if (track) {
                          setSelectedTrackId(track.id);
                        }
                        setNewMusicTitle('');
                        setNewMusicFile(null);
                        setUploadingMusic(false);
                      }}
                    >
                      {uploadingMusic ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload Track
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Video Filter */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium mb-4 block">Choose a Video Filter</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select a filter to apply a visual style to your entire video. Music will auto-adjust to video length.
                  </p>
                </div>

                {/* Live Preview */}
                <div className="bg-muted/30 rounded-xl p-4 border">
                  <h4 className="text-sm font-medium mb-3">Live Preview</h4>
                  <FilterPreviewCompare filterId={videoFilter} />
                </div>

                {getFilterCategories().map((category) => (
                  <div key={category} className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">{getCategoryDisplayName(category)}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {getFiltersByCategory(category).map((filter) => (
                        <button
                          key={filter.id}
                          onClick={() => setVideoFilter(filter.id)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            videoFilter === filter.id
                              ? 'border-primary bg-primary/10 ring-2 ring-primary'
                              : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }`}
                        >
                          <div className="font-medium text-sm">{filter.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">{filter.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 5: Metadata */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <Button onClick={handleGenerateMetadata} disabled={isGenerating}>
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 mr-2" />
                    )}
                    Generate Metadata
                  </Button>
                </div>

                <div>
                  <Label htmlFor="ytTitle">YouTube Title *</Label>
                  <Input
                    id="ytTitle"
                    value={youtubeTitle}
                    onChange={(e) => setYoutubeTitle(e.target.value)}
                    placeholder="Your video title"
                    className="mt-1"
                    maxLength={100}
                  />
                  <span className="text-xs text-muted-foreground">{youtubeTitle.length}/100</span>
                </div>

                <div>
                  <Label htmlFor="ytDesc">YouTube Description</Label>
                  <Textarea
                    id="ytDesc"
                    value={youtubeDescription}
                    onChange={(e) => setYoutubeDescription(e.target.value)}
                    placeholder="Video description..."
                    className="mt-1"
                    rows={6}
                  />
                </div>

                <div>
                  <Label htmlFor="ytTags">Tags (comma-separated)</Label>
                  <Input
                    id="ytTags"
                    value={youtubeTags}
                    onChange={(e) => setYoutubeTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Video Category</Label>
                    <Select value={youtubeCategory} onValueChange={setYoutubeCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {YOUTUBE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Privacy Setting</Label>
                    <Select value={youtubePrivacy} onValueChange={setYoutubePrivacy}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select privacy" />
                      </SelectTrigger>
                      <SelectContent>
                        {YOUTUBE_PRIVACY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            <div>
                              <span className="font-medium">{opt.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {opt.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <Label htmlFor="madeForKids" className="cursor-pointer">Made for Kids</Label>
                    <p className="text-xs text-muted-foreground">
                      Required by COPPA. Limits some features.
                    </p>
                  </div>
                  <Switch
                    id="madeForKids"
                    checked={madeForKids}
                    onCheckedChange={setMadeForKids}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <Label htmlFor="notifySubs" className="cursor-pointer">Notify Subscribers</Label>
                    <p className="text-xs text-muted-foreground">
                      Send notification to subscribers when published
                    </p>
                  </div>
                  <Switch
                    id="notifySubs"
                    checked={notifySubscribers}
                    onCheckedChange={setNotifySubscribers}
                  />
                </div>

                <div>
                  <Label>Thumbnail *</Label>
                  <div className="mt-1">
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    
                    <Button variant="outline" onClick={() => thumbnailInputRef.current?.click()}>
                      <Image className="w-4 h-4 mr-2" />
                      Upload Thumbnail
                    </Button>

                    {thumbnailFile && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-green-500">{thumbnailFile.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => setThumbnailFile(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Publish Settings */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div>
                  <Label>Target Channel *</Label>
                  <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          <div className="flex items-center gap-2">
                            {channel.channel_thumbnail && (
                              <img
                                src={channel.channel_thumbnail}
                                alt=""
                                className="w-5 h-5 rounded-full"
                              />
                            )}
                            {channel.channel_title}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Scheduling</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      { id: 'immediate', label: 'Publish Immediately' },
                      { id: 'manual', label: 'Specific Date/Time' },
                      { id: 'auto_hours', label: 'Hours after last video' },
                      { id: 'auto_days', label: 'Days after last video' },
                      { id: 'auto_weeks', label: 'Weeks after last video' },
                      { id: 'auto_month', label: 'Month after last video' },
                    ].map((mode) => (
                      <Button
                        key={mode.id}
                        variant={schedulingMode === mode.id ? 'default' : 'outline'}
                        onClick={() => setSchedulingMode(mode.id as any)}
                        className="justify-start"
                      >
                        {mode.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {schedulingMode === 'manual' && (
                  <div>
                    <Label htmlFor="schedDate">Publish Date & Time</Label>
                    <Input
                      id="schedDate"
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                {['auto_hours', 'auto_days', 'auto_weeks', 'auto_month'].includes(schedulingMode) && (
                  <div>
                    <Label>
                      {schedulingMode === 'auto_hours' && 'Hours after last video'}
                      {schedulingMode === 'auto_days' && 'Days after last video'}
                      {schedulingMode === 'auto_weeks' && 'Weeks after last video'}
                      {schedulingMode === 'auto_month' && 'Month(s) after last video'}
                      : {schedulingDelay}
                    </Label>
                    <Slider
                      value={[schedulingDelay]}
                      onValueChange={([val]) => setSchedulingDelay(val)}
                      min={1}
                      max={schedulingMode === 'auto_hours' ? 48 : schedulingMode === 'auto_days' ? 30 : 12}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSaveProject} disabled={isSaving || !canProceed()}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Project
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Projects List View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Long-Form Video Creator</h2>
          <p className="text-muted-foreground">Create full-length videos from reference clips</p>
        </div>
        <Button onClick={handleStartNew}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <LongFormProjectsList
        projects={projects}
        loading={loading}
        onDelete={deleteProject}
        onTriggerProcessing={triggerProcessing}
        onEdit={handleEdit}
        onPublish={publishProject}
        getLastScheduledTime={getLastScheduledTime}
      />
    </div>
  );
}
