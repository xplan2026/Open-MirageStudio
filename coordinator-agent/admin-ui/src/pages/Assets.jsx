import { useState } from 'react';
import { Search, FileSearch, Loader2, X, FolderRoot } from 'lucide-react';
import FileTree from '../components/assets/FileTree';
import DataPreview from '../components/assets/DataPreview';
import { useDataTree, useDataFile, useDataSearch } from '../lib/queries';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { formatSize, basename } from '../lib/utils';

export default function Assets() {
  const [selected, setSelected] = useState('XujieWriter-data/幻觉/INDEX.md');
  const [searchQ, setSearchQ] = useState('');
  const [searchMode, setSearchMode] = useState(false);

  const { data, isLoading } = useDataTree('', 7);
  const fileQuery = useDataFile(selected);
  const searchQuery = useDataSearch(searchQ, searchMode && !!searchQ);

  const openFile = (path) => {
    setSelected(path);
    setSearchMode(false);
  };

  return (
    <div className="flex h-full flex-col gap-0 lg:flex-row">
      {/* 左栏：文件树 / 搜索 */}
      <div className="flex w-full flex-col border-r lg:w-80 lg:shrink-0">
        <div className="space-y-2 border-b p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setSearchMode(true);
              }}
              placeholder="搜索 data/ 目录…"
              className="pl-8 pr-8"
            />
            {searchQ && (
              <button
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchQ('');
                  setSearchMode(false);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {searchMode && searchQ ? (
            searchQuery.isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : searchQuery.data?.results?.length ? (
              <div className="space-y-0.5">
                <div className="px-2 pb-1 text-xs text-muted-foreground">
                  找到 {searchQuery.data.results.length} 处匹配
                </div>
                {searchQuery.data.results.map((r, i) => (
                  <button
                    key={`${r.path}-${r.line}-${i}`}
                    onClick={() => openFile(r.path)}
                    className="flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/60"
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <FileSearch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{basename(r.path)}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">L{r.line}</span>
                    </div>
                    <div className="truncate pl-5 text-[11px] text-muted-foreground">
                      {r.snippet}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">无匹配结果</div>
            )
          ) : isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : data?.tree?.length ? (
            <FileTree tree={data.tree} onSelect={openFile} selectedPath={selected} />
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">data/ 目录为空</div>
          )}
        </div>
      </div>

      {/* 右栏：内容预览 */}
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <FolderRoot className="h-3 w-3" />
            data
          </Badge>
          {selected &&
            selected.split('/').map((seg, i, arr) => (
              <span key={i} className="flex items-center gap-2 text-sm">
                {i > 0 && <span className="text-muted-foreground">/</span>}
                <span className={i === arr.length - 1 ? 'font-medium' : 'text-muted-foreground'}>
                  {seg}
                </span>
              </span>
            ))}
          {fileQuery.data?.size != null && (
            <span className="ml-auto text-xs text-muted-foreground">
              {formatSize(fileQuery.data.size)}
            </span>
          )}
        </div>

        {fileQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : (
          <DataPreview file={fileQuery.data} />
        )}
      </div>
    </div>
  );
}
