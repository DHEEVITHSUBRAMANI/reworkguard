import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Filter, 
  Wrench, 
  Code2, 
  DollarSign, 
  HelpCircle,
  CheckCheck
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatHours, formatDate, cn } from '../lib/utils';
import { TimeLog, AttributionStatus } from '../types';

export const Approvals: React.FC = () => {
  const { timeLogs, tasks, modules, projects, bugs, reviewTimeLog, searchQuery } = useApp();
  const { currentUser, users, canApproveTime, isEmployee } = useAuth();

  const [filterType, setFilterType] = useState<string>('pending');
  const [rejectTarget, setRejectTarget] = useState<TimeLog | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [exemptTarget, setExemptTarget] = useState<TimeLog | null>(null);
  const [exemptReason, setExemptReason] = useState('');

  // Pending logs
  const pendingLogs = timeLogs.filter(l => l.approval_status === 'pending');
  const processedLogs = timeLogs.filter(l => l.approval_status !== 'pending');

  const displayedLogs = filterType === 'pending' ? pendingLogs : processedLogs;

  const handleApprove = (log: TimeLog, overrideAttribution?: AttributionStatus) => {
    reviewTimeLog(log.id, 'approved', overrideAttribution || log.attribution_status);
  };

  const handleConfirmReject = () => {
    if (!rejectTarget) return;
    reviewTimeLog(rejectTarget.id, 'rejected', undefined, rejectReason);
    setRejectTarget(null);
    setRejectReason('');
  };

  const handleConfirmExemptApproval = () => {
    if (!exemptTarget) return;
    reviewTimeLog(exemptTarget.id, 'approved', 'exempt', exemptReason);
    setExemptTarget(null);
    setExemptReason('');
  };

  const handleBatchApprovePending = () => {
    pendingLogs.forEach(l => {
      reviewTimeLog(l.id, 'approved', l.attribution_status);
    });
  };

  return (
    <div className="space-y-6">
      {/* Role permission banner if employee */}
      {isEmployee && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You are currently viewing as <strong>Software Engineer</strong>. Time approvals are restricted to Team Leads, Managers, and Finance Admins. Switch roles in the top-right menu to approve.
            </span>
          </div>
        </div>
      )}

      {/* Metric overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Pending Approvals</span>
          <div className="text-2xl font-bold text-amber-600 mt-2">{pendingLogs.length}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Requiring review before payroll cutoff</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Corrective Rework in Queue</span>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            {pendingLogs.filter(l => l.log_type === 'corrective_maintenance').length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Subject to delivery attribution verification</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Processed & Authorized</span>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{processedLogs.length}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Logged to immutable payroll ledger</span>
        </div>
      </div>

      {/* Filter Tabs and Batch Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-200/60 p-1 rounded-lg w-fit">
          <button
            onClick={() => setFilterType('pending')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              filterType === 'pending'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Pending Queue ({pendingLogs.length})
          </button>
          <button
            onClick={() => setFilterType('processed')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              filterType === 'processed'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Approval History ({processedLogs.length})
          </button>
        </div>

        {canApproveTime && pendingLogs.length > 0 && filterType === 'pending' && (
          <Button
            size="sm"
            variant="outline"
            icon={<CheckCheck className="w-3.5 h-3.5" />}
            onClick={handleBatchApprovePending}
          >
            Approve All Pending
          </Button>
        )}
      </div>

      {/* Approvals Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Engineer & Date</th>
                <th className="px-4 py-3.5">Work Type & Hours</th>
                <th className="px-4 py-3.5">Context & Linked Defect</th>
                <th className="px-4 py-3.5">Attribution Policy</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No time logs in this queue.
                  </td>
                </tr>
              ) : (
                displayedLogs.map((log) => {
                  const user = users.find(u => u.id === log.user_id);
                  const task = tasks.find(t => t.id === log.task_id);
                  const bug = bugs.find(b => b.id === log.bug_id);
                  const isCorrective = log.log_type === 'corrective_maintenance';
                  const isAttributable = isCorrective && log.attribution_status === 'attributable';

                  return (
                    <tr
                      key={log.id}
                      className={cn(
                        'hover:bg-slate-50/70 transition-colors',
                        isAttributable && 'bg-rose-50/15'
                      )}
                    >
                      {/* Engineer & Date */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <img
                            src={user?.avatar_url}
                            alt={user?.full_name}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 block">{user?.full_name}</span>
                            <span className="text-[10px] text-slate-400">{formatDate(log.date)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Type & Hours */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isCorrective ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Wrench className="w-3 h-3 text-amber-600" /> Corrective
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              <Code2 className="w-3 h-3 text-blue-600" /> Regular
                            </span>
                          )}
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {formatHours(log.hours)}
                          </span>
                        </div>
                      </td>

                      {/* Context & Description */}
                      <td className="px-4 py-4 max-w-sm">
                        <div className="font-medium text-slate-800 truncate">{task?.title}</div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic">
                          &quot;{log.description}&quot;
                        </p>
                        {bug && (
                          <div className="mt-1 text-[10px] text-rose-600 font-medium">
                            Defect: {bug.id} ({bug.defect_classification.replace(/_/g, ' ')})
                          </div>
                        )}
                      </td>

                      {/* Attribution */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isCorrective ? (
                          <div>
                            {log.attribution_status === 'attributable' && (
                              <Badge variant="danger" dot>Attributable Rework</Badge>
                            )}
                            {log.attribution_status === 'exempt' && (
                              <Badge variant="success" dot>Exempt from Deduction</Badge>
                            )}
                            {log.attribution_status === 'pending' && (
                              <Badge variant="warning" dot>Pending Investigation</Badge>
                            )}
                            {log.exempt_reason && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Note: {log.exempt_reason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Billable Regular Work</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                          log.approval_status === 'approved' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          log.approval_status === 'pending' && 'bg-amber-50 text-amber-700 border-amber-200',
                          log.approval_status === 'rejected' && 'bg-rose-50 text-rose-700 border-rose-200'
                        )}>
                          {log.approval_status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        {log.approval_status === 'pending' && canApproveTime ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Standard Approve */}
                            <button
                              onClick={() => handleApprove(log)}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                              title="Approve as specified"
                            >
                              Approve
                            </button>

                            {/* Mark Exempt Button if Corrective */}
                            {isCorrective && log.attribution_status !== 'exempt' && (
                              <button
                                onClick={() => setExemptTarget(log)}
                                className="px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                                title="Approve but exempt from payroll deduction"
                              >
                                Exempt
                              </button>
                            )}

                            {/* Reject Button */}
                            <button
                              onClick={() => setRejectTarget(log)}
                              className="px-2 py-1 text-xs font-medium rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                              title="Reject time log"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {log.approved_at ? `Reviewed ${formatDate(log.approved_at)}` : 'No action'}
                          </span>
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

      {/* Modal: Rejection Reason */}
      <Modal
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Reject Time Log"
        description="Provide a justification for rejecting this logged work."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rejection Reason *</label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Duplicate time entry or misattributed ticket..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmReject}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Exempt Approval */}
      <Modal
        isOpen={Boolean(exemptTarget)}
        onClose={() => setExemptTarget(null)}
        title="Approve as Exempt from Payroll Deduction"
        description="Authorize hours for client billing while exempting the engineer from rework deductions."
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
            <span className="font-bold block">Policy Exemption Justification</span>
            <p className="mt-0.5 leading-relaxed">
              These {exemptTarget?.hours} corrective hours will be authorized for payment, but will NOT be counted toward the engineer&apos;s next-month deduction total.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Exemption Reason *</label>
            <textarea
              rows={3}
              value={exemptReason}
              onChange={(e) => setExemptReason(e.target.value)}
              placeholder="e.g. Defect triggered by external upstream API deprecation..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setExemptTarget(null)}>
              Cancel
            </Button>
            <Button variant="success" size="sm" onClick={handleConfirmExemptApproval}>
              Approve with Exemption
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
