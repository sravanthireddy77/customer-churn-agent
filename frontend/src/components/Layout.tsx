import { NavLink, Outlet } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bot,
  ClipboardList,
  Gauge,
  Layers3,
  SearchCheck,
  Users,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { to: '/', label: 'Agent', icon: Bot },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/analyze', label: 'Analyze', icon: SearchCheck },
  { to: '/batch', label: 'Batch', icon: Layers3 },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-700">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-600 text-white">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Churn Rescue</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">AI Agent Console</p>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-cyan-50 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-600 text-white">
                <Gauge className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold">Churn Rescue</span>
            </div>
            <div className="hidden items-center gap-2 text-sm text-slate-500 dark:text-slate-400 lg:flex">
              <Activity className="h-4 w-4 text-cyan-700 dark:text-cyan-500" />
              Agentic retention workspace
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
            </div>
            <nav className="flex gap-1 lg:hidden">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `rounded-lg p-2 ${
                      isActive
                        ? 'bg-cyan-50 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
                        : 'text-slate-500 dark:text-slate-400'
                    }`
                  }
                  aria-label={item.label}
                >
                  <item.icon className="h-4 w-4" />
                </NavLink>
              ))}
            </nav>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
