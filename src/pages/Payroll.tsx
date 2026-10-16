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
  AlertCircle,
  Search,
  Filter,
  PlusCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Lock,
  ChevronDown
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatHours, formatDate, cn } from '../lib/utils';
import { PayrollRecord, User, AdjustmentType, PayrollAdjustment } from '../types';

export const Payroll: React.FC = () => {
  const { 
    payrollRecords, 
    deductionItems,
    payrollAdjustments,
    policy, 
    timeLogs, 
    selectedMonth, 
    setSelectedMonth,
    calculatePayrollForMonth, 
    finalizePayrollRecord,
    addPayrollAdjustment
  } = useApp();
  const { currentUser, users, canManagePayroll, canFinalizePayroll, isEmployee } = useAuth();

  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [targetRecordForAdjustment, setTargetRecordForAdjustment] = useState<PayrollRecord | null>(null);

  // Adjustment form state
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('reversal');
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('50');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'under_review' | 'approved' | 'finalized'>('all');
  const [deductionFilter, setDeductionFilter] = useState<'all' | 'with_deductions' | 'zero_deductions'>('all');
  const [calcNotice, setCalcNotice] = useState<string | null>(null);

  // Derive source month from selected month (destination_month_offset)
  const getSourceMonth = (targetMonth: string) => {
    const [year, month] = targetMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    const prevYear = date.getFullYear();
    const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
    return `${prevYear}-${prevMonth}`;
  };

  const sourceMonth = getSourceMonth(selectedMonth);

  // Records for active period
  let periodRecords = payrollRecords.filter(r => r.period === selectedMonth || r.payroll_month === selectedMonth);
  if (periodRecords.length === 0) {
    periodRecords = payrollRecords;
  }

  // Filter for role and search
  let filteredRecords = periodRecords;
  if (isEmployee) {
    filteredRecords = filteredRecords.filter(r => r.employee_id === currentUser.id);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredRecords = filteredRecords.filter(r => {
      const emp = users.find(u => u.id === r.employee_id);
      return (
        emp?.full_name.toLowerCase().includes(q) ||
        emp?.email.toLowerCase().includes(q) ||
        emp?.department?.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }

  if (statusFilter !== 'all') {
    filteredRecords = filteredRecords.filter(r => (r.status || r.processing_status) === statusFilter);
  }

  if (deductionFilter === 'with_deductions') {
    filteredRecords = filteredRecords.filter(r => r.deduction_amount > 0);
  } else if (deductionFilter === 'zero_deductions') {
    filteredRecords = filteredRecords.filter(r => r.deduction_amount === 0);
  }

  // Reconciliation Metrics
  const totalPayout = filteredRecords.reduce((sum, r) => sum + r.net_payout, 0);
  const totalProposedDeductions = filteredRecords
    .filter(r => r.status === 'draft' || r.status === 'under_review')
    .reduce((sum, r) => sum + r.deduction_amount, 0);
  const totalApprovedDeductions = filteredRecords
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + r.deduction_amount, 0);
  const totalFinalizedDeductions = filteredRecords
    .filter(r => r.status === 'finalized')
    .reduce((sum, r) => sum + r.deduction_amount, 0);
  const totalAllDeductions = filteredRecords.reduce((sum, r) => sum + r.deduction_amount, 0);
  const totalAttributableHours = filteredRecords.reduce((sum, r) => sum + (r.attributable_corrective_hours || 0), 0);
  const totalExemptHours = filteredRecords.reduce((sum, r) => sum + (r.exempt_corrective_hours || 0), 0);
  const totalAdjustments = filteredRecords.reduce((sum, r) => sum + (r.other_authorized_adjustments || 0), 0);

  const handleRecalculate = () => {
    const summary = calculatePayrollForMonth(selectedMonth, sourceMonth);
    setCalcNotice(`Payroll calculated for ${selectedMonth} based on ${sourceMonth} rework logs (${summary.deductionItems.length} deduction line items processed).`);
    setTimeout(() => setCalcNotice(null), 5000);
  };

  const handleFinalize = async (recordId: string) => {
    const res = await finalizePayrollRecord(recordId);
    if (!res.success) {
      alert(res.error || 'Failed to finalize payroll record');
    }
  };

  const handleOpenAdjustmentModal = (record: PayrollRecord) => {
    setTargetRecordForAdjustment(record);
    setAdjustmentType('reversal');
    setAdjustmentAmount('50');
    setAdjustmentReason('');
    setAdjustmentError(null);
    setIsAdjustmentModalOpen(true);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRecordForAdjustment) return;

    const parsedAmount = parseFloat(adjustmentAmount);
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      setAdjustmentError('Please enter a valid non-zero adjustment amount.');
      return;
    }

    if (!adjustmentReason || adjustmentReason.trim().length < 10) {
      setAdjustmentError('A written justification of at least 10 characters is mandatory.');
      return;
    }

    setIsSubmittingAdjustment(true);
    setAdjustmentError(null);

    const res = await addPayrollAdjustment(
      targetRecordForAdjustment.id,
      adjustmentType,
      parsedAmount,
      adjustmentReason.trim()
    );

    setIsSubmittingAdjustment(false);
    if (res.success) {
      setIsAdjustmentModalOpen(false);
      // Update selectedRecord if payslip is currently viewing this record
      if (selectedRecord && selectedRecord.id === targetRecordForAdjustment.id && res.updatedRecord) {
        setSelectedRecord(res.updatedRecord);
      }
    } else {
      setAdjustmentError(res.error || 'Failed to create payroll adjustment.');
    }
  };

  const getRecordUser = (userId: string): User | undefined => {
    return users.find(u => u.id === userId);
  };

  const getRecordDeductionItems = (recordId: string) => {
    return deductionItems.filter(i => i.payroll_record_id === recordId);
  };

  const getRecordAdjustments = (recordId: string) => {
    return payrollAdjustments.filter(a => a.payroll_record_id === recordId);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner explaining deduction timing & compliance */}
      <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 rounded-xl text-blue-900 text-xs shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-950 text-sm">Next-Month Rework Deduction Policy Active</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono text-[10px] font-bold">Policy v2.0</span>
            </div>
            <p className="mt-1 leading-relaxed text-blue-800">
              Target Payroll Period: <strong className="font-semibold text-blue-950">{selectedMonth}</strong> draws approved rework from <strong className="font-semibold text-blue-950">{sourceMonth}</strong>.
              Each employee receives <strong className="font-semibold text-emerald-800">{policy.monthly_grace_hours} free grace hours</strong> per month. Maximum deduction is capped at <strong className="font-semibold text-amber-900">{policy.max_deduction_cap_percentage}%</strong> of base salary.
            </p>
            <p className="mt-1 text-[11px] text-blue-700/80 italic">
              Notice: Proposed deductions represent quality-based payroll adjustments pursuant to corporate policy, not automatic cash withholdings.
            </p>
          </div>
        </div>

        {canManagePayroll && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleRecalculate}
              className="bg-white hover:bg-slate-50 text-blue-900 border-blue-300 shadow-2xs"
            >
              Recalculate {selectedMonth}
            </Button>
          </div>
        )}
      </div>

      {calcNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{calcNotice}</span>
        </div>
      )}

      {/* Reconciliation Metrics Row (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Net Disbursal */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Net Disbursal</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-slate-900">{formatCurrency(totalPayout)}</div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 font-mono">
              <span>{filteredRecords.length} payslips</span>
              {totalAdjustments !== 0 && (
                <span className={cn(totalAdjustments > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  {totalAdjustments > 0 ? `+${formatCurrency(totalAdjustments)}` : formatCurrency(totalAdjustments)} adj
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Proposed Deductions */}
        <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Proposed Deductions</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-amber-700">{formatCurrency(totalProposedDeductions)}</div>
            <div className="text-[11px] text-amber-800/80 mt-1 flex items-center gap-1">
              <span>Draft & pending review</span>
            </div>
          </div>
        </div>

        {/* 3. Approved / Finalized Deductions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Verified Deductions</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-rose-600">
              {formatCurrency(totalApprovedDeductions + totalFinalizedDeductions)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono flex justify-between">
              <span>Fin: {formatCurrency(totalFinalizedDeductions)}</span>
              <span>Appr: {formatCurrency(totalApprovedDeductions)}</span>
            </div>
          </div>
        </div>

        {/* 4. Quality Rework Hours */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rework Hours</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-slate-900 font-mono">
              {totalAttributableHours}h <span className="text-xs font-normal text-slate-500">attr</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-mono mt-1">
              {totalExemptHours}h exempt / non-defect
            </div>
          </div>
        </div>

        {/* 5. Policy Guardrails */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Policy Formula</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-[11px] space-y-0.5 text-slate-600 font-mono">
            <div className="flex justify-between">
              <span>Rate:</span>
              <strong className="text-slate-900">{policy.deduction_rate_percentage}%</strong>
            </div>
            <div className="flex justify-between">
              <span>Grace:</span>
              <strong className="text-emerald-700">{policy.monthly_grace_hours}h free</strong>
            </div>
            <div className="flex justify-between">
              <span>Max Cap:</span>
              <strong className="text-amber-700">{policy.max_deduction_cap_percentage}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Controls Bar: Month, Search, Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Target Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-mono font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="2026-11">2026-11 (November)</option>
              <option value="2026-12">2026-12 (December)</option>
              <option value="2026-10">2026-10 (October)</option>
              <option value="2027-01">2027-01 (January)</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee or record..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg text-xs">
            <span className="text-[11px] text-slate-500 px-1.5 font-medium">Status:</span>
            {(['all', 'draft', 'approved', 'finalized'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-colors',
                  statusFilter === st ? 'bg-white shadow-2xs text-slate-900 font-bold border border-slate-200' : 'text-slate-500 hover:text-slate-900'
                )}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Deductions Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg text-xs">
            <span className="text-[11px] text-slate-500 px-1.5 font-medium">Filter:</span>
            <button
              onClick={() => setDeductionFilter('all')}
              className={cn(
                'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
                deductionFilter === 'all' ? 'bg-white shadow-2xs text-slate-900 font-bold border border-slate-200' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              All
            </button>
            <button
              onClick={() => setDeductionFilter('with_deductions')}
              className={cn(
                'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
                deductionFilter === 'with_deductions' ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              With Deductions
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 text-right">
          Showing <strong className="text-slate-800">{filteredRecords.length}</strong> of {periodRecords.length} records
        </div>
      </div>

      {/* Payroll Records Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Payroll Ledger ({selectedMonth})
            </h3>
            <span className="text-[11px] text-slate-500 font-normal">
              — Sourced from {sourceMonth} approved defect rework
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Base Salary</th>
                <th className="px-4 py-3.5">Rate / Basis</th>
                <th className="px-4 py-3.5">Rework Hours</th>
                <th className="px-4 py-3.5">Proposed Deduction</th>
                <th className="px-4 py-3.5">Adjustments</th>
                <th className="px-4 py-3.5">Net Payout</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                    No payroll records matching the current filter. Try recalculating or adjusting filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const emp = getRecordUser(record.employee_id);
                  const hasDeduction = record.deduction_amount > 0;
                  const itemBreakdown = getRecordDeductionItems(record.id);
                  const recordAdjs = getRecordAdjustments(record.id);
                  const isFinal = record.status === 'finalized';

                  return (
                    <tr
                      key={record.id}
                      className={cn(
                        'hover:bg-slate-50/70 transition-colors',
                        hasDeduction && 'bg-rose-50/10'
                      )}
                    >
                      {/* Employee */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={emp?.avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100`}
                            alt={emp?.full_name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                          />
                          <div>
                            <div className="font-semibold text-slate-900">{emp?.full_name}</div>
                            <div className="text-[11px] text-slate-500">{emp?.department} • {emp?.role}</div>
                          </div>
                        </div>
                      </td>

                      {/* Base Salary */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono font-medium text-slate-800">
                        {formatCurrency(record.base_salary)}
                      </td>

                      {/* Hourly Rate */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-600">
                        <span>${record.hourly_rate}/hr</span>
                        <span className="block text-[10px] text-slate-400">contract rate</span>
                      </td>

                      {/* Rework Hours Breakdown */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-mono text-xs">
                          <span className={cn(
                            'font-bold',
                            (record.attributable_corrective_hours || 0) > 0 ? 'text-rose-600' : 'text-slate-400'
                          )}>
                            {record.attributable_corrective_hours || 0}h attr
                          </span>
                          <span className="text-slate-400">/</span>
                          <span className="text-[11px] text-emerald-700 font-medium">
                            {policy.monthly_grace_hours}h grace
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          Billable: {record.billable_deduction_hours || 0}h ({itemBreakdown.length} line items)
                        </span>
                      </td>

                      {/* Deduction Amount */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono">
                        <span className={cn(
                          'font-bold text-xs',
                          hasDeduction ? 'text-rose-600' : 'text-slate-400'
                        )}>
                          {hasDeduction ? `-${formatCurrency(record.deduction_amount)}` : '$0.00'}
                        </span>
                        {record.deduction_cap_applied && (
                          <span className="block text-[10px] text-amber-600 font-bold uppercase mt-0.5">
                            Capped @ {policy.max_deduction_cap_percentage}%
                          </span>
                        )}
                      </td>

                      {/* Adjustments */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs">
                        {record.other_authorized_adjustments ? (
                          <span className={cn(
                            'font-bold',
                            record.other_authorized_adjustments > 0 ? 'text-emerald-600' : 'text-rose-600'
                          )}>
                            {record.other_authorized_adjustments > 0 ? `+${formatCurrency(record.other_authorized_adjustments)}` : formatCurrency(record.other_authorized_adjustments)}
                          </span>
                        ) : (
                          <span className="text-slate-400">$0.00</span>
                        )}
                        {recordAdjs.length > 0 && (
                          <span className="block text-[10px] text-slate-400 font-sans">
                            {recordAdjs.length} adjustment(s)
                          </span>
                        )}
                      </td>

                      {/* Net Payout */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(record.net_payout)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border inline-flex items-center gap-1',
                          record.status === 'finalized' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          record.status === 'approved' && 'bg-blue-50 text-blue-700 border-blue-200',
                          record.status === 'under_review' && 'bg-purple-50 text-purple-700 border-purple-200',
                          record.status === 'draft' && 'bg-amber-50 text-amber-700 border-amber-200'
                        )}>
                          {record.status === 'finalized' && <Lock className="w-2.5 h-2.5 text-emerald-600" />}
                          {record.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRecord(record);
                              setIsPayslipOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1 shadow-2xs"
                            title="View official itemized payslip"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            Payslip
                          </button>

                          {canFinalizePayroll && !isFinal && (
                            <button
                              onClick={() => handleFinalize(record.id)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs flex items-center gap-1"
                              title="Authorize and finalize payslip (locks time logs)"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                              Finalize
                            </button>
                          )}

                          {canManagePayroll && (
                            <button
                              onClick={() => handleOpenAdjustmentModal(record)}
                              className="px-2 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                              title="Create controlled adjustment or reversal"
                            >
                              Adjust
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

      {/* Modal: Controlled Post-Finalization Adjustment / Reversal */}
      <Modal
        isOpen={isAdjustmentModalOpen && Boolean(targetRecordForAdjustment)}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title="Authorize Payroll Adjustment / Reversal"
        description={`Record ID: ${targetRecordForAdjustment?.id} | Employee: ${getRecordUser(targetRecordForAdjustment?.employee_id || '')?.full_name}`}
        maxWidth="md"
      >
        {targetRecordForAdjustment && (
          <form onSubmit={handleSubmitAdjustment} className="space-y-4 text-xs text-slate-700">
            {adjustmentError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{adjustmentError}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Current Net Disbursal:</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(targetRecordForAdjustment.net_payout)}</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="text-slate-500">Current Deduction:</span>
                <span className="font-mono font-semibold text-rose-600">-{formatCurrency(targetRecordForAdjustment.deduction_amount)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adjustment Type
              </label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="reversal">Reversal / Reimbursement (Credit back to employee)</option>
                <option value="policy_relief">Policy Relief / Discretionary Waiver (Credit back)</option>
                <option value="dispute_settlement">Dispute Settlement</option>
                <option value="correction">Calculation Correction</option>
                <option value="other">Other Authorized Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adjustment Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                placeholder="e.g. 50.00 (positive increases net pay)"
                className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Positive value increases employee payout; negative value reduces it.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Written Justification (Min 10 characters)
              </label>
              <textarea
                rows={3}
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="State the audit rationale, ticket reference, or policy justification for this change..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Live Calculation Preview */}
            {(() => {
              const parsed = parseFloat(adjustmentAmount) || 0;
              const projectedNet = targetRecordForAdjustment.base_salary - targetRecordForAdjustment.deduction_amount + (targetRecordForAdjustment.other_authorized_adjustments || 0) + parsed;
              return (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <span className="font-semibold text-blue-900">Projected New Net Payout:</span>
                  <span className="font-mono font-bold text-blue-950 text-sm">
                    {formatCurrency(projectedNet)}
                  </span>
                </div>
              );
            })()}

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsAdjustmentModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={isSubmittingAdjustment}>
                {isSubmittingAdjustment ? 'Authorizing...' : 'Authorize Adjustment'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Full Payslip Details & Transparent Audit Breakdown */}
      <Modal
        isOpen={isPayslipOpen && Boolean(selectedRecord)}
        onClose={() => setIsPayslipOpen(false)}
        title="Employee Monthly Payslip & Transparent Audit Statement"
        description={`Period: ${selectedRecord?.period} | Record ID: ${selectedRecord?.id}`}
        maxWidth="3xl"
      >
        {selectedRecord && (
          <div className="space-y-5 text-xs text-slate-700 print:text-black">
            {/* Header info */}
            {(() => {
              const emp = getRecordUser(selectedRecord.employee_id);
              return (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={emp?.avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100`}
                      alt={emp?.full_name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-xs"
                    />
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{emp?.full_name}</h4>
                      <p className="text-slate-500 text-xs">{emp?.department} • {emp?.email}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
                        <span>Contract Rate: ${selectedRecord.hourly_rate}/hr</span>
                        <span>•</span>
                        <span>Quality Score: {emp?.quality_score}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Payslip Status</span>
                    <span className={cn(
                      'px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border inline-flex items-center gap-1 mt-1',
                      selectedRecord.status === 'finalized' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    )}>
                      {selectedRecord.status === 'finalized' && <Lock className="w-3 h-3 text-emerald-600" />}
                      {selectedRecord.status}
                    </span>
                    {selectedRecord.finalized_at && (
                      <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                        Finalized: {formatDate(selectedRecord.finalized_at)} by Finance
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
                  <span className="font-medium text-slate-600">Regular Working Hours (160h standard):</span>
                  <span className="font-mono text-slate-700">{selectedRecord.regular_hours_worked} hrs</span>
                </div>
              </div>
            </div>

            {/* Deduction Calculation Breakdown */}
            <div className="border border-rose-200 rounded-xl overflow-hidden bg-rose-50/20">
              <div className="p-3 bg-rose-50/70 border-b border-rose-200 font-bold text-rose-900 uppercase tracking-wider text-[11px] flex justify-between items-center">
                <span>Rework Quality Deductions ({selectedRecord.source_month} Attributable Defect Work)</span>
                <span className="text-rose-700 font-mono text-xs">Policy Multiplier: {policy.deduction_rate_percentage}%</span>
              </div>

              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-rose-100/70">
                  <span className="text-slate-600">Total Corrective Hours Logged:</span>
                  <span className="font-mono font-medium text-slate-800">{selectedRecord.total_corrective_hours} hrs</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-rose-100/70">
                  <span className="text-slate-600">Attributable to Verified Original Delivery Defects:</span>
                  <span className="font-mono font-bold text-rose-700">{selectedRecord.attributable_corrective_hours} hrs</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-rose-100/70">
                  <span className="text-emerald-700 font-medium">Monthly Company Grace Allowance:</span>
                  <span className="font-mono font-bold text-emerald-700">-{policy.monthly_grace_hours} hrs</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-rose-100/70">
                  <span className="font-semibold text-slate-800">Net Billable Deductible Hours:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedRecord.billable_deduction_hours} hrs</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-rose-100/70">
                  <span className="text-slate-600">
                    Gross Calculation ({selectedRecord.billable_deduction_hours}h × ${selectedRecord.hourly_rate}/hr × {policy.deduction_rate_percentage}%):
                  </span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(selectedRecord.gross_deduction_amount)}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-rose-100/70">
                  <span className="text-slate-600">Statutory Salary Cap ({policy.max_deduction_cap_percentage}% of Base Salary):</span>
                  <span className="font-mono text-slate-600">{formatCurrency(selectedRecord.base_salary * (policy.max_deduction_cap_percentage / 100))}</span>
                </div>

                <div className="flex justify-between items-center py-2 bg-rose-100/50 px-3 rounded-lg font-bold text-rose-900">
                  <span>Authorized Quality Payroll Deduction:</span>
                  <span className="font-mono text-sm">-{formatCurrency(selectedRecord.deduction_amount)}</span>
                </div>

                {/* Itemized Deduction Line Items (from deductionItems) */}
                {(() => {
                  const items = getRecordDeductionItems(selectedRecord.id);
                  if (items.length === 0) return null;
                  return (
                    <div className="mt-3 pt-3 border-t border-rose-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-[11px] text-slate-800 uppercase tracking-wider block">
                          Itemized Source Defect Rework Items ({items.length})
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Rates Frozen at Snapshot</span>
                      </div>
                      <div className="space-y-1.5 font-mono text-[11px]">
                        {items.map(item => (
                          <div key={item.id} className="p-2.5 bg-white rounded-lg border border-rose-200/80 flex items-center justify-between text-slate-700">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{item.hours}h</span>
                                <span>@ ${item.hourly_rate}/hr</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-rose-600 font-semibold">{item.bug_id || 'Defect Rework'}</span>
                                {item.work_date && (
                                  <span className="text-slate-400 text-[10px]">({item.work_date})</span>
                                )}
                              </div>
                              <p className="font-sans text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">
                                Task: {item.task_id} | Attribution: {item.attribution_reason || 'Verified original delivery defect'}
                              </p>
                            </div>
                            <span className="font-bold text-rose-700">
                              -${item.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Other Authorized Adjustments / Reversals */}
            {(() => {
              const adjs = getRecordAdjustments(selectedRecord.id);
              if (adjs.length === 0) return null;
              return (
                <div className="border border-emerald-200 rounded-xl overflow-hidden bg-emerald-50/20">
                  <div className="p-3 bg-emerald-50/70 border-b border-emerald-200 font-bold text-emerald-900 uppercase tracking-wider text-[11px] flex justify-between items-center">
                    <span>Authorized Post-Audit Adjustments & Reversals</span>
                    <span className="text-emerald-700 font-mono text-xs">Total: {formatCurrency(selectedRecord.other_authorized_adjustments || 0)}</span>
                  </div>
                  <div className="p-3 space-y-2">
                    {adjs.map(adj => (
                      <div key={adj.id} className="p-2 bg-white rounded border border-emerald-200/80 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {adj.adjustment_type}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">By {adj.authorizer_name} ({formatDate(adj.created_at)})</span>
                          </div>
                          <p className="mt-1 text-slate-600 italic">&quot;{adj.reason}&quot;</p>
                        </div>
                        <span className={cn('font-mono font-bold text-sm', adj.amount >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                          {adj.amount >= 0 ? `+${formatCurrency(adj.amount)}` : formatCurrency(adj.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Net Salary Disbursal Box */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Official Net Disbursal Amount</span>
                <span className="text-xs text-slate-300">Base Salary minus Quality Deductions plus Adjustments</span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {formatCurrency(selectedRecord.net_payout)}
              </div>
            </div>

            {/* Audit Notes & Disclaimer */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs space-y-1">
              <span className="font-bold text-slate-800 block">Statutory Audit Statement:</span>
              <p className="leading-relaxed text-[11px] text-slate-500 italic">
                {selectedRecord.notes || 'This statement was generated and audited by ReworkGuard Authoritative Payroll Engine.'}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center print:hidden">
              <span className="text-[11px] text-slate-400 font-mono">
                ReworkGuard Immutable Ledger • Hash: {selectedRecord.id}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print Official Slip
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
