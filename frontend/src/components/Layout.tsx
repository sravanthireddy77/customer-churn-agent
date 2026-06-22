import { NavLink, Outlet } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bot,
  Boxes,
  ClipboardList,
  Crosshair,
  Gauge,
  Layers3,
  Users,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/customers', label: 'Customer 360', icon: Users },
  { to: '/analyze', label: 'Risk Analyzer', icon: Bot },
  { to: '/', label: 'Campaigns', icon: Crosshair },
  { to: '/tasks', label: 'Approvals', icon: ClipboardList },
  { to: '/batch', label: 'Batch Analysis', icon: Layers3 },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 bg-[#071d35] text-slate-100 lg:flex lg:flex-col">
        <div className="px-7 pb-8 pt-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400 text-[#071d35]">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black leading-5">Customer</p>
              <p className="text-lg font-black leading-5 text-cyan-300">Churn Rescue</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-blue-900/70 text-white before:absolute before:-left-5 before:top-0 before:h-full before:w-1.5 before:bg-cyan-300'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-7 pb-9">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Activity className="h-4 w-4 text-emerald-300" />
              Agent online
            </div>
            <p className="mt-3 text-xs font-bold text-slate-300">AI Agent MVP</p>
            <p className="mt-1 text-xs text-slate-400">Banking / Telecom / SaaS</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#071d35] text-cyan-300">
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-sm font-black leading-4">Customer</span>
                <span className="block text-sm font-black leading-4 text-cyan-600">Churn Rescue</span>
              </div>
            </div>
            <ThemeToggle />
            <nav className="flex w-full gap-1 overflow-x-auto pb-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1380px]">
            <div className="mb-5 hidden justify-end lg:flex">
              <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <Boxes className="h-4 w-4 text-blue-600" />
                Agentic retention workspace
                <ThemeToggle />
              </div>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
