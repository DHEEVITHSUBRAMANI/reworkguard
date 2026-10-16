import { 
  User, 
  Project, 
  Module, 
  Task, 
  BugReport, 
  TimeLog, 
  PayrollPolicy, 
  PayrollRecord, 
  AuditLog, 
  AppNotification,
  TaskStateHistory,
  BugAttributionRecord,
  EmployeeRate,
  PayrollDeductionItem,
  PayrollAdjustment
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_PROJECTS, 
  INITIAL_MODULES, 
  INITIAL_TASKS, 
  INITIAL_BUGS, 
  INITIAL_TIME_LOGS, 
  INITIAL_POLICY, 
  INITIAL_PAYROLL, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_NOTIFICATIONS,
  INITIAL_TASK_STATE_HISTORY,
  INITIAL_BUG_ATTRIBUTION_HISTORY,
  INITIAL_EMPLOYEE_RATES,
  INITIAL_DEDUCTION_ITEMS,
  INITIAL_PAYROLL_ADJUSTMENTS
} from '../data/seedData';

const STORAGE_KEYS = {
  USERS: 'reworkguard_users_v1',
  PROJECTS: 'reworkguard_projects_v1',
  MODULES: 'reworkguard_modules_v1',
  TASKS: 'reworkguard_tasks_v1',
  BUGS: 'reworkguard_bugs_v1',
  TIME_LOGS: 'reworkguard_timelogs_v1',
  POLICY: 'reworkguard_policy_v1',
  PAYROLL: 'reworkguard_payroll_v1',
  AUDIT: 'reworkguard_audit_v1',
  NOTIFICATIONS: 'reworkguard_notifications_v1',
  ACTIVE_USER_ID: 'reworkguard_active_user_id_v1',
  SELECTED_MONTH: 'reworkguard_selected_month_v1',
  TASK_STATE_HISTORY: 'reworkguard_task_history_v1',
  BUG_ATTRIBUTION_HISTORY: 'reworkguard_bug_attributions_v1',
  EMPLOYEE_RATES: 'reworkguard_employee_rates_v1',
  DEDUCTION_ITEMS: 'reworkguard_deduction_items_v1',
  PAYROLL_ADJUSTMENTS: 'reworkguard_payroll_adjustments_v1',
};

const memoryStore: Record<string, string> = {};

