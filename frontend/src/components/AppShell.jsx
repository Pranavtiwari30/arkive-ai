import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Shield, MessageSquare, CheckSquare, BarChart, 
  Users, Folder, ShieldAlert, History, LogOut, Plus 
} from 'lucide-react';

const navItems = [
  { path: '/', icon: MessageSquare, label: 'Chat' },
  { path: '/compliance', icon: CheckSquare, label: 'Compliance Check', badge: 'New' },
  { path: '/risk-tier', icon: BarChart, label: 'Risk Tier Analysis' },
  { path: '/role', icon: Users, label: 'Role Classification' },
  { path: '/documents', icon: Folder, label: 'Documents' },
  { path: '/red-team', icon: ShieldAlert, label: 'Red Team' },
];

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar - hidden on mobile */}
      <aside className="hidden md:flex flex-col w-64 px-5 py-7 bg-black">
        
        {/* Top logo row */}
        <div className="flex items-center gap-3 mb-10 pl-2">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-foreground text-background flex items-center justify-center">
            <Shield size={20} strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-xl tracking-tight leading-tight">Arkive AI</span>
            <span className="text-[10px] uppercase text-muted-foreground tracking-[0.2em] leading-tight">
              Compliance Intelligence
            </span>
          </div>
        </div>

        {/* Workspace section */}
        <div className="flex-1 overflow-y-auto">
          <div className="mb-8">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 pl-3">Workspace</h3>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      isActive 
                        ? 'bg-gradient-to-r from-[oklch(0.5_0.2_310/0.35)] to-transparent text-foreground gold-glow' 
                        : 'text-muted-foreground hover:bg-[oklch(0.4_0.15_300/0.25)] hover:text-foreground'
                    }`}
                  >
                    <item.icon 
                      size={16} 
                      strokeWidth={1.7} 
                      className={isActive ? 'text-gold' : ''} 
                    />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] bg-gold-soft/30 px-2 py-0.5 rounded-full text-gold">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* History section */}
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 pl-3">History</h3>
            <nav className="flex flex-col gap-1">
              <NavLink
                to="/audit-logs"
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive 
                    ? 'bg-gradient-to-r from-[oklch(0.5_0.2_310/0.35)] to-transparent text-foreground gold-glow' 
                    : 'text-muted-foreground hover:bg-[oklch(0.4_0.15_300/0.25)] hover:text-foreground'
                }`}
              >
                <History size={16} strokeWidth={1.7} className={location.pathname === '/audit-logs' ? 'text-gold' : ''} />
                <span>Audit Logs</span>
              </NavLink>
            </nav>
          </div>
        </div>

        {/* Bottom user row */}
        <div className="mt-auto flex items-center gap-3 rounded-2xl bg-[oklch(0.18_0.03_290/0.5)] px-3 py-2.5 hairline">
          <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-primary to-[oklch(0.5_0.22_280)] flex items-center justify-center text-white text-[13px] font-semibold select-none">
            J
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[13px] font-medium truncate leading-tight">john</span>
            <span className="text-[11px] text-muted-foreground truncate leading-tight">test12345@gmail.com</span>
          </div>
          <button
            onClick={() => navigate('/auth')}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-[oklch(1_0_0/0.06)] transition-all shrink-0"
            title="Sign out"
          >
            <LogOut size={14} strokeWidth={1.8} />
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <main className="aurora-canvas flex-1 flex flex-col min-w-0 relative h-[100dvh] md:h-[calc(100vh-2rem)] md:my-4 md:mr-4 md:ml-0 md:rounded-2xl overflow-hidden soft-shadow">
        {/* Top-right button container */}
        <div className="absolute top-7 right-6 lg:right-10 z-10 hidden md:block">
          <button 
            onClick={() => {
              if (location.pathname !== '/') navigate('/');
              window.dispatchEvent(new Event('new-chat'));
            }}
            className="bg-foreground text-background rounded-xl px-3.5 py-2 text-sm flex items-center gap-2 gold-glow font-medium hover:bg-[oklch(0.9_0.01_300)] transition-colors"
          >
            <Plus size={16} strokeWidth={2} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Content container */}
        <div className={`flex-1 w-full px-6 lg:px-10 py-7 md:pt-24 pb-20 ${location.pathname === '/' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto hide-scrollbar'}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
