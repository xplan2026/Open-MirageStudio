import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  MessageSquarePlus,
  CheckCircle2,
  CircleDot,
  Wrench,
  Loader2,
  Sparkles,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import MarkdownView from '../assets/MarkdownView';
import {
  useChapters,
  useChapter,
  useFeedback,
  useAddFeedback,
  useSetFeedbackStatus,
  useImpact,
} from '../../lib/queries';
import { cn, formatTime } from '../../lib/utils';

const STATUS_META = {
  draft: { label: '草稿', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  pending: { label: '待修改', cls: 'bg-orange-500/15 text-orange-600 border-orange-500/30' },
  polishing: { label: '修改中', cls: 'bg-sky-500/15 text-sky-600 border-sky-500/30' },
  final: { label: '定稿', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
};

const DIMENSIONS = [
  { value: 'reader', label: '读者视角' },
  { value: 'editor', label: '编辑视角' },
  { value: 'logic', label: '逻辑一致性' },
  { value: 'era', label: '时代还原' },
  { value: 'general', label: '综合' },
];

const FB_STATUS = {
  pending: { label: '待处理', icon: CircleDot, cls: 'border-amber-500/30 text-amber-600' },
  executed: { label: '已执行', icon: Wrench, cls: 'border-sky-500/30 text-sky-600' },
  confirmed: { label: '已确认', icon: CheckCircle2, cls: 'border-emerald-500/30 text-emerald-600' },
};

/**
 * 章节修改联动（2.5）— 修改意见 → 执行 → 蝴蝶效应分析 → 确认
 */
export default function ChapterPanel() {
  const { data, isLoading } = useChapters();
  const chapters = data?.chapters || [];

  const [selected, setSelected] = useState(null);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [dimension, setDimension] = useState('general');
  const [impactQ, setImpactQ] = useState('');
  const [showImpact, setShowImpact] = useState(false);

  const addFeedback = useAddFeedback();
  const setStatus = useSetFeedbackStatus();

  useEffect(() => {
    if (!selected && chapters.length) setSelected(chapters[0].file);
  }, [chapters, selected]);

  const { data: chapterData, isLoading: chapterLoading } = useChapter(selected, !!selected);
  const { data: feedbackData } = useFeedback(selected);
  const impact = useImpact(impactQ || selected, showImpact && (impactQ || selected));
  const feedbackItems = feedbackData?.items || [];

  const submit = async () => {
    if (!feedbackContent.trim()) return;
    await addFeedback.mutateAsync({ chapter: selected, content: feedbackContent, dimension });
    setFeedbackContent('');
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
      {/* 左：章节树 */}
      <div className="flex h-full min-h-0 flex-col rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-3 py-2.5 text-xs font-medium text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          章节
          <Badge variant="secondary" className="ml-auto px-1.5 text-[10px]">
            {chapters.length}
          </Badge>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-auto p-1.5">
          {isLoading ? (
            <div className="space-y-1.5 p-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : (
            chapters.map((c) => {
              const meta = STATUS_META[c.status] || STATUS_META.draft;
              return (
                <button
                  key={c.file}
                  onClick={() => setSelected(c.file)}
                  className={cn(
                    'block w-full rounded-lg border p-2 text-left transition-colors hover:bg-accent/60',
                    selected === c.file && 'border-primary/40 bg-accent',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium">{c.title}</span>
                    <Badge variant="outline" className={cn('ml-auto shrink-0 border px-1.5 py-0 text-[10px]', meta.cls)}>
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{c.volume}</span>
                    <span className="ml-auto">{(c.words / 1000).toFixed(1)}k 字</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 右：正文 + 修改意见工作流 */}
      <div className="flex min-h-0 flex-col gap-4">
        {/* 章节正文 */}
        <div className="min-h-0 flex-1 rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-2.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate text-sm font-medium">{selected}</span>
            {chapterData && (
              <Badge variant="secondary" className="shrink-0 px-1.5 text-[10px]">
                {(chapterData.words / 1000).toFixed(1)}k 字
              </Badge>
            )}
          </div>
          <div className="h-[40vh] min-h-[260px] overflow-auto p-4 md:h-[42vh]">
            {chapterLoading || !chapterData ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <MarkdownView content={chapterData.content} />
            )}
          </div>
        </div>

        {/* 蝴蝶效应分析 */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 px-4 pt-3">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-medium text-muted-foreground">蝴蝶效应分析</span>
            <Badge variant="outline" className="ml-auto px-1.5 text-[10px]">
              {(impact.data?.affectedChapters?.length || 0) + (impact.data?.zhupu?.length || 0) + (impact.data?.notes?.length || 0)} 处关联
            </Badge>
          </div>
          <div className="flex gap-2 p-3">
            <Input
              placeholder="输入角色/事件/道具关键词，评估修改影响范围"
              value={impactQ}
              onChange={(e) => setImpactQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setShowImpact(true)}
            />
            <Button size="sm" variant="outline" onClick={() => setShowImpact(true)} disabled={impact.isLoading}>
              {impact.isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              分析
            </Button>
          </div>
          {showImpact && !impact.isLoading && (
            <div className="space-y-1.5 px-3 pb-3">
              {impact.data?.affectedChapters?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {impact.data.affectedChapters.map((c) => (
                    <Badge key={c.file} variant="secondary" className="gap-1 px-2 py-1 text-[11px]">
                      {c.file}
                      <span className="text-muted-foreground">×{c.hits}</span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  未在已写章节中发现该关键词
                </div>
              )}
              {impact.data?.zhupu?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {impact.data.zhupu.map((z, i) => (
                    <Badge key={i} variant="outline" className="gap-1 px-2 py-1 text-[11px]">
                      Zhupu: {z.member} ({z.family})
                    </Badge>
                  ))}
                </div>
              )}
              {impact.data?.notes?.length > 0 && (
                <div className="text-[11px] text-muted-foreground">
                  笔记引用：{impact.data.notes.join('、')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 修改意见工作流 */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 px-4 pt-3 text-xs font-medium text-muted-foreground">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            修改意见（{feedbackItems.length}）
          </div>

          <div className="flex gap-2 p-3">
            <Select value={dimension} onValueChange={setDimension}>
              <SelectTrigger className="h-9 w-32 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIMENSIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
              placeholder="输入修改意见（如：开篇钩子不足，建议在场景一加入悬念）…"
              className="h-16 flex-1 resize-none text-xs"
            />
            <Button size="sm" className="shrink-0 self-start" onClick={submit} disabled={addFeedback.isPending || !feedbackContent.trim()}>
              {addFeedback.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquarePlus className="h-3.5 w-3.5" />}
              提交
            </Button>
          </div>

          <div className="space-y-1.5 px-3 pb-3">
            {feedbackItems.length === 0 && (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                暂无修改意见 — 提交第一条，进入「待处理 → 已执行 → 已确认」工作流
              </div>
            )}
            {feedbackItems.map((fb) => {
              const meta = FB_STATUS[fb.status] || FB_STATUS.pending;
              const Icon = meta.icon;
              const dim = DIMENSIONS.find((d) => d.value === fb.dimension);
              return (
                <div key={fb.id} className="rounded-lg border bg-muted/20 p-2.5">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className={cn('mt-0.5 shrink-0 border px-1.5 py-0 text-[10px]', meta.cls)}>
                      <Icon className="mr-0.5 h-3 w-3" />
                      {meta.label}
                    </Badge>
                    {dim && (
                      <Badge variant="secondary" className="mt-0.5 shrink-0 px-1.5 py-0 text-[10px]">
                        {dim.label}
                      </Badge>
                    )}
                    <span className="min-w-0 flex-1 whitespace-pre-wrap text-xs leading-relaxed">{fb.content}</span>
                    <span className="shrink-0 pt-0.5 text-[10px] text-muted-foreground">
                      {formatTime(new Date(fb.createdAt).getTime())}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 pl-0.5">
                    {fb.status !== 'confirmed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        disabled={setStatus.isPending}
                        onClick={() => setStatus.mutate({ id: fb.id, status: 'executed' })}
                      >
                        <Wrench className="mr-1 h-3 w-3" />
                        标记已执行
                      </Button>
                    )}
                    {fb.status === 'executed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] text-emerald-600"
                        disabled={setStatus.isPending}
                        onClick={() => setStatus.mutate({ id: fb.id, status: 'confirmed' })}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        确认闭环
                      </Button>
                    )}
                    {fb.status === 'confirmed' && (
                      <span className="text-[11px] text-muted-foreground">✓ 已完成闭环</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
