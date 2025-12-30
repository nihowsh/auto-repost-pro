import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useYouTubeChannel } from '@/hooks/useYouTubeChannel';
import { Youtube, LogOut, Settings, User, RefreshCw, Loader2 } from 'lucide-react';
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
  const { channel, disconnectChannel, refetchChannel } = useYouTubeChannel();
  const { toast } = useToast();
  const [switchingAccount, setSwitchingAccount] = useState(false);

  const handleSwitchAccount = async () => {
    setSwitchingAccount(true);
    try {
      // First disconnect current channel if exists
      if (channel) {
        await disconnectChannel();
      }

      // Initiate new Google OAuth with prompt to select account
      if (!session?.access_token) {
        throw new Error('Please sign in again');
      }

      const { data, error } = await supabase.functions.invoke('youtube-auth', {
        body: { action: 'get_auth_url' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Add prompt=select_account to force account selection
        const urlWithPrompt = data.url + '&prompt=select_account';
        window.location.href = urlWithPrompt;
      }
    } catch (err: any) {
      toast({
        title: 'Switch failed',
        description: err?.message || 'Failed to switch account',
        variant: 'destructive',
      });
      setSwitchingAccount(false);
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
            
            {channel && (
              <>
                <div className="px-3 py-2">
                  <p className="text-xs text-muted-foreground">Connected Channel</p>
                  <p className="text-sm font-medium text-foreground truncate">{channel.channel_title}</p>
                </div>
                <DropdownMenuItem 
                  onClick={handleSwitchAccount}
                  className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  disabled={switchingAccount}
                >
                  {switchingAccount ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Switch Channel
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
