import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StorageService } from './storage';
import { 
  Profile, 
  Project, 
  Module, 
  Task, 
  BugReport, 
  TimeLog, 
  PayrollRecord, 
  PayrollDeductionItem, 
  PayrollPolicy, 
  AuditLog, 
  AppNotification, 
  PayrollAdjustment,
  AdjustmentType,
  EmployeeRate,
  TaskStateHistory,
  TaskDeliveryContributor,
  DefectClassification,
  ApprovalStatus,
  AttributionStatus,
  UserRole,
  BugAttributionRecord,
  BugStatus
} from '../types';
import { PayrollEngine, PayrollCalculationSummary } from './payrollEngine';

/**
 * ReworkGuard Unified Data-Access Layer
 * Dispatches to Supabase PostgreSQL when credentials are provided in .env,
 * or persistent browser storage in Demo Mode.
 */

// 1. AUTH & PROFILES API
export const authApi = {
  async signInWithEmail(email: string, password: string): Promise<{ profile: Profile; session: any } | { error: string }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        if (data.user) {
          const { data: profileData, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          if (profileErr) return { error: profileErr.message };
          return { profile: profileData, session: data.session };
        }
      } catch (err: any) {
        return { error: err.message || 'Authentication failed' };
      }
    }

    // Demo Mode Sign-in
    const users = StorageService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { error: 'Invalid credentials. Use demo accounts or configure Supabase.' };
    }
    StorageService.setActiveUserId(user.id);
    return { 
      profile: user, 
      session: { user: { id: user.id, email: user.email }, access_token: 'demo-token' } 
    };
  },

  async signUpWithEmail(email: string, password: string, fullName: string, role: UserRole): Promise<{ profile: Profile } | { error: string }> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role } }
        });
        if (error) return { error: error.message };
        if (data.user) {
          const { data: profileData, error: profErr } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email,
              full_name: fullName,
              role,
              department: 'Engineering'
            })
            .select()
            .single();
          if (profErr) return { error: profErr.message };
          return { profile: profileData };
        }
      } catch (err: any) {
        return { error: err.message };
      }
    }

    // Demo mode signup
    const newProfile: Profile = {
      id: `usr-${Date.now()}`,
      email,
      full_name: fullName,
      role,
      active: true,
      department: 'Engineering',
      hourly_rate: 45,
      base_monthly_salary: 7000,
      quality_score: 95,
      reopen_count: 0
    };
    const users = StorageService.getUsers();
    StorageService.setUsers([newProfile, ...users]);
    StorageService.setActiveUserId(newProfile.id);
    return { profile: newProfile };
  },

  async getProfiles(): Promise<Profile[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (!error && data) return data;
    }
    return StorageService.getUsers();
  }
};

// 2. PROJECTS API
export const projectsApi = {
  async getAll(): Promise<Project[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return StorageService.getProjects();
  },

  async create(project: Omit<Project, 'id' | 'created_at'>): Promise<Project | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('projects').insert(project).select().single();
      if (!error && data) return data;
    }
    const newP: Project = { ...project, id: `prj-${Date.now()}`, created_at: new Date().toISOString() };
    const current = StorageService.getProjects();
    StorageService.setProjects([newP, ...current]);
    return newP;
  }
};

// 3. MODULES API
export const modulesApi = {
  async getAll(): Promise<Module[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('modules').select('*').order('created_at');
      if (!error && data) return data;
    }
    return StorageService.getModules();
  },

  async create(module: Omit<Module, 'id' | 'created_at' | 'reopen_count'>): Promise<Module | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('modules').insert(module).select().single();
      if (!error && data) return data;
    }
    const newM: Module = { ...module, id: `mod-${Date.now()}`, reopen_count: 0, created_at: new Date().toISOString() };
    const current = StorageService.getModules();
    StorageService.setModules([...current, newM]);
    return newM;
  },

  async reopen(moduleId: string, reason: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('modules')
        .update({
          status: 'reopened',
          reopened_at: new Date().toISOString(),
        })
        .eq('id', moduleId);
      if (!error) return true;
    }
    const modules = StorageService.getModules().map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          status: 'reopened' as const,
          reopened_at: new Date().toISOString(),
          reopen_count: (m.reopen_count || 0) + 1,
        };
      }
      return m;
    });
    StorageService.setModules(modules);
    return true;
  }
};

