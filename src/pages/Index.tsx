import { useAuth } from '@/hooks/useAuth';
import { useYouTubeChannel } from '@/hooks/useYouTubeChannel';
import { AuthScreen } from '@/components/AuthScreen';
import { Header } from '@/components/Header';
import { ConnectChannelCard } from '@/components/ConnectChannelCard';
import { Dashboard } from '@/components/Dashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { channel, loading: channelLoading } = useYouTubeChannel();

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!user) {
    return <AuthScreen />;
  }

  // Show loading for channel check
  if (channelLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  // Show channel connection if not connected
  if (!channel) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="py-16">
          <ConnectChannelCard />
        </div>
      </div>
    );
  }

  // Show main dashboard
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Dashboard />
    </div>
  );
};

export default Index;
