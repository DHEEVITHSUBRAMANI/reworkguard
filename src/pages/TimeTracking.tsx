import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ClockAlert, 
  Filter, 
  Wrench, 
  Code2, 
  FileText,
  DollarSign,
  RotateCcw,
  AlertCircle,
  Download
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatHours, formatDate, cn } from '../lib/utils';
import { TimeLog, TimeLogType, ApprovalStatus, AttributionStatus } from '../types';
import { exportTimeLogsToCSV } from '../lib/csvExport';

export const TimeTracking: React.FC = () => {
  const { 
    timeLogs, 
    tasks, 
    modules, 
    projects, 
    bugs, 
    addTimeLog, 
    resubmitTimeLog,
    selectedMonth, 
    searchQuery 
  } = useApp();
  const { currentUser, users } = useAuth();

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [attributionFilter, setAttributionFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'rejected'>('all');

  // Modal: Log Time
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);

  // Form State
  const [logType, setLogType] = useState<TimeLogType>('regular');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '');
  const [selectedBugId, setSelectedBugId] = useState<string>(bugs[0]?.id || '');
  const [hours, setHours] = useState<number>(4.0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');

  // Modal: Resubmit Rejected Log
  const [resubmitTarget, setResubmitTarget] = useState<TimeLog | null>(null);
  const [resubmitHours, setResubmitHours] = useState<number>(4.0);
  const [resubmitDescription, setResubmitDescription] = useState<string>('');
  const [resubmitError, setResubmitError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleOpenLogModal = () => {
    setTimeError(null);
    setIsTimeModalOpen(true);
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    setTimeError(null);

    // Validation 1: Hours > 0 and <= 16
    if (hours <= 0 || hours > 16) {
      setTimeError('Hours logged must be between 0.5 and 16.0 hours per entry.');
      return;
    }

    // Validation 2: No future dates
    if (date > todayStr) {
      setTimeError('Cannot log time for future dates.');
      return;
    }

    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) {
      setTimeError('Please select a valid target task.');
      return;
    }

    // Validation 3: If corrective, bug must be selected
    if (logType === 'corrective_maintenance' && !selectedBugId) {
      setTimeError('Corrective maintenance must be tied to a documented defect report.');
      return;
    }

    const res = await addTimeLog({
      task_id: task.id,
      module_id: task.module_id,
      project_id: task.project_id,
      user_id: currentUser.id,
      log_type: logType,
      bug_id: logType === 'corrective_maintenance' ? selectedBugId : undefined,
      hours: Number(hours),
      date,
      description,
    });

    if (res && !res.success) {
      setTimeError(res.error || 'Failed to submit time log.');
      return;
    }

    setIsTimeModalOpen(false);
    setDescription('');
    setHours(4.0);
  };

  const handleOpenResubmit = (log: TimeLog) => {
    setResubmitTarget(log);
    setResubmitHours(log.hours);
    setResubmitDescription(log.description);
    setResubmitError(null);
  };

  const handleConfirmResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmitTarget) return;

    if (resubmitHours <= 0 || resubmitHours > 16) {
      setResubmitError('Hours logged must be between 0.5 and 16.0 hours.');
      return;
    }

    if (!resubmitDescription.trim()) {
      setResubmitError('Please provide an updated description explaining the work or corrections made.');
      return;
    }

    const res = await resubmitTimeLog(resubmitTarget.id, resubmitHours, resubmitDescription);
    if (res && !res.success) {
      setResubmitError(res.error || 'Failed to resubmit time log.');
      return;
    }

    setResubmitTarget(null);
  };

  // Metrics for active month
  const monthLogs = timeLogs.filter(l => l.date.startsWith(selectedMonth.slice(0, 7)) || l.date.startsWith('2026-10'));
  
  const regularHoursTotal = monthLogs
    .filter(l => l.log_type === 'regular' && l.approval_status === 'approved')
    .reduce((sum, l) => sum + l.hours, 0);

  const correctiveHoursTotal = monthLogs
    .filter(l => l.log_type === 'corrective_maintenance' && l.approval_status === 'approved')
    .reduce((sum, l) => sum + l.hours, 0);

  const attributableHoursTotal = monthLogs
    .filter(l => l.log_type === 'corrective_maintenance' && l.attribution_status === 'attributable' && l.approval_status === 'approved')
    .reduce((sum, l) => sum + l.hours, 0);

  const rejectedLogs = timeLogs.filter(l => l.approval_status === 'rejected');

  // Filtered logs
  const filteredLogs = timeLogs.filter((l) => {
    if (activeTab === 'rejected' && l.approval_status !== 'rejected') return false;
    const matchesSearch = l.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || l.log_type === typeFilter;
    const matchesApproval = approvalFilter === 'all' || l.approval_status === approvalFilter;
    const matchesAttribution = attributionFilter === 'all' || l.attribution_status === attributionFilter;
    return matchesSearch && matchesType && matchesApproval && matchesAttribution;
  });

  const getApprovalBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success" dot>Approved</Badge>;
      case 'pending':
        return <Badge variant="warning" dot>Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="danger" dot>Rejected</Badge>;
      case 'exempt':
        return <Badge variant="info" dot>Exempt</Badge>;
    }
  };

  const getAttributionBadge = (status: AttributionStatus) => {
    switch (status) {
      case 'attributable':
        return <Badge variant="danger" dot>Attributable Rework</Badge>;
      case 'exempt':
        return <Badge variant="success" dot>Exempt</Badge>;
      case 'pending':
        return <Badge variant="warning" dot>Investigation Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Hour Separation Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Regular Development Hours */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Regular Dev Hours</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900">{regularHoursTotal} hrs</div>
            <Badge variant="info">Standard</Badge>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">New feature sprints & architecture</span>
        </div>

        {/* Corrective Maintenance (Total) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Corrective Rework</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-amber-600">{correctiveHoursTotal} hrs</div>
            <Badge variant="warning">Rework</Badge>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Post-delivery bug fixes & refactoring</span>
        </div>

        {/* Attributable to Payroll Deductions */}
        <div className="bg-rose-50/60 p-5 rounded-xl border border-rose-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Payroll Deductible Hours</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-rose-700">{attributableHoursTotal} hrs</div>
            <Badge variant="danger">Attributable</Badge>
          </div>
          <span className="text-[11px] text-rose-600/80 mt-1 block">Approved & attributable to original delivery defect</span>
        </div>
      </div>

      {/* Rejected Logs Alert Notification */}
      {rejectedLogs.length > 0 && activeTab !== 'rejected' && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              You have <strong>{rejectedLogs.length} rejected time log(s)</strong> that require corrections and resubmission.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('rejected')}
            className="px-2.5 py-1 text-xs font-bold bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors shadow-2xs"
          >
            Review Rejected Logs
          </button>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tab Selector */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              All Time Logs
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5',
                activeTab === 'rejected' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:text-rose-900'
              )}
            >
              <span>Rejected Queue</span>
              {rejectedLogs.length > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.2 rounded-full',
                  activeTab === 'rejected' ? 'bg-white text-rose-700' : 'bg-rose-200 text-rose-900'
                )}>
                  {rejectedLogs.length}
                </span>
              )}
            </button>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Work Types</option>
            <option value="regular">Regular Development</option>
            <option value="corrective_maintenance">Corrective Maintenance (Rework)</option>
          </select>

          {/* Approval Filter */}
          {activeTab === 'all' && (
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
            >
              <option value="all">All Approval States</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          )}

          {/* Attribution Filter */}
          <select
            value={attributionFilter}
            onChange={(e) => setAttributionFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Attributions</option>
            <option value="attributable">Attributable (Deductible)</option>
            <option value="exempt">Exempt</option>
            <option value="pending">Investigation Pending</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => exportTimeLogsToCSV(filteredLogs, users, bugs, tasks)}
          >
            Export CSV
          </Button>

          <Button
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenLogModal}
          >
            Log Work Hours
          </Button>
        </div>
      </div>

      {/* Time Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Date & Engineer</th>
                <th className="px-4 py-3.5">Category & Linked Defect</th>
                <th className="px-4 py-3.5">Task & Module</th>
                <th className="px-4 py-3.5">Logged Hours</th>
                <th className="px-4 py-3.5">Attribution Policy</th>
                <th className="px-4 py-3.5">Approval Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No time logs match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const user = users.find(u => u.id === log.user_id);
                  const task = tasks.find(t => t.id === log.task_id);
                  const module = modules.find(m => m.id === log.module_id);
                  const bug = bugs.find(b => b.id === log.bug_id);
                  const isCorrective = log.log_type === 'corrective_maintenance';
                  const isRejected = log.approval_status === 'rejected';

                  return (
                    <tr
                      key={log.id}
                      className={cn(
                        'hover:bg-slate-50/70 transition-colors',
                        isCorrective && log.attribution_status === 'attributable' && 'bg-rose-50/15',
                        isRejected && 'bg-rose-50/30'
                      )}
                    >
                      {/* Date & User */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{formatDate(log.date)}</div>
                        <div className="flex items-center gap-1.5 mt-1 text-slate-600">
                          <img src={user?.avatar_url} alt={user?.full_name} className="w-5 h-5 rounded-full object-cover" />
                          <span>{user?.full_name}</span>
                        </div>
                      </td>

                      {/* Work Type & Bug Link */}
                      <td className="px-4 py-4 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          {isCorrective ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Wrench className="w-3 h-3 text-amber-600" /> Corrective Maintenance
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              <Code2 className="w-3 h-3 text-blue-600" /> Regular Development
                            </span>
                          )}
                        </div>

                        {bug && (
                          <div className="mt-1.5 text-[11px] text-rose-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span className="truncate">Linked Defect: {bug.id} - {bug.title}</span>
                          </div>
                        )}

                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic">
                          &quot;{log.description}&quot;
                        </p>

                        {/* If rejected, show rejection reason */}
                        {isRejected && log.rejection_reason && (
                          <div className="mt-1.5 p-1.5 bg-rose-100/70 border border-rose-200 rounded text-[10px] text-rose-900 font-medium">
                            <strong>Rejection Reason:</strong> {log.rejection_reason}
                          </div>
                        )}
                      </td>

                      {/* Task & Module */}
                      <td className="px-4 py-4 max-w-xs">
                        <div className="font-semibold text-slate-800 truncate">{task?.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{module?.name}</div>
                      </td>

                      {/* Hours */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={cn(
                          'font-mono text-xs font-bold px-2 py-1 rounded',
                          isCorrective ? 'bg-amber-100/80 text-amber-900' : 'bg-slate-100 text-slate-800'
                        )}>
                          {formatHours(log.hours)}
                        </span>
                      </td>

                      {/* Attribution */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isCorrective ? (
                          <div>
                            {getAttributionBadge(log.attribution_status)}
                            {log.exempt_reason && (
                              <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1">
                                {log.exempt_reason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">N/A (Regular Work)</span>
                        )}
                      </td>

                      {/* Approval */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getApprovalBadge(log.approval_status)}
                        {log.approved_at && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {formatDate(log.approved_at)}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        {isRejected && (
                          <button
                            onClick={() => handleOpenResubmit(log)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1 ml-auto"
                            title="Resubmit corrected log"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Resubmit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Log Work Hours */}
      <Modal
        isOpen={isTimeModalOpen}
        onClose={() => setIsTimeModalOpen(false)}
        title="Log Engineering Work Hours"
        description="Maintain strict separation between new feature work and corrective rework."
      >
        <form onSubmit={handleLogTime} className="space-y-4">
          {timeError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{timeError}</span>
            </div>
          )}

          {/* Work Type Switcher Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Work Category *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLogType('regular')}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  logType === 'regular'
                    ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <Code2 className="w-4 h-4 text-blue-600" />
                  Regular Development
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Feature sprint, code review, planned milestone work.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setLogType('corrective_maintenance')}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  logType === 'corrective_maintenance'
                    ? 'border-amber-600 bg-amber-50/70 ring-1 ring-amber-500'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  Corrective Maintenance
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Fixing post-delivery defects, reopened tasks, or regressions.
                </p>
              </button>
            </div>
          </div>

          {/* Conditional Notice if Corrective */}
          {logType === 'corrective_maintenance' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
              <span className="font-bold block">Defect Rework Governance Policy:</span>
              <p className="mt-0.5 leading-relaxed">
                Corrective maintenance hours must be tied to a documented bug. Approved hours attributable to original delivery defects enter the next-month payroll rework review under company policy.
              </p>
            </div>
          )}

          {/* Task Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Task *</label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.status})
                </option>
              ))}
            </select>
          </div>

          {/* If Corrective, choose bug */}
          {logType === 'corrective_maintenance' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Linked Defect / Bug Report *</label>
              <select
                value={selectedBugId}
                onChange={(e) => setSelectedBugId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {bugs.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id} - {b.title} ({b.defect_classification.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hours Worked * (Max 16h/day)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="16"
                required
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date * (No future dates)</label>
              <input
                type="date"
                required
                max={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Activity Log *</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a clear description of the engineering work completed..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsTimeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Submit Time Log
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Resubmit Rejected Log */}
      <Modal
        isOpen={Boolean(resubmitTarget)}
        onClose={() => setResubmitTarget(null)}
        title="Resubmit Corrected Time Log"
        description={`Log ID: ${resubmitTarget?.id} (Previously Rejected)`}
      >
        <form onSubmit={handleConfirmResubmit} className="space-y-4 text-xs">
          {resubmitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{resubmitError}</span>
            </div>
          )}

          {resubmitTarget?.rejection_reason && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
              <span className="font-bold block">Reviewer&apos;s Rejection Reason:</span>
              <p className="mt-0.5">{resubmitTarget.rejection_reason}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Adjusted Hours * (Max 16h)</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="16"
              required
              value={resubmitHours}
              onChange={(e) => setResubmitHours(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Clarified Work Description *</label>
            <textarea
              rows={3}
              required
              value={resubmitDescription}
              onChange={(e) => setResubmitDescription(e.target.value)}
              placeholder="Address the reviewer's concerns and explain specific fixes applied..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setResubmitTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Confirm Resubmission
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
