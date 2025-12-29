import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Youtube, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export function ConnectChannelCard() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  const handleConnectYouTube = async () => {
    setLoading(true);
    try {
      if (!session?.access_token) {
        throw new Error('Please sign in again, then retry connecting your channel.');
      }

      const { data, error } = await supabase.functions.invoke('youtube-auth', {
        body: { action: 'get_auth_url' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        const details = (error as any)?.context?.body || (error as any)?.details;
        throw new Error(details ? `${error.message}: ${details}` : error.message);
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({
        title: 'Connection failed',
        description: err?.message || 'Failed to initiate YouTube connection',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-8 max-w-md mx-auto text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
        <Youtube className="w-8 h-8 text-primary" />
      </div>
      
      <h2 className="text-2xl font-semibold text-foreground mb-3">
        Connect Your YouTube Channel
      </h2>
      
      <p className="text-muted-foreground mb-6">
        Connect your YouTube channel to start automating video uploads and scheduling.
      </p>

      <Button 
        variant="google" 
        size="lg" 
        className="w-full"
        onClick={handleConnectYouTube}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Youtube className="w-5 h-5" />
            Connect with Google
            <ExternalLink className="w-4 h-4 ml-auto" />
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground mt-4">
        We'll only access your YouTube channel for uploading and scheduling videos.
      </p>
    </div>
  );
}
