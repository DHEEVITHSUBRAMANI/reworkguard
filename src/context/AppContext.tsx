import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Project, 
  Module, 
  Task, 
  BugReport, 
  TimeLog, 
  PayrollPolicy, 
  PayrollRecord, 
  AuditLog, 
  AppNotification,
  DefectClassification,
  ApprovalStatus,
  AttributionStatus,
  User
} from '../types';
import { StorageService } from '../services/storage';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface AppContextType {
  projects: Project[];
  modules: Module[];
  tasks: Task[];
  bugs: BugReport[];
  timeLogs: TimeLog[];
  policy: PayrollPolicy;
  payrollRecords: PayrollRecord[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isDemoMode: boolean;
  
  // Actions
  addProject: (data: Omit<Project, 'id' | 'created_at'>) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  addModule: (data: Omit<Module, 'id' | 'created_at' | 'reopen_count'>) => void;
  updateModule: (id: string, data: Partial<Module>) => void;
  reopenModule: (id: string, reason?: string) => void;
  
  addTask: (data: Omit<Task, 'id' | 'created_at' | 'corrective_hours' | 'actual_regular_hours'>) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  completeTask: (id: string) => void;
  reopenTask: (id: string, reason?: string) => void;
  
  addBugReport: (data: Omit<BugReport, 'id' | 'created_at'>) => void;
  classifyDefect: (
    bugId: string, 
    classification: DefectClassification, 
    notes: string
  ) => void;
  
  addTimeLog: (data: Omit<TimeLog, 'id' | 'created_at' | 'approval_status' | 'attribution_status'>) => void;
  reviewTimeLog: (
    logId: string, 
    status: ApprovalStatus, 
    attributionStatus?: AttributionStatus,
    reason?: string
  ) => void;
  
  updatePolicy: (policy: PayrollPolicy) => void;
  calculatePayrollForMonth: (targetMonth: string, sourceMonth: string) => void;
  finalizePayrollRecord: (recordId: string) => void;
  
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, users } = useAuth();

  const [projects, setProjects] = useState<Project[]>(() => StorageService.getProjects());
  const [modules, setModules] = useState<Module[]>(() => StorageService.getModules());
  const [tasks, setTasks] = useState<Task[]>(() => StorageService.getTasks());
  const [bugs, setBugs] = useState<BugReport[]>(() => StorageService.getBugs());
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>(() => StorageService.getTimeLogs());
  const [policy, setPolicyState] = useState<PayrollPolicy>(() => StorageService.getPolicy());
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() => StorageService.getPayroll());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => StorageService.getAuditLogs());
  const [notifications, setNotifications] = useState<AppNotification[]>(() => StorageService.getNotifications());
  const [selectedMonth, setSelectedMonthState] = useState<string>(() => StorageService.getSelectedMonth());
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isDemoMode = !isSupabaseConfigured;

  const setSelectedMonth = (month: string) => {
    setSelectedMonthState(month);
    StorageService.setSelectedMonth(month);
  };

  const addAuditLog = (
    action: string, 
    entityType: AuditLog['entity_type'], 
    entityId: string, 
    details: string,
    metadata?: Record<string, any>
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      metadata,
      created_at: new Date().toISOString(),
    };
    const updated = [newLog, ...auditLogs];
    setAuditLogs(updated);
    StorageService.setAuditLogs(updated);
  };

  const addNotification = (
    userId: string,
    title: string,
    message: string,
    type: AppNotification['type'] = 'info',
    link?: string
  ) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      title,
      message,
      type,
      read: false,
      link,
      created_at: new Date().toISOString(),
    };
    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    StorageService.setNotifications(updated);
  };

  // Projects
  const addProject = (data: Omit<Project, 'id' | 'created_at'>) => {
    const newProject: Project = {
      ...data,
      id: `prj-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newProject, ...projects];
    setProjects(updated);
    StorageService.setProjects(updated);
    addAuditLog('PROJECT_CREATED', 'project', newProject.id, `Created project "${newProject.name}" (${newProject.code})`);
  };

  const updateProject = (id: string, data: Partial<Project>) => {
    const updated = projects.map(p => p.id === id ? { ...p, ...data } : p);
    setProjects(updated);
    StorageService.setProjects(updated);
    addAuditLog('PROJECT_UPDATED', 'project', id, `Updated project details`);
  };

  // Modules
  const addModule = (data: Omit<Module, 'id' | 'created_at' | 'reopen_count'>) => {
    const newModule: Module = {
      ...data,
      id: `mod-${Date.now()}`,
      reopen_count: 0,
      created_at: new Date().toISOString(),
    };
    const updated = [...modules, newModule];
    setModules(updated);
    StorageService.setModules(updated);
    addAuditLog('MODULE_CREATED', 'module', newModule.id, `Created module "${newModule.name}" (${newModule.code})`);
  };

  const updateModule = (id: string, data: Partial<Module>) => {
    const updated = modules.map(m => m.id === id ? { ...m, ...data } : m);
    setModules(updated);
    StorageService.setModules(updated);
    addAuditLog('MODULE_UPDATED', 'module', id, `Updated module properties`);
  };

  const reopenModule = (id: string, reason?: string) => {
    const target = modules.find(m => m.id === id);
    if (!target) return;
    const updated = modules.map(m => {
      if (m.id === id) {
        return {
          ...m,
          status: 'reopened' as const,
          reopened_at: new Date().toISOString(),
          reopen_count: (m.reopen_count || 0) + 1,
        };
      }
      return m;
    });
    setModules(updated);
    StorageService.setModules(updated);
    addAuditLog('MODULE_REOPENED', 'module', id, `Reopened module "${target.name}". Reason: ${reason || 'Defects detected'}`);
    addNotification('all', `Module Reopened: ${target.name}`, `Module was reopened due to reported defects: ${reason || 'Investigation underway'}`, 'warning', '/projects');
  };

  // Tasks
  const addTask = (data: Omit<Task, 'id' | 'created_at' | 'corrective_hours' | 'actual_regular_hours'>) => {
    const newTask: Task = {
      ...data,
      id: `tsk-${Date.now()}`,
      corrective_hours: 0,
      actual_regular_hours: 0,
      created_at: new Date().toISOString(),
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    StorageService.setTasks(updated);
    addAuditLog('TASK_CREATED', 'task', newTask.id, `Created task "${newTask.title}"`);
    addNotification(newTask.assigned_to, 'New Task Assigned', `You have been assigned to task: ${newTask.title}`, 'info', '/tasks');
  };

  const updateTask = (id: string, data: Partial<Task>) => {
    const updated = tasks.map(t => t.id === id ? { ...t, ...data } : t);
    setTasks(updated);
    StorageService.setTasks(updated);
    addAuditLog('TASK_UPDATED', 'task', id, `Updated task details`);
  };

  const completeTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const now = new Date().toISOString();
    const updated = tasks.map(t => t.id === id ? {
      ...t,
      status: 'completed' as const,
      completed_at: now,
      delivered_at: now,
    } : t);
    setTasks(updated);
    StorageService.setTasks(updated);
    addAuditLog('TASK_COMPLETED', 'task', id, `Marked task "${task.title}" as delivered & completed`);
    addNotification('all', 'Task Delivered', `Task "${task.title}" was marked as completed and delivered.`, 'success', '/tasks');
  };

  const reopenTask = (id: string, reason?: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updated = tasks.map(t => t.id === id ? {
      ...t,
      status: 'reopened' as const,
    } : t);
    setTasks(updated);
    StorageService.setTasks(updated);
    addAuditLog('TASK_REOPENED', 'task', id, `Task "${task.title}" reopened. Reason: ${reason || 'Post-delivery defect'}`);
    addNotification(task.assigned_to, 'Task Reopened', `Task "${task.title}" was reopened for corrective work.`, 'danger', '/tasks');
  };

  // Bug Reports & Classification
  const addBugReport = (data: Omit<BugReport, 'id' | 'created_at'>) => {
    const newBug: BugReport = {
      ...data,
      id: `bug-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newBug, ...bugs];
    setBugs(updated);
    StorageService.setBugs(updated);
    addAuditLog('BUG_REPORTED', 'bug', newBug.id, `Reported bug "${newBug.title}" with severity ${newBug.severity}`);

    // If linked to a delivered module, prompt reopen
    if (newBug.module_id) {
      const mod = modules.find(m => m.id === data.module_id);
      if (mod && mod.status === 'delivered') {
        reopenModule(mod.id, `Bug reported: ${data.title}`);
      }
    }
    // If linked to a completed task, reopen task
    if (newBug.task_id) {
      reopenTask(newBug.task_id, `Bug reported: ${data.title}`);
    }

    addNotification('all', 'New Bug Reported', `Bug reported: "${newBug.title}" (${newBug.severity.toUpperCase()})`, 'warning', '/bugs');
  };

  const classifyDefect = (
    bugId: string, 
    classification: DefectClassification, 
    notes: string
  ) => {
    const bug = bugs.find(b => b.id === bugId);
    if (!bug) return;

    const now = new Date().toISOString();
    const updatedBugs = bugs.map(b => b.id === bugId ? {
      ...b,
      defect_classification: classification,
      classification_notes: notes,
      classified_by: currentUser.id,
      classified_at: now,
    } : b);
    setBugs(updatedBugs);
    StorageService.setBugs(updatedBugs);

    // Update attribution on all linked corrective time logs
    let targetAttribution: AttributionStatus = 'pending';
    if (classification === 'caused_by_original_delivery') {
      targetAttribution = 'attributable';
    } else if (classification === 'not_caused_by_original_delivery') {
      targetAttribution = 'exempt';
    }

    const updatedLogs = timeLogs.map(l => {
      if (l.bug_id === bugId) {
        return {
          ...l,
          attribution_status: targetAttribution,
          exempt_reason: classification === 'not_caused_by_original_delivery' ? notes : l.exempt_reason,
        };
      }
      return l;
    });
    setTimeLogs(updatedLogs);
    StorageService.setTimeLogs(updatedLogs);

    const classificationLabels: Record<DefectClassification, string> = {
      caused_by_original_delivery: 'Caused by original delivery (Attributable)',
      not_caused_by_original_delivery: 'Not caused by original delivery (Exempt)',
      pending_investigation: 'Pending investigation',
    };

    addAuditLog('DEFECT_CLASSIFIED', 'bug', bugId, `Defect classified as "${classificationLabels[classification]}". Notes: ${notes}`);

    if (bug.original_developer_id) {
      const isAttr = classification === 'caused_by_original_delivery';
      addNotification(
        bug.original_developer_id,
        `Defect Classified: ${bug.title}`,
        `Manager ${currentUser.full_name} classified Bug #${bugId} as: ${classificationLabels[classification]}. ${isAttr ? 'Associated corrective hours will be considered for payroll deduction review.' : 'Associated hours are exempt from payroll deduction.'}`,
        isAttr ? 'danger' : 'info',
        '/bugs'
      );
    }
  };

  // Time Logs
  const addTimeLog = (data: Omit<TimeLog, 'id' | 'created_at' | 'approval_status' | 'attribution_status'>) => {
    // Determine initial attribution status
    let attributionStatus: AttributionStatus = 'exempt';
    if (data.log_type === 'corrective_maintenance') {
      attributionStatus = 'pending';
      if (data.bug_id) {
        const bug = bugs.find(b => b.id === data.bug_id);
        if (bug) {
          if (bug.defect_classification === 'caused_by_original_delivery') {
            attributionStatus = 'attributable';
          } else if (bug.defect_classification === 'not_caused_by_original_delivery') {
            attributionStatus = 'exempt';
          }
        }
      }
    }

    const newLog: TimeLog = {
      ...data,
      id: `log-${Date.now()}`,
      approval_status: 'pending',
      attribution_status: attributionStatus,
      created_at: new Date().toISOString(),
    };

    const updated = [newLog, ...timeLogs];
    setTimeLogs(updated);
    StorageService.setTimeLogs(updated);

    // Update task hour totals
    const task = tasks.find(t => t.id === data.task_id);
    if (task) {
      if (data.log_type === 'regular') {
        updateTask(task.id, { actual_regular_hours: (task.actual_regular_hours || 0) + data.hours });
      } else {
        updateTask(task.id, { corrective_hours: (task.corrective_hours || 0) + data.hours });
      }
    }

    addAuditLog('TIME_LOGGED', 'time_log', newLog.id, `Logged ${data.hours} hours (${data.log_type}) for task`);
    addNotification('all', 'New Time Log Submitted', `${currentUser.full_name} submitted ${data.hours} hrs (${data.log_type.replace('_', ' ')}) for approval.`, 'info', '/approvals');
  };

  const reviewTimeLog = (
    logId: string, 
    status: ApprovalStatus, 
    attributionStatus?: AttributionStatus,
    reason?: string
  ) => {
    const target = timeLogs.find(l => l.id === logId);
    if (!target) return;

    const now = new Date().toISOString();
    const updated = timeLogs.map(l => {
      if (l.id === logId) {
        return {
          ...l,
          approval_status: status,
          approved_by: currentUser.id,
          approved_at: now,
          attribution_status: attributionStatus || l.attribution_status,
          rejection_reason: status === 'rejected' ? reason : undefined,
          exempt_reason: attributionStatus === 'exempt' ? reason : l.exempt_reason,
        };
      }
      return l;
    });

    setTimeLogs(updated);
    StorageService.setTimeLogs(updated);

    addAuditLog(
      status === 'approved' ? 'TIME_LOG_APPROVED' : 'TIME_LOG_REJECTED',
      'time_log',
      logId,
      `${status === 'approved' ? 'Approved' : 'Rejected'} ${target.hours}h log (${target.log_type}) for ${target.user_id}. Attribution: ${attributionStatus || target.attribution_status}`
    );

    addNotification(
      target.user_id,
      `Time Log ${status.toUpperCase()}`,
      `Your ${target.hours} hr ${target.log_type.replace('_', ' ')} log was ${status} by ${currentUser.full_name}.`,
      status === 'approved' ? 'success' : 'danger',
      '/time'
    );
  };

  // Policy
  const updatePolicy = (newPolicy: PayrollPolicy) => {
    setPolicyState(newPolicy);
    StorageService.setPolicy(newPolicy);
    addAuditLog('POLICY_UPDATED', 'policy', newPolicy.id, `Updated payroll deduction rules: Rate=${newPolicy.deduction_rate_percentage}%, Cap=${newPolicy.max_deduction_cap_percentage}%, Grace=${newPolicy.monthly_grace_hours}h`);
    addNotification('all', 'Payroll Policy Updated', `Deduction policy adjusted: ${newPolicy.deduction_rate_percentage}% rate, ${newPolicy.max_deduction_cap_percentage}% salary cap.`, 'warning', '/settings');
  };

  // Payroll Calculation Engine
  const calculatePayrollForMonth = (targetMonth: string, sourceMonth: string) => {
    const updatedRecords = [...payrollRecords];

    users.forEach(employee => {
      // Find all approved time logs for this employee in source month
      const empLogs = timeLogs.filter(l => 
        l.user_id === employee.id && 
        l.date.startsWith(sourceMonth) &&
        l.approval_status === 'approved'
      );

      const regularHours = empLogs
        .filter(l => l.log_type === 'regular')
        .reduce((sum, l) => sum + l.hours, 0);

      const correctiveLogs = empLogs.filter(l => l.log_type === 'corrective_maintenance');
      const totalCorrectiveHours = correctiveLogs.reduce((sum, l) => sum + l.hours, 0);

      const attributableHours = correctiveLogs
        .filter(l => l.attribution_status === 'attributable')
        .reduce((sum, l) => sum + l.hours, 0);

      const exemptHours = correctiveLogs
        .filter(l => l.attribution_status === 'exempt')
        .reduce((sum, l) => sum + l.hours, 0);

      // Apply grace hours
      const hourlyRate = employee.hourly_rate ?? 50;
      const baseSalary = employee.base_monthly_salary ?? 7000;

      const billableDeductionHours = Math.max(0, attributableHours - policy.monthly_grace_hours);
      const grossDeduction = billableDeductionHours * hourlyRate * (policy.deduction_rate_percentage / 100);
      const salaryCap = baseSalary * (policy.max_deduction_cap_percentage / 100);
      
      const deductionCapApplied = grossDeduction > salaryCap;
      const finalDeduction = deductionCapApplied ? salaryCap : grossDeduction;
      const netPayout = baseSalary - finalDeduction;

      const recordIndex = updatedRecords.findIndex(r => r.period === targetMonth && r.employee_id === employee.id);
      
      const newRecord: PayrollRecord = {
        id: recordIndex >= 0 ? updatedRecords[recordIndex].id : `pay-${targetMonth}-${employee.id}`,
        period: targetMonth,
        source_month: sourceMonth,
        employee_id: employee.id,
        base_salary: baseSalary,
        hourly_rate: hourlyRate,
        regular_hours_worked: regularHours || 160,
        total_corrective_hours: totalCorrectiveHours,
        attributable_corrective_hours: attributableHours,
        exempt_corrective_hours: exemptHours,
        billable_deduction_hours: billableDeductionHours,
        gross_deduction_amount: grossDeduction,
        deduction_amount: finalDeduction,
        deduction_cap_applied: deductionCapApplied,
        net_payout: netPayout,
        status: recordIndex >= 0 && updatedRecords[recordIndex].status === 'finalized' ? 'finalized' : 'draft',
        notes: `${attributableHours}h attributable corrective rework in ${sourceMonth}. Grace applied: ${policy.monthly_grace_hours}h. Billable: ${billableDeductionHours}h @ $${hourlyRate}/hr (${policy.deduction_rate_percentage}%).`,
        created_at: new Date().toISOString(),
      };

      if (recordIndex >= 0) {
        updatedRecords[recordIndex] = newRecord;
      } else {
        updatedRecords.push(newRecord);
      }
    });

    setPayrollRecords(updatedRecords);
    StorageService.setPayroll(updatedRecords);
    addAuditLog('PAYROLL_CALCULATED', 'payroll', targetMonth, `Recalculated payroll deductions for ${targetMonth} from ${sourceMonth} rework logs`);
    addNotification('all', `Payroll Updated for ${targetMonth}`, `Payroll recalculation complete with latest approved corrective rework hours.`, 'info', '/payroll');
  };

  const finalizePayrollRecord = (recordId: string) => {
    const updated = payrollRecords.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          status: 'finalized' as const,
          finalized_at: new Date().toISOString(),
          finalized_by: currentUser.id,
        };
      }
      return r;
    });
    setPayrollRecords(updated);
    StorageService.setPayroll(updated);
    addAuditLog('PAYROLL_FINALIZED', 'payroll', recordId, `Finalized payroll record ${recordId} by Finance Admin ${currentUser.full_name}`);
    addNotification('all', 'Payslip Finalized', `Payslip finalized for record #${recordId}.`, 'success', '/payroll');
  };

  const markNotificationRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    StorageService.setNotifications(updated);
  };

  const markAllNotificationsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    StorageService.setNotifications(updated);
  };

  const resetAllData = () => {
    StorageService.resetToSeedData();
    setProjects(StorageService.getProjects());
    setModules(StorageService.getModules());
    setTasks(StorageService.getTasks());
    setBugs(StorageService.getBugs());
    setTimeLogs(StorageService.getTimeLogs());
    setPolicyState(StorageService.getPolicy());
    setPayrollRecords(StorageService.getPayroll());
    setAuditLogs(StorageService.getAuditLogs());
    setNotifications(StorageService.getNotifications());
  };

  return (
    <AppContext.Provider
      value={{
        projects,
        modules,
        tasks,
        bugs,
        timeLogs,
        policy,
        payrollRecords,
        auditLogs,
        notifications,
        selectedMonth,
        setSelectedMonth,
        searchQuery,
        setSearchQuery,
        isDemoMode,
        addProject,
        updateProject,
        addModule,
        updateModule,
        reopenModule,
        addTask,
        updateTask,
        completeTask,
        reopenTask,
        addBugReport,
        classifyDefect,
        addTimeLog,
        reviewTimeLog,
        updatePolicy,
        calculatePayrollForMonth,
        finalizePayrollRecord,
        markNotificationRead,
        markAllNotificationsRead,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
