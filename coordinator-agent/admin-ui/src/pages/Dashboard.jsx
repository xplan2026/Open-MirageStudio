import { Link } from 'react-router-dom';
import {
  Cpu,
  ListTodo,
  Loader2,
  CheckCircle2,
  Bot,
  Activity,
  ArrowRight,
  BookOpen,
  Music,
  Clapperboard,
  Network,
  TextQuote,
  UserRound,
  FileAudio,
  Image as ImageIcon,
  Files,
} from 'lucide-react';
import { useDashboard, useDataStats } from '../lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { formatTime } from '../lib/utils';

const STATUS_STYLE = {
  online: 'success',
  offline: 'destructive',
  maintenance: 'warning',
  pending: 'warning',
  running: 'info',
  success: 'success',
  failed: 'destructive',
  cancelled: 'secondary',
};

function StatusBadge({ status }) {
  return <Badge variant={STATUS_STYLE[status] || 'outline'}>{status}</Badge>;
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <div className="text-lg font-bold">{value ?? '—'}</div>
      <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        {Icon && <Icon className="h-2.5 w-2.5" />}
        {label}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, loading }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-muted ${color || ''}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">
            {loading ? <Skeleton className="h-7 w-10" /> : value}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError } = useDashboard();
  const { data: dataStats } = useDataStats();

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Dashboard 数据加载失败，请检查后端服务
          </CardContent>
        </Card>
      </div>
    );
  }

  const agents = data?.agents || [];
  const stats = data?.taskStats || {};
  const recentTasks = data?.recentTasks || [];
  const onlineCount = agents.filter((a) => a.status === 'online').length;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* 统计卡 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Bot}
          label={`Agent 在线（${onlineCount}/${agents.length}）`}
          value={agents.length}
          color="text-indigo-400"
          loading={isLoading}
        />
        <StatCard
          icon={ListTodo}
          label="任务总数"
          value={stats.total ?? '—'}
          color="text-sky-400"
          loading={isLoading}
        />
        <StatCard
          icon={Loader2}
          label="运行中"
          value={stats.running ?? '—'}
          color="text-amber-400"
          loading={isLoading}
        />
        <StatCard
          icon={CheckCircle2}
          label="已完成"
          value={stats.success ?? '—'}
          color="text-emerald-400"
          loading={isLoading}
        />
      </div>

      {/* Agent 状态 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-indigo-400" />
            Agent 运行状态
          </h2>
          <Link to="/agents" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            查看全部 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20" />)
            : agents.map((a) => (
                <Card key={a.agentId} className="transition-colors hover:border-indigo-500/40">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{a.name}</span>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{a.desc}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>

      {/* 产物统计 */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Files className="h-4 w-4 text-indigo-400" />
          产物统计
        </div>
        {dataStats ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card>
              <CardContent className="space-y-2.5 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                  Xujie Writer ·《幻觉》
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="章节" value={dataStats.xujie?.chapters} icon={TextQuote} />
                  <Stat label="字数(万)" value={Math.round((dataStats.xujie?.words || 0) / 10000)} icon={TextQuote} />
                  <Stat label="角色" value={dataStats.xujie?.characters} icon={UserRound} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2.5 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Music className="h-3.5 w-3.5 text-indigo-400" />
                  Lemong · 歌曲
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="歌曲" value={dataStats.lemong?.songs} icon={Music} />
                  <Stat label="MP3" value={dataStats.lemong?.mp3s} icon={FileAudio} />
                  <Stat label="歌词" value={dataStats.lemong?.lyricsFiles} icon={TextQuote} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2.5 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Clapperboard className="h-3.5 w-3.5 text-indigo-400" />
                  Erhu · MV
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="MV" value={dataStats.erhu?.mvs} icon={Clapperboard} />
                  <Stat label="视频" value={dataStats.erhu?.videos} icon={Clapperboard} />
                  <Stat label="图片" value={dataStats.erhu?.images} icon={ImageIcon} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2.5 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Network className="h-3.5 w-3.5 text-indigo-400" />
                  Zhupu · 族谱
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="家族" value={dataStats.zhupu?.families} icon={Network} />
                  <Stat label="成员" value={dataStats.zhupu?.members} icon={UserRound} />
                  <Stat label="联姻图" value={dataStats.zhupu?.graphFiles} icon={Network} />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}
      </div>

      {/* 最近任务 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ListTodo className="h-4 w-4 text-indigo-400" />
            最近任务
          </h2>
          <Link to="/tasks" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            任务编排 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentTasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                暂无任务，去「AI 对话」发起第一个创作任务
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">任务 ID</th>
                      <th className="px-4 py-2.5 font-medium">Agent</th>
                      <th className="px-4 py-2.5 font-medium">指令</th>
                      <th className="px-4 py-2.5 font-medium">状态</th>
                      <th className="px-4 py-2.5 font-medium">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTasks.map((t) => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">#{t.id}</td>
                        <td className="px-4 py-2.5">{t.agentId}</td>
                        <td className="max-w-[300px] truncate px-4 py-2.5 text-muted-foreground">
                          {t.intent}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {formatTime(t.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
