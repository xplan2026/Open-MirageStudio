import { useMemo, useState } from 'react';
import {
  Clapperboard,
  Send,
  Loader2,
  Image as ImageIcon,
  Film,
  ListVideo,
  Mic2,
} from 'lucide-react';
import { useDataTree } from '../lib/queries';
import { api } from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../components/ui/dialog';
import { cn } from '../lib/utils';

/** 从文件树中提取 MV 目录（含 .mp4 的目录） */
function extractMVs(tree, mvs = []) {
  for (const node of tree || []) {
    if (node.type === 'dir') {
      const hasMp4 = (node.children || []).some((c) => c.type === 'file' && c.ext === '.mp4');
      if (hasMp4) mvs.push(node);
      else extractMVs(node.children, mvs);
    }
  }
  return mvs;
}

export default function AgentErhu() {
  const { data: treeData, isLoading } = useDataTree('Erhu-data', 3);
  const mvs = useMemo(() => extractMVs(treeData?.tree), [treeData]);
  const [selected, setSelected] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  // 制作指令
  const [cmdPrompt, setCmdPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const mv = selected ? mvs.find((m) => m.name === selected) : null;
  const mp4 = mv?.children?.find((c) => c.type === 'file' && c.ext === '.mp4');
  const mp3 = mv?.children?.find((c) => c.type === 'file' && c.ext === '.mp3');
  const images = mv?.children?.find((c) => c.type === 'dir' && c.name === 'images')?.children || [];

  const sendCommand = async () => {
    if (!cmdPrompt.trim() || sending) return;
    setSending(true);
    setSendResult(null);
    try {
      const message = `为${selected ? `《${selected}》` : '歌曲'}制作一支 MV。${cmdPrompt.trim()}`;
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
      {/* 制作指令 */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Film className="h-4 w-4 text-rose-400" />
            制作 / 更新 MV
          </div>
          <div className="flex gap-3">
            <Input
              placeholder="输入 MV 制作指令，如：以归航为主题，结合画面分镜，制作 3 分钟 MV…"
              value={cmdPrompt}
              onChange={(e) => setCmdPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
            />
            <Button onClick={sendCommand} disabled={sending || !cmdPrompt.trim()}>
              {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              发送
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
        {/* MV 列表 */}
        <div className="flex flex-col overflow-hidden rounded-xl border">
          <div className="flex items-center gap-2 border-b px-3 py-2.5 text-xs font-medium text-muted-foreground">
            <ListVideo className="h-3.5 w-3.5" />
            MV 作品
            <Badge variant="secondary" className="ml-auto px-1.5 text-[10px]">
              {mvs.length}
            </Badge>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-1.5">
            {isLoading ? (
              <div className="space-y-1.5 p-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              mvs.map((mv) => (
                <button
                  key={mv.path}
                  onClick={() => setSelected(mv.name)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent/60',
                    selected === mv.name && 'bg-accent text-accent-foreground',
                  )}
                >
                  <Clapperboard className="h-4 w-4 shrink-0 text-rose-400" />
                  <span className="truncate text-[13px] font-medium">{mv.name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* MV 详情 */}
        <div className="min-h-0 overflow-auto">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              选择左侧 MV 作品查看详情
            </div>
          ) : !mv ? (
            <div className="p-8 text-center text-sm text-muted-foreground">作品未找到</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold">{selected}</h2>
                <Badge variant="secondary" className="gap-1">
                  <Mic2 className="h-3 w-3" />
                  Erhu 二虎
                </Badge>
              </div>

              {/* 视频播放 */}
              {mp4 ? (
                <Card>
                  <CardContent className="p-3">
                    <video
                      controls
                      src={api.mediaUrl(mp4.path)}
                      className="max-h-[55vh] w-full rounded-lg bg-black"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
                      <Film className="h-3.5 w-3.5" />
                      {mp4.name}
                      {mp3 && (
                        <>
                          <span className="mx-1">·</span>
                          <audio controls src={api.mediaUrl(mp3.path)} className="h-7 w-48" />
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  该作品暂无 MP4 视频文件
                </div>
              )}

              {/* 图片素材画廊 */}
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ImageIcon className="h-4 w-4 text-emerald-400" />
                  图片素材
                  <Badge variant="secondary" className="px-1.5 text-[10px]">
                    {images.length}
                  </Badge>
                </div>
                {images.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    暂无图片素材
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {images.map((img) => (
                      <button
                        key={img.path}
                        onClick={() => setLightbox(img.path)}
                        className="group relative aspect-video overflow-hidden rounded-lg border"
                      >
                        <img
                          src={api.mediaUrl(img.path)}
                          alt={img.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 图片放大 */}
      <Dialog open={!!lightbox} onOpenChange={(v) => !v && setLightbox(null)}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="sr-only">图片预览</DialogTitle>
          {lightbox && (
            <img src={api.mediaUrl(lightbox)} alt={lightbox} className="max-h-[75vh] w-full object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
