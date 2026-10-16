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
  User,
  Download,
  Eye,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Layers,
  Sparkles,
  Lock
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { formatDateTime, cn } from '../lib/utils';
import { EntityType, AuditLog } from '../types';
import { exportAuditTrailToCSV } from '../lib/csvExport';

export const AuditTrail: React.FC = () => {
  const { auditLogs, searchQuery, taskStateHistory } = useApp();
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionCategoryFilter, setActionCategoryFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState<string>('');
  
  // Selected log for detailed diff modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = auditLogs.filter((log) => {
    const query = (localSearch || searchQuery).toLowerCase();
    const matchesSearch =
      log.action.toLowerCase().includes(query) ||
      log.details.toLowerCase().includes(query) ||
      log.user_name.toLowerCase().includes(query) ||
      log.entity_id.toLowerCase().includes(query) ||
      log.id.toLowerCase().includes(query);
    
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;

    let matchesCategory = true;
    if (actionCategoryFilter === 'payroll') {
      matchesCategory = log.action.includes('PAYROLL') || log.entity_type === 'payroll';
    } else if (actionCategoryFilter === 'approval') {
      matchesCategory = log.action.includes('APPROVED') || log.action.includes('REJECTED');
    } else if (actionCategoryFilter === 'reopened') {
      matchesCategory = log.action.includes('REOPENED') || log.action.includes('STATUS');
    } else if (actionCategoryFilter === 'defect') {
      matchesCategory = log.action.includes('DEFECT') || log.action.includes('BUG');
    }

    return matchesSearch && matchesEntity && matchesCategory;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('PAYROLL')) {
      return <Badge variant="danger" dot>Payroll Event</Badge>;
    }
    if (action.includes('APPROVED')) {
      return <Badge variant="success" dot>Authorized</Badge>;
    }
    if (action.includes('REJECTED')) {
      return <Badge variant="danger" dot>Rejected</Badge>;
    }
    if (action.includes('REOPENED')) {
      return <Badge variant="warning" dot>Reopened (Rework)</Badge>;
    }
    if (action.includes('DEFECT') || action.includes('BUG')) {
      return <Badge variant="purple" dot>Defect Action</Badge>;
    }
    return <Badge variant="info">System Action</Badge>;
  };

  const handleExportCSV = () => {
    exportAuditTrailToCSV(filteredLogs);
  };

  // Helper to extract structured diff attributes from log details if not explicitly present in structured_change_details
  const getParsedChangeDetails = (log: AuditLog) => {
    if (log.structured_change_details && Object.keys(log.structured_change_details).length > 0) {
      return log.structured_change_details;
    }
    
    // Attempt parsing from linked taskStateHistory if entity is task
    if (log.entity_type === 'task' || log.entity_type === 'module') {
      const matchedHistory = taskStateHistory.find(
        h => h.task_id === log.entity_id || (h.reason ? log.details.includes(h.reason) : false)
      );
      if (matchedHistory) {
        return {
          previous_state: matchedHistory.previous_status,
          new_state: matchedHistory.new_status,
          actor: matchedHistory.actor_name,
          reason: matchedHistory.reason,
          timestamp: matchedHistory.timestamp || matchedHistory.created_at
        };
      }
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Intro info card */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Immutable Compliance & Operational Audit Trail</h3>
              <span className="flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                <Lock className="w-2.5 h-2.5" /> Append-Only Ledger
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Every status transition, defect attribution, managerial time approval, and payroll deduction calculation is cryptographically recorded.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
          >
            Export Audit CSV
          </Button>
          <span className="font-mono text-xs font-semibold px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
            {filteredLogs.length} / {auditLogs.length} events
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Entity Filter */}
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

          {/* Action Category Filter */}
          <select
            value={actionCategoryFilter}
            onChange={(e) => setActionCategoryFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Action Categories</option>
            <option value="reopened">Status Transitions & Reopening</option>
            <option value="defect">Defect Classifications</option>
            <option value="approval">Time Approvals & Reviews</option>
            <option value="payroll">Payroll Calculations & Finalizations</option>
          </select>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search action, user, entity ID, details..."
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
                <th className="px-4 py-3.5 w-8"></th>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Action & Event</th>
                <th className="px-4 py-3.5">Initiator / Actor</th>
                <th className="px-4 py-3.5">Entity Reference</th>
                <th className="px-4 py-3.5">Event Details & Justification</th>
                <th className="px-4 py-3.5 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-sans text-xs">
                    No audit records found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const parsedDiff = getParsedChangeDetails(log);

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        className={cn(
                          'hover:bg-slate-50/80 transition-colors cursor-pointer',
                          isExpanded && 'bg-blue-50/30'
                        )}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        {/* Toggle Icon */}
                        <td className="px-4 py-3.5 text-slate-400 text-center">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </td>

                        {/* Timestamp */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">
                          {formatDateTime(log.created_at || log.timestamp)}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>

                        {/* Initiator */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-sans font-medium text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{log.user_name || log.actor_name || 'System Engine'}</span>
                          </div>
                        </td>

                        {/* Entity */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                            {log.entity_type}
                          </span>
                          <span className="ml-1.5 text-slate-500 font-mono font-semibold">{log.entity_id}</span>
                        </td>

                        {/* Details */}
                        <td className="px-4 py-3.5 font-sans text-slate-700 leading-relaxed max-w-lg">
                          {log.details}
                        </td>

                        {/* Inspect Button */}
                        <td className="px-4 py-3.5 text-right font-sans whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            Diff Details
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Row Diff View */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-y border-slate-200/80">
                          <td colSpan={7} className="px-8 py-4 font-sans">
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                  <span>Structured Audit Payload & State Snapshot</span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
                                  Log UUID: {log.id}
                                </span>
                              </div>

                              {parsedDiff ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                  <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Previous State</span>
                                    <span className="font-mono font-semibold text-slate-700 mt-0.5 block">
                                      {parsedDiff.previous_state || 'N/A (Initial Record)'}
                                    </span>
                                  </div>
                                  <div className="p-2.5 bg-blue-50/50 rounded border border-blue-100">
                                    <span className="text-[10px] uppercase font-bold text-blue-600 block">New Transition State</span>
                                    <span className="font-mono font-bold text-blue-800 mt-0.5 block">
                                      {parsedDiff.new_state || log.action}
                                    </span>
                                  </div>
                                  <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Transition Rationale</span>
                                    <span className="text-slate-700 mt-0.5 block italic">
                                      "{parsedDiff.reason || log.details}"
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 bg-slate-50 rounded text-xs text-slate-600">
                                  <div className="flex items-center gap-2 mb-1.5 font-semibold text-slate-700">
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Audit Change Details</span>
                                  </div>
                                  <p className="leading-relaxed font-sans">{log.details}</p>
                                </div>
                              )}

                              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                                <div>
                                  <strong>Actor:</strong> {log.user_name || log.actor_name || 'System'} ({log.user_id || log.actor_id || 'system-engine'})
                                </div>
                                <div>
                                  <strong>Entity Type:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">{log.entity_type}</code> ({log.entity_id})
                                </div>
                                <div>
                                  <strong>Timestamp:</strong> {formatDateTime(log.created_at || log.timestamp)}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Structured Diff Modal for Deep Inspection */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title={`Audit Record: ${selectedLog.action}`}
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Header badges */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                {getActionBadge(selectedLog.action)}
                <span className="font-bold text-slate-800">{selectedLog.entity_type.toUpperCase()} #{selectedLog.entity_id}</span>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">
                {formatDateTime(selectedLog.created_at || selectedLog.timestamp)}
              </span>
            </div>

            {/* Change summary */}
            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
              <span className="font-bold text-slate-900 block text-xs">Event Narrative & Audit Justification</span>
              <p className="text-slate-700 leading-relaxed text-xs">
                {selectedLog.details}
              </p>
            </div>

            {/* Structured State Diff Comparison */}
            {(() => {
              const diff = getParsedChangeDetails(selectedLog);
              if (diff) {
                return (
                  <div className="space-y-2">
                    <span className="font-bold text-slate-900 block text-xs">State Transition Diff</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-200">
                        <span className="text-[10px] font-bold uppercase text-rose-700 block">Previous Status / Value</span>
                        <div className="font-mono font-bold text-rose-900 text-sm mt-1">
                          {diff.previous_state || 'None (Initial Entry)'}
                        </div>
                      </div>
                      <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
                        <span className="text-[10px] font-bold uppercase text-emerald-700 block">New Transition Status</span>
                        <div className="font-mono font-bold text-emerald-900 text-sm mt-1">
                          {diff.new_state || selectedLog.action}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Cryptographic Compliance metadata */}
            <div className="p-3 bg-slate-900 text-slate-200 rounded-lg space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5 font-sans">
                <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> Immutable Audit Ledger Record
                </span>
                <span>RFC-4180 / SOC-2 Compliant</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-slate-500">Record ID:</span> {selectedLog.id}</div>
                <div><span className="text-slate-500">Actor ID:</span> {selectedLog.user_id || selectedLog.actor_id || 'system-engine'}</div>
                <div><span className="text-slate-500">Entity:</span> {selectedLog.entity_type}::{selectedLog.entity_id}</div>
                <div><span className="text-slate-500">Timestamp:</span> {selectedLog.created_at || selectedLog.timestamp}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