// 4. TASKS API
export const tasksApi = {
  async getAll(): Promise<Task[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return StorageService.getTasks();
  },

  async create(task: Omit<Task, 'id' | 'created_at' | 'corrective_hours' | 'actual_regular_hours'>): Promise<Task | null> {
    const newT: Task = {
      ...task,
      id: `tsk-${Date.now()}`,
      assigned_to: task.assigned_to || task.assigned_employee_id || '',
      assigned_employee_id: task.assigned_employee_id || task.assigned_to,
      status: task.status || 'assigned',
      corrective_hours: 0,
      actual_regular_hours: 0,
      created_at: new Date().toISOString()
    };
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('tasks').insert(newT).select().single();
      if (!error && data) return data;
    }
    const current = StorageService.getTasks();
    StorageService.setTasks([newT, ...current]);
    return newT;
  },

  async complete(taskId: string, actorId: string = 'system', actorName: string = 'System Process'): Promise<{ success: boolean; task?: Task; error?: string }> {
    const tasks = StorageService.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    const now = new Date().toISOString();
    const todayStr = now.split('T')[0];
    const isOnTime = !task.committed_due_date || (todayStr <= task.committed_due_date);
    const originalDeliveryEmployee = task.original_delivery_employee_id || task.assigned_to || task.assigned_employee_id;

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          actual_completion_date: now,
          delivered_at: now,
          original_delivery_employee_id: originalDeliveryEmployee,
          is_delivered_on_time: isOnTime
        })
        .eq('id', taskId);
      if (error) console.error('Supabase complete error:', error);
    }

    const updatedTask: Task = {
      ...task,
      status: 'completed',
      actual_completion_date: now,
      delivered_at: now,
      completed_at: now,
      original_delivery_employee_id: originalDeliveryEmployee,
      is_delivered_on_time: isOnTime,
      updated_at: now
    };

    const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
    StorageService.setTasks(updatedTasks);

    // Record State History
    const stateRecord: TaskStateHistory = {
      id: `tsh-${Date.now()}`,
      task_id: taskId,
      previous_status: task.status,
      new_status: 'completed',
      actor_id: actorId,
      actor_name: actorName,
      reason: `Task completed and delivered. On-time delivery: ${isOnTime ? 'YES' : 'NO'}.`,
      timestamp: now
    };
    const history = StorageService.getTaskStateHistory();
    StorageService.setTaskStateHistory([stateRecord, ...history]);

    return { success: true, task: updatedTask };
  },

  async reopen(taskId: string, reason: string, actorId: string = 'system', actorName: string = 'System Process'): Promise<{ success: boolean; task?: Task; error?: string }> {
    const tasks = StorageService.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('tasks')
        .update({ status: 'reopened', updated_at: now })
        .eq('id', taskId);
    }

    const updatedTask: Task = {
      ...task,
      status: 'reopened',
      // PRESERVE original delivery records permanently
      original_delivery_employee_id: task.original_delivery_employee_id || task.assigned_to,
      actual_completion_date: task.actual_completion_date,
      committed_due_date: task.committed_due_date,
      is_delivered_on_time: task.is_delivered_on_time,
      updated_at: now
    };

    const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
    StorageService.setTasks(updatedTasks);

    // Record State History
    const stateRecord: TaskStateHistory = {
      id: `tsh-${Date.now()}`,
      task_id: taskId,
      previous_status: task.status,
      new_status: 'reopened',
      actor_id: actorId,
      actor_name: actorName,
      reason: reason || 'Task reopened for corrective rework',
      timestamp: now
    };
    const history = StorageService.getTaskStateHistory();
    StorageService.setTaskStateHistory([stateRecord, ...history]);

    return { success: true, task: updatedTask };
  },

  async startFix(taskId: string, actorId: string = 'system', actorName: string = 'System Process'): Promise<{ success: boolean; task?: Task; error?: string }> {
    const tasks = StorageService.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    const now = new Date().toISOString();
    const updatedTask: Task = {
      ...task,
      status: 'under_fix',
      updated_at: now
    };

    const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
    StorageService.setTasks(updatedTasks);

    const stateRecord: TaskStateHistory = {
      id: `tsh-${Date.now()}`,
      task_id: taskId,
      previous_status: task.status,
      new_status: 'under_fix',
      actor_id: actorId,
      actor_name: actorName,
      reason: 'Commenced corrective maintenance work on bug fix',
      timestamp: now
    };
    const history = StorageService.getTaskStateHistory();
    StorageService.setTaskStateHistory([stateRecord, ...history]);

    return { success: true, task: updatedTask };
  },

  async close(taskId: string, reason: string, actorId: string = 'system', actorName: string = 'System Process'): Promise<{ success: boolean; task?: Task; error?: string }> {
    const tasks = StorageService.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    // Check verification requirement before final closure
    const bugs = StorageService.getBugs().filter(b => (b.original_task_id === taskId || b.task_id === taskId));
    const unverifiedBugs = bugs.filter(b => b.status !== 'closed' && b.status !== 'verified_resolved' && b.fix_verification_status !== 'passed');
    if (unverifiedBugs.length > 0) {
      return {
        success: false,
        error: `Cannot close task: Verification is required before final closure. ${unverifiedBugs.length} bug(s) remain unverified.`
      };
    }

    const now = new Date().toISOString();
    const updatedTask: Task = {
      ...task,
      status: 'closed',
      fix_verification_status: 'passed',
      closure_date: now,
      closed_at: now,
      updated_at: now
    };

    const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
    StorageService.setTasks(updatedTasks);

    const stateRecord: TaskStateHistory = {
      id: `tsh-${Date.now()}`,
      task_id: taskId,
      previous_status: task.status,
      new_status: 'closed',
      actor_id: actorId,
      actor_name: actorName,
      reason: reason || 'Task verified and officially closed',
      timestamp: now
    };
    const history = StorageService.getTaskStateHistory();
    StorageService.setTaskStateHistory([stateRecord, ...history]);

    return { success: true, task: updatedTask };
  },

  getStateHistory(taskId?: string): TaskStateHistory[] {
    const history = StorageService.getTaskStateHistory();
    if (taskId) {
      return history.filter(h => h.task_id === taskId);
    }
    return history;
  }
};

