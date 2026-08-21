import { useState } from 'react';
import { Bot, Cpu, RefreshCw, Activity, HeartPulse } from 'lucide-react';
import { useAgents } from '../lib/queries';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/utils';

const STATUS_STYLE = {
  online: 'success',
  offline: 'destructive',
  maintenance: 'warning',
  unknown: 'outline',
};

function StatusBadge({ status }) {
  return <Badge variant={STATUS_STYLE[status] || 'outline'}>{status}</Badge>;
}

export default function AgentStatus() {
  const { data, isLoading, refetch, isRefetching } = useAgents(15000);
  const [selectedId, setSelectedId] = useState(null);

  const agents = data?.agents || [];
  const selected = agents.find((a) => a.agentId === selectedId) || null;
  const online = agents.filter((a) => a.status === 'online').length;
  const offline = agents.filter((a) => a.status !== 'online').length;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* 统计 + 刷新 */}
      <div className="flex flex-wrap items-center gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Bot className="h-5 w-5 text-indigo-400" />
            <div>
              <div className="text-xl font-bold">{agents.length}</div>
              <div className="text-xs text-muted-foreground">注册 Agent</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <HeartPulse className="h-5 w-5 text-emerald-400" />
            <div>
              <div className="text-xl font-bold text-emerald-400">{online}</div>
              <div className="text-xs text-muted-foreground">在线</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Activity className="h-5 w-5 text-rose-400" />
            <div>
              <div className="text-xl font-bold text-rose-400">{offline}</div>
              <div className="text-xs text-muted-foreground">离线</div>
            </div>
          </CardContent>
        </Card>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={cn('h-3.5 w-3.5', isRefetching && 'animate-spin')} />
          刷新
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Agent 列表 */}
        <div className="space-y-2">
          {isLoading
            ? [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-16" />)
            : agents.map((a) => (
                <Card
                  key={a.agentId}
                  className={cn(
                    'cursor-pointer transition-colors hover:border-indigo-500/40',
                    selectedId === a.agentId && 'border-indigo-500/60 bg-accent/30',
                  )}
                  onClick={() => setSelectedId(a.agentId)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{a.name}</span>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{a.desc}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* 详情 */}
        <div>
          {selected ? (
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">{selected.name}</h3>
                  <StatusBadge status={selected.health || selected.status} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Agent ID</div>
                    <div className="font-mono text-sm">{selected.agentId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">注册状态</div>
                    <div className="text-sm">{selected.status}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">描述</div>
                    <div className="text-sm text-foreground/80">{selected.desc || selected.description}</div>
                  </div>
                  {selected.cliEntry && (
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground">CLI 入口</div>
                      <div className="font-mono text-sm">{selected.cliEntry}</div>
                    </div>
                  )}
                  {selected.capabilities?.length > 0 && (
                    <div className="col-span-2">
                      <div className="mb-1 text-xs text-muted-foreground">能力</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.capabilities.map((cap) => (
                          <Badge key={cap} variant="secondary">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selected.inputSchema && (
                    <div className="col-span-2">
                      <div className="mb-1 text-xs text-muted-foreground">输入 Schema</div>
                      <pre className="overflow-auto rounded-lg bg-muted/50 p-3 font-mono text-xs">
                        {JSON.stringify(selected.inputSchema, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                选择左侧 Agent 查看详情
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
