import { YouTubeChannel } from '@/hooks/useYouTubeChannel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Youtube } from 'lucide-react';

interface ChannelSelectorProps {
  channels: YouTubeChannel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  disabled?: boolean;
}

export function ChannelSelector({
  channels,
  selectedChannelId,
  onSelectChannel,
  disabled,
}: ChannelSelectorProps) {
  if (channels.length === 0) {
    return null;
  }

  if (channels.length === 1) {
    const channel = channels[0];
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
        <Avatar className="w-8 h-8">
          <AvatarImage src={channel.channel_thumbnail || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            <Youtube className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{channel.channel_title}</p>
          <p className="text-xs text-muted-foreground">Publishing channel</p>
        </div>
      </div>
    );
  }

  return (
    <Select
      value={selectedChannelId || undefined}
      onValueChange={onSelectChannel}
      disabled={disabled}
    >
      <SelectTrigger className="w-full bg-input border-border">
        <SelectValue placeholder="Select a channel" />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        {channels.map((channel) => (
          <SelectItem key={channel.id} value={channel.id}>
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={channel.channel_thumbnail || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  <Youtube className="w-3 h-3" />
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{channel.channel_title}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
