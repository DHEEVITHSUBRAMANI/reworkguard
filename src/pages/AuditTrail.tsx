import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Receipt, 
  RotateCcw,
  User
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { formatDateTime, cn } from '../lib/utils';
import { EntityType } from '../types';

export const AuditTrail: React.FC = () => {
  const { auditLogs, searchQuery } = useApp();
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState<string>('');

  const filteredLogs = auditLogs.filter((log) => {
    const query = (localSearch || searchQuery).toLowerCase();
    const matchesSearch =
      log.action.toLowerCase().includes(query) ||
      log.details.toLowerCase().includes(query) ||
      log.user_name.toLowerCase().includes(query) ||
      log.entity_id.toLowerCase().includes(query);
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    return matchesSearch && matchesEntity;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('PAYROLL')) {
      return <Badge variant="danger" dot>Payroll Event</Badge>;
    }
    if (action.includes('APPROVED')) {
      return <Badge variant="success" dot>Authorized</Badge>;
    }
    if (action.includes('REOPENED')) {
      return <Badge variant="warning" dot>Reopened</Badge>;
    }
    if (action.includes('DEFECT') || action.includes('BUG')) {
      return <Badge variant="purple" dot>Defect Action</Badge>;
    }
    return <Badge variant="info">System Action</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Intro info card */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Immutable Compliance & Operational Audit Trail</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Every status change, time authorization, defect attribution, and payroll deduction is cryptographically tracked.
            </p>
          </div>
        </div>
        <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
          {auditLogs.length} events logged
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Entity Types</option>
            <option value="task">Tasks</option>
            <option value="module">Modules</option>
            <option value="project">Projects</option>
            <option value="bug">Defects & Bugs</option>
            <option value="time_log">Time Logs</option>
            <option value="payroll">Payroll Records</option>
            <option value="policy">Policies</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search action, details, user..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Audit Log Timeline Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Action & Event</th>
                <th className="px-4 py-3.5">Initiator</th>
                <th className="px-4 py-3.5">Entity Reference</th>
                <th className="px-4 py-3.5">Event Details & Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-sans text-xs">
                    No audit records found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Timestamp */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">
                      {formatDateTime(log.created_at)}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Initiator */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-sans font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.user_name}</span>
                      </div>
                    </td>

                    {/* Entity */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                        {log.entity_type}
                      </span>
                      <span className="ml-1.5 text-slate-500 font-mono">{log.entity_id}</span>
                    </td>

                    {/* Details */}
                    <td className="px-4 py-3.5 font-sans text-slate-700 leading-relaxed max-w-lg">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
