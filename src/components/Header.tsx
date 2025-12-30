import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useYouTubeChannel } from '@/hooks/useYouTubeChannel';
import { Youtube, LogOut, Settings, User, Plus, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function Header() {
  const { user, session, signOut } = useAuth();
  const { channel, channels, refetchChannel } = useYouTubeChannel();
  const { toast } = useToast();
  const [addingChannel, setAddingChannel] = useState(false);

  const handleAddChannel = async () => {
    setAddingChannel(true);
    try {
      if (!session?.access_token) {
        throw new Error('Please sign in again');
      }

      const { data, error } = await supabase.functions.invoke('youtube-auth', {
        body: { action: 'get_auth_url', prompt_type: 'select_account' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({
        title: 'Failed to add channel',
        description: err?.message || 'Could not start channel connection',
        variant: 'destructive',
      });
      setAddingChannel(false);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Youtube className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">TubeFlow</h1>
            {channel && (
              <p className="text-xs text-muted-foreground">{channel.channel_title}</p>
            )}
          </div>
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Signed in</p>
            </div>
            <DropdownMenuSeparator className="bg-border" />
            
            {channels.length > 0 && (
              <>
                <div className="px-3 py-2">
                  <p className="text-xs text-muted-foreground">Connected Channels</p>
                  <p className="text-sm font-medium text-foreground">{channels.length} channel{channels.length !== 1 ? 's' : ''}</p>
                </div>
                <DropdownMenuItem 
                  onClick={handleAddChannel}
                  className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  disabled={addingChannel}
                >
                  {addingChannel ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Another Channel
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
              </>
            )}

            <DropdownMenuItem className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer">
              <User className="w-4 h-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer">
              <Settings className="w-4 h-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem 
              onClick={signOut}
              className="gap-2 text-destructive hover:text-destructive cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
