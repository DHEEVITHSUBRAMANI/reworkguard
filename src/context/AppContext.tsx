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
  TaskStatus,
  TaskStateHistory,
  BugAttributionRecord,
  User
} from '../types';
import { StorageService } from '../services/storage';
import { tasksApi, bugsApi, timeLogsApi } from '../services/api';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface AppContextType {
  projects: Project[];
  modules: Module[];
  tasks: Task[];
  bugs: BugReport[];
  timeLogs: TimeLog[];
  taskStateHistory: TaskStateHistory[];
  bugAttributions: BugAttributionRecord[];
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
  updateTaskStatus: (taskId: string, newStatus: TaskStatus, reason: string) => Promise<{ success: boolean; error?: string }>;
  completeTask: (id: string) => Promise<{ success: boolean; task?: Task; error?: string }>;
  startCorrectiveWork: (id: string) => Promise<{ success: boolean; task?: Task; error?: string }>;
  reopenTask: (id: string, reason?: string) => Promise<{ success: boolean; task?: Task; error?: string }>;
  closeTask: (id: string, reason?: string) => Promise<{ success: boolean; task?: Task; error?: string }>;
  
  addBugReport: (data: Omit<BugReport, 'id' | 'created_at'>) => Promise<{ success: boolean; bug?: BugReport; error?: string }>;
  classifyDefect: (
    bugId: string, 
    classification: DefectClassification, 
    justification: string
  ) => Promise<{ success: boolean; error?: string }>;
  verifyBugFix: (bugId: string, passed: boolean, notes: string) => Promise<{ success: boolean; error?: string }>;
  
  addTimeLog: (data: Omit<TimeLog, 'id' | 'created_at' | 'approval_status' | 'attribution_status'>) => Promise<{ success: boolean; log?: TimeLog; error?: string }>;
  reviewTimeLog: (
    logId: string, 
    status: ApprovalStatus, 
    attributionStatus?: AttributionStatus,
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
  resubmitTimeLog: (logId: string, hours: number, description: string) => Promise<{ success: boolean; error?: string }>;
  
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
  const [taskStateHistory, setTaskStateHistory] = useState<TaskStateHistory[]>(() => StorageService.getTaskStateHistory());
  const [bugAttributions, setBugAttributions] = useState<BugAttributionRecord[]>(() => StorageService.getBugAttributions());
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

  // Tasks Lifecycle
  const completeTask = async (id: string) => {
    const res = await tasksApi.complete(id, currentUser.id, currentUser.full_name);
    if (!res.success) return res;
    setTasks(StorageService.getTasks());
    setTaskStateHistory(StorageService.getTaskStateHistory());
    addAuditLog('TASK_COMPLETED', 'task', id, `Marked task as delivered & completed. On-time: ${res.task?.is_delivered_on_time ? 'YES' : 'NO'}`);
    addNotification('all', 'Task Delivered', `Task was marked as completed and delivered.`, 'success', '/tasks');
    return res;
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus, reason: string) => {
    if (newStatus === 'completed') {
      return await completeTask(taskId);
    }
    if (newStatus === 'reopened') {
      return await reopenTask(taskId, reason);
    }
    if (newStatus === 'under_fix') {
      return await startCorrectiveWork(taskId);
    }
    if (newStatus === 'closed') {
      return await closeTask(taskId, reason);
    }
    // Generic status transition (e.g. assigned -> in_progress)
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    const now = new Date().toISOString();
    const updated = tasks.map(t => t.id === taskId ? { ...t, status: newStatus, updated_at: now } : t);
    setTasks(updated);
    StorageService.setTasks(updated);

    const stateRecord: TaskStateHistory = {
      id: `tsh-${Date.now()}`,
      task_id: taskId,
      previous_status: task.status,
      new_status: newStatus,
      actor_id: currentUser.id,
      actor_name: currentUser.full_name,
      reason: reason || `Transitioned to ${newStatus}`,
      timestamp: now,
    };
    const history = [stateRecord, ...StorageService.getTaskStateHistory()];
    setTaskStateHistory(history);
    StorageService.setTaskStateHistory(history);

    addAuditLog('TASK_STATUS_CHANGED', 'task', taskId, `Status changed from ${task.status} to ${newStatus}: ${reason}`);
    return { success: true };
  };

  const startCorrectiveWork = async (id: string) => {
    const res = await tasksApi.startFix(id, currentUser.id, currentUser.full_name);
    if (!res.success) return res;
    setTasks(StorageService.getTasks());
    setTaskStateHistory(StorageService.getTaskStateHistory());
    addAuditLog('TASK_CORRECTIVE_WORK_STARTED', 'task', id, `Commenced corrective rework`);
    return res;
  };

  const reopenTask = async (id: string, reason?: string) => {
    const res = await tasksApi.reopen(id, reason || 'Post-delivery defect detected', currentUser.id, currentUser.full_name);
    if (!res.success) return res;
    setTasks(StorageService.getTasks());
    setTaskStateHistory(StorageService.getTaskStateHistory());
    addAuditLog('TASK_REOPENED', 'task', id, `Task reopened. Reason: ${reason || 'Post-delivery defect'}`);
    if (res.task?.assigned_to) {
      addNotification(res.task.assigned_to, 'Task Reopened', `Task "${res.task.title}" was reopened for corrective work.`, 'danger', '/tasks');
    }
    return res;
  };

  const closeTask = async (id: string, reason?: string) => {
    const res = await tasksApi.close(id, reason || 'Verified and approved for release', currentUser.id, currentUser.full_name);
    if (!res.success) return res;
    setTasks(StorageService.getTasks());
    setTaskStateHistory(StorageService.getTaskStateHistory());
    addAuditLog('TASK_CLOSED', 'task', id, `Task officially closed. Reason: ${reason || 'Verified'}`);
    return res;
  };

  // Bug Reports & Classification
  const addBugReport = async (data: Omit<BugReport, 'id' | 'created_at'>) => {
    const res = await bugsApi.create(data, currentUser.id, currentUser.full_name);
    if (!res.success) return res;
    setBugs(StorageService.getBugs());
    setTasks(StorageService.getTasks());
    setTaskStateHistory(StorageService.getTaskStateHistory());
    setModules(StorageService.getModules());

    addAuditLog('BUG_REPORTED', 'bug', res.bug!.id, `Reported defect "${res.bug!.title}" with severity ${res.bug!.severity}`);

    // Reopen module if it was delivered
    if (res.bug!.module_id) {
      const mod = modules.find(m => m.id === res.bug!.module_id);
      if (mod && mod.status === 'delivered') {
        reopenModule(mod.id, `Bug reported: ${res.bug!.title}`);
      }
    }

    addNotification(
      res.bug!.original_developer_id || 'all',
      'Defect Reported on Delivered Work',
      `Bug reported: "${res.bug!.title}" (${res.bug!.severity.toUpperCase()}). Original task has been reopened.`,
      'danger',
      '/bugs'
    );
    return res;
  };

  const classifyDefect = async (
    bugId: string, 
    classification: DefectClassification, 
    justification: string
  ) => {
    const res = await bugsApi.classify(bugId, classification, justification, currentUser.id, currentUser.full_name);
    if (!res.success) return res;

    setBugs(StorageService.getBugs());
    setBugAttributions(StorageService.getBugAttributions());
    setTimeLogs(StorageService.getTimeLogs());

    addAuditLog('DEFECT_CLASSIFIED', 'bug', bugId, `Defect classified as "${classification}". Justification: ${justification}`);
    
    const bug = StorageService.getBugs().find(b => b.id === bugId);
    if (bug && bug.original_developer_id) {
      const isAttr = classification === 'original_delivery_defect' || classification === 'caused_by_original_delivery';
      addNotification(
        bug.original_developer_id,
        `Defect Classified: ${bug.title}`,
        `Manager ${currentUser.full_name} classified Bug #${bugId} as ${classification}. ${isAttr ? 'Corrective hours are eligible for next-month payroll deduction.' : 'Associated hours are exempt from payroll deduction.'}`,
        isAttr ? 'danger' : 'info',
        '/bugs'
      );
    }
    return res;
  };

  const verifyBugFix = async (bugId: string, passed: boolean, notes: string) => {
    const res = await bugsApi.verifyFix(bugId, passed, notes, currentUser.id, currentUser.full_name);
    if (!res.success) return res;

    setBugs(StorageService.getBugs());
    setTasks(StorageService.getTasks());
    setTaskStateHistory(StorageService.getTaskStateHistory());

    addAuditLog(
      passed ? 'BUG_FIX_VERIFIED' : 'BUG_FIX_REJECTED',
      'bug',
      bugId,
      `Fix verification ${passed ? 'PASSED' : 'FAILED'}: ${notes}`
    );
    return res;
  };

  // Time Logs
  const addTimeLog = async (data: Omit<TimeLog, 'id' | 'created_at' | 'approval_status' | 'attribution_status'>) => {
    const res = await timeLogsApi.create(data);
    if (!res.success) return res;

    setTimeLogs(StorageService.getTimeLogs());
    setTasks(StorageService.getTasks());
    setTaskStateHistory(StorageService.getTaskStateHistory());

    addAuditLog('TIME_LOGGED', 'time_log', res.log!.id, `Logged ${res.log!.hours}h (${res.log!.log_type}) on task`);
    addNotification('all', 'New Time Log Submitted', `${currentUser.full_name} submitted ${res.log!.hours} hrs (${res.log!.log_type.replace('_', ' ')}) for approval.`, 'info', '/approvals');
    return res;
  };

  const reviewTimeLog = async (
    logId: string, 
    status: ApprovalStatus, 
    attributionStatus?: AttributionStatus,
    reason?: string
  ) => {
    const res = await timeLogsApi.review(logId, status, currentUser.id, currentUser.full_name, attributionStatus, reason);
    if (!res.success) return res;

    setTimeLogs(StorageService.getTimeLogs());

    const target = StorageService.getTimeLogs().find(l => l.id === logId);
    if (target) {
      addAuditLog(
        status === 'approved' ? 'TIME_LOG_APPROVED' : 'TIME_LOG_REJECTED',
        'time_log',
        logId,
        `${status.toUpperCase()} ${target.hours}h log (${target.log_type}). Attribution: ${attributionStatus || target.attribution_status}`
      );

      addNotification(
        target.user_id,
        `Time Log ${status.toUpperCase()}`,
        `Your ${target.hours} hr ${target.log_type.replace('_', ' ')} log was ${status} by ${currentUser.full_name}.`,
        status === 'approved' ? 'success' : 'danger',
        '/time'
      );
    }
    return res;
  };

  const resubmitTimeLog = async (logId: string, hours: number, description: string) => {
    const res = await timeLogsApi.resubmit(logId, hours, description);
    if (!res.success) return res;

    setTimeLogs(StorageService.getTimeLogs());
    addAuditLog('TIME_LOG_RESUBMITTED', 'time_log', logId, `Resubmitted log with ${hours}h: "${description}"`);
    addNotification('all', 'Time Log Resubmitted', `${currentUser.full_name} resubmitted a time log for review.`, 'info', '/approvals');
    return res;
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
    setTaskStateHistory(StorageService.getTaskStateHistory());
    setBugAttributions(StorageService.getBugAttributions());
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
        taskStateHistory,
        bugAttributions,
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
        updateTaskStatus,
        completeTask,
        startCorrectiveWork,
        reopenTask,
        closeTask,
        addBugReport,
        classifyDefect,
        verifyBugFix,
        addTimeLog,
        reviewTimeLog,
        resubmitTimeLog,
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
