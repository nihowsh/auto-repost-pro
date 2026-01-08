import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface YPPEligibilityTrackerProps {
  subscriberCount: number;
  watchTimeHours: number; // Total watch time in hours over last 365 days
  loading?: boolean;
}

const YPP_SUBS_THRESHOLD = 1000;
const YPP_WATCH_HOURS_THRESHOLD = 4000;

export function YPPEligibilityTracker({ subscriberCount, watchTimeHours, loading }: YPPEligibilityTrackerProps) {
  const eligibility = useMemo(() => {
    const subsProgress = Math.min((subscriberCount / YPP_SUBS_THRESHOLD) * 100, 100);
    const watchProgress = Math.min((watchTimeHours / YPP_WATCH_HOURS_THRESHOLD) * 100, 100);
    const subsRemaining = Math.max(YPP_SUBS_THRESHOLD - subscriberCount, 0);
    const watchRemaining = Math.max(YPP_WATCH_HOURS_THRESHOLD - watchTimeHours, 0);
    const isEligible = subscriberCount >= YPP_SUBS_THRESHOLD && watchTimeHours >= YPP_WATCH_HOURS_THRESHOLD;
    const subsReached = subscriberCount >= YPP_SUBS_THRESHOLD;
    const watchReached = watchTimeHours >= YPP_WATCH_HOURS_THRESHOLD;

    return {
      subsProgress,
      watchProgress,
      subsRemaining,
      watchRemaining,
      isEligible,
      subsReached,
      watchReached,
    };
  }, [subscriberCount, watchTimeHours]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            YPP Eligibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              YPP Eligibility
            </CardTitle>
            <CardDescription>YouTube Partner Program requirements</CardDescription>
          </div>
          {eligibility.isEligible ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle className="w-3 h-3 mr-1" />
              Eligible
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-500 border-amber-500/20">
              <AlertCircle className="w-3 h-3 mr-1" />
              In Progress
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subscribers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>Subscribers</span>
              {eligibility.subsReached && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
            <span className="font-medium">
              {subscriberCount.toLocaleString()} / {YPP_SUBS_THRESHOLD.toLocaleString()}
            </span>
          </div>
          <Progress value={eligibility.subsProgress} className="h-2" />
          {!eligibility.subsReached && (
            <p className="text-xs text-muted-foreground">
              {eligibility.subsRemaining.toLocaleString()} more subscribers needed
            </p>
          )}
        </div>

        {/* Watch Hours */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Public Watch Hours (365 days)</span>
              {eligibility.watchReached && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
            <span className="font-medium">
              {Math.round(watchTimeHours).toLocaleString()} / {YPP_WATCH_HOURS_THRESHOLD.toLocaleString()}
            </span>
          </div>
          <Progress value={eligibility.watchProgress} className="h-2" />
          {!eligibility.watchReached && (
            <p className="text-xs text-muted-foreground">
              {Math.round(eligibility.watchRemaining).toLocaleString()} more hours needed
            </p>
          )}
        </div>

        {eligibility.isEligible && (
          <div className="p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">
            🎉 Congratulations! You meet the YouTube Partner Program requirements.
            Apply through YouTube Studio to start monetizing.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
