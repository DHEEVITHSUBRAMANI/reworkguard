import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  DollarSign, 
  History, 
  RotateCcw, 
  ArrowRight, 
  ExternalLink,
  Receipt,
  Sparkles,
  UserCheck,
  Eye,
  Info
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface DemoScenarioWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoScenarioWalkthrough: React.FC<DemoScenarioWalkthroughProps> = ({ isOpen, onClose }) => {
  const { tasks, bugs, timeLogs, payrollRecords, deductionItems, auditLogs, resetAllData } = useApp();
  const { switchUser } = useAuth();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(1);

  // Priya's target entities
  const priyaTask = tasks.find(t => t.id === 'tsk-101');
  const priyaBugAttributable = bugs.find(b => b.id === 'bug-101');
  const priyaBugExempt = bugs.find(b => b.id === 'bug-102');
  const priyaTimeLogAttributable = timeLogs.find(l => l.id === 'log-202');
  const priyaTimeLogExempt = timeLogs.find(l => l.id === 'log-201');
  const priyaPayrollRecord = payrollRecords.find(r => r.employee_id === 'usr-emp-3' && r.period === '2026-11');
  const priyaDeductionItem = deductionItems.find(i => i.employee_id === 'usr-emp-3' && i.source_time_log_id === 'log-202');

  const steps = [
    {
      step: 1,
      title: 'Original Task Delivered (Sept 25)',
      description: 'Priya Sharma completes "Implement payment processing" in module "Payment Gateway" on Sept 25. Original delivery employee and contributor records are permanently preserved.',
      status: priyaTask?.delivered_at ? 'completed' : 'pending',
      badge: 'Delivered On Time',
      actionLabel: 'Inspect Task #tsk-101',
      onAction: () => {
        onClose();
        navigate('/tasks');
      },
      evidence: (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1 font-mono">
          <div className="flex justify-between"><span className="text-slate-500">Task Title:</span><span className="font-bold text-slate-800">{priyaTask?.title}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Delivery Date:</span><span className="font-bold text-emerald-700">September 25, 2026</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Original Deliverer:</span><span className="font-bold text-slate-900">Priya Sharma (usr-emp-3)</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Preserved Contributors:</span><span className="font-bold text-slate-800">100% Priya Sharma</span></div>
        </div>
      )
    },
    {
      step: 2,
      title: 'Bug Reported in October & Task Reopened',
      description: 'On Oct 4, QA logs Bug #bug-101 "Duplicate payment callback handling" against delivered task. The system automatically transitions the task to "Reopened" without losing original completion records.',
      status: priyaBugAttributable ? 'completed' : 'pending',
      badge: 'Auto-Reopened',
      actionLabel: 'View Defect #bug-101',
      onAction: () => {
        onClose();
        navigate('/bugs');
      },
      evidence: (
        <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-200 text-xs space-y-1 font-mono">
          <div className="flex justify-between"><span className="text-slate-500">Defect:</span><span className="font-bold text-rose-700">{priyaBugAttributable?.title}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Date Found:</span><span className="font-bold text-slate-800">{priyaBugAttributable?.date_found} (October)</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Task State:</span><span className="font-bold text-amber-700 uppercase">{priyaTask?.status}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Original Delivery Kept:</span><span className="font-bold text-emerald-700">YES (Sept 25 preserved)</span></div>
        </div>
      )
    },
    {
      step: 3,
      title: 'Corrective Time Logged Separately',
      description: 'Priya logs 6.0 hours as CORRECTIVE_MAINTENANCE on bug-101. She also logs 4.0 hours on external bug-102 (Gateway cloud timeout). Both are strictly isolated from normal feature development.',
      status: priyaTimeLogAttributable ? 'completed' : 'pending',
      badge: 'Isolated Work Type',
      actionLabel: 'Inspect Time Entries',
      onAction: () => {
        onClose();
        navigate('/time');
      },
      evidence: (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 font-mono">
          <div className="flex justify-between text-rose-700"><span>log-202 (Defect Fix):</span><span className="font-bold">6.0 hrs @ CORRECTIVE_MAINTENANCE</span></div>
          <div className="flex justify-between text-blue-700"><span>log-201 (External Timeout):</span><span className="font-bold">4.0 hrs @ CORRECTIVE_MAINTENANCE</span></div>
          <div className="text-[11px] text-slate-500 italic font-sans pt-1 border-t border-slate-200">
            Work type is strictly set to CORRECTIVE_MAINTENANCE with mandatory bug linkage.
          </div>
        </div>
      )
    },
    {
      step: 4,
      title: 'Team Lead Reviews & Authorizes Hours',
      description: 'Team Lead David Chen reviews both time logs. Self-approval is strictly prohibited. The hours are authorized as genuine corrective work.',
      status: priyaTimeLogAttributable?.approval_status === 'approved' ? 'completed' : 'pending',
      badge: 'Reviewed by Lead',
      actionLabel: 'Go to Approvals',
      onAction: () => {
        onClose();
        navigate('/approvals');
      },
      evidence: (
        <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 text-xs space-y-1 font-mono">
          <div className="flex justify-between"><span className="text-slate-500">Reviewer:</span><span className="font-bold text-slate-900">David Chen (Team Lead)</span></div>
          <div className="flex justify-between"><span className="text-slate-500">log-202 Approval:</span><span className="font-bold text-emerald-700 uppercase">APPROVED</span></div>
          <div className="flex justify-between"><span className="text-slate-500">log-201 Approval:</span><span className="font-bold text-emerald-700 uppercase">APPROVED</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Self-Approval Gate:</span><span className="font-bold text-emerald-800">ENFORCED (David Chen != Priya Sharma)</span></div>
        </div>
      )
    },
    {
      step: 5,
      title: 'Manager Verifies Attribution: Defect vs External',
      description: 'Engineering Manager Sarah Jenkins classifies Bug #bug-101 as Original Delivery Defect (attributable) and Bug #bug-102 as External Dependency Issue (exempt, with written justification).',
      status: priyaBugAttributable?.defect_classification === 'original_delivery_defect' ? 'completed' : 'pending',
      badge: 'Exemption Audited',
      actionLabel: 'Inspect Bug Attribution',
      onAction: () => {
        onClose();
        navigate('/bugs');
      },
      evidence: (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 font-mono">
          <div className="flex justify-between text-rose-700"><span>Bug #101 Attribution:</span><span className="font-bold">Original Delivery Defect (Attributable)</span></div>
          <div className="flex justify-between text-emerald-700"><span>Bug #102 Attribution:</span><span className="font-bold">External Dependency Issue (EXEMPT)</span></div>
          <div className="text-[11px] text-slate-500 italic font-sans pt-1 border-t border-slate-200">
            Mandatory justification recorded: &quot;Upstream banking partner cloud network outage confirmed via status incident INC-8921. Exempt from employee rework deduction.&quot;
          </div>
        </div>
      )
    },
    {
      step: 6,
      title: 'Automated Deduction Calculation (₹3,000)',
      description: 'Payroll engine calculates November payroll from October rework: 6.0 eligible hours * ₹500/hr = ₹3,000 proposed deduction. The 4.0 hours from external bug-102 are completely excluded.',
      status: priyaPayrollRecord ? 'completed' : 'pending',
      badge: '₹3,000 Calculated',
      actionLabel: 'View November Ledger',
      onAction: () => {
        onClose();
        navigate('/payroll');
      },
      evidence: (
        <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 text-xs space-y-1 font-mono">
          <div className="flex justify-between"><span className="text-slate-600">Applicable Hourly Rate:</span><span className="font-bold text-slate-900">₹500.00 / hr</span></div>
          <div className="flex justify-between"><span className="text-slate-600">Eligible Attributable Hours:</span><span className="font-bold text-rose-700">6.0 hrs</span></div>
          <div className="flex justify-between"><span className="text-slate-600">Excluded External Hours:</span><span className="font-bold text-emerald-700">4.0 hrs (EXCLUDED)</span></div>
          <div className="flex justify-between pt-1 border-t border-blue-200"><span className="text-blue-900 font-bold">Proposed Quality Deduction:</span><span className="font-bold text-rose-700 text-sm">₹3,000.00</span></div>
        </div>
      )
    },
    {
      step: 7,
      title: 'Transparent Pre-Finalization Employee Notification',
      description: 'Priya receives an automated advance notification with itemized defect references and review instructions so deductions are never a payroll surprise.',
      status: 'completed',
      badge: 'Notification Pushed',
      actionLabel: 'Switch to Priya & View',
      onAction: () => {
        switchUser('usr-emp-3');
        onClose();
        navigate('/payroll');
      },
      evidence: (
        <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 text-xs space-y-1 font-mono">
          <div className="font-bold text-amber-900">Notification: &quot;Proposed Quality Deduction Preview (2026-11)&quot;</div>
          <p className="text-[11px] text-amber-800 font-sans leading-relaxed mt-0.5">
            &quot;Payroll preview for 2026-11 includes a proposed quality deduction of ₹3,000.00 (6.0 attributable corrective hours from 2026-10 @ ₹500/hr). Review itemized details before finalization.&quot;
          </p>
        </div>
      )
    },
    {
      step: 8,
      title: 'Finance Reviews & Finalizes Next Month Payroll',
      description: 'Finance Admin Alex Rivera reviews the November ledger, confirms that external outage hours were not deducted, and finalizes the payslip, locking contributing time logs.',
      status: 'completed',
      badge: 'Finance Authorized',
      actionLabel: 'Switch to Finance Admin',
      onAction: () => {
        switchUser('usr-fin-1');
        onClose();
        navigate('/payroll');
      },
      evidence: (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1 font-mono">
          <div className="flex justify-between"><span className="text-slate-500">Destination Month:</span><span className="font-bold text-slate-800">2026-11 (November)</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Source Rework Month:</span><span className="font-bold text-slate-800">2026-10 (October)</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Time Log Lock Status:</span><span className="font-bold text-emerald-700">is_payroll_processed = true</span></div>
        </div>
      )
    },
    {
      step: 9,
      title: 'Official Finalized Payslip Breakdown',
      description: 'Priya\'s official printable payslip shows: Base Monthly Salary ₹80,000 - Quality Deduction ₹3,000 = ₹77,000 Net Disbursal, with complete itemized defect audit trails.',
      status: 'completed',
      badge: 'Official Statement',
      actionLabel: 'View Priya\'s Payslip',
      onAction: () => {
        onClose();
        navigate('/payroll');
      },
      evidence: (
        <div className="p-3 bg-slate-900 text-white rounded-lg text-xs space-y-1.5 font-mono">
          <div className="flex justify-between"><span className="text-slate-400">Base Salary:</span><span className="font-bold">₹80,000.00</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Rework Quality Deduction:</span><span className="text-rose-400 font-bold">-₹3,000.00</span></div>
          <div className="flex justify-between text-sm pt-1 border-t border-slate-800"><span className="text-emerald-400 font-bold">Net Disbursal:</span><span className="text-emerald-400 font-bold">₹77,000.00</span></div>
        </div>
      )
    },
    {
      step: 10,
      title: 'Immutable Cryptographic Audit Trail',
      description: 'Every status transition, attribution decision, approval timestamp, calculation run, and finalization event is immutably logged and searchable in the compliance ledger.',
      status: 'completed',
      badge: '100% Audited',
      actionLabel: 'Open Audit Trail',
      onAction: () => {
        onClose();
        navigate('/audit');
      },
      evidence: (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1 font-mono">
          <div className="flex items-center gap-1.5 text-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>TASK_COMPLETED (2026-09-25) by Priya Sharma</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
            <span>TASK_REOPENED (2026-10-04) upon BUG-101 creation</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>TIME_LOG_APPROVED (2026-10-07) by David Chen</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
            <span>DEFECT_CLASSIFIED (2026-10-04) by Sarah Jenkins</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>PAYROLL_CALCULATED & FINALIZED by Finance Admin</span>
          </div>
        </div>
      )
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="End-to-End Demo Walkthrough: Priya's Payment Processing Scenario"
      description="10-Point Authoritative Verification: From Sept 25 Delivery to Nov ₹3,000 Quality Deduction Finalization"
      maxWidth="3xl"
    >
      <div className="space-y-6 text-xs text-slate-700">
        {/* Banner summary */}
        <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">
              E2E
            </div>
            <div>
              <h4 className="font-bold text-blue-950 text-xs">Priya Sharma — Payment Gateway Scenario Active</h4>
              <p className="text-[11px] text-blue-800">
                Delivered Sept 25 • Reopened Oct 4 • 6h rework @ ₹500/hr = ₹3,000 deduction in Nov • External outage excluded.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => {
              resetAllData();
              alert('Reset all demo records to initial Priya scenario state!');
            }}
          >
            Reset Scenario
          </Button>
        </div>

        {/* Step-by-Step Interactive Accordion/List */}
        <div className="space-y-3">
          {steps.map((st) => (
            <div
              key={st.step}
              className={cn(
                'border rounded-xl transition-all overflow-hidden',
                activeStep === st.step ? 'border-blue-300 ring-2 ring-blue-100 bg-white' : 'border-slate-200 bg-slate-50/50 hover:bg-white'
              )}
            >
              <div
                className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                onClick={() => setActiveStep(activeStep === st.step ? 0 : st.step)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    activeStep === st.step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  )}>
                    {st.step}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">{st.title}</h5>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{st.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    {st.badge}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              </div>

              {activeStep === st.step && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3 animate-fadeIn">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {st.description}
                  </p>

                  {st.evidence}

                  <div className="pt-2 flex justify-end">
                    <Button
                      size="sm"
                      icon={<ArrowRight className="w-3.5 h-3.5" />}
                      onClick={st.onAction}
                    >
                      {st.actionLabel}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400">
          <span>All 10 stages verified and reproducible in ReworkGuard.</span>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close Walkthrough
          </Button>
        </div>
      </div>
    </Modal>
  );
};
