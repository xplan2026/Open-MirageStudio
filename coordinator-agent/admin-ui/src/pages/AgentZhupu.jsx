import { useMemo, useState } from 'react';
import {
  Network,
  Search,
  User,
  UserRound,
  Users,
  Heart,
  Baby,
  ArrowUpDown,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useDataFile } from '../lib/queries';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { cn } from '../lib/utils';

const FAMILIES = ['米家', '李家', '杨家', '何家', '于家'];

function MemberCard({ member, nameOf }) {
  return (
    <Card className="min-w-[160px] transition-colors hover:border-indigo-500/40">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white',
              member.gender === '女' ? 'bg-rose-500' : 'bg-indigo-500',
            )}
          >
            {member.gender === '女' ? <UserRound className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{member.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {member.birth || '?'} — {member.death || '今'}
            </div>
          </div>
        </div>
        {member.title && (
          <div className="mt-1.5 truncate text-[11px] text-muted-foreground">{member.title}</div>
        )}
        {member.spouse?.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Heart className="h-3 w-3 shrink-0 text-rose-400" />
            <span className="truncate">{member.spouse.map(nameOf).filter(Boolean).join('、')}</span>
          </div>
        )}
        {member.children?.length > 0 && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Baby className="h-3 w-3 shrink-0 text-sky-400" />
            <span className="truncate">{member.children.map(nameOf).filter(Boolean).join('、')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AgentZhupu() {
  const [family, setFamily] = useState('米家');
  const [query, setQuery] = useState('');
  const familyQuery = useDataFile(`Zhupu-data/${family}/族谱.json`);
  const graphQuery = useDataFile('Zhupu-data/graph/跨家族联姻图.json');

  const data = useMemo(() => {
    const file = familyQuery.data;
    if (!file || file.type !== 'text') return null;
    try {
      return JSON.parse(file.content);
    } catch {
      return null;
    }
  }, [familyQuery.data]);

  const nameOf = useMemo(() => {
    const byId = {};
    for (const m of Object.values(data?.members || {})) byId[m.id] = m;
    return (id) => byId[id]?.name || id;
  }, [data]);

  const generations = useMemo(() => {
    const map = new Map();
    for (const m of Object.values(data?.members || {})) {
      const gen = m.generation || 1;
      if (!map.has(gen)) map.set(gen, []);
      map.get(gen).push(m);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    return Object.values(data?.members || {}).filter((m) =>
      [m.name, m.title, m.notes, m.style_name].filter(Boolean).some((v) => v.includes(q)),
    );
  }, [data, query]);

  // 跨家族联姻图摘要
  const graphSummary = useMemo(() => {
    const file = graphQuery.data;
    if (!file || file.type !== 'text') return null;
    try {
      return JSON.parse(file.content);
    } catch {
      return null;
    }
  }, [graphQuery.data]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:p-6">
      {/* 家族切换 */}
      <div className="flex flex-wrap items-center gap-2">
        <Network className="h-4 w-4 text-indigo-400" />
        <span className="text-sm font-medium">选择家族：</span>
        {FAMILIES.map((f) => (
          <button
            key={f}
            onClick={() => setFamily(f)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              family === f
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                : 'hover:bg-accent/60',
            )}
          >
            {f}
          </button>
        ))}
        <div className="relative ml-auto w-56">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索角色…"
            className="pl-8"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {familyQuery.isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !data ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            族谱数据加载失败或格式不正确
          </div>
        ) : (
          <div className="space-y-6">
            {/* 家族简介 */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold">{data.family_name}</h2>
                <Badge variant="info">{data.members ? Object.keys(data.members).length : 0} 位成员</Badge>
                {data.culture?.motto && (
                  <Badge variant="secondary" className="max-w-full truncate">
                    家训：{data.culture.motto}
                  </Badge>
                )}
              </div>
              {data.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {data.description}
                </p>
              )}
            </div>

            {/* 查询结果 */}
            {filtered ? (
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Search className="h-4 w-4" />
                  查询「{query}」：{filtered.length} 位角色
                </div>
                {filtered.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">未找到匹配角色</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((m) => (
                      <MemberCard key={m.id} member={m} nameOf={nameOf} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* 世代可视化 */
              <div className="space-y-8">
                {generations.map(([gen, members]) => (
                  <div key={gen}>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold">
                        {data.generation_names?.[String(gen)] || `第 ${gen} 世`}
                      </span>
                      <Badge variant="secondary" className="px-1.5 text-[10px]">
                        {members.length} 人
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 pl-9">
                      {members.map((m) => (
                        <MemberCard key={m.id} member={m} nameOf={nameOf} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 跨家族联姻图摘要 */}
      {graphSummary && (
        <div className="shrink-0 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-emerald-400" />
            {graphSummary.graph_name || '跨家族联姻图'}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {graphSummary.description || graphSummary.novel_context?.main_line}
          </p>
        </div>
      )}
    </div>
  );
}
