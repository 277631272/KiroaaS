import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCw, Loader2, Zap, AlertCircle } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

interface UsageCardProps {
  host: string;
  port: number;
  apiKey: string;
  isRunning: boolean;
}

interface UsageData {
  monthlyUsageLimit?: { usageLimit?: number; currentUsage?: number };
  subscriptionData?: { subscriptionStatus?: string; subscriptionPlan?: string };
  overageConfig?: { isOverageEnabled?: boolean };
  usageLimitResetDate?: string;
  [key: string]: unknown;
}

export function UsageCard({ host, port, apiKey, isRunning }: UsageCardProps) {
  const { t } = useI18n();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!isRunning || !apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const fetchHost = host === '0.0.0.0' ? '127.0.0.1' : host;
      const res = await fetch(`http://${fetchHost}:${port}/usage`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setUsage(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
    } finally {
      setLoading(false);
    }
  }, [host, port, apiKey, isRunning]);

  useEffect(() => {
    if (isRunning) fetchUsage();
    else { setUsage(null); setError(null); }
  }, [isRunning, fetchUsage]);

  const limit = usage?.monthlyUsageLimit?.usageLimit ?? 0;
  const used = usage?.monthlyUsageLimit?.currentUsage ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const plan = usage?.subscriptionData?.subscriptionPlan;
  const status = usage?.subscriptionData?.subscriptionStatus;
  const resetDate = usage?.usageLimitResetDate
    ? new Date(usage.usageLimitResetDate).toLocaleDateString()
    : null;

  const fmtNum = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-stone-100">
            <Zap className="h-3.5 w-3.5 text-stone-500" />
          </div>
          <span className="font-semibold text-xs text-stone-500 tracking-wider uppercase">
            {t('creditUsage')}
          </span>
        </div>
        {isRunning && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-full hover:bg-stone-100"
            onClick={fetchUsage}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />
            ) : (
              <RotateCw className="h-3.5 w-3.5 text-stone-400" />
            )}
          </Button>
        )}
      </div>

      {/* Content */}
      {!isRunning ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-stone-400 font-medium">{t('usageServerOffline')}</p>
        </div>
      ) : loading && !usage ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-stone-300" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <p className="text-xs text-red-400 font-medium">{t('usageLoadFailed')}</p>
        </div>
      ) : usage ? (
        <div className="flex flex-col gap-3 flex-1">
          {/* Plan badge */}
          {(plan || status) && (
            <div className="flex items-center gap-2">
              {plan && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#111] text-white text-[10px] font-bold uppercase tracking-wider">
                  {plan}
                </span>
              )}
              {status && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  status === 'ACTIVE' ? 'bg-lime-100 text-lime-800' : 'bg-stone-100 text-stone-500'
                }`}>
                  {status}
                </span>
              )}
            </div>
          )}

          {/* Usage bar */}
          {limit > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-stone-400 font-medium">{t('usageUsed')}</span>
                <span className="text-xs font-bold text-[#111]">
                  {fmtNum(used)} <span className="text-stone-400 font-normal">/ {fmtNum(limit)}</span>
                </span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-[#EBFD93]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-stone-400">{pct}% {t('usageUsed').toLowerCase()}</span>
                {resetDate && (
                  <span className="text-[10px] text-stone-400">{t('usageResets')} {resetDate}</span>
                )}
              </div>
            </div>
          )}

          {/* Overage */}
          {usage.overageConfig?.isOverageEnabled !== undefined && (
            <div className="flex items-center gap-1.5 mt-auto">
              <div className={`h-1.5 w-1.5 rounded-full ${usage.overageConfig.isOverageEnabled ? 'bg-amber-400' : 'bg-stone-300'}`} />
              <span className="text-[10px] text-stone-400 font-medium">
                {t('usageOverage')}: {usage.overageConfig.isOverageEnabled ? t('usageOverageOn') : t('usageOverageOff')}
              </span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