// 5. BUGS & DEFECTS API
export const bugsApi = {
  async getAll(): Promise<BugReport[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('bugs').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return StorageService.getBugs();
  },

  async create(bug: Omit<BugReport, 'id' | 'created_at'>, actorId: string = 'system', actorName: string = 'System Process'): Promise<{ success: boolean; bug?: BugReport; error?: string }> {
    const targetTaskId = bug.original_task_id || bug.task_id;
    if (!targetTaskId && !bug.module_id) {
      return { success: false, error: 'Cannot create defect: A delivered task or module must be selected.' };
    }

    const tasks = StorageService.getTasks();
    const targetTask = targetTaskId ? tasks.find(t => t.id === targetTaskId) : undefined;
    const now = new Date().toISOString();

    const originalDevId = targetTask?.original_delivery_employee_id || targetTask?.assigned_to || bug.original_developer_id;

    const newB: BugReport = {
      ...bug,
      id: `bug-${Date.now()}`,
      original_task_id: targetTaskId,
      task_id: targetTaskId,
      original_developer_id: originalDevId,
      assigned_to: bug.assigned_to || originalDevId,
      reporter_id: bug.reporter_id || actorId,
      date_found: bug.date_found || now.split('T')[0],
      defect_classification: bug.defect_classification || 'pending_investigation',
      status: 'open',
      fix_verification_status: 'pending',
      created_at: now
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('bugs').insert(newB).select().single();
      if (error) console.error('Supabase bug insert error:', error);
    }

    const currentBugs = StorageService.getBugs();
    StorageService.setBugs([newB, ...currentBugs]);

    // Automatic Reopening Logic:
    // If the delivered task is completed or closed, automatically reopen it
    if (targetTask) {
      if (targetTask.status === 'completed' || targetTask.status === 'closed') {
        await tasksApi.reopen(targetTask.id, `Reopened due to defect: ${bug.title}`, actorId, actorName);
      }
      // If already reopened or under_fix, attach the bug WITHOUT creating duplicate reopening event!
    }

    return { success: true, bug: newB };
  },

  async classify(
    bugId: string, 
    classification: DefectClassification, 
    justification: string, 
    reviewerId: string, 
    reviewerName: string
  ): Promise<{ success: boolean; error?: string }> {
    // Require written justification for classifications that exempt a defect from deduction eligibility
    const isExempt = classification === 'scope_change' || 
                     classification === 'external_dependency_issue' || 
                     classification === 'not_caused_by_original_delivery';

    if (isExempt && (!justification || justification.trim().length < 5)) {
      return {
        success: false,
        error: 'Written justification is required for classifications that exempt a defect from deduction eligibility.'
      };
    }

    const now = new Date().toISOString();
    const bugs = StorageService.getBugs();
    const bug = bugs.find(b => b.id === bugId);
    if (!bug) return { success: false, error: 'Bug not found' };

    const updatedBugs = bugs.map(b => b.id === bugId ? {
      ...b,
      defect_classification: classification,
      attribution_classification: classification,
      classification_notes: justification,
      classification_justification: justification,
      classified_by: reviewerId,
      classified_at: now,
      updated_at: now
    } : b);
    StorageService.setBugs(updatedBugs);

    // Record immutable attribution decision history
    const attributionRecord: BugAttributionRecord = {
      id: `bah-${Date.now()}`,
      bug_id: bugId,
      reviewer_id: reviewerId,
      reviewer_name: reviewerName,
      classification: classification,
      justification: justification,
      created_at: now
    };
    const attributions = StorageService.getBugAttributions();
    StorageService.setBugAttributions([attributionRecord, ...attributions]);

    // Update attribution on all linked corrective time logs
    let targetAttribution: AttributionStatus = 'pending';
    if (classification === 'original_delivery_defect' || classification === 'caused_by_original_delivery') {
      targetAttribution = 'attributable';
    } else if (isExempt) {
      targetAttribution = 'exempt';
    }

    const logs = StorageService.getTimeLogs();
    const updatedLogs = logs.map(l => {
      if (l.bug_id === bugId) {
        return {
          ...l,
          attribution_status: targetAttribution,
          exempt_reason: isExempt ? justification : l.exempt_reason,
          updated_at: now
        };
      }
      return l;
    });
    StorageService.setTimeLogs(updatedLogs);

    return { success: true };
  },

  async verifyFix(
    bugId: string, 
    passed: boolean, 
    notes: string, 
    reviewerId: string, 
    reviewerName: string
  ): Promise<{ success: boolean; error?: string }> {
    const bugs = StorageService.getBugs();
    const bug = bugs.find(b => b.id === bugId);
    if (!bug) return { success: false, error: 'Bug not found' };

    const now = new Date().toISOString();
    const updatedStatus: BugStatus = passed ? 'verified_resolved' : 'in_fix';
    const updatedVerification: 'passed' | 'failed' = passed ? 'passed' : 'failed';

    const updatedBugs: BugReport[] = bugs.map(b => b.id === bugId ? {
      ...b,
      status: updatedStatus,
      fix_verification_status: updatedVerification,
      verified_by: reviewerId,
      verification_notes: notes,
      updated_at: now
    } : b);
    StorageService.setBugs(updatedBugs);

    // If verification failed, return the task to Under Fix
    const targetTaskId = bug.original_task_id || bug.task_id;
    if (targetTaskId) {
      if (!passed) {
        await tasksApi.startFix(targetTaskId, reviewerId, `${reviewerName}: Verification failed. Notes: ${notes}`);
      } else {
        // If passed, check if all bugs for this task are verified
        const taskBugs = updatedBugs.filter(b => b.original_task_id === targetTaskId || b.task_id === targetTaskId);
        const allResolved = taskBugs.every(b => b.status === 'verified_resolved' || b.status === 'closed');
        if (allResolved) {
          await tasksApi.close(targetTaskId, `All ${taskBugs.length} linked bugs verified and passed by ${reviewerName}`, reviewerId, reviewerName);
        }
      }
    }

    return { success: true };
  },

  getAttributionHistory(bugId?: string): BugAttributionRecord[] {
    const list = StorageService.getBugAttributions();
    if (bugId) {
      return list.filter(a => a.bug_id === bugId);
    }
    return list;
  }
};

