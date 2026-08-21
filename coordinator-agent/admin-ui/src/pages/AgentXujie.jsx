import { useState } from 'react';
import {
  BookOpen,
  Users,
  Brain,
  Map,
  ScrollText,
  GitBranch,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import ChapterPanel from '../components/xujie/ChapterPanel';
import CharacterPanel from '../components/xujie/CharacterPanel';
import NotesPanel from '../components/xujie/NotesPanel';
import FileEditor from '../components/editor/FileEditor';
import { useXujieSkills } from '../lib/queries';

/**
 * Xujie Writer Agent 工作台
 *  - 章节修改联动（2.5）：意见 → 执行 → 蝴蝶效应 → 确认
 *  - 角色素材（2.3）：角色卡编辑 + 主时间线 + 联动分析
 *  - 思想笔记（2.4）：CRUD + 标签 + 演化追踪
 *  - 大纲与设定 / 工作日志：直接文件编辑
 */
export default function AgentXujie() {
  const { data: skills } = useXujieSkills();
  const skillCount = skills?.skills?.length || 10;
  const [outline, setOutline] = useState('XujieWriter-data/幻觉/.novel/outline/outline.md');
  const [log, setLog] = useState('XujieWriter-data/工作日志/2026-08-12.md');

  return (
    <div className="flex h-full flex-col p-4 lg:p-6">
      <div className="mb-3 flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-indigo-400" />
        <span className="text-sm font-medium">Xujie Writer 创作工作台</span>
        <Badge variant="secondary" className="px-1.5 text-[10px]">
          {skillCount} Skill 已接入
        </Badge>
      </div>

      <Tabs defaultValue="chapters" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mb-3 w-fit flex-wrap">
          <TabsTrigger value="chapters">
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            章节修改联动
          </TabsTrigger>
          <TabsTrigger value="characters">
            <Users className="mr-1.5 h-3.5 w-3.5" />
            角色素材
          </TabsTrigger>
          <TabsTrigger value="reflections">
            <Brain className="mr-1.5 h-3.5 w-3.5" />
            思想笔记
          </TabsTrigger>
          <TabsTrigger value="outline">
            <Map className="mr-1.5 h-3.5 w-3.5" />
            大纲与设定
          </TabsTrigger>
          <TabsTrigger value="logs">
            <ScrollText className="mr-1.5 h-3.5 w-3.5" />
            工作日志
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chapters" className="min-h-0 flex-1">
          <ChapterPanel />
        </TabsContent>

        <TabsContent value="characters" className="min-h-0 flex-1">
          <CharacterPanel />
        </TabsContent>

        <TabsContent value="reflections" className="min-h-0 flex-1">
          <NotesPanel />
        </TabsContent>

        <TabsContent value="outline" className="min-h-0 flex-1">
          <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
            <div className="flex h-full flex-col gap-3 rounded-xl border bg-card p-2">
              <button
                onClick={() => setOutline('XujieWriter-data/幻觉/.novel/outline/outline.md')}
                className={cn(
                  'rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent/60',
                  outline === 'XujieWriter-data/幻觉/.novel/outline/outline.md' && 'bg-accent',
                )}
              >
                大纲 (outline.md)
              </button>
              <button
                onClick={() => setOutline('XujieWriter-data/幻觉/.novel/outline/volume-01-chapter-plan.md')}
                className={cn(
                  'rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent/60',
                  outline === 'XujieWriter-data/幻觉/.novel/outline/volume-01-chapter-plan.md' && 'bg-accent',
                )}
              >
                卷一章节计划
              </button>
              <button
                onClick={() => setOutline('XujieWriter-data/幻觉/.novel/worldbuilding/world.md')}
                className={cn(
                  'rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent/60',
                  outline === 'XujieWriter-data/幻觉/.novel/worldbuilding/world.md' && 'bg-accent',
                )}
              >
                世界观 (world.md)
              </button>
            </div>
            <FileEditor key={outline} path={outline} />
          </div>
        </TabsContent>

        <TabsContent value="logs" className="min-h-0 flex-1">
          <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
            <div className="flex h-full flex-col gap-3 rounded-xl border bg-card p-2">
              {['2026-08-12.md', '2026-08-11.md', '2026-08-10.md'].map((f) => (
                <button
                  key={f}
                  onClick={() => setLog(`XujieWriter-data/工作日志/${f}`)}
                  className={cn(
                    'rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-accent/60',
                    log === `XujieWriter-data/工作日志/${f}` && 'bg-accent',
                  )}
                >
                  {f.replace('.md', '')}
                </button>
              ))}
            </div>
            <FileEditor key={log} path={log} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
