import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderGit2, 
  CheckSquare, 
  Bug, 
  Clock, 
  CheckCircle2, 
  Receipt, 
  BarChart3, 
  History, 
  Settings, 
  ShieldCheck,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { timeLogs, bugs } = useApp();
  const { isEmployee, canApproveTime } = useAuth();

  // Pending approval count
  const pendingApprovalsCount = timeLogs.filter(l => l.approval_status === 'pending').length;
  // Open / critical bug count
  const openBugsCount = bugs.filter(b => b.status === 'open' || b.status === 'in_fix').length;

  const navItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Projects & Modules', path: '/projects', icon: FolderGit2 },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare },
    { 
      label: 'Bug Reports', 
      path: '/bugs', 
      icon: Bug, 
      badge: openBugsCount > 0 ? openBugsCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    },
    { label: 'Time Tracking', path: '/time', icon: Clock },
    { 
      label: 'Approvals', 
      path: '/approvals', 
      icon: CheckCircle2, 
      badge: canApproveTime && pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    { label: 'Payroll', path: '/payroll', icon: Receipt },
    { label: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    { label: 'Audit Trail', path: '/audit', icon: History },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] border-r border-[#1E293B] text-slate-300 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Logo & Title */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#1E293B] bg-[#0c1322]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white tracking-tight text-base leading-none">
                Rework<span className="text-blue-400">Guard</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">
                Quality & Payroll SaaS
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Main Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    onClose();
                  }
                }}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 transition-colors" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                      item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom policy indicator & version */}
        <div className="p-3 border-t border-[#1E293B] bg-[#0c1322]">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
            <div className="flex items-center justify-between text-slate-300 font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Policy
              </span>
              <span className="text-blue-400 font-mono text-[10px]">100% Rate</span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Monthly Grace: 2.0h</span>
              <span>Cap: 15% Salary</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
