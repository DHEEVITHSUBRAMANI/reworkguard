import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { ShieldCheck, Lock, Mail, User, AlertCircle, CheckCircle2, DollarSign, Briefcase, Code2, Shield } from 'lucide-react';
import { UserRole } from '../../types';
import { cn } from '../../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { switchUser, users } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const demoAccounts = [
    {
      roleName: 'Finance Admin',
      name: 'Alex Rivera',
      email: 'alex.rivera@reworkguard.io',
      role: 'finance_admin' as UserRole,
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
      roleName: 'Engineering Manager',
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@reworkguard.io',
      role: 'manager' as UserRole,
      icon: Briefcase,
      color: 'text-purple-600 bg-purple-50 border-purple-200'
    },
    {
      roleName: 'Team Lead',
      name: 'David Chen',
      email: 'david.chen@reworkguard.io',
      role: 'team_lead' as UserRole,
      icon: Shield,
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
      roleName: 'Software Engineer',
      name: 'Elena Rostova',
      email: 'elena.rostova@reworkguard.io',
      role: 'employee' as UserRole,
      icon: Code2,
      color: 'text-slate-600 bg-slate-50 border-slate-200'
    }
  ];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await authApi.signInWithEmail(email, password || 'Demo1234!');
    setLoading(false);

    if ('error' in res) {
      setError(res.error);
    } else {
      switchUser(res.profile.id);
      setSuccess(`Signed in successfully as ${res.profile.full_name}`);
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1000);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await authApi.signUpWithEmail(email, password, fullName, selectedRole);
    setLoading(false);

    if ('error' in res) {
      setError(res.error);
    } else {
      switchUser(res.profile.id);
      setSuccess(`Account created for ${res.profile.full_name}`);
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1000);
    }
  };

  const handleSelectDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('DemoPass2026!');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tab === 'signin' ? 'Sign In to ReworkGuard' : 'Create ReworkGuard Account'}
      description="Enterprise authentication with role-based governance & security."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Tab selection */}
        <div className="flex border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => { setTab('signin'); setError(null); }}
            className={cn(
              'pb-2 px-4 border-b-2 transition-colors',
              tab === 'signin'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('signup'); setError(null); }}
            className={cn(
              'pb-2 px-4 border-b-2 transition-colors',
              tab === 'signup'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@reworkguard.io"
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <Button type="submit" size="sm" className="w-full mt-2" loading={loading}>
              Sign In
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@reworkguard.io"
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Organizational Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="employee">Software Engineer</option>
                <option value="team_lead">Team Lead</option>
                <option value="manager">Engineering Manager</option>
                <option value="finance_admin">Finance Administrator</option>
              </select>
            </div>

            <Button type="submit" size="sm" className="w-full mt-2" loading={loading}>
              Create Account
            </Button>
          </form>
        )}

        {/* Demo Accounts Quick-Select */}
        <div className="pt-3 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Or Click a Demo Persona to Test:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => handleSelectDemo(d.email)}
                  className="p-2 text-left border rounded-lg hover:border-slate-400 transition-all text-xs bg-slate-50/50 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                    <Icon className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                    <span className="truncate">{d.roleName}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{d.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
