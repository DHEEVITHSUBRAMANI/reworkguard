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
  BugAttributionRecord
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
  INITIAL_BUG_ATTRIBUTION_HISTORY
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
};

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
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

  resetToSeedData: () => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
    localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(INITIAL_MODULES));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    localStorage.setItem(STORAGE_KEYS.BUGS, JSON.stringify(INITIAL_BUGS));
    localStorage.setItem(STORAGE_KEYS.TIME_LOGS, JSON.stringify(INITIAL_TIME_LOGS));
    localStorage.setItem(STORAGE_KEYS.POLICY, JSON.stringify(INITIAL_POLICY));
    localStorage.setItem(STORAGE_KEYS.PAYROLL, JSON.stringify(INITIAL_PAYROLL));
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, JSON.stringify('usr-fin-1'));
    localStorage.setItem(STORAGE_KEYS.SELECTED_MONTH, JSON.stringify('2026-11'));
    localStorage.setItem(STORAGE_KEYS.TASK_STATE_HISTORY, JSON.stringify(INITIAL_TASK_STATE_HISTORY));
    localStorage.setItem(STORAGE_KEYS.BUG_ATTRIBUTION_HISTORY, JSON.stringify(INITIAL_BUG_ATTRIBUTION_HISTORY));
  }
};
