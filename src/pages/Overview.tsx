import React from 'react';
import { 
  FolderGit2, 
  PackageCheck, 
  RotateCcw, 
  ClockAlert, 
  Clock, 
  TrendingDown, 
  ShieldAlert, 
  PiggyBank, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatHours, formatDateTime, cn } from '../lib/utils';
import { Badge } from '../components/common/Badge';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export const Overview: React.FC = () => {
  const { 
    projects, 
    modules, 
    tasks, 
    bugs, 
    timeLogs, 
    payrollRecords, 
    auditLogs, 
    selectedMonth 
  } = useApp();
  const { currentUser, users } = useAuth();

  // Metrics calculations
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const deliveredModules = modules.filter(m => m.status === 'delivered' || m.delivered_at).length;
  
  // Reopened modules this month
  const reopenedModules = modules.filter(m => m.status === 'reopened').length;
  const totalCompletedOrDelivered = modules.filter(m => m.status === 'delivered' || m.status === 'reopened' || m.status === 'closed').length;
  const reopenRate = totalCompletedOrDelivered > 0 
    ? Math.round((modules.filter(m => (m.reopen_count || 0) > 0).length / totalCompletedOrDelivered) * 100) 
    : 0;

  // Time logs metrics
  const approvedCorrectiveHours = timeLogs
    .filter(l => l.log_type === 'corrective_maintenance' && l.approval_status === 'approved')
    .reduce((sum, l) => sum + l.hours, 0);

  const pendingApprovalsCount = timeLogs.filter(l => l.approval_status === 'pending').length;

  // Projected deductions for selected month
  const selectedPayrollRecords = payrollRecords.filter(r => r.period === selectedMonth);
  const projectedDeductions = selectedPayrollRecords.reduce((sum, r) => sum + r.deduction_amount, 0);
  const isFinalizedMonth = selectedPayrollRecords.length > 0 && selectedPayrollRecords.every(r => r.status === 'finalized');

  // Chart data: Monthly corrective hours (Attributable vs Exempt)
  const monthlyCorrectiveData = [
    { month: 'Jul 2026', attributable: 4.0, exempt: 1.5, regular: 160 },
    { month: 'Aug 2026', attributable: 5.5, exempt: 2.0, regular: 175 },
    { month: 'Sep 2026', attributable: 7.0, exempt: 3.0, regular: 168 },
    { month: 'Oct 2026', attributable: 14.5, exempt: 3.5, regular: 182 },
    { month: 'Nov 2026 (Proj)', attributable: 6.0, exempt: 2.0, regular: 160 },
  ];

  // Chart data: Rework by Project
  const reworkByProjectData = projects.map(proj => {
    const projLogs = timeLogs.filter(l => l.project_id === proj.id && l.log_type === 'corrective_maintenance');
    const hours = projLogs.reduce((sum, l) => sum + l.hours, 0);
    return {
      name: proj.code,
      fullName: proj.name,
      hours: hours || 0.5,
    };
  });

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Projects */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Projects</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900">{activeProjects}</div>
            <span className="text-xs text-slate-500">{projects.length} total</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span className="text-emerald-600 font-medium flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> 100%
            </span>
            <span>on-time milestone pace</span>
          </div>
        </div>

        {/* Delivered Modules & Reopen Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivered Modules</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900">{deliveredModules}</div>
            <span className="text-xs text-amber-600 font-medium">{reopenedModules} reopened</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Reopen Rate:</span>
            <span className={cn('font-semibold', reopenRate > 20 ? 'text-rose-600' : 'text-amber-600')}>
              {reopenRate}%
            </span>
          </div>
        </div>

        {/* Approved Corrective Hours */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Corrective Hours</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ClockAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900">{approvedCorrectiveHours}h</div>
            <Badge variant={pendingApprovalsCount > 0 ? 'warning' : 'success'}>
              {pendingApprovalsCount} pending
            </Badge>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span className="text-slate-400">Attributable to delivered code defects</span>
          </div>
        </div>

        {/* Projected Payroll Deductions / Savings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Next-Month Deductions</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-rose-600">
              {formatCurrency(projectedDeductions)}
            </div>
            <span className={cn(
              'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
              isFinalizedMonth 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            )}>
              {isFinalizedMonth ? 'Finalized' : 'Estimated'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Cycle: {selectedMonth}</span>
            <Link to="/payroll" className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-0.5">
              Review <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Corrective Hours vs Regular */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Corrective Maintenance vs Exempt Hours</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Strict separation of attributable rework hours entering next-month payroll deductions
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-rose-500" />
                <span className="text-slate-600 font-medium">Attributable Rework</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-500" />
                <span className="text-slate-600 font-medium">Exempt (Spec change / Client)</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCorrectiveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(val: number) => [`${val} hrs`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="attributable" fill="#EF4444" radius={[4, 4, 0, 0]} name="Attributable Corrective" />
                <Bar dataKey="exempt" fill="#10B981" radius={[4, 4, 0, 0]} name="Exempt Corrective" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rework Distribution By Project */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Rework by Project</h3>
            <p className="text-xs text-slate-500 mt-0.5">Corrective hours across active deliverables</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reworkByProjectData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="hours"
                >
                  {reworkByProjectData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: number) => [`${val} hrs`, 'Corrective Rework']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 mt-2">
            {reworkByProjectData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-slate-700 font-medium">{item.name}</span>
                </div>
                <span className="text-slate-500 font-mono">{item.hours}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two columns: Reopened Modules & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Reopened Modules & Employee Quality Scores */}
        <div className="space-y-6">
          {/* Top Reopened Modules */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Reopened Modules
              </h3>
              <Link to="/projects" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {modules.filter(m => m.status === 'reopened').map(mod => {
                const proj = projects.find(p => p.id === mod.project_id);
                return (
                  <div key={mod.id} className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">{mod.name}</span>
                      <Badge variant="warning" dot>Reopened x{mod.reopen_count}</Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Project: {proj?.code}</span>
                      <span className="font-mono text-amber-800">Delivered: {mod.delivered_at ? new Date(mod.delivered_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Employee Quality Score Table */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Employee Quality & Rework Metrics</h3>
            <div className="divide-y divide-slate-100">
              {users.filter(u => u.role === 'employee').map(emp => {
                const empAttributableHours = timeLogs
                  .filter(l => l.user_id === emp.id && l.attribution_status === 'attributable' && l.approval_status === 'approved')
                  .reduce((sum, l) => sum + l.hours, 0);

                return (
                  <div key={emp.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <img src={emp.avatar_url} alt={emp.full_name} className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{emp.full_name}</div>
                        <div className="text-[11px] text-slate-500">{emp.department}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">
                        {emp.quality_score}% <span className="font-normal text-[11px] text-slate-400">score</span>
                      </div>
                      <div className="text-[11px] text-rose-600 font-mono">
                        {empAttributableHours}h rework
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Recent Activity Feed */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Operational Activity</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time audit events: deliveries, defect classifications, approvals and payroll
              </p>
            </div>
            <Link to="/audit" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              Full audit trail <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {auditLogs.slice(0, 6).map((log) => {
              const getActionIcon = (action: string) => {
                if (action.includes('PAYROLL')) return <PiggyBank className="w-4 h-4 text-rose-500" />;
                if (action.includes('APPROVED')) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
                if (action.includes('REOPENED')) return <RotateCcw className="w-4 h-4 text-amber-500" />;
                if (action.includes('DEFECT') || action.includes('BUG')) return <ShieldAlert className="w-4 h-4 text-purple-500" />;
                if (action.includes('TASK_COMPLETED')) return <FileCheck className="w-4 h-4 text-blue-500" />;
                return <Clock className="w-4 h-4 text-slate-400" />;
              };

              return (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                  <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900">
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {log.details}
                    </p>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                      <span>Initiated by: <strong className="text-slate-700 font-medium">{log.user_name}</strong></span>
                      <span>•</span>
                      <span className="uppercase text-[10px] tracking-wider px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200">
                        {log.entity_type}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
