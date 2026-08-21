import { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  FileJson,
  FileAudio,
  FileVideo,
  FileImage,
  File,
  ChevronRight,
} from 'lucide-react';
import { cn, formatSize } from '../../lib/utils';

const EXT_ICONS = {
  md: FileText,
  txt: FileText,
  json: FileJson,
  mp3: FileAudio,
  wav: FileAudio,
  mp4: FileVideo,
  webm: FileVideo,
  jpg: FileImage,
  jpeg: FileImage,
  png: FileImage,
  gif: FileImage,
  webp: FileImage,
  svg: FileImage,
};

function TreeNode({ node, depth, onSelect, selectedPath }) {
  const [open, setOpen] = useState(() => depth === 0 || node.path === 'XujieWriter-data');
  const isDir = node.type === 'dir';
  const isSelected = selectedPath === node.path;

  if (isDir) {
    const Icon = open ? FolderOpen : Folder;
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-accent/60',
            isSelected && 'bg-accent',
          )}
          style={{ paddingLeft: depth * 14 + 8 }}
        >
          <ChevronRight
            className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
          />
          <Icon className="h-4 w-4 shrink-0 text-sky-500" />
          <span className="truncate font-medium">{node.name}</span>
          {node.hasMore && <span className="ml-auto text-[10px] text-muted-foreground">…</span>}
        </button>
        {open && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                onSelect={onSelect}
                selectedPath={selectedPath}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const FileIcon = EXT_ICONS[node.ext?.replace('.', '')] || File;
  return (
    <button
      onClick={() => onSelect(node.path)}
      className={cn(
        'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-accent/60',
        isSelected && 'bg-accent text-accent-foreground',
      )}
      style={{ paddingLeft: depth * 14 + 20 }}
      title={`${node.path} (${formatSize(node.size)})`}
    >
      <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export default function FileTree({ tree = [], onSelect, selectedPath }) {
  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          onSelect={onSelect}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}
