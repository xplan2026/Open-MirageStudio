import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  MessageCircle,
  PenLine,
  Network,
  Music,
  Clapperboard,
  FolderTree,
  ListTodo,
  Activity,
  ScrollText,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';

const NAV_SECTIONS = [
  {
    title: '概览',
    items: [
      { to: '/', label: '工作台', icon: LayoutDashboard, end: true },
      { to: '/chat', label: 'AI 对话', icon: MessageSquare },
      { to: '/wechat', label: '微信对话', icon: MessageCircle },
    ],
  },
  {
    title: '创作 Agent',
    items: [
      { to: '/xujie', label: 'Xujie Writer', icon: PenLine, desc: '小说创作' },
      { to: '/zhupu', label: 'Zhupu 族谱', icon: Network, desc: '角色族谱' },
      { to: '/lemong', label: 'Lemong', icon: Music, desc: '音乐创作' },
      { to: '/erhu', label: 'Erhu 二虎', icon: Clapperboard, desc: 'MV 制作' },
    ],
  },
  {
    title: '产物',
    items: [{ to: '/assets', label: '产物浏览器', icon: FolderTree }],
  },
  {
    title: '系统',
    items: [
      { to: '/tasks', label: '任务编排', icon: ListTodo },
      { to: '/agents', label: 'Agent 状态', icon: Activity },
      { to: '/logs', label: '系统日志', icon: ScrollText },
    ],
  },
];

export function SidebarNav({ onNavigate }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="mb-1 px-3 text-xs font-medium text-muted-foreground">
            {section.title}
          </div>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <Badge variant="info" className="px-1.5 py-0 text-[10px]">
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-2.5 border-b px-6 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-bold">Mirage Studio</div>
        <div className="text-[11px] text-muted-foreground">大副工作台</div>
      </div>
    </div>
  );
}
