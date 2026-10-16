import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search, Calendar, ChevronDown, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { NotificationDropdown } from '../common/NotificationDropdown';
import { DemoScenarioWalkthrough } from '../demo/DemoScenarioWalkthrough';

interface HeaderProps {
  onMenuToggle: () => void;
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Executive Overview', subtitle: 'Real-time project health, corrective hours & rework deductions' },
  '/projects': { title: 'Projects & Modules', subtitle: 'Manage client deliverables, module lifecycles & reopen status' },
  '/tasks': { title: 'Task Management', subtitle: 'Track feature delivery, completion handoffs & reopened items' },
  '/bugs': { title: 'Defect Tracking & Classification', subtitle: 'Classify bugs and determine delivery attribution for payroll' },
  '/time': { title: 'Time Tracking', subtitle: 'Strict separation of regular development vs corrective maintenance' },
  '/approvals': { title: 'Time Log Approvals', subtitle: 'Verify and authorize engineering logs and rework attribution' },
  '/payroll': { title: 'Payroll & Rework Deductions', subtitle: 'Policy-based deduction calculations, monthly grace & net payouts' },
  '/reports': { title: 'Analytics & Quality Metrics', subtitle: 'Attribution trends, reopen rates and employee quality scores' },
  '/audit': { title: 'Immutable Audit Trail', subtitle: 'Complete chronological history of approvals, deliveries & classifications' },
  '/settings': { title: 'System & Policy Settings', subtitle: 'Configure deduction rates, salary caps, grace hours & roles' },
};

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const location = useLocation();
  const { selectedMonth, setSelectedMonth, searchQuery, setSearchQuery } = useApp();
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  const currentMeta = PAGE_TITLES[location.pathname] || {
    title: 'ReworkGuard',
    subtitle: 'Rework-Aware Task Tracking and Payroll Management System',
  };

  const months = [
    { value: '2026-11', label: 'November 2026 (Upcoming)' },
    { value: '2026-10', label: 'October 2026 (Active)' },
    { value: '2026-09', label: 'September 2026 (Closed)' },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shadow-2xs">
        {/* Left: Mobile hamburger + Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">
              {currentMeta.title}
            </h1>
            <p className="hidden lg:block text-xs text-slate-500 truncate -mt-0.5">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Search, Demo, Month selector, Notifications, Profile/Role switcher */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Global Search */}
          <div className="relative hidden xl:block w-48 lg:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, bugs, modules..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* E2E Demo Walkthrough Trigger */}
          <button
            onClick={() => setIsDemoOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs hover:shadow transition-all"
            title="Priya Sharma E2E Rework Lifecycle Scenario Walkthrough"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
            <span className="hidden sm:inline">Priya E2E Demo</span>
          </button>

          {/* Selected Month Filter */}
          <div className="relative">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-2xs cursor-pointer">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notifications */}
          <NotificationDropdown />

          {/* Role & Persona Switcher */}
          <RoleSwitcher />
        </div>
      </header>

      {/* Demo Walkthrough Modal */}
      <DemoScenarioWalkthrough 
        isOpen={isDemoOpen} 
        onClose={() => setIsDemoOpen(false)} 
      />
    </>
  );
};
