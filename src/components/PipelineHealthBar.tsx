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
import { AlertCircle, RefreshCw } from "lucide-react";

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
      parts.push(`${health.disconnectedChannels.length} channel(s) need reconnect (${names})`);
    }
    if (health.recentAuthFailures > 0) parts.push(`${health.recentAuthFailures} auth failure(s)`);
    if (health.stuckUploading > 0) parts.push(`${health.stuckUploading} stuck upload(s)`);
    return parts.join(" • ");
  }, [health]);

  const handleReconnect = async () => {
    if (!session?.access_token) return;
    const { data } = await supabase.functions.invoke("youtube-auth", {
      body: { action: "get_auth_url", prompt_type: "select_account" },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (data?.url) window.location.href = data.url;
  };

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
          <Button variant="default" size="sm" onClick={handleReconnect}>
            Reconnect
          </Button>
          <Button variant="outline" size="sm" onClick={loadHealth} disabled={loading}>
            <RefreshCw className={"w-4 h-4" + (loading ? " animate-spin" : "")} />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Most stalls are caused by a channel authorization expiring/revoked. We auto-stop retrying those channels and show you here.
      </p>

      <AlertDialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>What happened?</AlertDialogTitle>
            <AlertDialogDescription>
              The uploader is hitting Google token refresh errors ("invalid_grant") for some channels, meaning the channel access was revoked/expired.
              Those videos can't upload until you reconnect the channel.
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
            <AlertDialogAction onClick={handleReconnect}>Reconnect channel(s)</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
