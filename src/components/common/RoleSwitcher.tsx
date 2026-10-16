import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { ChevronDown, Shield, Check, UserCircle, Briefcase, DollarSign, Code2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AuthModal } from '../auth/AuthModal';

export const RoleSwitcher: React.FC = () => {
  const { currentUser, users, switchUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'finance_admin':
        return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'manager':
        return <Briefcase className="w-4 h-4 text-purple-500" />;
      case 'team_lead':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'employee':
        return <Code2 className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'finance_admin':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'manager':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'team_lead':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'employee':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatRoleName = (role: UserRole) => {
    switch (role) {
      case 'finance_admin': return 'Finance Admin';
      case 'manager': return 'Engineering Manager';
      case 'team_lead': return 'Team Lead';
      case 'employee': return 'Software Engineer';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 pl-2 pr-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left bg-white shadow-2xs"
      >
        <div className="relative">
          <img
            src={currentUser.avatar_url}
            alt={currentUser.full_name}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>
        <div className="hidden sm:block text-xs">
          <div className="font-semibold text-slate-900 leading-tight">{currentUser.full_name}</div>
          <div className="text-slate-500 text-[11px] leading-tight flex items-center gap-1 mt-0.5">
            <span className={cn('px-1.5 py-0.2 rounded text-[10px] font-medium border', getRoleBadge(currentUser.role))}>
              {formatRoleName(currentUser.role)}
            </span>
          </div>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform duration-150', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Switch Persona & Role</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Test role-specific workflows and security boundaries.</p>
          </div>

          <div className="py-1 max-h-72 overflow-y-auto">
            {users.map((user) => {
              const isSelected = user.id === currentUser.id;
              return (
                <button
                  key={user.id}
                  onClick={() => {
                    switchUser(user.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors',
                    isSelected && 'bg-blue-50/70'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-900 truncate flex items-center gap-1.5">
                        {user.full_name}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        {getRoleIcon(user.role)}
                        <span className="capitalize">{formatRoleName(user.role)}</span>
                        <span className="text-slate-300">•</span>
                        <span>${user.hourly_rate}/hr</span>
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Base Salary: ${(currentUser.base_monthly_salary ?? 0).toLocaleString()}</span>
            <span>Rate: ${currentUser.hourly_rate ?? 0}/hr</span>
          </div>

          <div className="p-2 border-t border-slate-100">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsAuthModalOpen(true);
              }}
              className="w-full py-1.5 px-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Sign In with Email / Supabase Auth
            </button>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};
