import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, RefreshCw, Link2 } from "lucide-react";

interface DisconnectedChannel {
  id: string;
  channel_title: string;
  channel_thumbnail: string | null;
}

type Health = {
  disconnectedChannels: DisconnectedChannel[];
  stuckUploading: number;
  recentAuthFailures: number;
  sampleFailures: { id: string; title: string; error_message: string; updated_at: string }[];
};

const STUCK_UPLOAD_MINUTES = 45;

export function PipelineHealthBar() {
  const { user, session } = useAuth();
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectQueue, setReconnectQueue] = useState<DisconnectedChannel[]>([]);
  const [currentReconnectIndex, setCurrentReconnectIndex] = useState(0);

  const loadHealth = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = Date.now();
      const stuckCutoff = new Date(now - STUCK_UPLOAD_MINUTES * 60 * 1000).toISOString();

      const [channelsRes, stuckRes, failedRes] = await Promise.all([
        supabase
          .from("youtube_channels")
          .select("id, channel_title, channel_thumbnail")
          .eq("is_active", false),
        supabase
          .from("videos")
          .select("id", { count: "exact", head: true })
          .eq("status", "uploading")
          .lt("updated_at", stuckCutoff),
        supabase
          .from("videos")
          .select("id, title, error_message, updated_at")
          .eq("status", "failed")
          .like("error_message", "%invalid_grant%")
          .order("updated_at", { ascending: false })
          .limit(8),
      ]);

      const disconnectedChannels: DisconnectedChannel[] = (channelsRes.data ?? []).map((c) => ({
        id: c.id,
        channel_title: c.channel_title,
        channel_thumbnail: c.channel_thumbnail,
      }));
      const stuckUploading = stuckRes.count ?? 0;
      const authFailures = failedRes.data ?? [];

      setHealth({
        disconnectedChannels,
        stuckUploading,
        recentAuthFailures: authFailures.length,
        sampleFailures: authFailures.map((v) => ({
          id: v.id,
          title: v.title || "Untitled",
          error_message: v.error_message || "Unknown error",
          updated_at: v.updated_at,
        })),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
    const t = window.setInterval(loadHealth, 60_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const hasIssue = Boolean(
    (health?.disconnectedChannels?.length ?? 0) > 0 ||
      (health?.stuckUploading ?? 0) > 0 ||
      (health?.recentAuthFailures ?? 0) > 0
  );

  const summary = useMemo(() => {
    if (!health) return null;
    const parts: string[] = [];
    if (health.disconnectedChannels.length > 0) {
      const names = health.disconnectedChannels.map((c) => c.channel_title).join(", ");
      parts.push(`${health.disconnectedChannels.length} channel(s) need reconnect: ${names}`);
    }
    if (health.recentAuthFailures > 0) parts.push(`${health.recentAuthFailures} auth failure(s)`);
    if (health.stuckUploading > 0) parts.push(`${health.stuckUploading} stuck upload(s)`);
    return parts.join(" • ");
  }, [health]);

  // Start reconnecting all channels - opens Google auth for each one sequentially
  const handleReconnectAll = () => {
    if (!health?.disconnectedChannels.length) return;
    setReconnectQueue(health.disconnectedChannels);
    setCurrentReconnectIndex(0);
    setReconnecting(true);
  };

  const handleReconnectNext = async () => {
    if (!session?.access_token || currentReconnectIndex >= reconnectQueue.length) {
      setReconnecting(false);
      setReconnectQueue([]);
      setCurrentReconnectIndex(0);
      return;
    }

    const { data } = await supabase.functions.invoke("youtube-auth", {
      body: { action: "get_auth_url", prompt_type: "select_account" },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (data?.url) {
      // Store reconnect state in sessionStorage so we can continue after redirect
      sessionStorage.setItem("reconnect_queue", JSON.stringify(reconnectQueue));
      sessionStorage.setItem("reconnect_index", String(currentReconnectIndex + 1));
      window.location.href = data.url;
    }
  };

  // Check if we need to continue reconnecting after a redirect
  useEffect(() => {
    const storedQueue = sessionStorage.getItem("reconnect_queue");
    const storedIndex = sessionStorage.getItem("reconnect_index");
    
    if (storedQueue && storedIndex) {
      const queue = JSON.parse(storedQueue) as DisconnectedChannel[];
      const index = parseInt(storedIndex, 10);
      
      // Clear storage
      sessionStorage.removeItem("reconnect_queue");
      sessionStorage.removeItem("reconnect_index");
      
      // If there are more channels to reconnect, continue
      if (index < queue.length) {
        setReconnectQueue(queue);
        setCurrentReconnectIndex(index);
        setReconnecting(true);
      }
    }
  }, []);

  const currentChannel = reconnectQueue[currentReconnectIndex];

  if (!user || !hasIssue) return null;

  return (
    <div className="glass-card border border-destructive/20 bg-destructive/5 p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <p className="text-sm text-foreground">
            <span className="font-medium">Publishing needs attention:</span> {summary}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDetailsOpen(true)}>
            View details
          </Button>
          {(health?.disconnectedChannels?.length ?? 0) > 1 ? (
            <Button variant="default" size="sm" onClick={handleReconnectAll}>
              <Link2 className="w-4 h-4 mr-1" />
              Reconnect All ({health?.disconnectedChannels.length})
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={handleReconnectAll}>
              Reconnect
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadHealth} disabled={loading}>
            <RefreshCw className={"w-4 h-4" + (loading ? " animate-spin" : "")} />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        We automatically refresh tokens before they expire. If channels still disconnect, it means Google revoked access (changed password, removed app permissions, etc.).
      </p>

      {/* Reconnect All Dialog */}
      <AlertDialog open={reconnecting} onOpenChange={setReconnecting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reconnect Channels ({currentReconnectIndex + 1}/{reconnectQueue.length})</AlertDialogTitle>
            <AlertDialogDescription>
              {currentChannel ? (
                <>
                  Click "Connect" to reconnect <strong>{currentChannel.channel_title}</strong>.
                  <br /><br />
                  You'll be redirected to Google to authorize this channel. After completing, you'll be brought back to continue with the next channel.
                </>
              ) : (
                "All channels have been reconnected!"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {currentChannel && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              {currentChannel.channel_thumbnail ? (
                <img
                  src={currentChannel.channel_thumbnail}
                  alt=""
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted" />
              )}
              <div>
                <p className="font-medium text-foreground">{currentChannel.channel_title}</p>
                <p className="text-xs text-muted-foreground">Channel {currentReconnectIndex + 1} of {reconnectQueue.length}</p>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setReconnecting(false);
              setReconnectQueue([]);
              setCurrentReconnectIndex(0);
            }}>
              Cancel
            </AlertDialogCancel>
            {currentChannel && (
              <AlertDialogAction onClick={handleReconnectNext}>
                Connect {currentChannel.channel_title}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Dialog */}
      <AlertDialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>What happened?</AlertDialogTitle>
            <AlertDialogDescription>
              Channels disconnect when Google revokes access (password change, removed permissions, etc.). 
              We now proactively refresh tokens before they expire, but revoked access requires manual reconnection.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {/* Disconnected channels list */}
            {health?.disconnectedChannels && health.disconnectedChannels.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-sm font-medium text-foreground mb-2">Disconnected Channels</p>
                <div className="space-y-2">
                  {health.disconnectedChannels.map((ch) => (
                    <div key={ch.id} className="flex items-center gap-2">
                      {ch.channel_thumbnail ? (
                        <img
                          src={ch.channel_thumbnail}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted" />
                      )}
                      <span className="text-sm text-foreground">{ch.channel_title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {health?.sampleFailures?.length ? (
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-sm font-medium text-foreground mb-2">Failed Video Examples</p>
                <div className="space-y-2">
                  {health.sampleFailures.map((v) => (
                    <div key={v.id} className="text-xs">
                      <div className="font-medium text-foreground truncate">{v.title}</div>
                      <div className="text-muted-foreground truncate">{v.error_message}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent auth-failure examples found.</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={handleReconnectAll}>
              {(health?.disconnectedChannels?.length ?? 0) > 1 
                ? `Reconnect All (${health?.disconnectedChannels.length})`
                : "Reconnect channel"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
