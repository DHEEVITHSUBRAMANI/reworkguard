/**
 * Comprehensive Automated Payroll Calculation & Audit Engine Test Suite
 * ReworkGuard
 */

import { PayrollEngine } from '../src/services/payrollEngine';
import { StorageService } from '../src/services/storage';
import { timeLogsApi, payrollApi } from '../src/services/api';
import { 
  TimeLog, 
  BugReport, 
  Task, 
  PayrollPolicy, 
  EmployeeRate, 
  User 
} from '../src/types';

// Simple lightweight test runner assertion helpers
let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error(`    Details: ${details}`);
  }
}

function assertEqual<T>(actual: T, expected: T, testName: string) {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  assert(match, testName, `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function runPayrollTests() {
  console.log('\n======================================================');
  console.log('--- REWORKGUARD AUTHORITATIVE PAYROLL TEST SUITE ---');
  console.log('======================================================\n');

  // Reset seed data before testing
  StorageService.resetToSeedData();

  const policy: PayrollPolicy = {
    id: 'pol-test',
    name: 'Enterprise Test Policy',
    deduction_rate_percentage: 100,
    monthly_grace_hours: 2,
    max_deduction_cap_percentage: 15,
    defect_attribution_window_days: 30,
    requires_manager_approval: true,
    effective_start_date: '2026-01-01',
    is_active: true,
    rate_basis: 'contract_rate',
    currency: 'USD',
    rounding_mode: 'round_half_even',
    destination_month_offset: 1,
    policy_version: 'v2.0',
    allow_no_deduction_override: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // ------------------------------------------------------------------------
  // TEST GROUP 1: Strict Eligibility & Filtering Business Rules
  // ------------------------------------------------------------------------
  console.log('\n[1] Strict Eligibility & Multi-factor Deduction Rules');

  const mockTasks: Task[] = [
    {
      id: 'task-orig-1',
      title: 'Delivered Task Alpha',
      module_id: 'mod-1',
      project_id: 'proj-1',
      assigned_to: 'usr-dev-1',
      original_delivery_employee_id: 'usr-dev-1',
      status: 'completed',
      priority: 'high',
      committed_due_date: '2026-10-10',
      actual_completion_date: '2026-10-10',
      is_delivered_on_time: true,
      created_at: '2026-10-01T00:00:00Z',
    }
  ];

  const mockBugs: BugReport[] = [
    {
      id: 'bug-valid-1',
      title: 'Regression Bug in Alpha',
      original_task_id: 'task-orig-1',
      module_id: 'mod-1',
      project_id: 'proj-1',
      reporter_id: 'usr-qa-1',
      status: 'open',
      severity: 'high',
      defect_classification: 'original_delivery_defect',
      attribution_classification: 'original_delivery_defect',
      date_found: '2026-10-12',
      created_at: '2026-10-12T00:00:00Z',
    },
    {
      id: 'bug-exempt-scope',
      title: 'Feature Scope Change',
      original_task_id: 'task-orig-1',
      module_id: 'mod-1',
      project_id: 'proj-1',
      reporter_id: 'usr-qa-1',
      status: 'open',
      severity: 'medium',
      defect_classification: 'scope_change',
      attribution_classification: 'scope_change',
      classification_justification: 'Client added new columns to invoice',
      date_found: '2026-10-14',
      created_at: '2026-10-14T00:00:00Z',
    },
    {
      id: 'bug-pending-investigation',
      title: 'Unclassified Glitch',
      original_task_id: 'task-orig-1',
      module_id: 'mod-1',
      project_id: 'proj-1',
      reporter_id: 'usr-qa-1',
      status: 'open',
      severity: 'low',
      defect_classification: 'pending_investigation',
      attribution_classification: 'pending_investigation',
      date_found: '2026-10-15',
      created_at: '2026-10-15T00:00:00Z',
    }
  ];

  // 1a: Regular hours must be excluded
  const regularLog: TimeLog = {
    id: 'log-reg',
    user_id: 'usr-dev-1',
    task_id: 'task-orig-1',
    hours: 8,
    date: '2026-10-05',
    work_date: '2026-10-05',
    log_type: 'regular',
    approval_status: 'approved',
    attribution_status: 'exempt',
    is_payroll_processed: false,
    created_at: '2026-10-05T00:00:00Z'
  };
  const resReg = PayrollEngine.evaluateLogEligibility(regularLog, mockBugs, mockTasks);
  assert(!resReg.isEligible, 'Regular development time logs are NOT eligible for deductions');

  // 1b: Unapproved corrective log must be excluded
  const pendingLog: TimeLog = {
    id: 'log-pending',
    user_id: 'usr-dev-1',
    task_id: 'task-orig-1',
    bug_id: 'bug-valid-1',
    hours: 4,
    date: '2026-10-15',
    work_date: '2026-10-15',
    log_type: 'corrective_maintenance',
    approval_status: 'pending',
    attribution_status: 'attributable',
    is_payroll_processed: false,
    created_at: '2026-10-15T00:00:00Z'
  };
  const resPending = PayrollEngine.evaluateLogEligibility(pendingLog, mockBugs, mockTasks);
  assert(!resPending.isEligible, 'Pending (unapproved) corrective logs are NOT eligible');

  // 1c: Rejected corrective log must be excluded
  const rejectedLog: TimeLog = {
    ...pendingLog,
    id: 'log-rejected',
    approval_status: 'rejected'
  };
  const resRejected = PayrollEngine.evaluateLogEligibility(rejectedLog, mockBugs, mockTasks);
  assert(!resRejected.isEligible, 'Rejected corrective logs are NOT eligible');

  // 1d: Scope change / Exempt defect log must be excluded
  const scopeChangeLog: TimeLog = {
    ...pendingLog,
    id: 'log-scope',
    bug_id: 'bug-exempt-scope',
    approval_status: 'approved',
    attribution_status: 'exempt'
  };
  const resScope = PayrollEngine.evaluateLogEligibility(scopeChangeLog, mockBugs, mockTasks);
  assert(!resScope.isEligible, 'Defects classified as Scope Change are excluded from deductions');

  // 1e: Pending investigation defect log must be excluded
  const unresolvedLog: TimeLog = {
    ...pendingLog,
    id: 'log-unresolved',
    bug_id: 'bug-pending-investigation',
    approval_status: 'approved',
    attribution_status: 'pending'
  };
  const resUnresolved = PayrollEngine.evaluateLogEligibility(unresolvedLog, mockBugs, mockTasks);
  assert(!resUnresolved.isEligible, 'Defects pending investigation are excluded from deductions');

  // 1f: Already finalized log must be excluded
  const alreadyProcessedLog: TimeLog = {
    ...pendingLog,
    id: 'log-processed',
    approval_status: 'approved',
    is_payroll_processed: true
  };
  const resProcessed = PayrollEngine.evaluateLogEligibility(alreadyProcessedLog, mockBugs, mockTasks);
  assert(!resProcessed.isEligible, 'Logs already locked in finalized payroll are excluded from new calculations');

  // 1g: Fully valid approved defect rework log must be eligible
  const validLog: TimeLog = {
    ...pendingLog,
    id: 'log-valid',
    approval_status: 'approved',
    is_payroll_processed: false
  };
  const resValid = PayrollEngine.evaluateLogEligibility(validLog, mockBugs, mockTasks);
  assert(resValid.isEligible, 'Approved corrective log for verified delivery defect is eligible');
  assertEqual(resValid.originalDeliveryEmployeeId, 'usr-dev-1', 'Correctly resolves original delivery employee');

  // ------------------------------------------------------------------------
  // TEST GROUP 2: Three-Way Separation of Actor Roles
  // ------------------------------------------------------------------------
  console.log('\n[2] Three-Way Role Separation: Deliverer vs Fixer vs Manager');

  // Dev 2 fixes a defect on task delivered by Dev 1
  const crossDevLog: TimeLog = {
    id: 'log-cross-dev',
    user_id: 'usr-dev-2', // Fixer
    employee_id: 'usr-dev-2',
    task_id: 'task-orig-1', // Delivered by usr-dev-1
    bug_id: 'bug-valid-1',
    hours: 5,
    date: '2026-10-16',
    work_date: '2026-10-16',
    log_type: 'corrective_maintenance',
    approval_status: 'approved',
    attribution_status: 'attributable',
    is_payroll_processed: false,
    created_at: '2026-10-16T00:00:00Z'
  };

  const resCross = PayrollEngine.evaluateLogEligibility(crossDevLog, mockBugs, mockTasks);
  assert(resCross.isEligible, 'Cross-developer fix is eligible');
  assertEqual(resCross.originalDeliveryEmployeeId, 'usr-dev-1', 'Attribution targets original deliverer usr-dev-1');
  assertEqual(resCross.correctiveWorkerId, 'usr-dev-2', 'Preserves usr-dev-2 as corrective worker');

  // ------------------------------------------------------------------------
  // TEST GROUP 3: Integer Minor-Units Arithmetic & Rounding Precision
  // ------------------------------------------------------------------------
  console.log('\n[3] Integer Minor-Units (Cents) Money Arithmetic & Rounding');

  // Test 3.33 hours @ $52.75/hr @ 100%
  // 3.33 * 52.75 = 175.6575 -> rounded to 175.66
  const moneyResult = PayrollEngine.multiplyMoney(3.33, 52.75, 100, 'round_half_even');
  assertEqual(moneyResult, 175.66, 'Precisely rounds 3.33h * $52.75 to $175.66 without floating epsilon');

  // Test half-even banker's rounding on .005
  // 1.00h * $10.025 @ 100% -> rounds to 10.02 (even)
  const bankerEven = PayrollEngine.multiplyMoney(1.0, 10.025, 100, 'round_half_even');
  assertEqual(bankerEven, 10.02, "Banker's round_half_even rounds to nearest even cent");

  // ------------------------------------------------------------------------
  // TEST GROUP 4: Historical Rate Freezing
  // ------------------------------------------------------------------------
  console.log('\n[4] Historical Rate Snapshot Freezing');

  const mockRates: EmployeeRate[] = [
    {
      id: 'rate-1',
      employee_id: 'usr-dev-1',
      effective_date: '2026-10-01',
      hourly_rate: 45.0,
      base_monthly_salary: 8000,
      currency: 'USD',
      active_status: true,
      created_at: '2026-01-01T00:00:00Z'
    },
    {
      id: 'rate-2',
      employee_id: 'usr-dev-1',
      effective_date: '2026-11-01',
      hourly_rate: 85.0, // Major raise starting November 1
      base_monthly_salary: 8000,
      currency: 'USD',
      active_status: true,
      created_at: '2026-11-01T00:00:00Z'
    }
  ];

  const mockUsers: User[] = [
    {
      id: 'usr-dev-1',
      email: 'dev1@reworkguard.com',
      full_name: 'Dev One',
      role: 'employee',
      department: 'Engineering',
      hourly_rate: 85.0,
      base_monthly_salary: 8000,
      quality_score: 94,
      active_tasks_count: 2,
      is_active: true
    }
  ];

  // Work done on 2026-10-20 should receive the $45.00 historical rate, NOT current $85.00 rate
  const resolvedRateOct = PayrollEngine.getEffectiveRate('usr-dev-1', '2026-10-20', mockRates, mockUsers);
  assertEqual(resolvedRateOct.hourlyRate, 45.0, 'Picks historical effective rate for October work date ($45 vs current $85)');

  // Work done on 2026-11-05 should receive the $85.00 rate
  const resolvedRateNov = PayrollEngine.getEffectiveRate('usr-dev-1', '2026-11-05', mockRates, mockUsers);
  assertEqual(resolvedRateNov.hourlyRate, 85.0, 'Picks new effective rate for November work date ($85.00)');

  // ------------------------------------------------------------------------
  // TEST GROUP 5: Monthly Calculation & Grace Allowance & Caps
  // ------------------------------------------------------------------------
  console.log('\n[5] Monthly Payroll Calculation, Grace Hours & Cap Guardrails');

  // Run calculation for November 2026 from October 2026 rework
  const calcSummary = PayrollEngine.calculateMonthlyPayroll('2026-11', '2026-10', policy, { dryRun: false });
  assert(calcSummary.records.length > 0, `Generated ${calcSummary.records.length} payroll records`);
  assert(calcSummary.reconciliation.totalProposedDeductions >= 0, 'Reconciliation metric totalProposedDeductions calculated');
  assert(calcSummary.reconciliation.grossEligibleReworkCost >= 0, 'Reconciliation metric grossEligibleReworkCost calculated');

  // Verify that deduction items exist and contain frozen snapshot rates
  const deductionItems = StorageService.getDeductionItems();
  assert(deductionItems.length > 0, `Deduction items stored: ${deductionItems.length}`);
  const firstItem = deductionItems[0];
  assert(firstItem.hourly_rate > 0, `Line item captures frozen hourly_rate: $${firstItem.hourly_rate}`);
  assert(firstItem.amount > 0, `Line item captures calculated amount: $${firstItem.amount}`);
  assert(Boolean(firstItem.source_time_log_id), 'Line item references source_time_log_id');

  // ------------------------------------------------------------------------
  // TEST GROUP 6: Idempotent Recalculation
  // ------------------------------------------------------------------------
  console.log('\n[6] Idempotent Recalculation (Clean Replacement without Duplication)');

  const rerun1 = PayrollEngine.calculateMonthlyPayroll('2026-11', '2026-10', policy, { dryRun: false });
  const countAfterRerun1 = StorageService.getDeductionItems().filter(i => {
    const parent = StorageService.getPayroll().find(p => p.id === i.payroll_record_id);
    return parent?.period === '2026-11';
  }).length;

  const rerun2 = PayrollEngine.calculateMonthlyPayroll('2026-11', '2026-10', policy, { dryRun: false });
  const countAfterRerun2 = StorageService.getDeductionItems().filter(i => {
    const parent = StorageService.getPayroll().find(p => p.id === i.payroll_record_id);
    return parent?.period === '2026-11';
  }).length;

  assertEqual(countAfterRerun1, countAfterRerun2, 'Rerunning calculation is idempotent and does not create duplicate line items');

  // ------------------------------------------------------------------------
  // TEST GROUP 7: Finalization & Immutability Locking
  // ------------------------------------------------------------------------
  console.log('\n[7] Transactional Finalization & Time Log Freezing');

  const draftRecord = StorageService.getPayroll().find(r => r.period === '2026-11' && r.status !== 'finalized');
  assert(Boolean(draftRecord), 'Found draft payroll record for 2026-11');

  if (draftRecord) {
    const finalizeRes = PayrollEngine.finalizePayrollRecord(draftRecord.id, 'usr-fin-1', 'Finance Director');
    assert(finalizeRes.success, 'Draft record successfully finalized by Finance');
    assertEqual(finalizeRes.record?.status, 'finalized', 'Record status marked finalized');

    // Attempting to finalize again should fail cleanly
    const reFinalize = PayrollEngine.finalizePayrollRecord(draftRecord.id, 'usr-fin-1');
    assert(!reFinalize.success, 'Re-finalizing an already finalized record is prevented');

    // Check that source time logs are locked (is_payroll_processed = true)
    const recordItems = StorageService.getDeductionItems().filter(i => i.payroll_record_id === draftRecord.id);
    const allLogs = StorageService.getTimeLogs();
    const sourceLogs = allLogs.filter(l => recordItems.some(item => item.source_time_log_id === l.id));

    if (sourceLogs.length > 0) {
      const allLocked = sourceLogs.every(l => l.is_payroll_processed === true);
      assert(allLocked, `All ${sourceLogs.length} contributing time logs locked with is_payroll_processed = true`);

      // Attempting to modify a locked time log via timeLogsApi must fail
      const reviewLockedRes = await timeLogsApi.review(sourceLogs[0].id, 'approved', 'usr-lead-1', 'Team Lead');
      assert(!reviewLockedRes.success, 'Prevent modification of time log locked in finalized payroll');
    }
  }

  // ------------------------------------------------------------------------
  // TEST GROUP 8: Controlled Post-Finalization Adjustments
  // ------------------------------------------------------------------------
  console.log('\n[8] Controlled Post-Finalization Adjustments & Audit Trail');

  const finalizedRecord = StorageService.getPayroll().find(r => r.status === 'finalized');
  assert(Boolean(finalizedRecord), 'Finalized record available for adjustment test');

  if (finalizedRecord) {
    const originalNet = finalizedRecord.net_payout;

    // 8a: Validation failure on empty or short reason (< 10 chars)
    const invalidAdj = PayrollEngine.createPayrollAdjustment(
      finalizedRecord.id,
      'reversal',
      50.0,
      'short', // < 10 characters
      'usr-fin-1'
    );
    assert(!invalidAdj.success, 'Adjustment rejected when justification is under 10 characters');

    // 8b: Valid authorized reversal (+ credit back to employee)
    const validAdj = PayrollEngine.createPayrollAdjustment(
      finalizedRecord.id,
      'reversal',
      50.0,
      'Approved client goodwill reimbursement for unverified defect',
      'usr-fin-1',
      'Finance Director'
    );
    assert(validAdj.success, 'Adjustment authorized and created successfully');
    assertEqual(validAdj.updatedRecord?.other_authorized_adjustments, 50.0, 'other_authorized_adjustments updated to $50.00');
    assertEqual(validAdj.updatedRecord?.net_payout, originalNet + 50.0, 'Net payout increased by exactly $50.00');

    // Check adjustment history persistence
    const adjustments = StorageService.getPayrollAdjustments().filter(a => a.payroll_record_id === finalizedRecord.id);
    assert(adjustments.length > 0, `Adjustment recorded in audit ledger: ${adjustments.length}`);
    assertEqual(adjustments[0].adjustment_type, 'reversal', 'Adjustment type preserved');
    assert(adjustments[0].reason.length >= 10, 'Justification recorded');
  }

  // ------------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`TOTAL PAYROLL TESTS RUN: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPayrollTests().catch(err => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