// 6. TIME LOGS API
export const timeLogsApi = {
  async getAll(): Promise<TimeLog[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('time_logs').select('*').order('work_date', { ascending: false });
      if (!error && data) return data;
    }
    return StorageService.getTimeLogs();
  },

  async create(log: Omit<TimeLog, 'id' | 'created_at' | 'approval_status' | 'attribution_status'>): Promise<{ success: boolean; log?: TimeLog; error?: string }> {
    // Validations:
    // 1. Hours must be greater than zero and within daily maximum (16h)
    if (!log.hours || log.hours <= 0) {
      return { success: false, error: 'Hours worked must be greater than zero.' };
    }
    if (log.hours > 16) {
      return { success: false, error: 'Hours worked exceeds configurable daily maximum of 16.0 hours.' };
    }

    // 2. Work date cannot be empty or future
    const todayStr = new Date().toISOString().split('T')[0];
    const logDate = log.date || log.work_date || todayStr;
    if (logDate > todayStr) {
      return { success: false, error: 'Work date cannot be set in the future.' };
    }

    // 3. For corrective maintenance, validate bug and task relationship
    const isCorrective = log.log_type === 'corrective_maintenance' || log.work_type === 'corrective_maintenance';
    if (isCorrective) {
      if (!log.bug_id) {
        return { success: false, error: 'Corrective maintenance time logs require selecting a linked defect.' };
      }
      const bugs = StorageService.getBugs();
      const linkedBug = bugs.find(b => b.id === log.bug_id);
      if (!linkedBug) {
        return { success: false, error: 'Selected bug does not exist.' };
      }
      if (linkedBug.original_task_id && linkedBug.original_task_id !== log.task_id && linkedBug.task_id !== log.task_id) {
        return { success: false, error: 'The selected bug does not belong to the chosen task.' };
      }
    }

    // Determine initial attribution status
    let initialAttribution: AttributionStatus = 'exempt';
    if (isCorrective) {
      initialAttribution = 'pending';
      if (log.bug_id) {
        const bug = StorageService.getBugs().find(b => b.id === log.bug_id);
        if (bug) {
          if (bug.defect_classification === 'original_delivery_defect' || bug.defect_classification === 'caused_by_original_delivery') {
            initialAttribution = 'attributable';
          } else if (bug.defect_classification === 'scope_change' || bug.defect_classification === 'external_dependency_issue' || bug.defect_classification === 'not_caused_by_original_delivery') {
            initialAttribution = 'exempt';
          }
        }
      }
    }

    const newLog: TimeLog = {
      ...log,
      id: `log-${Date.now()}`,
      employee_id: log.employee_id || log.user_id,
      user_id: log.user_id || log.employee_id || '',
      date: logDate,
      work_date: logDate,
      log_type: isCorrective ? 'corrective_maintenance' : 'regular',
      work_type: isCorrective ? 'corrective_maintenance' : 'regular',
      approval_status: 'pending',
      attribution_status: initialAttribution,
      is_payroll_processed: false,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('time_logs').insert(newLog);
    }

    const current = StorageService.getTimeLogs();
    StorageService.setTimeLogs([newLog, ...current]);

    // Transition task to under_fix if corrective work began on a reopened task
    if (isCorrective && log.task_id) {
      const tasks = StorageService.getTasks();
      const task = tasks.find(t => t.id === log.task_id);
      if (task && (task.status === 'reopened' || task.status === 'assigned')) {
        await tasksApi.startFix(task.id, newLog.user_id, 'Automatic transition to Under Fix upon logging corrective maintenance time');
      }
    }

    return { success: true, log: newLog };
  },

  async review(
    logId: string, 
    status: ApprovalStatus, 
    reviewerId: string, 
    reviewerName: string, 
    attributionStatus?: AttributionStatus, 
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const logs = StorageService.getTimeLogs();
    const target = logs.find(l => l.id === logId);
    if (!target) return { success: false, error: 'Time log not found' };

    // Prevent modification if payroll has already been finalized
    if (target.is_payroll_processed) {
      return { success: false, error: 'Cannot modify time log: This entry has already been processed and locked in finalized payroll.' };
    }

    // SELF-APPROVAL ENFORCEMENT: Unauthorized users cannot approve their own logs!
    const targetUserId = target.employee_id || target.user_id;
    if (status === 'approved' && targetUserId === reviewerId) {
      return { success: false, error: 'Unauthorized: Self-approval forbidden. Users cannot approve their own time logs.' };
    }

    const now = new Date().toISOString();
    const updatedLogs = logs.map(l => l.id === logId ? {
      ...l,
      approval_status: status,
      approved_by: reviewerId,
      reviewer_id: reviewerId,
      reviewer_name: reviewerName,
      approved_at: now,
      review_timestamp: now,
      attribution_status: attributionStatus || l.attribution_status,
      rejection_reason: status === 'rejected' ? reason : undefined,
      exempt_reason: attributionStatus === 'exempt' ? reason : l.exempt_reason,
      updated_at: now
    } : l);

    StorageService.setTimeLogs(updatedLogs);
    return { success: true };
  },

  async resubmit(logId: string, newHours: number, newDescription: string): Promise<{ success: boolean; error?: string }> {
    const logs = StorageService.getTimeLogs();
    const target = logs.find(l => l.id === logId);
    if (!target) return { success: false, error: 'Time log not found' };

    if (newHours <= 0 || newHours > 16) {
      return { success: false, error: 'Hours must be greater than zero and at most 16 hours.' };
    }

    const now = new Date().toISOString();
    const updatedLogs = logs.map(l => l.id === logId ? {
      ...l,
      hours: newHours,
      description: newDescription,
      approval_status: 'pending' as const,
      rejection_reason: undefined,
      updated_at: now
    } : l);

    StorageService.setTimeLogs(updatedLogs);
    return { success: true };
  }
};

