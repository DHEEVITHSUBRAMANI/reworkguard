import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingDown, 
  ShieldCheck, 
  Filter, 
  ArrowUpRight, 
  FileSpreadsheet,
  PieChart as PieChartIcon
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { formatCurrency, formatHours, cn } from '../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const Reports: React.FC = () => {
  const { projects, modules, tasks, bugs, timeLogs, payrollRecords } = useApp();
  const { users } = useAuth();

  const [selectedProject, setSelectedProject] = useState<string>('all');

  // Trend data: Quality metrics over months
  const qualityTrendData = [
    { month: 'Jun 2026', totalReworkHours: 8.0, deductionsSaved: 360, qualityScoreAvg: 95 },
    { month: 'Jul 2026', totalReworkHours: 12.5, deductionsSaved: 560, qualityScoreAvg: 93 },
    { month: 'Aug 2026', totalReworkHours: 15.0, deductionsSaved: 680, qualityScoreAvg: 91 },
    { month: 'Sep 2026', totalReworkHours: 11.0, deductionsSaved: 495, qualityScoreAvg: 92 },
    { month: 'Oct 2026', totalReworkHours: 20.0, deductionsSaved: 900, qualityScoreAvg: 89 },
  ];

  // Employee quality comparison data
  const employeeMetricsData = users
    .filter(u => u.role === 'employee')
    .map(emp => {
      const empLogs = timeLogs.filter(l => l.user_id === emp.id && l.log_type === 'corrective_maintenance');
      const attributableHours = empLogs
        .filter(l => l.attribution_status === 'attributable' && l.approval_status === 'approved')
        .reduce((sum, l) => sum + l.hours, 0);

      const exemptHours = empLogs
        .filter(l => l.attribution_status === 'exempt')
        .reduce((sum, l) => sum + l.hours, 0);

      return {
        name: emp.full_name.split(' ')[0],
        fullName: emp.full_name,
        qualityScore: emp.quality_score ?? 90,
        attributableHours,
        exemptHours,
        reopens: emp.reopen_count ?? 0,
        hourlyRate: emp.hourly_rate ?? 45,
      };
    });

  // Defect Classification breakdown
  const defectClassificationData = [
    { name: 'Attributable Delivery Defects', value: bugs.filter(b => b.defect_classification === 'caused_by_original_delivery').length, color: '#EF4444' },
    { name: 'Exempt / Client Scope Change', value: bugs.filter(b => b.defect_classification === 'not_caused_by_original_delivery').length, color: '#10B981' },
    { name: 'Pending Investigation', value: bugs.filter(b => b.defect_classification === 'pending_investigation').length, color: '#F59E0B' },
  ];

  const handleExportCSV = () => {
    // Generate clean CSV content
    const headers = ['Employee,Role,QualityScore,AttributableReworkHours,ExemptHours,HourlyRate,ReopenCount'];
    const rows = employeeMetricsData.map(e => 
      `"${e.fullName}",Employee,${e.qualityScore}%,${e.attributableHours},${e.exemptHours},$${e.hourlyRate},${e.reopens}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reworkguard-quality-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Engineering Quality & Financial Impact Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-project audit of delivery defects, rework costs, and payroll accountability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
          >
            Export Quality CSV
          </Button>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend of Rework Hours vs Deductions Saved */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Corrective Maintenance vs Savings</h3>
              <p className="text-xs text-slate-500 mt-0.5">Financial rework recovery under policy rules</p>
            </div>
            <span className="text-xs font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              $2,995 total recovered
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    name === 'deductionsSaved' ? `$${val}` : `${val} hrs`,
                    name === 'deductionsSaved' ? 'Policy Savings' : 'Rework Hours'
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="totalReworkHours" name="Corrective Hours" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="deductionsSaved" name="Policy Deductions ($)" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Defect Attribution Pie Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Defect Attribution Distribution</h3>
            <p className="text-xs text-slate-500 mt-0.5">Managerial classification outcomes for reported bugs</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={defectClassificationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {defectClassificationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [`${val} defect(s)`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 mt-2">
            {defectClassificationData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Employee Quality Scorecard Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Engineer Quality Scorecard & Attributable Hours
          </h3>
          <span className="text-xs text-slate-500">Benchmark: 90% Quality Score</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Engineer</th>
                <th className="px-4 py-3.5">Quality Rating</th>
                <th className="px-4 py-3.5">Attributable Rework Hours</th>
                <th className="px-4 py-3.5">Exempt Hours</th>
                <th className="px-4 py-3.5">Module Reopens</th>
                <th className="px-4 py-3.5">Hourly Rate</th>
                <th className="px-4 py-3.5 text-right">Policy Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employeeMetricsData.map((emp) => (
                <tr key={emp.fullName} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">
                    {emp.fullName}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            emp.qualityScore >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                          )}
                          style={{ width: `${emp.qualityScore}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-slate-800">{emp.qualityScore}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono font-semibold text-rose-600">
                    {emp.attributableHours} hrs
                  </td>
                  <td className="px-4 py-3.5 font-mono text-emerald-600 font-medium">
                    {emp.exemptHours} hrs
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-700">
                    {emp.reopens}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-600">
                    ${emp.hourlyRate}/hr
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-right text-slate-900">
                    {emp.attributableHours > 2 ? (
                      <span className="text-rose-600">
                        -${((emp.attributableHours - 2) * emp.hourlyRate).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">Within Grace</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
