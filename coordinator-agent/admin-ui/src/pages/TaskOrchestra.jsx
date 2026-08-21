import { useState } from 'react';
import {
  Rocket,
  Play,
  Ban,
  RotateCcw,
  Loader2,
  ListTodo,
  Send,
  Workflow,
} from 'lucide-react';
import { useTasks, useCreateTask, useTaskAction } from '../lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { formatTime } from '../lib/utils';

const STATUS_STYLE = {
  pending: 'warning',
  running: 'info',
  success: 'success',
  failed: 'destructive',
  cancelled: 'secondary',
};

function StatusBadge({ status }) {
  return <Badge variant={STATUS_STYLE[status] || 'outline'}>{status}</Badge>;
}

export default function TaskOrchestra() {
  const { data, isLoading } = useTasks(null, 5000);
  const createTask = useCreateTask();
  const execAction = useTaskAction('executeTask');
  const cancelAction = useTaskAction('cancelTask');
  const retryAction = useTaskAction('retryTask');

  const [message, setMessage] = useState('');
  const tasks = data?.tasks || [];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    await createTask.mutateAsync({ message });
    setMessage('');
  };

  const counts = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    running: tasks.filter((t) => t.status === 'running').length,
    success: tasks.filter((t) => t.status === 'success').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  };

  const stats = [
    { label: '全部', value: counts.total },
    { label: '等待中', value: counts.pending, className: 'text-amber-400' },
    { label: '运行中', value: counts.running, className: 'text-sky-400' },
    { label: '成功', value: counts.success, className: 'text-emerald-400' },
    { label: '失败', value: counts.failed, className: 'text-rose-400' },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* 新建任务 */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Workflow className="h-4 w-4 text-indigo-400" />
            新建任务
          </div>
          <form onSubmit={handleCreate} className="flex gap-3">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="自然语言任务描述，如：帮我写一首关于秋天的民谣歌曲"
            />
            <Button type="submit" disabled={createTask.isPending || !message.trim()}>
              {createTask.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}
              创建任务
            </Button>
          </form>
          {createTask.data?.task && (
            <div className="mt-2 rounded-lg bg-muted/50 p-2.5 text-xs">
              任务 #{createTask.data.task.id} 已创建 → {createTask.data.agent?.name || createTask.data.intent?.agentId}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 统计 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${s.className || ''}`}>{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 任务列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ListTodo className="h-4 w-4 text-indigo-400" />
            任务列表
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              暂无任务，在上方输入任务描述开始
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">任务 ID</th>
                    <th className="px-4 py-2.5 font-medium">Agent</th>
                    <th className="px-4 py-2.5 font-medium">意图</th>
                    <th className="px-4 py-2.5 font-medium">状态</th>
                    <th className="px-4 py-2.5 font-medium">创建时间</th>
                    <th className="px-4 py-2.5 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="max-w-[180px] truncate px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {task.id}
                      </td>
                      <td className="px-4 py-2.5">{task.agentId}</td>
                      <td className="max-w-[240px] truncate px-4 py-2.5 text-muted-foreground">
                        {task.intent || '-'}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {formatTime(task.createdAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          {(task.status === 'pending' || task.status === 'running') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => execAction.mutate(task.id)}
                              disabled={execAction.isPending}
                            >
                              <Play className="h-3 w-3" />
                              执行
                            </Button>
                          )}
                          {task.status === 'running' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={() => cancelAction.mutate(task.id)}
                            >
                              <Ban className="h-3 w-3" />
                              取消
                            </Button>
                          )}
                          {task.status === 'failed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => retryAction.mutate(task.id)}
                            >
                              <RotateCcw className="h-3 w-3" />
                              重试
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编排流程说明 */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4 text-xs text-muted-foreground">
          <Rocket className="h-4 w-4 shrink-0 text-indigo-400" />
          编排流程：意图解析 → 创建任务 → Agent 执行 → 状态跟踪。Phase 3 将接入真实 Agent 适配器。
        </CardContent>
      </Card>
    </div>
  );
}