// 7. PAYROLL API
export const payrollApi = {
  async getRecords(month?: string): Promise<PayrollRecord[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('payroll_records').select('*');
      if (month) query = query.eq('payroll_month', month);
      const { data, error } = await query;
      if (!error && data) return data;
    }
    const all = StorageService.getPayroll();
    if (month) {
      return all.filter(r => r.period === month || r.payroll_month === month);
    }
    return all;
  },

  async getDeductionItems(recordId?: string): Promise<PayrollDeductionItem[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('payroll_deduction_items').select('*');
      if (recordId) query = query.eq('payroll_record_id', recordId);
      const { data, error } = await query;
      if (!error && data) return data;
    }
    const all = StorageService.getDeductionItems();
    if (recordId) {
      return all.filter(i => i.payroll_record_id === recordId);
    }
    return all;
  },

  async getAdjustments(recordId?: string): Promise<PayrollAdjustment[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('payroll_adjustments').select('*');
      if (recordId) query = query.eq('payroll_record_id', recordId);
      const { data, error } = await query;
      if (!error && data) return data;
    }
    const all = StorageService.getPayrollAdjustments();
    if (recordId) {
      return all.filter(a => a.payroll_record_id === recordId);
    }
    return all;
  },

  async getEmployeeRates(employeeId?: string): Promise<EmployeeRate[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('employee_rates').select('*');
      if (employeeId) query = query.eq('employee_id', employeeId);
      const { data, error } = await query;
      if (!error && data) return data;
    }
    const all = StorageService.getEmployeeRates();
    if (employeeId) {
      return all.filter(r => r.employee_id === employeeId);
    }
    return all;
  },

  async getPolicy(): Promise<PayrollPolicy> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('payroll_policies').select('*').limit(1).single();
      if (!error && data) return data;
    }
    return StorageService.getPayrollPolicy();
  },

  async updatePolicy(policy: PayrollPolicy): Promise<PayrollPolicy> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('payroll_policies').upsert(policy);
    }
    StorageService.setPayrollPolicy(policy);
    return policy;
  },

  calculate(
    targetMonth: string, 
    sourceMonth: string, 
    policy?: PayrollPolicy, 
    options: { dryRun?: boolean; calculatedBy?: string; calculatedByName?: string } = {}
  ): PayrollCalculationSummary {
    const effectivePolicy = policy || StorageService.getPayrollPolicy();
    return PayrollEngine.calculateMonthlyPayroll(targetMonth, sourceMonth, effectivePolicy, options);
  },

  async finalize(
    recordId: string, 
    finalizedBy: string, 
    finalizerName: string = 'Finance Admin'
  ): Promise<{ success: boolean; record?: PayrollRecord; error?: string }> {
    const res = PayrollEngine.finalizePayrollRecord(recordId, finalizedBy, finalizerName);
    if (res.success && isSupabaseConfigured && supabase && res.record) {
      await supabase.from('payroll_records').update(res.record).eq('id', recordId);
    }
    return res;
  },

  async createAdjustment(
    recordId: string,
    adjustmentType: AdjustmentType,
    amount: number,
    reason: string,
    authorizedBy: string,
    authorizerName: string = 'Finance Admin'
  ): Promise<{ success: boolean; adjustment?: PayrollAdjustment; updatedRecord?: PayrollRecord; error?: string }> {
    const res = PayrollEngine.createPayrollAdjustment(recordId, adjustmentType, amount, reason, authorizedBy, authorizerName);
    if (res.success && isSupabaseConfigured && supabase && res.adjustment && res.updatedRecord) {
      await supabase.from('payroll_adjustments').insert(res.adjustment);
      await supabase.from('payroll_records').update(res.updatedRecord).eq('id', recordId);
    }
    return res;
  }
};
