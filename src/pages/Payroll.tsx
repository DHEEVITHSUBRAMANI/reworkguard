import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  Receipt, 
  RotateCcw, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Calendar, 
  ShieldCheck, 
  Printer, 
  Info, 
  Download,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatHours, formatDate, cn } from '../lib/utils';
import { PayrollRecord, User } from '../types';

export const Payroll: React.FC = () => {
  const { 
    payrollRecords, 
    policy, 
    timeLogs, 
    selectedMonth, 
    calculatePayrollForMonth, 
    finalizePayrollRecord 
  } = useApp();
  const { currentUser, users, canManagePayroll, canFinalizePayroll, isEmployee } = useAuth();

  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  // Derive source month from selected month (e.g. November 2026 draws rework from October 2026)
  const getSourceMonth = (targetMonth: string) => {
    const [year, month] = targetMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    const prevYear = date.getFullYear();
    const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
    return `${prevYear}-${prevMonth}`;
  };

  const sourceMonth = getSourceMonth(selectedMonth);

  // Records for active month
  let records = payrollRecords.filter(r => r.period === selectedMonth);
  if (records.length === 0) {
    // If no records for this period yet, use existing demo records or calculate
    records = payrollRecords;
  }

  // If user is employee, show only their own payslip
  if (isEmployee) {
    records = records.filter(r => r.employee_id === currentUser.id);
  }

  const handleRecalculate = () => {
    calculatePayrollForMonth(selectedMonth, sourceMonth);
  };

  const handleFinalize = (recordId: string) => {
    finalizePayrollRecord(recordId);
  };

  const totalPayout = records.reduce((sum, r) => sum + r.net_payout, 0);
  const totalDeductions = records.reduce((sum, r) => sum + r.deduction_amount, 0);
  const totalAttributableHours = records.reduce((sum, r) => sum + r.attributable_corrective_hours, 0);

  const getRecordUser = (userId: string): User | undefined => {
    return users.find(u => u.id === userId);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner explaining deduction timing */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-blue-950 block">Next-Month Rework Deduction Policy Active:</span>
            <p className="mt-0.5 leading-relaxed text-blue-800">
              Payroll period <strong className="font-semibold">{selectedMonth}</strong> applies deductions calculated from approved corrective maintenance hours in <strong className="font-semibold">{sourceMonth}</strong>.
              Each employee receives <strong className="font-semibold">{policy.monthly_grace_hours} free grace hours</strong> per month. Maximum deduction is capped at <strong className="font-semibold">{policy.max_deduction_cap_percentage}%</strong> of base monthly salary.
            </p>
          </div>
        </div>

        {canManagePayroll && (
          <Button
            size="sm"
            variant="outline"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleRecalculate}
            className="shrink-0"
          >
            Recalculate {selectedMonth}
          </Button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Net Payroll Disbursal */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Net Disbursal</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalPayout)}</div>
            <span className="text-xs text-slate-400 font-mono">{records.length} employees</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Scheduled for disbursal after audit</span>
        </div>

        {/* Total Rework Deductions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Rework Deductions</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-rose-600">{formatCurrency(totalDeductions)}</div>
            <Badge variant={totalDeductions > 0 ? 'danger' : 'success'}>
              {totalAttributableHours}h rework
            </Badge>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Quality savings recovered via policy</span>
        </div>

        {/* Policy Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Policy Rules</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xs space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Rate per Rework Hour:</span>
              <strong className="text-slate-900 font-mono">{policy.deduction_rate_percentage}% of rate</strong>
            </div>
            <div className="flex justify-between">
              <span>Monthly Grace:</span>
              <strong className="text-emerald-700 font-mono">{policy.monthly_grace_hours}h free</strong>
            </div>
            <div className="flex justify-between">
              <span>Salary Deduction Cap:</span>
              <strong className="text-amber-700 font-mono">{policy.max_deduction_cap_percentage}% max</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Payroll Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Payroll Ledger Preview ({selectedMonth})
          </h3>
          <span className="text-xs text-slate-500">
            Source Rework Month: <strong className="text-slate-800">{sourceMonth}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Base Monthly Salary</th>
                <th className="px-4 py-3.5">Hourly Rate</th>
                <th className="px-4 py-3.5">Rework Hours (Attr / Grace)</th>
                <th className="px-4 py-3.5">Gross Deduction</th>
                <th className="px-4 py-3.5">Net Payout</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => {
                const emp = getRecordUser(record.employee_id);
                const hasDeduction = record.deduction_amount > 0;

                return (
                  <tr
                    key={record.id}
                    className={cn(
                      'hover:bg-slate-50/70 transition-colors',
                      hasDeduction && 'bg-rose-50/10'
                    )}
                  >
                    {/* Employee */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={emp?.avatar_url}
                          alt={emp?.full_name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{emp?.full_name}</div>
                          <div className="text-[11px] text-slate-500">{emp?.department}</div>
                        </div>
                      </div>
                    </td>

                    {/* Base Salary */}
                    <td className="px-4 py-4 whitespace-nowrap font-mono font-medium text-slate-800">
                      {formatCurrency(record.base_salary)}
                    </td>

                    {/* Hourly Rate */}
                    <td className="px-4 py-4 whitespace-nowrap font-mono text-slate-600">
                      ${record.hourly_rate}/hr
                    </td>

                    {/* Rework Hours Breakdown */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <span className={cn(
                          'font-mono font-bold',
                          record.attributable_corrective_hours > 0 ? 'text-rose-600' : 'text-slate-400'
                        )}>
                          {record.attributable_corrective_hours}h attr
                        </span>
                        <span className="text-slate-400 mx-1">|</span>
                        <span className="text-[11px] text-emerald-700 font-mono font-medium">
                          {policy.monthly_grace_hours}h grace
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        Billable rework: {record.billable_deduction_hours}h
                      </span>
                    </td>

                    {/* Deduction Amount */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={cn(
                        'font-mono font-bold text-xs',
                        hasDeduction ? 'text-rose-600' : 'text-slate-400'
                      )}>
                        {hasDeduction ? `-${formatCurrency(record.deduction_amount)}` : '$0.00'}
                      </span>
                      {record.deduction_cap_applied && (
                        <span className="block text-[10px] text-amber-600 font-bold uppercase mt-0.5">
                          Cap Applied ({policy.max_deduction_cap_percentage}%)
                        </span>
                      )}
                    </td>

                    {/* Net Payout */}
                    <td className="px-4 py-4 whitespace-nowrap font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(record.net_payout)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                        record.status === 'finalized' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        record.status === 'reviewed' && 'bg-blue-50 text-blue-700 border-blue-200',
                        record.status === 'draft' && 'bg-amber-50 text-amber-700 border-amber-200'
                      )}>
                        {record.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedRecord(record);
                            setIsPayslipOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          Payslip
                        </button>

                        {canFinalizePayroll && record.status !== 'finalized' && (
                          <button
                            onClick={() => handleFinalize(record.id)}
                            className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
                            title="Authorize and finalize payslip"
                          >
                            Finalize
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Full Payslip Details & Transparent Audit Breakdown */}
      <Modal
        isOpen={isPayslipOpen && Boolean(selectedRecord)}
        onClose={() => setIsPayslipOpen(false)}
        title="Employee Monthly Payslip & Audit Breakdown"
        description={`Period: ${selectedRecord?.period} | Record ID: ${selectedRecord?.id}`}
        maxWidth="2xl"
      >
        {selectedRecord && (
          <div className="space-y-5 text-xs text-slate-700">
            {/* Header info */}
            {(() => {
              const emp = getRecordUser(selectedRecord.employee_id);
              return (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={emp?.avatar_url} alt={emp?.full_name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-xs" />
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{emp?.full_name}</h4>
                      <p className="text-slate-500 text-xs">{emp?.department} • {emp?.email}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
                        <span>Rate: ${selectedRecord.hourly_rate}/hr</span>
                        <span>•</span>
                        <span>Quality Score: {emp?.quality_score}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Payslip Status</span>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border inline-block mt-1',
                      selectedRecord.status === 'finalized' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    )}>
                      {selectedRecord.status}
                    </span>
                    {selectedRecord.finalized_at && (
                      <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                        Finalized: {formatDate(selectedRecord.finalized_at)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Compensation Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-3 bg-slate-50/70 border-b border-slate-200 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Earnings & Salary Schedule
              </div>
              <div className="p-4 space-y-2.5">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="font-medium text-slate-600">Base Monthly Contract Salary:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(selectedRecord.base_salary)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="font-medium text-slate-600">Regular Hours Worked (160h standard):</span>
                  <span className="font-mono text-slate-700">{selectedRecord.regular_hours_worked} hrs</span>
                </div>
              </div>
            </div>

            {/* Deduction Calculation Breakdown */}
            <div className="border border-rose-200 rounded-xl overflow-hidden bg-rose-50/20">
              <div className="p-3 bg-rose-50/70 border-b border-rose-200 font-bold text-rose-900 uppercase tracking-wider text-[11px] flex justify-between items-center">
                <span>Rework Quality Deductions ({selectedRecord.source_month} Attributable Hours)</span>
                <span className="text-rose-700 font-mono text-xs">Policy: 100% Rate</span>
              </div>

              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-rose-100/70">
                  <span className="text-slate-600">Total Corrective Maintenance Hours Logged:</span>
                  <span className="font-mono font-medium text-slate-800">{selectedRecord.total_corrective_hours} hrs</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-rose-100/70">
                  <span className="text-slate-600">Attributable to Original Delivery Defects:</span>
                  <span className="font-mono font-bold text-rose-700">{selectedRecord.attributable_corrective_hours} hrs</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-rose-100/70">
                  <span className="text-emerald-700 font-medium">Less Monthly Grace Hours (Company Benefit):</span>
                  <span className="font-mono font-bold text-emerald-700">-{policy.monthly_grace_hours} hrs</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-rose-100/70">
                  <span className="font-semibold text-slate-800">Net Billable Deductible Hours:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedRecord.billable_deduction_hours} hrs</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-rose-100/70">
                  <span className="text-slate-600">Deduction Calculation ({selectedRecord.billable_deduction_hours}h × ${selectedRecord.hourly_rate}/hr × {policy.deduction_rate_percentage}%):</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(selectedRecord.gross_deduction_amount)}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-rose-100/70">
                  <span className="text-slate-600">Maximum Deduction Cap ({policy.max_deduction_cap_percentage}% of Base Salary):</span>
                  <span className="font-mono text-slate-600">{formatCurrency(selectedRecord.base_salary * (policy.max_deduction_cap_percentage / 100))}</span>
                </div>

                <div className="flex justify-between items-center py-2 bg-rose-100/50 px-3 rounded-lg font-bold text-rose-900">
                  <span>Total Authorized Payroll Deduction:</span>
                  <span className="font-mono text-sm">-{formatCurrency(selectedRecord.deduction_amount)}</span>
                </div>

                {/* Itemized Deduction Line Items (Source Time Logs & Bugs) */}
                {selectedRecord.attributable_corrective_hours > 0 && (
                  <div className="mt-3 pt-3 border-t border-rose-200">
                    <span className="font-bold text-[11px] text-slate-800 uppercase tracking-wider block mb-2">
                      Itemized Deduction Breakdown (Source Audit Items)
                    </span>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {timeLogs
                        .filter(l => 
                          l.user_id === selectedRecord.employee_id && 
                          l.date.startsWith(selectedRecord.source_month) && 
                          l.attribution_status === 'attributable' && 
                          l.approval_status === 'approved'
                        )
                        .map(log => (
                          <div key={log.id} className="p-2 bg-white rounded border border-rose-200/80 flex items-center justify-between text-slate-700">
                            <div>
                              <span className="font-bold text-slate-900">{log.hours}h</span> @ ${selectedRecord.hourly_rate}/hr
                              <span className="text-slate-400 mx-1.5">•</span>
                              <span className="text-rose-600 font-semibold">{log.bug_id || 'Defect Rework'}</span>
                              <p className="font-sans text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">&quot;{log.description}&quot;</p>
                            </div>
                            <span className="font-bold text-rose-700">
                              -${(log.hours * selectedRecord.hourly_rate).toFixed(2)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Net Salary Payable */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Net Disbursal Amount</span>
                <span className="text-xs text-slate-300">Base Salary minus Policy Deductions</span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {formatCurrency(selectedRecord.net_payout)}
              </div>
            </div>

            {/* Audit Notes */}
            {selectedRecord.notes && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs">
                <span className="font-bold text-slate-800 block">Audit Notes:</span>
                <p className="mt-0.5 leading-relaxed italic">{selectedRecord.notes}</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                Audited & Verified via ReworkGuard Payroll Engine
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print Slip
                </Button>
                <Button size="sm" onClick={() => setIsPayslipOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