const storageBackend = {
  getItem: (key: string): string | null => {
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch {
        return memoryStore[key] || null;
      }
    }
    return memoryStore[key] || null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        memoryStore[key] = value;
      }
    }
    memoryStore[key] = value;
  },
  removeItem: (key: string): void => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
        return;
      } catch {
        delete memoryStore[key];
      }
    }
    delete memoryStore[key];
  }
};

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = storageBackend.getItem(key);
    if (!item) {
      storageBackend.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  try {
    storageBackend.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to storage:`, error);
  }
}

export const StorageService = {
  getUsers: (): User[] => getFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS),
  setUsers: (users: User[]) => setToStorage(STORAGE_KEYS.USERS, users),

  getProjects: (): Project[] => getFromStorage(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS),
  setProjects: (projects: Project[]) => setToStorage(STORAGE_KEYS.PROJECTS, projects),

  getModules: (): Module[] => getFromStorage(STORAGE_KEYS.MODULES, INITIAL_MODULES),
  setModules: (modules: Module[]) => setToStorage(STORAGE_KEYS.MODULES, modules),

  getTasks: (): Task[] => getFromStorage(STORAGE_KEYS.TASKS, INITIAL_TASKS),
  setTasks: (tasks: Task[]) => setToStorage(STORAGE_KEYS.TASKS, tasks),

  getBugs: (): BugReport[] => getFromStorage(STORAGE_KEYS.BUGS, INITIAL_BUGS),
  setBugs: (bugs: BugReport[]) => setToStorage(STORAGE_KEYS.BUGS, bugs),

  getTimeLogs: (): TimeLog[] => getFromStorage(STORAGE_KEYS.TIME_LOGS, INITIAL_TIME_LOGS),
  setTimeLogs: (logs: TimeLog[]) => setToStorage(STORAGE_KEYS.TIME_LOGS, logs),

  getPolicy: (): PayrollPolicy => getFromStorage(STORAGE_KEYS.POLICY, INITIAL_POLICY),
  setPolicy: (policy: PayrollPolicy) => setToStorage(STORAGE_KEYS.POLICY, policy),
  getPayrollPolicy: (): PayrollPolicy => getFromStorage(STORAGE_KEYS.POLICY, INITIAL_POLICY),
  setPayrollPolicy: (policy: PayrollPolicy) => setToStorage(STORAGE_KEYS.POLICY, policy),

  getPayroll: (): PayrollRecord[] => getFromStorage(STORAGE_KEYS.PAYROLL, INITIAL_PAYROLL),
  setPayroll: (records: PayrollRecord[]) => setToStorage(STORAGE_KEYS.PAYROLL, records),

  getAuditLogs: (): AuditLog[] => getFromStorage(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS),
  setAuditLogs: (logs: AuditLog[]) => setToStorage(STORAGE_KEYS.AUDIT, logs),

  getNotifications: (): AppNotification[] => getFromStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS),
  setNotifications: (notifs: AppNotification[]) => setToStorage(STORAGE_KEYS.NOTIFICATIONS, notifs),

  getActiveUserId: (): string => getFromStorage(STORAGE_KEYS.ACTIVE_USER_ID, 'usr-fin-1'),
  setActiveUserId: (id: string) => setToStorage(STORAGE_KEYS.ACTIVE_USER_ID, id),

  getSelectedMonth: (): string => getFromStorage(STORAGE_KEYS.SELECTED_MONTH, '2026-11'),
  setSelectedMonth: (month: string) => setToStorage(STORAGE_KEYS.SELECTED_MONTH, month),

  getTaskStateHistory: (): TaskStateHistory[] => getFromStorage(STORAGE_KEYS.TASK_STATE_HISTORY, INITIAL_TASK_STATE_HISTORY),
  setTaskStateHistory: (history: TaskStateHistory[]) => setToStorage(STORAGE_KEYS.TASK_STATE_HISTORY, history),

  getBugAttributions: (): BugAttributionRecord[] => getFromStorage(STORAGE_KEYS.BUG_ATTRIBUTION_HISTORY, INITIAL_BUG_ATTRIBUTION_HISTORY),
  setBugAttributions: (records: BugAttributionRecord[]) => setToStorage(STORAGE_KEYS.BUG_ATTRIBUTION_HISTORY, records),

  getEmployeeRates: (): EmployeeRate[] => getFromStorage(STORAGE_KEYS.EMPLOYEE_RATES, INITIAL_EMPLOYEE_RATES),
  setEmployeeRates: (rates: EmployeeRate[]) => setToStorage(STORAGE_KEYS.EMPLOYEE_RATES, rates),

  getDeductionItems: (): PayrollDeductionItem[] => getFromStorage(STORAGE_KEYS.DEDUCTION_ITEMS, INITIAL_DEDUCTION_ITEMS),
  setDeductionItems: (items: PayrollDeductionItem[]) => setToStorage(STORAGE_KEYS.DEDUCTION_ITEMS, items),

  getPayrollAdjustments: (): PayrollAdjustment[] => getFromStorage(STORAGE_KEYS.PAYROLL_ADJUSTMENTS, INITIAL_PAYROLL_ADJUSTMENTS),
  setPayrollAdjustments: (adjustments: PayrollAdjustment[]) => setToStorage(STORAGE_KEYS.PAYROLL_ADJUSTMENTS, adjustments),

  resetToSeedData: () => {
    setToStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
    setToStorage(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS);
    setToStorage(STORAGE_KEYS.MODULES, INITIAL_MODULES);
    setToStorage(STORAGE_KEYS.TASKS, INITIAL_TASKS);
    setToStorage(STORAGE_KEYS.BUGS, INITIAL_BUGS);
    setToStorage(STORAGE_KEYS.TIME_LOGS, INITIAL_TIME_LOGS);
    setToStorage(STORAGE_KEYS.POLICY, INITIAL_POLICY);
    setToStorage(STORAGE_KEYS.PAYROLL, INITIAL_PAYROLL);
    setToStorage(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
    setToStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    setToStorage(STORAGE_KEYS.ACTIVE_USER_ID, 'usr-fin-1');
    setToStorage(STORAGE_KEYS.SELECTED_MONTH, '2026-11');
    setToStorage(STORAGE_KEYS.TASK_STATE_HISTORY, INITIAL_TASK_STATE_HISTORY);
    setToStorage(STORAGE_KEYS.BUG_ATTRIBUTION_HISTORY, INITIAL_BUG_ATTRIBUTION_HISTORY);
    setToStorage(STORAGE_KEYS.EMPLOYEE_RATES, INITIAL_EMPLOYEE_RATES);
    setToStorage(STORAGE_KEYS.DEDUCTION_ITEMS, INITIAL_DEDUCTION_ITEMS);
    setToStorage(STORAGE_KEYS.PAYROLL_ADJUSTMENTS, INITIAL_PAYROLL_ADJUSTMENTS);
  }
};
