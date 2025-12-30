import { useState } from 'react';
import { useApiKeys } from '@/hooks/useApiKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Terminal,
  Download,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export function ApiKeyManager() {
  const { apiKeys, loading, generateApiKey, revokeApiKey } = useApiKeys();
  const { toast } = useToast();
  
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your API key',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    try {
      const result = await generateApiKey(newKeyName.trim());
      if (result) {
        setGeneratedKey(result.api_key);
        toast({
          title: 'API Key generated',
          description: 'Make sure to copy it now - you won\'t see it again!',
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to generate key',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyKey = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'API key copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyEnvFormat = async () => {
    if (generatedKey) {
      const envFormat = `RUNNER_API_KEY=${generatedKey}`;
      await navigator.clipboard.writeText(envFormat);
      toast({
        title: 'Copied!',
        description: 'Environment variable format copied',
      });
    }
  };

  const handleCloseNewKeyDialog = () => {
    setShowNewKeyDialog(false);
    setNewKeyName('');
    setGeneratedKey(null);
    setCopied(false);
  };

  const handleRevokeKey = async (keyId: string) => {
    const success = await revokeApiKey(keyId);
    if (success) {
      toast({
        title: 'API Key revoked',
        description: 'The key can no longer be used',
      });
    } else {
      toast({
        title: 'Failed to revoke key',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
    setShowDeleteDialog(null);
  };

  const downloadRunnerScript = () => {
    const script = generateRunnerScript();
    const blob = new Blob([script], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'local-runner.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Script downloaded',
      description: 'Check the README section below for setup instructions',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Local Runner Setup
              </CardTitle>
              <CardDescription>
                Download and run videos locally using yt-dlp for reliable downloading
              </CardDescription>
            </div>
            <Button onClick={downloadRunnerScript} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Download Script
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
            <p className="font-medium">Prerequisites:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Node.js 18 or later</li>
              <li>yt-dlp installed and in PATH (<code className="bg-muted px-1 rounded">brew install yt-dlp</code> or <code className="bg-muted px-1 rounded">pip install yt-dlp</code>)</li>
              <li>An API key (generate one below)</li>
            </ul>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
            <p className="font-medium">Quick Start:</p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1">
              <li>Generate an API key below</li>
              <li>Download the script</li>
              <li>Create a <code className="bg-muted px-1 rounded">.env</code> file with your API key</li>
              <li>Run <code className="bg-muted px-1 rounded">node local-runner.js</code></li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Section */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage authentication keys for your local runner
              </CardDescription>
            </div>
            <Button onClick={() => setShowNewKeyDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Generate Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No API keys yet</p>
              <p className="text-sm text-muted-foreground">Generate a key to use with your local runner</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Key className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{key.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <code className="bg-muted px-1.5 py-0.5 rounded">{key.key_prefix}...</code>
                        <span>•</span>
                        <span>Created {formatDistanceToNow(new Date(key.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {key.last_used_at ? (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="w-3 h-3" />
                        Used {formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Never used</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDeleteDialog(key.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Key Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={handleCloseNewKeyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {generatedKey ? 'Your New API Key' : 'Generate API Key'}
            </DialogTitle>
            <DialogDescription>
              {generatedKey 
                ? 'Copy this key now. You won\'t be able to see it again!'
                : 'Give your key a name to identify where it\'s used.'
              }
            </DialogDescription>
          </DialogHeader>

          {generatedKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  This is the only time you'll see this key. Make sure to copy it!
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <div className="flex gap-2">
                  <Input 
                    value={generatedKey} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyKey}
                    className={copied ? 'text-green-500' : ''}
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Environment Variable Format</label>
                <div className="flex gap-2">
                  <Input 
                    value={`RUNNER_API_KEY=${generatedKey}`} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyEnvFormat}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Key Name</label>
                <Input
                  placeholder="e.g., MacBook Pro Runner"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateKey()}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {generatedKey ? (
              <Button onClick={handleCloseNewKeyDialog} className="w-full">
                Done
              </Button>
            ) : (
              <Button 
                onClick={handleGenerateKey} 
                disabled={generating || !newKeyName.trim()}
                className="w-full"
              >
                {generating ? 'Generating...' : 'Generate Key'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke the key. Any runners using this key will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && handleRevokeKey(showDeleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function generateRunnerScript(): string {
  return `#!/usr/bin/env node
/**
 * Local Video Runner
 * Downloads videos using yt-dlp and uploads them to your YouTube channel
 * 
 * Prerequisites:
 * - Node.js 18+
 * - yt-dlp installed (brew install yt-dlp or pip install yt-dlp)
 * 
 * Setup:
 * 1. Create a .env file with your RUNNER_API_KEY
 * 2. Run: node local-runner.js
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      });
    }
  } catch (error) {
    console.error('Error loading .env file:', error.message);
  }
}

loadEnv();

const API_KEY = process.env.RUNNER_API_KEY;
const POLL_INTERVAL = 30000; // 30 seconds
const SUPABASE_FUNCTION_URL = 'https://qhzwksaeogpwgvttcxej.supabase.co/functions/v1';

if (!API_KEY) {
  console.error('❌ RUNNER_API_KEY not found in environment');
  console.error('Create a .env file with: RUNNER_API_KEY=your_api_key_here');
  process.exit(1);
}

let supabaseUrl = '';
let supabaseServiceKey = '';
let userId = '';

async function authenticate() {
  console.log('🔐 Authenticating with API key...');
  
  const response = await fetch(\`\${SUPABASE_FUNCTION_URL}/runner-auth\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: API_KEY }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Authentication failed');
  }

  const data = await response.json();
  supabaseUrl = data.supabase_url;
  supabaseServiceKey = data.service_role_key;
  userId = data.user_id;
  
  console.log('✅ Authenticated successfully');
  return data;
}

async function supabaseRequest(endpoint, options = {}) {
  const url = \`\${supabaseUrl}/rest/v1/\${endpoint}\`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': \`Bearer \${supabaseServiceKey}\`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(\`Supabase request failed: \${text}\`);
  }
  
  return response.json();
}

async function fetchPendingVideos() {
  const videos = await supabaseRequest(
    \`videos?user_id=eq.\${userId}&status=eq.pending_download&select=*\`
  );
  return videos;
}

async function updateVideoStatus(videoId, status, extra = {}) {
  await supabaseRequest(\`videos?id=eq.\${videoId}\`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...extra }),
  });
}

async function downloadVideo(video) {
  const outputDir = path.join(process.cwd(), 'downloads');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, \`\${video.id}.mp4\`);
  
  console.log(\`📥 Downloading: \${video.title || video.source_url}\`);
  
  try {
    // Use yt-dlp to download
    const args = [
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '-o', outputPath,
      '--no-playlist',
      video.source_url,
    ];
    
    // For shorts, limit duration
    if (video.is_short) {
      args.unshift('--match-filter', 'duration<=60');
    }
    
    execSync(\`yt-dlp \${args.map(a => \`"\${a}"\`).join(' ')}\`, {
      stdio: 'inherit',
    });
    
    return outputPath;
  } catch (error) {
    console.error('Download failed:', error.message);
    throw error;
  }
}

async function uploadToStorage(videoId, filePath) {
  const fileName = path.basename(filePath);
  const storagePath = \`\${userId}/\${videoId}/\${fileName}\`;
  
  console.log(\`☁️ Uploading to storage: \${storagePath}\`);
  
  const fileContent = fs.readFileSync(filePath);
  
  const response = await fetch(
    \`\${supabaseUrl}/storage/v1/object/videos/\${storagePath}\`,
    {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${supabaseServiceKey}\`,
        'Content-Type': 'video/mp4',
      },
      body: fileContent,
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(\`Upload failed: \${error}\`);
  }
  
  return storagePath;
}

async function triggerVideoWorker(videoId) {
  console.log('🚀 Triggering video worker...');
  
  const response = await fetch(\`\${SUPABASE_FUNCTION_URL}/video-worker\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${supabaseServiceKey}\`,
    },
    body: JSON.stringify({ video_id: videoId }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Worker trigger failed:', error);
  }
}

async function processVideo(video) {
  console.log(\`\\n🎬 Processing: \${video.title || video.id}\`);
  
  try {
    // Update status to downloading
    await updateVideoStatus(video.id, 'downloading');
    
    // Download the video
    const filePath = await downloadVideo(video);
    
    // Upload to storage
    const storagePath = await uploadToStorage(video.id, filePath);
    
    // Update video record
    await updateVideoStatus(video.id, 'processing', {
      video_file_path: storagePath,
    });
    
    // Trigger the video worker to upload to YouTube
    await triggerVideoWorker(video.id);
    
    // Clean up local file
    fs.unlinkSync(filePath);
    
    console.log(\`✅ Video processed: \${video.id}\`);
  } catch (error) {
    console.error(\`❌ Error processing video \${video.id}:\`, error.message);
    await updateVideoStatus(video.id, 'failed', {
      error_message: error.message,
    });
  }
}

async function pollForVideos() {
  try {
    const videos = await fetchPendingVideos();
    
    if (videos.length > 0) {
      console.log(\`\\n📋 Found \${videos.length} video(s) to process\`);
      
      for (const video of videos) {
        await processVideo(video);
      }
    }
  } catch (error) {
    console.error('Polling error:', error.message);
  }
}

async function main() {
  console.log('🎥 Local Video Runner');
  console.log('='.repeat(40));
  
  try {
    await authenticate();
    
    console.log(\`\\n⏳ Polling for videos every \${POLL_INTERVAL / 1000} seconds...\`);
    console.log('Press Ctrl+C to stop\\n');
    
    // Initial poll
    await pollForVideos();
    
    // Set up polling interval
    setInterval(pollForVideos, POLL_INTERVAL);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
`;
}
