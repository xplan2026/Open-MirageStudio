import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Save,
  Loader2,
  Clock,
  Sparkles,
  UserPlus,
  Link2,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
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
import {
  useCharacters,
  useCharacter,
  useSaveCharacter,
  useImpact,
} from '../../lib/queries';
import { cn } from '../../lib/utils';

const ROLE_INFO_KEYS = ['身份', '年龄', '朝代', '家族', '与主角关系', '性格'];

/**
 * 角色素材管理（2.3）— 新增/修改角色、主时间线视图、蝴蝶效应联动提示
 */
export default function CharacterPanel() {
  const { data, isLoading } = useCharacters();
  const characters = data?.characters || [];

  const [selected, setSelected] = useState(null);
  const [impactQ, setImpactQ] = useState('');
  const [showImpact, setShowImpact] = useState(false);

  // 新建角色
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const saveMutation = useSaveCharacter();

  useEffect(() => {
    if (!selected && characters.length) setSelected(characters[0].name);
  }, [characters, selected]);

  const { data: detail, isLoading: detailLoading } = useCharacter(selected, !!selected);
  const impact = useImpact(impactQ || selected, showImpact && (impactQ || selected));

  const createCharacter = async () => {
    if (!newName.trim()) return;
    const content =
      newContent.trim() ||
      `## 基本信息\n- **身份**: \n- **性格**: \n\n## 角色弧线\n\n- 起点：\n- 转折：\n- 终点：\n`;
    await saveMutation.mutateAsync({ name: newName.trim(), title: newTitle.trim(), content });
    setNewName('');
    setNewTitle('');
    setNewContent('');
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
      {/* 左：角色列表 */}
      <div className="flex h-full min-h-0 flex-col rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-3 py-2.5 text-xs font-medium text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          角色档案
          <Badge variant="secondary" className="ml-auto px-1.5 text-[10px]">
            {characters.length}
          </Badge>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-auto p-1.5">
          {isLoading ? (
            <div className="space-y-1.5 p-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            characters.map((c) => (
              <button
                key={c.name}
                onClick={() => {
                  setSelected(c.name);
                  setShowImpact(false);
                }}
                className={cn(
                  'block w-full rounded-lg border p-2.5 text-left transition-colors hover:bg-accent/60',
                  selected === c.name && 'border-primary/40 bg-accent',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{c.title}</span>
                  {c.hasTimeline && (
                    <Clock className="ml-auto h-3 w-3 shrink-0 text-amber-400" />
                  )}
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {Object.entries(c.info)
                    .slice(0, 3)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' · ') || '暂无基本信息'}
                </div>
              </button>
            ))
          )}
        </div>
        <div className="border-t p-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="h-3.5 w-3.5" />
                新建角色
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建角色卡</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Input placeholder="角色名（如：米福云）" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <Input placeholder="显示标题（如：米福云 · 米家第三代当家人）" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                <Textarea
                  placeholder="角色卡内容（Markdown，可留空使用模板）"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="min-h-[180px]"
                />
                <Button className="w-full" onClick={createCharacter} disabled={saveMutation.isPending || !newName.trim()}>
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  创建角色
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 右：角色详情 + 时间线 + 联动 */}
      <div className="min-h-0 flex-1">
        {detailLoading || !detail ? (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : (
          <Tabs defaultValue="detail" className="flex h-full min-h-0 flex-col">
            <TabsList className="w-fit">
              <TabsTrigger value="detail">角色档案</TabsTrigger>
              <TabsTrigger value="timeline" disabled={!detail.timeline}>
                主时间线 {detail.timeline && <Clock className="ml-1 h-3 w-3" />}
              </TabsTrigger>
              <TabsTrigger value="impact">
                <Sparkles className="mr-1 h-3 w-3" />
                联动分析
              </TabsTrigger>
            </TabsList>

            <TabsContent value="detail" className="min-h-0 flex-1">
              <CharacterEditor character={detail} />
            </TabsContent>

            <TabsContent value="timeline" className="min-h-0 flex-1 overflow-auto rounded-xl border bg-card p-4">
              {detail.timeline ? (
                <MarkdownView content={detail.timeline} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  该角色暂无主时间线
                </div>
              )}
            </TabsContent>

            <TabsContent value="impact" className="min-h-0 flex-1">
              <ImpactPanel
                keyword={impactQ}
                onKeyword={setImpactQ}
                selected={selected}
                data={impact.data}
                isLoading={impact.isLoading}
                run={() => setShowImpact(true)}
                dirty={!showImpact}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

/** 角色档案编辑 */
function CharacterEditor({ character }) {
  const saveMutation = useSaveCharacter();
  const [title, setTitle] = useState(character.title);
  const [content, setContent] = useState(character.content);

  useEffect(() => {
    setTitle(character.title);
    setContent(character.content);
  }, [character.name]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 border-0 bg-transparent text-sm font-medium focus-visible:ring-0"
        />
        <Badge variant="secondary" className="shrink-0">
          {character.name}
        </Badge>
        <Button
          size="sm"
          className="shrink-0"
          disabled={saveMutation.isPending}
          onClick={async () => {
            await saveMutation.mutateAsync({ name: character.name, title, content });
          }}
        >
          {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          保存
        </Button>
      </div>
      <div className="min-h-0 flex-1 p-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="h-full min-h-[420px] resize-none font-mono text-xs leading-relaxed"
        />
      </div>
    </div>
  );
}

/** 蝴蝶效应联动分析 */
function ImpactPanel({ keyword, onKeyword, selected, data, isLoading, run, dirty }) {
  const affected = data?.affectedChapters || [];
  const zhupu = data?.zhupu || [];
  const notes = data?.notes || [];
  const total = affected.length + zhupu.length + notes.length;

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-indigo-400" />
        <span className="text-sm font-medium">蝴蝶效应联动分析</span>
        <Badge variant="outline" className="ml-auto">
          {total} 处关联
        </Badge>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={`输入角色/关键词（默认：${selected}）`}
          value={keyword}
          onChange={(e) => onKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
        />
        <Button size="sm" onClick={run} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
          分析
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        检测「{keyword || selected}」在已写章节、Zhupu 族谱、思想笔记中的出现情况，用于评估角色设定修改的影响范围。
      </p>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto">
        {!dirty && isLoading && (
          <div className="space-y-2 p-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-3/5" />
          </div>
        )}
        {!isLoading && total === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <AlertTriangle className="h-6 w-6" />
            未发现任何关联 — 该关键词是全新元素
          </div>
        )}

        {affected.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              受影响章节（{affected.length}）
            </div>
            <div className="space-y-1">
              {affected.map((c) => (
                <div key={c.file} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5 text-xs">
                  <span className="truncate">{c.file}</span>
                  <Badge variant="secondary" className="ml-auto shrink-0 px-1.5 text-[10px]">
                    命中 {c.hits} 次
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        )}

        {zhupu.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Zhupu 族谱成员（{zhupu.length}）
            </div>
            <div className="space-y-1">
              {zhupu.map((z, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5 text-xs">
                  <span>{z.member}</span>
                  <Badge variant="outline" className="shrink-0 px-1.5 text-[10px]">
                    {z.family}
                  </Badge>
                  <span className="ml-auto truncate text-muted-foreground">{z.relation || z.memberId}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {notes.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              思想笔记引用（{notes.length}）
            </div>
            <div className="flex flex-wrap gap-1.5">
              {notes.map((n) => (
                <Badge key={n} variant="secondary">
                  {n}
                </Badge>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
