import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  Bug, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  FileText, 
  Info, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  History,
  Check,
  X,
  Layers,
  Wrench
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatDateTime, formatDate, formatHours, cn } from '../lib/utils';
import { BugReport, BugSeverity, BugStatus, DefectClassification, Task } from '../types';

export const Bugs: React.FC = () => {
  const { 
    bugs, 
    modules, 
    projects, 
    tasks, 
    timeLogs, 
    bugAttributions,
    addBugReport, 
    classifyDefect, 
    verifyBugFix,
    searchQuery 
  } = useApp();
  const { currentUser, users, canClassifyDefect, isManager, isLead } = useAuth();

  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals & Drawers
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [classifyTarget, setClassifyTarget] = useState<BugReport | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<DefectClassification>('caused_by_original_delivery');
  const [classificationNotes, setClassificationNotes] = useState('');
  
  const [verifyTarget, setVerifyTarget] = useState<BugReport | null>(null);
  const [verifyResult, setVerifyResult] = useState<'pass' | 'fail'>('pass');
  const [verifyNotes, setVerifyNotes] = useState('');

  const [detailBug, setDetailBug] = useState<BugReport | null>(null);

  // Form State for Report Defect
  const [newBug, setNewBug] = useState({
    title: '',
    description: '',
    steps_to_reproduce: '',
    severity: 'high' as BugSeverity,
    status: 'open' as BugStatus,
    project_id: projects[0]?.id || '',
    module_id: modules[0]?.id || '',
    task_id: tasks[0]?.id || '',
    assigned_to: users.find(u => u.role === 'employee')?.id || users[0].id,
    original_developer_id: users.find(u => u.role === 'employee')?.id || users[0].id,
    reported_by: currentUser.id,
    defect_classification: 'pending_investigation' as DefectClassification,
  });

  // Handle task selection during bug reporting (auto-populates module, project, original developer)
  const handleTaskSelectionChange = (taskId: string) => {
    const selectedTask = tasks.find(t => t.id === taskId);
    if (selectedTask) {
      const origDevId = selectedTask.original_delivery_employee_id || selectedTask.assigned_to;
      setNewBug({
        ...newBug,
        task_id: selectedTask.id,
        module_id: selectedTask.module_id,
        project_id: selectedTask.project_id,
        original_developer_id: origDevId,
        assigned_to: origDevId,
      });
    } else {
      setNewBug({
        ...newBug,
        task_id: taskId,
      });
    }
  };

  const handleReportBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBug.title || !newBug.module_id || !newBug.task_id) return;
    await addBugReport(newBug);
    setIsReportModalOpen(false);
    setNewBug({
      title: '',
      description: '',
      steps_to_reproduce: '',
      severity: 'high',
      status: 'open',
      project_id: projects[0]?.id || '',
      module_id: modules[0]?.id || '',
      task_id: tasks[0]?.id || '',
      assigned_to: users.find(u => u.role === 'employee')?.id || users[0].id,
      original_developer_id: users.find(u => u.role === 'employee')?.id || users[0].id,
      reported_by: currentUser.id,
      defect_classification: 'pending_investigation',
    });
  };

  const handleConfirmClassification = async () => {
    if (!classifyTarget) return;
    const isExempt = selectedClassification === 'not_caused_by_original_delivery' || 
                     selectedClassification === 'scope_change' || 
                     selectedClassification === 'external_dependency_issue';
    
    if (isExempt && classificationNotes.trim().length < 10) {
      alert('A written justification of at least 10 characters is required for exempt defect classifications.');
      return;
    }

    await classifyDefect(classifyTarget.id, selectedClassification, classificationNotes);
    setClassifyTarget(null);
    setClassificationNotes('');
  };

  const handleConfirmVerification = async () => {
    if (!verifyTarget) return;
    if (!verifyNotes.trim()) {
      alert('Please enter verification sign-off notes.');
      return;
    }
    await verifyBugFix(verifyTarget.id, verifyResult === 'pass', verifyNotes);
    setVerifyTarget(null);
    setVerifyNotes('');
  };

  // Metrics
  const totalBugs = bugs.length;
  const causedByDelivery = bugs.filter(b => 
    b.defect_classification === 'caused_by_original_delivery' || 
    b.defect_classification === 'original_delivery_defect'
  ).length;
  const notCausedByDelivery = bugs.filter(b => 
    b.defect_classification === 'not_caused_by_original_delivery' || 
    b.defect_classification === 'scope_change' ||
    b.defect_classification === 'external_dependency_issue'
  ).length;
  const pendingInvestigation = bugs.filter(b => b.defect_classification === 'pending_investigation').length;

  // Filter
  const filteredBugs = bugs.filter((b) => {
    const matchesSearch = 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClassification = 
      classificationFilter === 'all' || 
      b.defect_classification === classificationFilter ||
      (classificationFilter === 'caused_by_original_delivery' && b.defect_classification === 'original_delivery_defect') ||
      (classificationFilter === 'not_caused_by_original_delivery' && (b.defect_classification === 'scope_change' || b.defect_classification === 'external_dependency_issue'));

    const matchesSeverity = severityFilter === 'all' || b.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesClassification && matchesSeverity && matchesStatus;
  });

  const getSeverityBadge = (severity: BugSeverity) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="danger" dot>Critical</Badge>;
      case 'high':
        return <Badge variant="warning" dot>High</Badge>;
      case 'medium':
        return <Badge variant="info">Medium</Badge>;
      case 'low':
        return <Badge variant="default">Low</Badge>;
    }
  };

  const getClassificationBadge = (classification: DefectClassification) => {
    switch (classification) {
      case 'caused_by_original_delivery':
      case 'original_delivery_defect':
        return (
          <Badge variant="danger" dot title="Attributable rework hours will be subject to next-month payroll review">
            Caused by Original Delivery
          </Badge>
        );
      case 'not_caused_by_original_delivery':
        return (
          <Badge variant="success" dot title="Exempt from payroll deduction (external / client spec change)">
            Exempt (Spec / Client)
          </Badge>
        );
      case 'scope_change':
        return (
          <Badge variant="purple" dot title="Exempt: Scope shift post-delivery">
            Exempt (Scope Change)
          </Badge>
        );
      case 'external_dependency_issue':
        return (
          <Badge variant="info" dot title="Exempt: Third-party library or service outage">
            Exempt (External Issue)
          </Badge>
        );
      case 'pending_investigation':
        return (
          <Badge variant="warning" dot title="Under managerial review">
            Pending Investigation
          </Badge>
        );
    }
  };

  // Attribution records for currently detailed or classified bug
  const currentAttributions = detailBug
    ? (bugAttributions || []).filter(a => a.bug_id === detailBug.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  const classifyAttributions = classifyTarget
    ? (bugAttributions || []).filter(a => a.bug_id === classifyTarget.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  // Linked time logs for detail bug
  const bugTimeLogs = detailBug
    ? timeLogs.filter(l => l.bug_id === detailBug.id)
    : [];

  const totalReworkHoursOnBug = bugTimeLogs.reduce((acc, l) => acc + l.hours, 0);

  const isExemptSelected = selectedClassification === 'not_caused_by_original_delivery' || 
                           selectedClassification === 'scope_change' || 
                           selectedClassification === 'external_dependency_issue';

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Defect Reports</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalBugs}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Reported against delivered features</span>
        </div>

        <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block">Attributable to Delivery</span>
          <div className="text-2xl font-bold text-rose-700 mt-2">{causedByDelivery}</div>
          <span className="text-[11px] text-rose-600/80 mt-1 block">Subject to payroll rework review</span>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">Exempt (Spec / Client)</span>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{notCausedByDelivery}</div>
          <span className="text-[11px] text-emerald-600/80 mt-1 block">Zero employee deduction applied</span>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block">Pending Investigation</span>
          <div className="text-2xl font-bold text-amber-700 mt-2">{pendingInvestigation}</div>
          <span className="text-[11px] text-amber-600/80 mt-1 block">Awaiting managerial classification</span>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Classification Filter */}
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Classifications</option>
            <option value="caused_by_original_delivery">Caused by Original Delivery</option>
            <option value="not_caused_by_original_delivery">Exempt Classifications</option>
            <option value="pending_investigation">Pending Investigation</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="in_fix">In Fix</option>
            <option value="verified_resolved">Verified Resolved</option>
          </select>
        </div>

        <Button
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setIsReportModalOpen(true)}
        >
          Report Defect
        </Button>
      </div>

      {/* Bugs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Defect Summary & Module</th>
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5">Classification & Attribution</th>
                <th className="px-4 py-3.5">Original Developer</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBugs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No defects found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredBugs.map((bug) => {
                  const module = modules.find((m) => m.id === bug.module_id);
                  const project = projects.find((p) => p.id === bug.project_id);
                  const originalDev = users.find((u) => u.id === bug.original_developer_id);
                  const isAttributable = bug.defect_classification === 'caused_by_original_delivery' || bug.defect_classification === 'original_delivery_defect';
                  const task = tasks.find(t => t.id === bug.task_id);

                  return (
                    <tr 
                      key={bug.id}
                      className={cn(
                        'hover:bg-slate-50/70 transition-colors',
                        isAttributable && 'bg-rose-50/15'
                      )}
                    >
                      {/* Summary */}
                      <td className="px-5 py-4 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border">
                            {bug.id}
                          </span>
                          <span 
                            onClick={() => setDetailBug(bug)}
                            className="font-semibold text-slate-900 text-xs hover:text-blue-600 cursor-pointer"
                          >
                            {bug.title}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-1 line-clamp-1">
                          {bug.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-700">{project?.code}</span>
                          <span>•</span>
                          <span>{module?.name}</span>
                          {task && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 font-mono">Task: {task.title.slice(0, 24)}...</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getSeverityBadge(bug.severity)}
                      </td>

                      {/* Classification */}
                      <td className="px-4 py-4 max-w-xs">
                        <div>
                          {getClassificationBadge(bug.defect_classification)}
                        </div>
                        {bug.classification_notes ? (
                          <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-2">
                            &quot;{bug.classification_notes}&quot;
                          </p>
                        ) : (
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Pending manager evaluation
                          </span>
                        )}
                      </td>

                      {/* Original Developer */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <img
                            src={originalDev?.avatar_url}
                            alt={originalDev?.full_name}
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                          />
                          <div>
                            <span className="font-medium text-slate-800 block">
                              {originalDev?.full_name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ${originalDev?.hourly_rate}/hr rate
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={cn(
                          "capitalize text-xs font-semibold px-2 py-0.5 rounded-full border",
                          bug.status === 'verified_resolved' 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        )}>
                          {bug.status.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {formatDate(bug.created_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDetailBug(bug)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                            title="View details & attribution audit"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Verify Fix Action */}
                          {(isManager || isLead) && (bug.status === 'in_fix' || bug.status === 'investigating') && (
                            <button
                              onClick={() => {
                                setVerifyTarget(bug);
                                setVerifyResult('pass');
                                setVerifyNotes('');
                              }}
                              className="px-2 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1"
                              title="Verify bug resolution"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Verify Fix
                            </button>
                          )}

                          {canClassifyDefect && (
                            <button
                              onClick={() => {
                                setClassifyTarget(bug);
                                setSelectedClassification(bug.defect_classification);
                                setClassificationNotes(bug.classification_notes || '');
                              }}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center gap-1"
                              title="Managerial defect classification"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Classify
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Report Defect with Mandatory Delivered Task/Module Selection */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Report Post-Delivery Defect"
        description="Select the delivered task/module to auto-link original developer and trigger reopening."
      >
        <form onSubmit={handleReportBug} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Defect Title *</label>
            <input
              type="text"
              required
              value={newBug.title}
              onChange={(e) => setNewBug({ ...newBug, title: e.target.value })}
              placeholder="e.g. Ledger discrepancy when batch exceeds 500 rows"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Mandatory Task Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Delivered Feature / Target Task *
            </label>
            <select
              required
              value={newBug.task_id}
              onChange={(e) => handleTaskSelectionChange(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="">-- Select Delivered Task --</option>
              {tasks.map((t) => {
                const origDev = users.find(u => u.id === (t.original_delivery_employee_id || t.assigned_to));
                return (
                  <option key={t.id} value={t.id}>
                    [{t.status.toUpperCase()}] {t.title} (Orig: {origDev?.full_name || 'N/A'})
                  </option>
                );
              })}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              If task is completed or closed, reporting this bug will automatically reopen it and snapshot original delivery.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Severity *</label>
              <select
                value={newBug.severity}
                onChange={(e) => setNewBug({ ...newBug, severity: e.target.value as BugSeverity })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="critical">Critical (Blocker)</option>
                <option value="high">High (Major defect)</option>
                <option value="medium">Medium</option>
                <option value="low">Low (Trivial)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Original Developer Snapshot</label>
              <select
                value={newBug.original_developer_id}
                onChange={(e) => setNewBug({ ...newBug, original_developer_id: e.target.value, assigned_to: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Defect Description *</label>
            <textarea
              rows={3}
              required
              value={newBug.description}
              onChange={(e) => setNewBug({ ...newBug, description: e.target.value })}
              placeholder="Describe the failure, observed error logs, and impact..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Steps to Reproduce</label>
            <textarea
              rows={3}
              value={newBug.steps_to_reproduce}
              onChange={(e) => setNewBug({ ...newBug, steps_to_reproduce: e.target.value })}
              placeholder="1. Step one&#10;2. Step two&#10;3. Observed discrepancy"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsReportModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!newBug.task_id}>
              Submit Bug Report
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Classify Defect (Manager Action with Justification Requirement) */}
      <Modal
        isOpen={Boolean(classifyTarget)}
        onClose={() => setClassifyTarget(null)}
        title="Managerial Defect Classification"
        description="Determine delivery attribution for payroll rework deduction policy."
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <span className="font-mono text-slate-500 font-bold block">{classifyTarget?.id}</span>
            <div className="font-semibold text-slate-900 mt-0.5">{classifyTarget?.title}</div>
            <p className="text-slate-500 mt-1 line-clamp-2">{classifyTarget?.description}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Classification Decision *</label>
            <div className="space-y-2">
              {/* Option 1: Attributable */}
              <label 
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  (selectedClassification === 'caused_by_original_delivery' || selectedClassification === 'original_delivery_defect')
                    ? 'border-rose-300 bg-rose-50/50 ring-1 ring-rose-400'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <input
                  type="radio"
                  name="classification"
                  value="caused_by_original_delivery"
                  checked={selectedClassification === 'caused_by_original_delivery' || selectedClassification === 'original_delivery_defect'}
                  onChange={() => setSelectedClassification('caused_by_original_delivery')}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    Caused by Original Delivery Defect
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">
                      Subject to Rework Deduction
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Code defect, missing validation, or unhandled regression within original scope. Approved corrective hours enter next-month deduction review.
                  </p>
                </div>
              </label>

              {/* Option 2: Scope Change (Exempt) */}
              <label 
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  (selectedClassification === 'scope_change' || selectedClassification === 'not_caused_by_original_delivery')
                    ? 'border-purple-300 bg-purple-50/50 ring-1 ring-purple-400'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <input
                  type="radio"
                  name="classification"
                  value="scope_change"
                  checked={selectedClassification === 'scope_change' || selectedClassification === 'not_caused_by_original_delivery'}
                  onChange={() => setSelectedClassification('scope_change')}
                  className="mt-0.5 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    Scope Change / Client Requirement Shift
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold">
                      Exempt from Deduction
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Customer shifted expectations or requested modifications after sign-off. Mandatory written justification required. Zero employee deduction.
                  </p>
                </div>
              </label>

              {/* Option 3: External Dependency Issue (Exempt) */}
              <label 
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  selectedClassification === 'external_dependency_issue'
                    ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-400'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <input
                  type="radio"
                  name="classification"
                  value="external_dependency_issue"
                  checked={selectedClassification === 'external_dependency_issue'}
                  onChange={() => setSelectedClassification('external_dependency_issue')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    External Dependency / Infrastructure Outage
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">
                      Exempt from Deduction
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Third-party API downtime, vendor library breaking change, or cloud infrastructure failure outside engineer control. Zero employee deduction.
                  </p>
                </div>
              </label>

              {/* Option 4: Pending Investigation */}
              <label 
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  selectedClassification === 'pending_investigation'
                    ? 'border-amber-300 bg-amber-50/50 ring-1 ring-amber-400'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <input
                  type="radio"
                  name="classification"
                  value="pending_investigation"
                  checked={selectedClassification === 'pending_investigation'}
                  onChange={() => setSelectedClassification('pending_investigation')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">Pending Investigation</div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Root cause investigation underway. No deduction applied until final classification.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Manager Rationale & Classification Notes {isExemptSelected && <span className="text-rose-500">* (Min 10 characters for exempt status)</span>}
            </label>
            <textarea
              rows={3}
              required={isExemptSelected}
              value={classificationNotes}
              onChange={(e) => setClassificationNotes(e.target.value)}
              placeholder={isExemptSelected 
                ? "Mandatory justification: cite client change request document or third-party outage incident ID..." 
                : "Cite specific code audits, scope documents, or client communications..."
              }
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {isExemptSelected && classificationNotes.trim().length > 0 && classificationNotes.trim().length < 10 && (
              <span className="text-[10px] text-rose-600 mt-1 block">
                Needs {10 - classificationNotes.trim().length} more characters of justification.
              </span>
            )}
          </div>

          {/* Past Attribution Decisions */}
          {classifyAttributions.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                Previous Attribution Records ({classifyAttributions.length})
              </span>
              <div className="max-h-32 overflow-y-auto space-y-1 text-[11px]">
                {classifyAttributions.map((a) => (
                  <div key={a.id} className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-700">
                    <span className="font-semibold text-slate-900">{(a.classification || a.new_classification || '').replace(/_/g, ' ')}</span>
                    <span className="text-slate-400 text-[10px] ml-2">{formatDate(a.created_at)}</span>
                    <p className="text-slate-600 italic mt-0.5">{a.justification}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setClassifyTarget(null)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleConfirmClassification}
              disabled={isExemptSelected && classificationNotes.trim().length < 10}
            >
              Save Classification
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Fix Verification (Pass / Fail by Lead or Manager) */}
      <Modal
        isOpen={Boolean(verifyTarget)}
        onClose={() => setVerifyTarget(null)}
        title="Verify Bug Fix and Resolution"
        description={`Authoritative sign-off on ${verifyTarget?.id} - ${verifyTarget?.title}`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-900 block">Defect Context:</span>
            <p className="text-slate-600 mt-1">{verifyTarget?.description}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Verification Decision *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVerifyResult('pass')}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  verifyResult === 'pass'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <Check className="w-4 h-4 text-emerald-600" /> Pass Verification
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Fix is verified and accepted. Closes the defect and marks the underlying task closed.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setVerifyResult('fail')}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  verifyResult === 'fail'
                    ? 'border-rose-500 bg-rose-50/70 ring-1 ring-rose-500'
                    : 'border-slate-200 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <X className="w-4 h-4 text-rose-600" /> Fail Verification
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Defect persists or tests failed. Returns defect to &apos;In Fix&apos; and task to &apos;Under Fix&apos;.
                </p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Verification Sign-Off Notes *
            </label>
            <textarea
              rows={3}
              required
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              placeholder="State reproduction test results, environment, and code verification remarks..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setVerifyTarget(null)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              variant={verifyResult === 'pass' ? 'primary' : 'danger'}
              onClick={handleConfirmVerification}
              disabled={!verifyNotes.trim()}
            >
              Submit Verification
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Defect Details, Time Logs & Attribution History */}
      <Modal
        isOpen={Boolean(detailBug)}
        onClose={() => setDetailBug(null)}
        title={detailBug?.title || 'Defect Details'}
        description={`Bug ID: ${detailBug?.id}`}
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-center gap-2">
            {detailBug && getSeverityBadge(detailBug.severity)}
            {detailBug && getClassificationBadge(detailBug.defect_classification)}
          </div>

          <div>
            <span className="font-semibold text-slate-700 block mb-1">Description:</span>
            <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
              {detailBug?.description}
            </p>
          </div>

          <div>
            <span className="font-semibold text-slate-700 block mb-1">Steps to Reproduce:</span>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {detailBug?.steps_to_reproduce || 'No reproduction steps provided.'}
            </pre>
          </div>

          {/* Linked Time Logs */}
          <div>
            <span className="font-semibold text-slate-700 block mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-slate-500" />
                Corrective Time Logged Against this Defect ({bugTimeLogs.length} entries)
              </span>
              <span className="font-mono font-bold text-amber-700">
                Total: {formatHours(totalReworkHoursOnBug)}
              </span>
            </span>

            {bugTimeLogs.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 italic text-center">
                No corrective maintenance hours logged on this defect yet.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                {bugTimeLogs.map((log) => {
                  const dev = users.find(u => u.id === log.user_id);
                  return (
                    <div key={log.id} className="p-2.5 hover:bg-slate-50 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-800">{dev?.full_name}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-[10px] text-slate-500">{formatDate(log.date)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">&quot;{log.description}&quot;</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-amber-700 block">{formatHours(log.hours)}</span>
                        <span className={cn(
                          "text-[9px] uppercase font-bold px-1 rounded",
                          log.approval_status === 'approved' ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
                        )}>
                          {log.approval_status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attribution History Trail */}
          <div>
            <span className="font-semibold text-slate-700 block mb-2 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-500" />
              Managerial Attribution Audit Trail ({currentAttributions.length})
            </span>
            {currentAttributions.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 italic text-center">
                No recorded attribution changes.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                {currentAttributions.map((a) => {
                  const decider = users.find(u => u.id === (a.reviewer_id || a.decided_by));
                  return (
                    <div key={a.id} className="p-2.5 hover:bg-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">
                          {(a.classification || a.new_classification || '').replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateTime(a.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 italic">
                        &quot;{a.justification}&quot;
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Decider: {decider?.full_name || a.reviewer_name || a.reviewer_id || a.decided_by}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setDetailBug(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
