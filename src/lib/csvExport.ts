/**
 * ReworkGuard Authoritative CSV Export Utility
 * Provides RFC 4180 compliant CSV serialization with quote escaping
 * and role-based data projection.
 */

import { Task, TimeLog, PayrollRecord, AuditLog, User, Module, BugReport } from '../types';
import { formatCurrency, formatDate } from './utils';

/**
 * Escapes a cell value according to RFC 4180
 */
export function escapeCSVCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const stringValue = String(value);
  // If the cell contains quotes, commas, or newlines, quote it and escape internal quotes
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return `"${stringValue}"`;
}

/**
 * Triggers a browser download of a CSV string
 */
export function triggerCSVDownload(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Tasks to CSV
 */
export function exportTasksToCSV(
  tasks: Task[], 
  users: User[], 
  modules: Module[],
  filename: string = `reworkguard-tasks-${new Date().toISOString().split('T')[0]}`
): void {
  const headers = [
    'Task ID',
    'Title',
    'Module',
    'Assigned Engineer',
    'Original Delivery Engineer',
    'Status',
    'Priority',
    'Committed Due Date',
    'Actual Completion Date',
    'Delivered On Time',
    'Corrective Hours',
    'Created At'
  ];

  const rows = tasks.map(t => {
    const assignedUser = users.find(u => u.id === (t.assigned_to || t.assigned_employee_id));
    const origUser = users.find(u => u.id === (t.original_delivery_employee_id || t.assigned_to));
    const mod = modules.find(m => m.id === t.module_id);

    return [
      t.id,
      t.title,
      mod?.name || t.module_id,
      assignedUser?.full_name || t.assigned_to || '',
      origUser?.full_name || t.original_delivery_employee_id || '',
      t.status,
      t.priority || 'medium',
      t.committed_due_date || '',
      t.actual_completion_date || '',
      t.is_delivered_on_time ? 'YES' : 'NO',
      t.corrective_hours || 0,
      t.created_at || ''
    ].map(escapeCSVCell).join(',');
  });

  const csvContent = [headers.map(escapeCSVCell).join(','), ...rows].join('\r\n');
  triggerCSVDownload(filename, csvContent);
}

/**
 * Export Time Logs to CSV
 */
export function exportTimeLogsToCSV(
  timeLogs: TimeLog[],
  users: User[],
  bugs: BugReport[],
  tasks: Task[],
  filename: string = `reworkguard-timelogs-${new Date().toISOString().split('T')[0]}`
): void {
  const headers = [
    'Log ID',
    'Work Date',
    'Employee',
    'Work Type',
    'Hours Logged',
    'Task Title',
    'Linked Defect',
    'Approval Status',
    'Attribution Status',
    'Reviewer',
    'Review Timestamp',
    'Payroll Processed Locked',
    'Description',
    'Exemption Reason'
  ];

  const rows = timeLogs.map(l => {
    const user = users.find(u => u.id === (l.user_id || l.employee_id));
    const bug = bugs.find(b => b.id === l.bug_id);
    const task = tasks.find(t => t.id === l.task_id);

    return [
      l.id,
      l.work_date || l.date,
      user?.full_name || l.user_id,
      l.work_type || l.log_type,
      l.hours,
      task?.title || l.task_id || '',
      bug?.title || l.bug_id || 'N/A',
      l.approval_status,
      l.attribution_status || 'exempt',
      l.reviewer_name || l.reviewer_id || '',
      l.review_timestamp || l.approved_at || '',
      l.is_payroll_processed ? 'LOCKED' : 'PENDING_FINALIZATION',
      l.description || '',
      l.exempt_reason || ''
    ].map(escapeCSVCell).join(',');
  });

  const csvContent = [headers.map(escapeCSVCell).join(','), ...rows].join('\r\n');
  triggerCSVDownload(filename, csvContent);
}

/**
 * Export Payroll Summary to CSV
 */
export function exportPayrollToCSV(
  payrollRecords: PayrollRecord[],
  users: User[],
  period: string,
  filename: string = `reworkguard-payroll-${period}`
): void {
  const headers = [
    'Record ID',
    'Payroll Month',
    'Source Rework Month',
    'Employee ID',
    'Employee Name',
    'Department',
    'Base Monthly Salary',
    'Hourly Rate',
    'Attributable Corrective Hours',
    'Grace Hours Applied',
    'Billable Deductible Hours',
    'Gross Quality Deduction',
    'Deduction Cap Applied',
    'Final Deduction Amount',
    'Other Authorized Adjustments',
    'Net Disbursal Salary',
    'Processing Status',
    'Finalized At',
    'Audit Notes'
  ];

  const rows = payrollRecords.map(r => {
    const emp = users.find(u => u.id === r.employee_id);
    return [
      r.id,
      r.period || r.payroll_month,
      r.source_month || '',
      r.employee_id,
      emp?.full_name || r.employee_id,
      emp?.department || '',
      r.base_salary,
      r.hourly_rate,
      r.attributable_corrective_hours || 0,
      r.exempt_corrective_hours || 0,
      r.billable_deduction_hours || 0,
      r.gross_deduction_amount || 0,
      r.deduction_cap_applied ? 'YES' : 'NO',
      r.deduction_amount,
      r.other_authorized_adjustments || 0,
      r.net_payout,
      r.status || r.processing_status,
      r.finalized_at || '',
      r.notes || ''
    ].map(escapeCSVCell).join(',');
  });

  const csvContent = [headers.map(escapeCSVCell).join(','), ...rows].join('\r\n');
  triggerCSVDownload(filename, csvContent);
}

/**
 * Export Audit Trail to CSV
 */
export function exportAuditTrailToCSV(
  auditLogs: AuditLog[],
  filename: string = `reworkguard-audittrail-${new Date().toISOString().split('T')[0]}`
): void {
  const headers = [
    'Audit ID',
    'Timestamp',
    'Actor Name',
    'Actor ID',
    'Action',
    'Entity Type',
    'Entity ID',
    'Details'
  ];

  const rows = auditLogs.map(l => [
    l.id,
    l.created_at || l.timestamp,
    l.user_name || l.actor_name || '',
    l.user_id || l.actor_id || '',
    l.action,
    l.entity_type,
    l.entity_id,
    l.details || ''
  ].map(escapeCSVCell).join(','));

  const csvContent = [headers.map(escapeCSVCell).join(','), ...rows].join('\r\n');
  triggerCSVDownload(filename, csvContent);
}

/**
 * Export Quality & Analytics Metrics to CSV
 */
export function exportQualityMetricsToCSV(
  metrics: Array<{
    name: string;
    department: string;
    deliveriesCount: number;
    reopenedCount: number;
    reopenRate: number;
    attributableHours: number;
    exemptHours: number;
    avgFixTimeHours: number;
    unresolvedBugs: number;
    qualityScore: number;
  }>,
  period: string,
  filename: string = `reworkguard-quality-analytics-${period}`
): void {
  const headers = [
    'Employee Name',
    'Department',
    'Total Completed Deliveries',
    'Deliveries Reopened',
    'Reopen Rate (%)',
    'Attributable Corrective Hours',
    'Exempt Corrective Hours',
    'Average Fix Time (Hours)',
    'Unresolved Linked Defects',
    'Quality Score (%)'
  ];

  const rows = metrics.map(m => [
    m.name,
    m.department,
    m.deliveriesCount,
    m.reopenedCount,
    m.reopenRate.toFixed(1) + '%',
    m.attributableHours,
    m.exemptHours,
    m.avgFixTimeHours.toFixed(1),
    m.unresolvedBugs,
    m.qualityScore + '%'
  ].map(escapeCSVCell).join(','));

  const csvContent = [headers.map(escapeCSVCell).join(','), ...rows].join('\r\n');
  triggerCSVDownload(filename, csvContent);
}

/**
 * Export Defect Reports to CSV
 */
export function exportBugsToCSV(
  bugs: BugReport[],
  tasks: Task[],
  modules: Module[],
  users: User[],
  filename: string = `reworkguard-defects-${new Date().toISOString().split('T')[0]}`
): void {
  const headers = [
    'Bug ID',
    'Title',
    'Severity',
    'Status',
    'Attribution Classification',
    'Linked Task',
    'Module',
    'Original Developer',
    'Assigned To',
    'Reporter',
    'Date Found',
    'Fix Verification',
    'Justification Notes'
  ];

  const rows = bugs.map(b => {
    const task = tasks.find(t => t.id === (b.original_task_id || b.task_id));
    const mod = modules.find(m => m.id === b.module_id);
    const origDev = users.find(u => u.id === b.original_developer_id);
    const assigned = users.find(u => u.id === b.assigned_to);
    const reporter = users.find(u => u.id === b.reporter_id);

    return [
      b.id,
      b.title,
      b.severity,
      b.status,
      b.defect_classification || b.attribution_classification || 'pending_investigation',
      task?.title || b.original_task_id || b.task_id || '',
      mod?.name || b.module_id || '',
      origDev?.full_name || b.original_developer_id || '',
      assigned?.full_name || b.assigned_to || '',
      reporter?.full_name || b.reporter_id || '',
      b.date_found || '',
      b.fix_verification_status || 'pending',
      b.classification_notes || b.classification_justification || ''
    ].map(escapeCSVCell).join(',');
  });

  const csvContent = [headers.map(escapeCSVCell).join(','), ...rows].join('\r\n');
  triggerCSVDownload(filename, csvContent);
}

