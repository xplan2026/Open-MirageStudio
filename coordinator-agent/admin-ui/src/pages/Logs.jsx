import { useMemo, useState } from 'react';
import { ScrollText, RefreshCw, Info, AlertTriangle, CircleX } from 'lucide-react';
import { useTasks } from '../lib/queries';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { cn, formatTime } from '../lib/utils';

const FILTERS = [
  { key: 'all', label: '全部', icon: ScrollText },
  { key: 'info', label: '信息', icon: Info },
  { key: 'warn', label: '警告', icon: AlertTriangle },
  { key: 'error', label: '错误', icon: CircleX },
];

const LEVEL_STYLE = {
  info: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
  warn: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  error: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
};

export default function Logs() {
  const { data, isLoading, refetch, isRefetching } = useTasks(null, 10000);
  const [filter, setFilter] = useState('all');

  const logs = useMemo(() => {
    const tasks = data?.tasks || [];
    return tasks
      .map((t) => ({
        id: t.id,
        time: t.updatedAt || t.createdAt,
        level: t.status === 'failed' ? 'error' : t.status === 'cancelled' ? 'warn' : 'info',
        agentId: t.agentId,
        message: t.error ? `任务失败: ${t.error}` : `任务 ${t.status} — ${t.intent || t.agentId}`,
        status: t.status,
      }))
      .sort((a, b) => b.time - a.time);
  }, [data]);

  const counts = {
    all: logs.length,
    info: logs.filter((l) => l.level === 'info').length,
    warn: logs.filter((l) => l.level === 'warn').length,
    error: logs.filter((l) => l.level === 'error').length,
  };

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.level === filter);

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.key)}
          >
            <f.icon className="mr-1.5 h-3.5 w-3.5" />
            {f.label} ({counts[f.key]})
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn('mr-1 h-3.5 w-3.5', isRefetching && 'animate-spin')} />
          刷新
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">暂无日志记录</div>
          ) : (
            <div className="divide-y">
              {filtered.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {formatTime(entry.time)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex w-12 shrink-0 items-center justify-center rounded border px-1 py-0.5 text-[10px] font-semibold',
                      LEVEL_STYLE[entry.level],
                    )}
                  >
                    {entry.level.toUpperCase()}
                  </span>
                  <Badge variant="secondary" className="shrink-0 text-[11px]">
                    {entry.agentId}
                  </Badge>
                  <span className="truncate text-muted-foreground">{entry.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
