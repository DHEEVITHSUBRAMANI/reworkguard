import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Bell, 
  CheckCheck, 
  ExternalLink, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Bug,
  RotateCcw,
  Receipt,
  Clock,
  Filter
} from 'lucide-react';
import { formatDateTime, cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export const NotificationDropdown: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter notifications for this user or 'all'
  const userNotifications = notifications.filter(
    n => n.user_id === 'all' || n.user_id === currentUser.id
  );

  const unreadCount = userNotifications.filter(n => !n.read).length;

  const displayedNotifications = userNotifications.filter(n => {
    if (filterMode === 'unread') return !n.read;
    return true;
  });

  const getCategoryBadge = (title: string, message: string) => {
    const text = `${title} ${message}`.toLowerCase();
    if (text.includes('payroll') || text.includes('deduction')) {
      return (
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
          Payroll
        </span>
      );
    }
    if (text.includes('reopen') || text.includes('rework')) {
      return (
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
          Reopened
        </span>
      );
    }
    if (text.includes('defect') || text.includes('bug') || text.includes('classified')) {
      return (
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
          Defect
        </span>
      );
    }
    if (text.includes('approved') || text.includes('authorized')) {
      return (
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
          Approved
        </span>
      );
    }
    return (
      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
        System
      </span>
    );
  };

  const getIcon = (type: string, title: string) => {
    const text = title.toLowerCase();
    if (text.includes('defect') || text.includes('bug')) {
      return <Bug className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />;
    }
    if (text.includes('reopen')) {
      return <RotateCcw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
    }
    if (text.includes('payroll')) {
      return <Receipt className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />;
    }

    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
      case 'danger':
        return <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
    }
  };

  const handleNotificationClick = (n: typeof notifications[0]) => {
    markNotificationRead(n.id);
    if (n.link) {
      setIsOpen(false);
      navigate(n.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/60 bg-white shadow-2xs"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Notifications</h4>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Toggle: All vs Unread */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1">
            <button
              onClick={() => setFilterMode('all')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors',
                filterMode === 'all'
                  ? 'bg-white text-slate-800 shadow-2xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              All ({userNotifications.length})
            </button>
            <button
              onClick={() => setFilterMode('unread')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors',
                filterMode === 'unread'
                  ? 'bg-white text-slate-800 shadow-2xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {displayedNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {filterMode === 'unread' ? 'No unread notifications' : 'No notifications right now'}
              </div>
            ) : (
              displayedNotifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    'p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer',
                    !n.read && 'bg-blue-50/40'
                  )}
                >
                  {getIcon(n.type, n.title)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{n.title}</p>
                        {getCategoryBadge(n.title, n.message)}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatDateTime(n.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>

                    {n.link && (
                      <div className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold mt-1.5">
                        <span>Inspect Record</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
