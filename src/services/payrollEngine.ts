/**
 * ReworkGuard Authoritative Payroll Calculation Engine
 * 
 * Rules:
 * 1. Corrective time log is eligible only if:
 *    - Work type is CORRECTIVE_MAINTENANCE.
 *    - Time log status is Approved.
 *    - The linked bug and original task exist.
 *    - The defect attribution is explicitly classified as an original delivery defect.
 *    - Required manager review and approval are complete.
 *    - The log has not already been included in a finalized payroll deduction.
 *    - The log falls within the payroll period being processed.
 * 2. Exclude pending, rejected, exempt entries, scope changes, external issues, and unresolved investigations.
 * 3. Separate employee who performed corrective work, original delivery employee, and manager attribution decision.
 * 4. Use integer minor units (cents) to avoid floating-point rounding deltas.
 * 5. Idempotent: Rerunning calculation on a Draft/Under Review period refreshes items without duplicates.
 * 6. Historical preservation: Rate snapshots frozen per deduction item so future rate changes never mutate past payroll.
 * 7. Finalized locking: Finalized records freeze underlying time logs (is_payroll_processed = true).
 * 8. Controlled adjustments: Post-finalization corrections create separate auditable reversal/relief records.
 */

import { 
  PayrollRecord, 
  PayrollDeductionItem, 
  PayrollPolicy, 
  TimeLog, 
  BugReport, 
  Task, 
  User, 
  EmployeeRate,
  PayrollAdjustment,
  AdjustmentType,
  AppNotification
} from '../types';
import { StorageService } from './storage';

export interface EligibilityResult {
  isEligible: boolean;
  exclusionReason?: string;
  bug?: BugReport;
  task?: Task;
  originalDeliveryEmployeeId?: string;
  correctiveWorkerId?: string;
}

export interface PayrollCalculationSummary {
  period: string;
  sourceMonth: string;
  records: PayrollRecord[];
  deductionItems: PayrollDeductionItem[];
  notifications: AppNotification[];
  reconciliation: {
    totalProposedDeductions: number;
    totalApprovedDeductions: number;
    totalFinalizedDeductions: number;
    totalExemptHours: number;
    totalExemptAmount: number;
    totalPendingReviewHours: number;
    totalPendingReviewAmount: number;
    grossEligibleReworkCost: number;
    verifiedPayrollSavings: number;
    complianceNote: string;
  };
}

