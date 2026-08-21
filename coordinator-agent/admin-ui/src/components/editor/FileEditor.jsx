import { useEffect, useState } from 'react';
import { Pencil, Save, X, Loader2 } from 'lucide-react';
import DataPreview from '../assets/DataPreview';
import { useDataFile, useSaveDataFile } from '../../lib/queries';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Skeleton } from '../ui/skeleton';
import { formatSize } from '../../lib/utils';

/**
 * 文件阅读/编辑组件
 * @param {string} path 相对 data/ 的文件路径
 * @param {boolean} editable 是否允许编辑保存
 */
export default function FileEditor({ path, editable = true }) {
  const { data: file, isLoading } = useDataFile(path);
  const saveMutation = useSaveDataFile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setEditing(false);
    setDraft('');
  }, [path]);

  useEffect(() => {
    if (editing && file?.type === 'text') {
      setDraft(file.content);
    }
  }, [editing, file]);

  if (!path) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        请选择文件
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    );
  }

  const canEdit = editable && file?.type === 'text';

  const save = async () => {
    if (!draft) return;
    await saveMutation.mutateAsync({ path, content: draft });
    setEditing(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{file?.name}</div>
          {file?.size != null && (
            <div className="text-xs text-muted-foreground">{formatSize(file.size)}</div>
          )}
        </div>
        {canEdit && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </Button>
        )}
        {canEdit && editing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5" />
              取消
            </Button>
            <Button size="sm" onClick={save} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              保存
            </Button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {editing ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-full min-h-[400px] resize-none font-mono text-xs leading-relaxed"
          />
        ) : (
          <div className="h-full overflow-auto">
            <DataPreview file={file} />
          </div>
        )}
      </div>
    </div>
  );
}
