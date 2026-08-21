import { useMemo, useState } from 'react';
import {
  Music,
  Disc3,
  Send,
  Loader2,
  FileJson,
  NotebookPen,
  Save,
  Pencil,
  X,
  ListMusic,
} from 'lucide-react';
import { useDataTree, useDataFile, useSaveDataFile } from '../lib/queries';
import { api } from '../api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import MarkdownView from '../components/assets/MarkdownView';
import { cn } from '../lib/utils';

/** 从文件树中提取歌曲目录列表 */
function extractSongs(tree, songs = []) {
  for (const node of tree || []) {
    if (node.type === 'dir') {
      const hasMp3 = (node.children || []).some((c) => c.type === 'file' && c.ext === '.mp3');
      if (hasMp3) songs.push(node);
      else extractSongs(node.children, songs);
    }
  }
  return songs;
}

function PromptEditor({ path }) {
  const { data: file, isLoading } = useDataFile(path);
  const saveMutation = useSaveDataFile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const formatted = file?.type === 'text' ? JSON.stringify(JSON.parse(file.content), null, 2) : '';

  const save = async () => {
    await saveMutation.mutateAsync({ path, content: draft });
    setEditing(false);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileJson className="h-3.5 w-3.5" />
          prompt.json
        </div>
        {editing ? (
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              <X className="h-3 w-3" /> 取消
            </Button>
            <Button size="sm" onClick={save} disabled={saveMutation.isPending}>
              <Save className="h-3 w-3" /> 保存
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => { setDraft(formatted); setEditing(true); }}>
            <Pencil className="h-3 w-3" /> 编辑
          </Button>
        )}
      </div>
      {editing ? (
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[300px] font-mono text-xs" />
      ) : (
        <pre className="overflow-auto rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed">{formatted}</pre>
      )}
    </div>
  );
}

export default function AgentLemong() {
  const { data: treeData, isLoading } = useDataTree('Lemong-data', 2);
  const songs = useMemo(() => extractSongs(treeData?.tree), [treeData]);
  const [selected, setSelected] = useState(null);

  // 创作指令
  const [cmdTitle, setCmdTitle] = useState('');
  const [cmdPrompt, setCmdPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const lyricsPath = selected ? `Lemong-data/${selected}/歌词.md` : null;
  const promptPath = selected ? `Lemong-data/${selected}/prompt.json` : null;
  const backgroundPath = selected ? `Lemong-data/${selected}/创作背景.md` : null;
  const mp3Node = selected?.children?.find((c) => c.type === 'file' && c.ext === '.mp3');

  const lyricsQuery = useDataFile(lyricsPath, !!selected);
  const backgroundQuery = useDataFile(backgroundPath, !!selected);

  const sendCommand = async () => {
    if (!cmdPrompt.trim() || sending) return;
    setSending(true);
    setSendResult(null);
    try {
      const message = `为《幻觉》创作一首歌曲${cmdTitle.trim() ? `，歌名《${cmdTitle.trim()}》` : ''}。${cmdPrompt.trim()}`;
      const result = await api.chat(message);
      setSendResult(result);
    } catch (err) {
      setSendResult({ error: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:p-6">
      {/* 创作指令 */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Disc3 className="h-4 w-4 text-indigo-400" />
            创作新歌曲
          </div>
          <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
            <Input placeholder="歌名（可选）" value={cmdTitle} onChange={(e) => setCmdTitle(e.target.value)} />
            <Input
              placeholder="创作主题与风格描述，如：以米丰的归航为主题，民谣风格，忧伤温暖…"
              value={cmdPrompt}
              onChange={(e) => setCmdPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
            />
            <Button onClick={sendCommand} disabled={sending || !cmdPrompt.trim()}>
              {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              发送指令
            </Button>
          </div>
          {sendResult && (
            <div className="mt-2 rounded-lg bg-muted/50 p-2.5 text-xs">
              {sendResult.error ? (
                <span className="text-destructive">指令失败：{sendResult.error}</span>
              ) : (
                <span>
                  任务 #{sendResult.task?.id} 已创建，交由「{sendResult.agent?.name}」执行（状态：{sendResult.task?.status}）
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        {/* 歌曲列表 */}
        <div className="flex flex-col overflow-hidden rounded-xl border">
          <div className="flex items-center gap-2 border-b px-3 py-2.5 text-xs font-medium text-muted-foreground">
            <ListMusic className="h-3.5 w-3.5" />
            歌曲列表
            <Badge variant="secondary" className="ml-auto px-1.5 text-[10px]">
              {songs.length}
            </Badge>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-1.5">
            {isLoading ? (
              <div className="space-y-1.5 p-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              songs.map((song) => (
                <button
                  key={song.path}
                  onClick={() => setSelected(song.name)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent/60',
                    selected === song.name && 'bg-accent text-accent-foreground',
                  )}
                >
                  <Music className="h-4 w-4 shrink-0 text-indigo-400" />
                  <span className="truncate text-[13px] font-medium">{song.name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 歌曲详情 */}
        <div className="min-h-0 overflow-auto">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              选择左侧歌曲查看详情
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold">{selected}</h2>
                <Badge variant="secondary">Lemong 产物</Badge>
              </div>

              {/* 播放器 */}
              {mp3Node && (
                <Card>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                      <Music className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{mp3Node.name}</div>
                      <audio controls src={api.mediaUrl(mp3Node.path)} className="mt-1.5 h-9 w-full" />
                    </div>
                  </CardContent>
                </Card>
              )}

              <Tabs defaultValue="lyrics" className="w-full">
                <TabsList>
                  <TabsTrigger value="lyrics">歌词</TabsTrigger>
                  <TabsTrigger value="prompt">Prompt</TabsTrigger>
                  <TabsTrigger value="background">创作背景</TabsTrigger>
                </TabsList>
                <TabsContent value="lyrics">
                  {lyricsQuery.isLoading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : lyricsQuery.data?.type === 'text' ? (
                    <MarkdownView content={lyricsQuery.data.content} />
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">暂无歌词</div>
                  )}
                </TabsContent>
                <TabsContent value="prompt">
                  {promptPath && <PromptEditor path={promptPath} />}
                </TabsContent>
                <TabsContent value="background">
                  {backgroundQuery.isLoading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : backgroundQuery.data?.type === 'text' ? (
                    <MarkdownView content={backgroundQuery.data.content} />
                  ) : (
                    <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                      <NotebookPen className="h-4 w-4" />
                      暂无创作背景文档
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