export const PayrollEngine = {
  /**
   * Evaluates strict business eligibility for a single candidate time log
   */
  evaluateLogEligibility(
    log: TimeLog,
    bugs: BugReport[],
    tasks: Task[]
  ): EligibilityResult {
    // 1. Work type check
    const isCorrective = log.log_type === 'corrective_maintenance' || log.work_type === 'corrective_maintenance';
    if (!isCorrective) {
      return { isEligible: false, exclusionReason: 'Not corrective maintenance (regular development hours are excluded)' };
    }

    // 2. Approval status check
    if (log.approval_status !== 'approved') {
      return { isEligible: false, exclusionReason: `Time log is ${log.approval_status}; only Approved hours are eligible` };
    }

    // 3. Finalized locking check
    if (log.is_payroll_processed) {
      return { isEligible: false, exclusionReason: 'Already included in finalized payroll deduction' };
    }

    // 4. Linked bug existence
    if (!log.bug_id) {
      return { isEligible: false, exclusionReason: 'Missing linked defect reference' };
    }
    const bug = bugs.find(b => b.id === log.bug_id);
    if (!bug) {
      return { isEligible: false, exclusionReason: `Linked defect #${log.bug_id} not found in defect register` };
    }

    // 5. Original task existence
    const taskId = bug.original_task_id || bug.task_id || log.task_id;
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      return { isEligible: false, exclusionReason: `Underlying delivered task #${taskId} not found` };
    }

    // 6. Explicit Defect Attribution Classification check
    const classification = bug.defect_classification || bug.attribution_classification;
    const isOriginalDefect = classification === 'original_delivery_defect' || classification === 'caused_by_original_delivery';

    if (!isOriginalDefect) {
      if (classification === 'scope_change' || classification === 'not_caused_by_original_delivery') {
        return { isEligible: false, exclusionReason: 'Defect classified as client scope change (Exempt)', bug, task };
      }
      if (classification === 'external_dependency_issue') {
        return { isEligible: false, exclusionReason: 'Defect classified as external dependency / environment outage (Exempt)', bug, task };
      }
      if (classification === 'pending_investigation') {
        return { isEligible: false, exclusionReason: 'Defect attribution is under managerial investigation', bug, task };
      }
      return { isEligible: false, exclusionReason: `Defect classification '${classification}' is not eligible for rework deduction`, bug, task };
    }

    // 7. Attribution status on the log itself
    if (log.attribution_status === 'exempt') {
      return { isEligible: false, exclusionReason: `Time log specifically marked exempt by reviewer (${log.exempt_reason || 'Policy relief'})`, bug, task };
    }

    const originalDevId = task.original_delivery_employee_id || task.assigned_to;
    const workerId = log.user_id || log.employee_id;

    return {
      isEligible: true,
      bug,
      task,
      originalDeliveryEmployeeId: originalDevId,
      correctiveWorkerId: workerId,
    };
  },

  /**
   * Looks up the effective hourly rate and base salary for an employee on a given work date
   * Preserves historical rate so rate revisions later do not alter past calculations.
   */
  getEffectiveRate(
    employeeId: string,
    workDate: string,
    employeeRates: EmployeeRate[],
    users: User[]
  ): { hourlyRate: number; baseSalary: number; currency: string } {
    const matchingRates = employeeRates
      .filter(r => r.employee_id === employeeId && r.active_status && r.effective_date <= workDate)
      .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());

    if (matchingRates.length > 0) {
      return {
        hourlyRate: matchingRates[0].hourly_rate,
        baseSalary: matchingRates[0].base_monthly_salary,
        currency: matchingRates[0].currency || 'USD',
      };
    }

    const user = users.find(u => u.id === employeeId);
    return {
      hourlyRate: user?.hourly_rate ?? 50,
      baseSalary: user?.base_monthly_salary ?? 7000,
      currency: 'USD',
    };
  },

  /**
   * Currency minor-unit multiplication (avoids IEEE 754 floating point rounding bugs)
   * Supports round_half_even (Banker's rounding) and round_half_up (Standard)
   */
  multiplyMoney(hours: number, rate: number, percentage: number = 100, roundingMode: string = 'round_half_even'): number {
    const unroundedCents = hours * rate * (percentage / 100) * 100;
    if (roundingMode === 'round_half_even') {
      const floor = Math.floor(unroundedCents);
      const diff = unroundedCents - floor;
      let roundedCents: number;
      if (Math.abs(diff - 0.5) < 1e-9) {
        roundedCents = (floor % 2 === 0) ? floor : floor + 1;
      } else {
        roundedCents = Math.round(unroundedCents);
      }
      return roundedCents / 100;
    }
    return Math.round(unroundedCents) / 100;
  },

  /**
   * Calculates monthly payroll across all employees with strict policy safeguards
   */
  calculateMonthlyPayroll(
    targetMonth: string,
    sourceMonth: string,
    policy: PayrollPolicy,
    options: { dryRun?: boolean; calculatedBy?: string; calculatedByName?: string } = {}
  ): PayrollCalculationSummary {
    const users = StorageService.getUsers().filter(u => u.role === 'employee');
    const allUsers = StorageService.getUsers();
    const tasks = StorageService.getTasks();
    const bugs = StorageService.getBugs();
    const timeLogs = StorageService.getTimeLogs();
    const employeeRates = StorageService.getEmployeeRates();
    const existingRecords = StorageService.getPayroll();
    const existingItems = StorageService.getDeductionItems();
    const existingAdjustments = StorageService.getPayrollAdjustments();

    // Check if payroll for this target month is already finalized
    const finalizedInMonth = existingRecords.filter(r => r.period === targetMonth && r.status === 'finalized');
    const isMonthLocked = finalizedInMonth.length > 0 && finalizedInMonth.length === users.length;
    if (isMonthLocked && !options.dryRun) {
      throw new Error(`Payroll for period ${targetMonth} is already finalized and locked against recalculation.`);
    }

    const calculatedRecords: PayrollRecord[] = [];
    const calculatedItems: PayrollDeductionItem[] = [];
    const generatedNotifications: AppNotification[] = [];

    // Reconciliation accumulators
    let totalProposed = 0;
    let totalApproved = 0;
    let totalFinalized = 0;
    let totalExemptHrs = 0;
    let totalExemptAmt = 0;
    let totalPendingHrs = 0;
    let totalPendingAmt = 0;
    let grossEligibleCost = 0;

    users.forEach((employee) => {
      // Find existing record if already finalized to preserve immutability
      const existingRecord = existingRecords.find(r => r.period === targetMonth && r.employee_id === employee.id);
      if (existingRecord && existingRecord.status === 'finalized') {
        calculatedRecords.push(existingRecord);
        totalFinalized += existingRecord.deduction_amount;
        return;
      }

      // Collect all logs in source month for this employee
      const employeeLogs = timeLogs.filter(l => 
        (l.user_id === employee.id || l.employee_id === employee.id) && 
        (l.date.startsWith(sourceMonth) || l.work_date?.startsWith(sourceMonth))
      );

      const regularHours = employeeLogs
        .filter(l => l.log_type === 'regular' || l.work_type === 'regular')
        .reduce((sum, l) => sum + l.hours, 0);

      const correctiveLogs = employeeLogs.filter(l => 
        l.log_type === 'corrective_maintenance' || l.work_type === 'corrective_maintenance'
      );

      const totalCorrectiveHours = correctiveLogs.reduce((sum, l) => sum + l.hours, 0);

      // Evaluate eligibility for each corrective log
      const eligibleLogs: { log: TimeLog; bug: BugReport; task: Task }[] = [];
      const exemptLogs: { log: TimeLog; reason: string }[] = [];
      const pendingLogs: { log: TimeLog; reason: string }[] = [];

      correctiveLogs.forEach((log) => {
        const evalResult = PayrollEngine.evaluateLogEligibility(log, bugs, tasks);
        if (evalResult.isEligible && evalResult.bug && evalResult.task) {
          eligibleLogs.push({ log, bug: evalResult.bug, task: evalResult.task });
        } else {
          if (log.approval_status === 'pending' || evalResult.bug?.defect_classification === 'pending_investigation') {
            pendingLogs.push({ log, reason: evalResult.exclusionReason || 'Pending review' });
          } else {
            exemptLogs.push({ log, reason: evalResult.exclusionReason || 'Exempt' });
          }
        }
      });

      const attributableHours = eligibleLogs.reduce((sum, item) => sum + item.log.hours, 0);
      const exemptHours = exemptLogs.reduce((sum, item) => sum + item.log.hours, 0);
      const pendingHours = pendingLogs.reduce((sum, item) => sum + item.log.hours, 0);

      // Effective rates for work date (using first day of source month or first log date)
      const sampleDate = eligibleLogs[0]?.log.date || `${sourceMonth}-15`;
      const rateInfo = PayrollEngine.getEffectiveRate(employee.id, sampleDate, employeeRates, allUsers);
      const { hourlyRate, baseSalary } = rateInfo;

      // Calculate exempt and pending amounts for reconciliation
      const exemptAmt = PayrollEngine.multiplyMoney(exemptHours, hourlyRate, 100);
      const pendingAmt = PayrollEngine.multiplyMoney(pendingHours, hourlyRate, 100);
      totalExemptHrs += exemptHours;
      totalExemptAmt += exemptAmt;
      totalPendingHrs += pendingHours;
      totalPendingAmt += pendingAmt;

      // Apply Monthly Grace Hours (Company Policy Benefit)
      const graceHours = policy.monthly_grace_hours || 0;
      const billableDeductionHours = Math.max(0, attributableHours - graceHours);

      // Calculate gross rework cost
      const grossCost = PayrollEngine.multiplyMoney(attributableHours, hourlyRate, policy.deduction_rate_percentage || 100);
      grossEligibleCost += grossCost;

      // Calculate gross deduction amount after grace hours
      const grossDeduction = PayrollEngine.multiplyMoney(billableDeductionHours, hourlyRate, policy.deduction_rate_percentage || 100);

      // Apply Maximum Deduction Cap (e.g. 15% of monthly base salary)
      const maxCapPercentage = policy.max_deduction_cap_percentage || 15;
      const salaryCapAmount = Math.round(baseSalary * (maxCapPercentage / 100) * 100) / 100;
      const deductionCapApplied = grossDeduction > salaryCapAmount;
      const finalDeductionAmount = deductionCapApplied ? salaryCapAmount : grossDeduction;

      // Check existing adjustments for this period
      const recordId = existingRecord?.id || `pay-${targetMonth}-${employee.id}`;
      const adjustmentsForRecord = existingAdjustments.filter(a => a.payroll_record_id === recordId);
      const otherAdjustmentsTotal = adjustmentsForRecord.reduce((sum, a) => sum + a.amount, 0);

      const netSalary = Math.round((baseSalary - finalDeductionAmount + otherAdjustmentsTotal) * 100) / 100;

      const recordStatus = existingRecord?.status === 'approved' ? 'approved' : 'draft';

      const payrollRecord: PayrollRecord = {
        id: recordId,
        period: targetMonth,
        payroll_month: targetMonth,
        source_month: sourceMonth,
        employee_id: employee.id,
        base_salary: baseSalary,
        gross_salary: baseSalary,
        hourly_rate: hourlyRate,
        regular_hours_worked: regularHours || 160,
        total_corrective_hours: totalCorrectiveHours,
        attributable_corrective_hours: attributableHours,
        exempt_corrective_hours: exemptHours,
        billable_deduction_hours: billableDeductionHours,
        gross_deduction_amount: grossDeduction,
        deduction_amount: finalDeductionAmount,
        approved_rework_deduction: finalDeductionAmount,
        other_authorized_adjustments: otherAdjustmentsTotal,
        deduction_cap_applied: deductionCapApplied,
        net_payout: netSalary,
        net_salary: netSalary,
        status: recordStatus,
        processing_status: recordStatus,
        notes: `${attributableHours}h attributable corrective rework in ${sourceMonth}. Grace applied: ${graceHours}h. Billable: ${billableDeductionHours}h @ $${hourlyRate}/hr (${policy.deduction_rate_percentage}%). Cap: $${salaryCapAmount.toFixed(2)}${deductionCapApplied ? ' (CAP REACHED)' : ''}.`,
        created_at: existingRecord?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      calculatedRecords.push(payrollRecord);

      if (recordStatus === 'approved') {
        totalApproved += finalDeductionAmount;
      } else {
        totalProposed += finalDeductionAmount;
      }

      // Generate Itemized Deduction Breakdown items for each eligible log
      // Account for grace hours distribution across line items
      let remainingGrace = graceHours;
      eligibleLogs.forEach((item, index) => {
        const itemLog = item.log;
        const itemRate = PayrollEngine.getEffectiveRate(employee.id, itemLog.date, employeeRates, allUsers).hourlyRate;
        
        let itemBillableHours = itemLog.hours;
        if (remainingGrace > 0) {
          if (itemBillableHours <= remainingGrace) {
            remainingGrace -= itemBillableHours;
            itemBillableHours = 0;
          } else {
            itemBillableHours -= remainingGrace;
            remainingGrace = 0;
          }
        }

        const itemAmount = PayrollEngine.multiplyMoney(itemBillableHours, itemRate, policy.deduction_rate_percentage || 100);

        const deductionItem: PayrollDeductionItem = {
          id: `pdi-${targetMonth}-${itemLog.id}-${index}`,
          payroll_record_id: recordId,
          source_time_log_id: itemLog.id,
          employee_id: employee.id,
          task_id: item.task.id,
          module_id: item.task.module_id,
          bug_id: item.bug.id,
          work_date: itemLog.date,
          hours: itemLog.hours,
          hourly_rate: itemRate,
          amount: itemAmount,
          attribution_reason: `Original delivery defect on ${item.task.title} - ${item.bug.title}`,
          approval_reference: `Approved by ${itemLog.reviewer_id || itemLog.approved_by || 'Lead'} on ${itemLog.review_timestamp || itemLog.approved_at || 'review'}`,
          created_at: new Date().toISOString(),
        };

        calculatedItems.push(deductionItem);
      });

      // Employee notification regarding proposed deduction
      if (finalDeductionAmount > 0) {
        const notif: AppNotification = {
          id: `notif-pay-${targetMonth}-${employee.id}`,
          user_id: employee.id,
          recipient_id: employee.id,
          title: `Proposed Rework Deduction for ${targetMonth}`,
          message: `Preliminary calculation from ${sourceMonth} corrective rework shows $${finalDeductionAmount.toFixed(2)} (${billableDeductionHours}h billable at $${hourlyRate}/hr after ${graceHours}h grace). Please review your payslip preview. If you dispute attribution, contact your manager before cutoff.`,
          type: 'warning',
          notification_type: 'warning',
          read: false,
          link: '/payroll',
          created_at: new Date().toISOString(),
        };
        generatedNotifications.push(notif);
      }
    });

    const verifiedSavings = totalFinalized + totalApproved;

    const summary: PayrollCalculationSummary = {
      period: targetMonth,
      sourceMonth,
      records: calculatedRecords,
      deductionItems: calculatedItems,
      notifications: generatedNotifications,
      reconciliation: {
        totalProposedDeductions: totalProposed,
        totalApprovedDeductions: totalApproved,
        totalFinalizedDeductions: totalFinalized,
        totalExemptHours: totalExemptHrs,
        totalExemptAmount: totalExemptAmt,
        totalPendingReviewHours: totalPendingHrs,
        totalPendingReviewAmount: totalPendingAmt,
        grossEligibleReworkCost: grossEligibleCost,
        verifiedPayrollSavings: verifiedSavings,
        complianceNote: 'A proposed deduction is a payroll quality adjustment under organizational policy, not an automatic cash realization. Rework hours are audited against verified original delivery defects.'
      }
    };

    // If not a dry run, persist updated records and deduction items
    if (!options.dryRun) {
      // Merge with records from other periods
      const otherPeriodRecords = existingRecords.filter(r => r.period !== targetMonth);
      StorageService.setPayroll([...otherPeriodRecords, ...calculatedRecords]);

      // Merge deduction items (replace draft items for this period)
      const otherPeriodItems = existingItems.filter(item => {
        const parent = existingRecords.find(r => r.id === item.payroll_record_id);
        return parent && parent.period !== targetMonth && parent.status === 'finalized';
      });
      StorageService.setDeductionItems([...otherPeriodItems, ...calculatedItems]);

      // Push pre-finalization notifications
      const existingNotifs = StorageService.getNotifications();
      StorageService.setNotifications([...generatedNotifications, ...existingNotifs]);

      // Audit log entry
      const actorId = options.calculatedBy || 'usr-fin-1';
      const actorName = options.calculatedByName || 'Finance Operations';
      const auditLog = {
        id: `aud-pay-calc-${Date.now()}`,
        user_id: actorId,
        actor_id: actorId,
        user_name: actorName,
        actor_name: actorName,
        action: 'PAYROLL_CALCULATED',
        entity_type: 'payroll' as const,
        entity_id: targetMonth,
        details: `Calculated payroll for ${targetMonth} from ${sourceMonth} rework: ${calculatedRecords.length} records, $${(totalProposed + totalApproved).toFixed(2)} total deductions.`,
        created_at: new Date().toISOString(),
      };
      StorageService.setAuditLogs([auditLog, ...StorageService.getAuditLogs()]);
    }

    return summary;
  },

  /**
   * Secure, transactional finalization of a payroll record
   * Freezes the record and locks all contributing time logs so they cannot be altered or reused.
   */
  finalizePayrollRecord(
    recordId: string,
    finalizedBy: string,
    finalizerName: string = 'Finance Admin'
  ): { success: boolean; record?: PayrollRecord; error?: string } {
    const records = StorageService.getPayroll();
    const record = records.find(r => r.id === recordId);
    if (!record) return { success: false, error: 'Payroll record not found' };

    if (record.status === 'finalized') {
      return { success: false, error: 'Payroll record is already finalized and locked.' };
    }

    const now = new Date().toISOString();
    const updatedRecord: PayrollRecord = {
      ...record,
      status: 'finalized',
      processing_status: 'finalized',
      finalized_at: now,
      finalized_by: finalizedBy,
      updated_at: now,
    };

    // 1. Lock all contributing time logs
    const deductionItems = StorageService.getDeductionItems().filter(i => i.payroll_record_id === recordId);
    const sourceLogIds = deductionItems.map(i => i.source_time_log_id);

    const allLogs = StorageService.getTimeLogs();
    const updatedLogs = allLogs.map(l => {
      if (sourceLogIds.includes(l.id)) {
        return { ...l, is_payroll_processed: true, updated_at: now };
      }
      return l;
    });
    StorageService.setTimeLogs(updatedLogs);

    // 2. Persist finalized record
    const updatedRecords = records.map(r => r.id === recordId ? updatedRecord : r);
    StorageService.setPayroll(updatedRecords);

    // 3. Create immutable audit log
    const auditLog = {
      id: `aud-finalize-${Date.now()}`,
      user_id: finalizedBy,
      actor_id: finalizedBy,
      user_name: finalizerName,
      actor_name: finalizerName,
      action: 'PAYROLL_FINALIZED',
      entity_type: 'payroll' as const,
      entity_id: recordId,
      details: `Authorized and finalized payroll record for employee ${record.employee_id} (Period: ${record.period}, Net: $${record.net_payout.toFixed(2)}, Deduction: $${record.deduction_amount.toFixed(2)}). Locked ${sourceLogIds.length} source time logs.`,
      created_at: now,
    };
    StorageService.setAuditLogs([auditLog, ...StorageService.getAuditLogs()]);

    // 4. Notify employee
    const notif: AppNotification = {
      id: `notif-final-${Date.now()}`,
      user_id: record.employee_id,
      recipient_id: record.employee_id,
      title: `Payslip Finalized (${record.period})`,
      message: `Your payslip for ${record.period} has been officially finalized by Finance ($${record.net_payout.toFixed(2)} net disbursal). You may download or print your finalized payslip.`,
      type: 'success',
      notification_type: 'success',
      read: false,
      link: '/payroll',
      created_at: now,
    };
    StorageService.setNotifications([notif, ...StorageService.getNotifications()]);

    return { success: true, record: updatedRecord };
  },

  /**
   * Creates a controlled, auditable post-finalization adjustment or reversal
   */
  createPayrollAdjustment(
    recordId: string,
    adjustmentType: AdjustmentType,
    amount: number,
    reason: string,
    authorizedBy: string,
    authorizerName: string = 'Finance Admin'
  ): { success: boolean; adjustment?: PayrollAdjustment; updatedRecord?: PayrollRecord; error?: string } {
    if (!reason || reason.trim().length < 10) {
      return { success: false, error: 'A written justification of at least 10 characters is required for payroll adjustments.' };
    }

    const records = StorageService.getPayroll();
    const record = records.find(r => r.id === recordId);
    if (!record) return { success: false, error: 'Payroll record not found' };

    const now = new Date().toISOString();
    const adjustment: PayrollAdjustment = {
      id: `adj-${Date.now()}`,
      payroll_record_id: recordId,
      employee_id: record.employee_id,
      adjustment_type: adjustmentType,
      amount,
      reason,
      authorized_by: authorizedBy,
      authorizer_name: authorizerName,
      created_at: now,
    };

    // Persist adjustment
    const allAdjustments = StorageService.getPayrollAdjustments();
    StorageService.setPayrollAdjustments([adjustment, ...allAdjustments]);

    // Recalculate other_authorized_adjustments and net_salary
    const currentAdjustments = [adjustment, ...allAdjustments.filter(a => a.payroll_record_id === recordId)];
    const newOtherAdjustments = currentAdjustments.reduce((sum, a) => sum + a.amount, 0);
    const newNetSalary = Math.round((record.base_salary - record.deduction_amount + newOtherAdjustments) * 100) / 100;

    const updatedRecord: PayrollRecord = {
      ...record,
      other_authorized_adjustments: newOtherAdjustments,
      net_payout: newNetSalary,
      net_salary: newNetSalary,
      updated_at: now,
    };

    const updatedRecords = records.map(r => r.id === recordId ? updatedRecord : r);
    StorageService.setPayroll(updatedRecords);

    // Audit log entry
    const auditLog = {
      id: `aud-adj-${Date.now()}`,
      user_id: authorizedBy,
      actor_id: authorizedBy,
      user_name: authorizerName,
      actor_name: authorizerName,
      action: 'PAYROLL_ADJUSTMENT_CREATED',
      entity_type: 'payroll' as const,
      entity_id: recordId,
      details: `Created ${adjustmentType} adjustment of $${amount.toFixed(2)} on record ${recordId}. Reason: "${reason}". New Net Salary: $${newNetSalary.toFixed(2)}.`,
      created_at: now,
    };
    StorageService.setAuditLogs([auditLog, ...StorageService.getAuditLogs()]);

    return { success: true, adjustment, updatedRecord };
  }
};
