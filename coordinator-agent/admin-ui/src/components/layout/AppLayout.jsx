import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut, Moon, Sun } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '../ui/sheet';
import { Button } from '../ui/button';
import { SidebarNav, SidebarBrand } from './Sidebar';

const PAGE_TITLES = {
  '/': { title: '工作台', desc: 'Mirage Studio 创作总览' },
  '/chat': { title: 'AI 对话', desc: '与 Coordinator 对话，发起创作任务' },
  '/assets': { title: '产物浏览器', desc: '浏览各 Agent 的构建产物' },
  '/xujie': { title: 'Xujie Writer', desc: '《幻觉》小说创作工作台' },
  '/zhupu': { title: 'Zhupu 族谱管家', desc: '家族关系可视化与角色查询' },
  '/lemong': { title: 'Lemong 音乐创作', desc: 'AI 歌曲创作与产物管理' },
  '/erhu': { title: 'Erhu 二虎 MV 制作', desc: '数字人歌手 MV 产物管理' },
  '/tasks': { title: '任务编排', desc: '创作任务的编排与状态管理' },
  '/agents': { title: 'Agent 状态', desc: '各 Agent 运行状态监控' },
  '/logs': { title: '系统日志', desc: 'Coordinator 运行日志' },
};

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('mirage-theme') || 'dark');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('mirage-theme', theme);
  }, [theme]);

  const meta = PAGE_TITLES[location.pathname] || { title: 'Mirage Studio', desc: '' };

  const logout = () => {
    localStorage.removeItem('coordinator_jwt');
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 桌面端固定侧边栏 */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <SidebarBrand />
        <SidebarNav />
        <div className="border-t p-3">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={logout}>
            <LogOut className="h-4 w-4" />
            退出登录
          </Button>
        </div>
      </aside>

      {/* 移动端 Sheet 侧边栏 */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">导航菜单</SheetTitle>
          <div className="flex h-full flex-col">
            <SidebarBrand />
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
            <div className="border-t p-3">
              <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={logout}>
                <LogOut className="h-4 w-4" />
                退出登录
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 主内容区 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 顶部栏 */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{meta.title}</h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{meta.desc}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
