import { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Plus,
  Save,
  Trash2,
  Loader2,
  Tag,
  GitBranch,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import MarkdownView from '../assets/MarkdownView';
import { useNotes, useSaveNote, useDeleteNote } from '../../lib/queries';
import { cn } from '../../lib/utils';

/**
 * 思想/立意素材页（2.4）— 笔记 CRUD + 标签系统 + 演化追踪
 */
export default function NotesPanel() {
  const { data, isLoading } = useNotes();
  const notes = data?.notes || [];
  const tagCount = data?.tags || {};

  const [selected, setSelected] = useState(null);
  const [activeTag, setActiveTag] = useState('全部');

  useEffect(() => {
    if (!selected && notes.length) setSelected(notes[0].name);
  }, [notes, selected]);

  const filtered = useMemo(() => {
    if (activeTag === '全部') return notes;
    return notes.filter((n) => n.tags.includes(activeTag));
  }, [notes, activeTag]);

  const current = notes.find((n) => n.name === selected);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 md:grid-cols-[300px_1fr]">
      {/* 左：标签云 + 笔记列表 */}
      <div className="flex h-full min-h-0 flex-col rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-3 py-2.5 text-xs font-medium text-muted-foreground">
          <Brain className="h-3.5 w-3.5" />
          思想笔记
          <Badge variant="secondary" className="ml-auto px-1.5 text-[10px]">
            {notes.length}
          </Badge>
        </div>

        {/* 标签云 */}
        <div className="flex flex-wrap gap-1.5 border-b px-3 py-2">
          <Tag className="mt-1 h-3 w-3 text-muted-foreground" />
          {[{ name: '全部', count: notes.length }, ...Object.entries(tagCount).map(([name, count]) => ({ name, count }))].map((t) => (
            <button
              key={t.name}
              onClick={() => setActiveTag(t.name)}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                activeTag === t.name
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'hover:bg-accent/60',
              )}
            >
              {t.name} {t.count}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-auto p-1.5">
          {isLoading ? (
            <div className="space-y-1.5 p-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            filtered.map((n) => (
              <button
                key={n.name}
                onClick={() => setSelected(n.name)}
                className={cn(
                  'block w-full rounded-lg border p-2.5 text-left transition-colors hover:bg-accent/60',
                  selected === n.name && 'border-primary/40 bg-accent',
                )}
              >
                <div className="truncate text-sm font-medium">{n.title}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  {n.date && <span className="text-[11px] text-muted-foreground">{n.date}</span>}
                  <span className="ml-auto flex flex-wrap justify-end gap-1">
                    {n.tags.slice(0, 3).map((t) => (
                      <Badge key={t} variant="outline" className="px-1.5 text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </span>
                </div>
              </button>
            ))
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">该标签下暂无笔记</div>
          )}
        </div>

        <div className="border-t p-2">
          <CreateNoteDialog />
        </div>
      </div>

      {/* 右：笔记编辑器 / 演化追踪 */}
      <div className="min-h-0 flex-1">
        {current ? (
          <NoteEditor key={current.name} note={current} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
            请选择左侧笔记
          </div>
        )}
      </div>
    </div>
  );
}

/** 新建笔记对话框 */
function CreateNoteDialog() {
  const saveMutation = useSaveNote();
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [open, setOpen] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    await saveMutation.mutateAsync({
      name: name.trim(),
      title: title.trim(),
      content: content || '# 新笔记\n',
      tags: tags.split(/[,，\s]+/).filter(Boolean),
    });
    setOpen(false);
    setName('');
    setTitle('');
    setTags('');
    setContent('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="h-3.5 w-3.5" />
          新建笔记
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建思想笔记</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Input placeholder="笔记名（如：米丰-50岁思想列表）" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="标题（可选）" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="标签，逗号分隔（如：人物观,家庭观）" value={tags} onChange={(e) => setTags(e.target.value)} />
          <Textarea
            placeholder="笔记内容（Markdown）…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[160px]"
          />
          <Button className="w-full" onClick={create} disabled={saveMutation.isPending || !name.trim()}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存笔记
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 笔记编辑器 + 演化追踪 */
function NoteEditor({ note }) {
  const saveMutation = useSaveNote();
  const deleteMutation = useDeleteNote();
  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState(note.tags.join(', '));
  const [content, setContent] = useState(note.body);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    setTitle(note.title);
    setTags(note.tags.join(', '));
    setContent(note.body);
    setPreview(false);
  }, [note.name]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 border-0 bg-transparent text-sm font-medium focus-visible:ring-0"
        />
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="标签"
          className="h-8 w-52 border-0 bg-transparent text-xs focus-visible:ring-0"
        />
        <Button variant="outline" size="sm" onClick={() => setPreview(!preview)}>
          {preview ? '编辑' : '预览'}
        </Button>
        <Button
          size="sm"
          disabled={saveMutation.isPending}
          onClick={async () => {
            await saveMutation.mutateAsync({
              name: note.name,
              title,
              content,
              tags: tags.split(/[,，\s]+/).filter(Boolean),
            });
          }}
        >
          {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          保存
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (window.confirm(`确认删除笔记「${note.title}」？`)) deleteMutation.mutate(note.name);
          }}
        >
          {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-1.5 text-[11px] text-muted-foreground">
        <GitBranch className="h-3 w-3" />
        演化追踪：{note.date || '未标注日期'} 创建 · 每次保存由后端追加时间戳（frontmatter date）
      </div>

      <div className="min-h-0 flex-1 p-4">
        {preview ? (
          <div className="h-full overflow-auto">
            <MarkdownView content={content} />
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-full min-h-[420px] resize-none font-mono text-xs leading-relaxed"
          />
        )}
      </div>
    </div>
  );
}
