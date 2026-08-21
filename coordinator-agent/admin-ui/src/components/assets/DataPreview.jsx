import { AlertCircle, FileText, Music, Clapperboard, Image as ImageIcon } from 'lucide-react';
import { mediaUrl } from '../../api';
import MarkdownView from './MarkdownView';
import { formatSize } from '../../lib/utils';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
const AUDIO_EXTS = ['mp3', 'wav', 'flac', 'm4a', 'ogg'];
const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'mkv'];

/**
 * 数据文件预览 — 根据文件类型自动选择渲染方式
 * file: { name, path, type: 'text'|'binary', content?, ext, mime?, size }
 */
export default function DataPreview({ file }) {
  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        请选择左侧文件查看内容
      </div>
    );
  }

  const ext = (file.ext || '').replace('.', '').toLowerCase();

  if (file.type === 'text') {
    if (ext === 'md' || ext === 'markdown') {
      return <MarkdownView content={file.content} />;
    }
    if (ext === 'json') {
      try {
        return (
          <pre className="overflow-auto rounded-lg bg-muted/50 p-4 font-mono text-xs leading-relaxed">
            {JSON.stringify(JSON.parse(file.content), null, 2)}
          </pre>
        );
      } catch {
        return <pre className="overflow-auto rounded-lg bg-muted/50 p-4 font-mono text-xs">{file.content}</pre>;
      }
    }
    return (
      <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-mono text-xs leading-relaxed">
        {file.content}
      </pre>
    );
  }

  // 二进制媒体
  if (IMAGE_EXTS.includes(ext)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <img
          src={mediaUrl(file.path)}
          alt={file.name}
          className="max-h-[70vh] max-w-full rounded-lg border object-contain shadow"
        />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          {file.name} · {formatSize(file.size)}
        </div>
      </div>
    );
  }

  if (AUDIO_EXTS.includes(ext)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-2">
          <Music className="h-12 w-12 text-indigo-400" />
          <div className="text-sm font-medium">{file.name}</div>
          <div className="text-xs text-muted-foreground">{formatSize(file.size)}</div>
        </div>
        <audio controls src={mediaUrl(file.path)} className="w-full max-w-lg" />
      </div>
    );
  }

  if (VIDEO_EXTS.includes(ext)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clapperboard className="h-4 w-4 text-rose-400" />
          {file.name}
          <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
        </div>
        <video
          controls
          src={mediaUrl(file.path)}
          className="max-h-[70vh] max-w-full rounded-lg border shadow"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <AlertCircle className="h-8 w-8" />
      <div>{file.name}</div>
      <div className="flex items-center gap-1.5 text-xs">
        <FileText className="h-3.5 w-3.5" />
        暂不支持预览此二进制格式（{ext || '未知'}）
      </div>
    </div>
  );
}
