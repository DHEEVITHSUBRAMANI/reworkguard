import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  Settings as SettingsIcon, 
  ShieldCheck, 
  RotateCcw, 
  Save, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  Sliders, 
  Info,
  DollarSign
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { PayrollPolicy } from '../types';

export const Settings: React.FC = () => {
  const { policy, updatePolicy, resetAllData, isDemoMode } = useApp();
  const { canConfigurePolicy, isEmployee } = useAuth();

  const [formData, setFormData] = useState<PayrollPolicy>(policy);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    updatePolicy({
      ...formData,
      updated_at: new Date().toISOString(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo data back to original seed state? This will restore initial projects, tasks, bugs, and time logs.')) {
      resetAllData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Banner */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Rework Deduction Policy & Governance</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tune calculation parameters, salary safety caps, grace allowances and role access.
            </p>
          </div>
        </div>
      </div>

      {/* Policy Configuration Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Corporate Rework Deduction Policy
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Defines how attributable corrective maintenance hours impact employee payslips.
            </p>
          </div>
          <Badge variant={formData.is_active ? 'success' : 'default'} dot>
            {formData.is_active ? 'Active Policy' : 'Draft Policy'}
          </Badge>
        </div>

        <form onSubmit={handleSavePolicy} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Title</label>
            <input
              type="text"
              disabled={!canConfigurePolicy}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Deduction Rate */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Deduction Rate Percentage (%)
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Multiplier applied to the employee&apos;s hourly rate for billable corrective hours. 100% equals full hourly rate.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  disabled={!canConfigurePolicy}
                  value={formData.deduction_rate_percentage}
                  onChange={(e) => setFormData({ ...formData, deduction_rate_percentage: Number(e.target.value) })}
                  className="w-32 text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                />
                <span className="text-xs font-bold text-slate-600">% of hourly rate</span>
              </div>
            </div>

            {/* Salary Cap */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Maximum Monthly Salary Cap (%)
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Statutory guardrail. Total deductions in any single month cannot exceed this percentage of base salary.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="50"
                  disabled={!canConfigurePolicy}
                  value={formData.max_deduction_cap_percentage}
                  onChange={(e) => setFormData({ ...formData, max_deduction_cap_percentage: Number(e.target.value) })}
                  className="w-32 text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                />
                <span className="text-xs font-bold text-slate-600">% max salary cap</span>
              </div>
            </div>

            {/* Monthly Grace Hours */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Monthly Grace Hours (Per Employee)
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Free rework allowance absorbed by the company each month before deductions commence.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  disabled={!canConfigurePolicy}
                  value={formData.monthly_grace_hours}
                  onChange={(e) => setFormData({ ...formData, monthly_grace_hours: Number(e.target.value) })}
                  className="w-32 text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                />
                <span className="text-xs font-bold text-slate-600">free hours / month</span>
              </div>
            </div>

            {/* Attribution Window */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Defect Attribution Window (Days)
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Grace period after client delivery. Defects reported after this window cannot be deducted.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="7"
                  max="180"
                  disabled={!canConfigurePolicy}
                  value={formData.defect_attribution_window_days}
                  onChange={(e) => setFormData({ ...formData, defect_attribution_window_days: Number(e.target.value) })}
                  className="w-32 text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                />
                <span className="text-xs font-bold text-slate-600">days post-delivery</span>
              </div>
            </div>

            {/* Rate Basis */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Rate Basis
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Determines whether the employee contract rate or standard blended tier rate is applied.
              </p>
              <select
                disabled={!canConfigurePolicy}
                value={formData.rate_basis || 'contract_rate'}
                onChange={(e) => setFormData({ ...formData, rate_basis: e.target.value as any })}
                className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 bg-white"
              >
                <option value="contract_rate">Contract Hourly Rate (Effective on work date)</option>
                <option value="standard_rate">Standard Standard Blended Policy Rate ($50.00)</option>
              </select>
            </div>

            {/* Destination Month Offset */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Payroll Calendar Deduction Timing
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Next-Month rule (offset = +1 month) vs Same-Month deduction.
              </p>
              <select
                disabled={!canConfigurePolicy}
                value={formData.destination_month_offset ?? 1}
                onChange={(e) => setFormData({ ...formData, destination_month_offset: Number(e.target.value) })}
                className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 bg-white"
              >
                <option value={1}>Next-Month Deduction (+1 Month Offset e.g. Oct rework - Nov payroll)</option>
                <option value={0}>Same-Month Deduction (0 Offset e.g. Oct rework - Oct payroll)</option>
              </select>
            </div>

            {/* Rounding Mode & Currency */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Monetary Arithmetic & Currency
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Authoritative integer minor units rounding method (banker&apos;s vs standard arithmetic).
              </p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  disabled={!canConfigurePolicy}
                  value={formData.rounding_mode || 'round_half_even'}
                  onChange={(e) => setFormData({ ...formData, rounding_mode: e.target.value as any })}
                  className="text-xs font-mono font-bold px-2 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 bg-white"
                >
                  <option value="round_half_even">Round Half Even (Banker&apos;s)</option>
                  <option value="round_half_up">Round Half Up (Standard)</option>
                </select>
                <select
                  disabled={!canConfigurePolicy}
                  value={formData.currency || 'USD'}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="text-xs font-mono font-bold px-2 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 bg-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            {/* Policy Version & Discretionary Override */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Governance & Relief Overrides
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Policy identifier version and management relief permissions.
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-800">Version: {formData.policy_version || 'v2.0'}</span>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canConfigurePolicy}
                    checked={formData.allow_no_deduction_override ?? false}
                    onChange={(e) => setFormData({ ...formData, allow_no_deduction_override: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Allow Good-Faith Waivers</span>
                </label>
              </div>
            </div>
          </div>

          {canConfigurePolicy ? (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {saveSuccess ? (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Policy parameters updated & saved to audit log!
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Last updated: {formData.updated_at ? new Date(formData.updated_at).toLocaleString() : 'N/A'}
                </span>
              )}
              <Button type="submit" size="sm" icon={<Save className="w-3.5 h-3.5" />}>
                Save Policy Changes
              </Button>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 text-amber-900 rounded-lg text-xs flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>You need Manager or Finance Admin privileges to edit policy parameters.</span>
            </div>
          )}
        </form>
      </div>

      {/* Role Matrix Overview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-blue-600" />
          Role Permission Matrix & Enforcement
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="p-3">Capability / Action</th>
                <th className="p-3 text-center">Software Engineer</th>
                <th className="p-3 text-center">Team Lead</th>
                <th className="p-3 text-center">Engineering Manager</th>
                <th className="p-3 text-center">Finance Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              <tr>
                <td className="p-3 font-medium">Log Regular & Corrective Hours</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Approve Time Logs</td>
                <td className="p-3 text-center text-slate-400">No</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Classify Defects (Delivery Attribution)</td>
                <td className="p-3 text-center text-slate-400">No</td>
                <td className="p-3 text-center text-slate-400">No</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Configure Deduction Policy & Caps</td>
                <td className="p-3 text-center text-slate-400">No</td>
                <td className="p-3 text-center text-slate-400">No</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Finalize Monthly Payslips & Disbursals</td>
                <td className="p-3 text-center text-slate-400">No</td>
                <td className="p-3 text-center text-slate-400">No</td>
                <td className="p-3 text-center text-slate-400">No</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Yes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Database & Demo Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              Demo Data & Storage Management
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Current environment: {isDemoMode ? 'Offline Persistent Local Storage (Demo Mode)' : 'Connected to Supabase PostgreSQL'}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleResetData}
          >
            {resetSuccess ? 'Seed Data Restored!' : 'Reset All Demo Data'}
          </Button>
        </div>
      </div>
    </div>
  );
};
