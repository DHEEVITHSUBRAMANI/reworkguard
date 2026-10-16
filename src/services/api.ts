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
  EmployeeRate,
  TaskStateHistory,
  TaskDeliveryContributor,
  DefectClassification,
  ApprovalStatus,
  AttributionStatus,
  UserRole
} from '../types';

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
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('tasks').insert(task).select().single();
      if (!error && data) return data;
    }
    const newT: Task = {
      ...task,
      id: `tsk-${Date.now()}`,
      corrective_hours: 0,
      actual_regular_hours: 0,
      created_at: new Date().toISOString()
    };
    const current = StorageService.getTasks();
    StorageService.setTasks([newT, ...current]);
    return newT;
  },

  async complete(taskId: string): Promise<boolean> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          actual_completion_date: now,
          delivered_at: now
        })
        .eq('id', taskId);
      if (!error) return true;
    }
    const tasks = StorageService.getTasks().map(t => t.id === taskId ? {
      ...t,
      status: 'completed' as const,
      completed_at: now,
      delivered_at: now,
    } : t);
    StorageService.setTasks(tasks);
    return true;
  },

  async reopen(taskId: string, reason: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'reopened' })
        .eq('id', taskId);
      if (!error) return true;
    }
    const tasks = StorageService.getTasks().map(t => t.id === taskId ? {
      ...t,
      status: 'reopened' as const
    } : t);
    StorageService.setTasks(tasks);
    return true;
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

  async create(bug: Omit<BugReport, 'id' | 'created_at'>): Promise<BugReport | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('bugs').insert(bug).select().single();
      if (!error && data) return data;
    }
    const newB: BugReport = { ...bug, id: `bug-${Date.now()}`, created_at: new Date().toISOString() };
    const current = StorageService.getBugs();
    StorageService.setBugs([newB, ...current]);
    return newB;
  },

  async classify(bugId: string, classification: DefectClassification, notes: string, classifiedBy: string): Promise<boolean> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('bugs')
        .update({
          attribution_classification: classification,
          defect_classification: classification,
          investigation_notes: notes,
          classification_notes: notes,
          classified_by: classifiedBy,
          classified_at: now
        })
        .eq('id', bugId);
      if (!error) return true;
    }
    const bugs = StorageService.getBugs().map(b => b.id === bugId ? {
      ...b,
      defect_classification: classification,
      classification_notes: notes,
      classified_by: classifiedBy,
      classified_at: now
    } : b);
    StorageService.setBugs(bugs);
    return true;
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

  async create(log: Omit<TimeLog, 'id' | 'created_at' | 'approval_status' | 'attribution_status'>): Promise<TimeLog | null> {
    const newLog: TimeLog = {
      ...log,
      id: `log-${Date.now()}`,
      approval_status: 'pending',
      attribution_status: log.log_type === 'corrective_maintenance' ? 'pending' : 'exempt',
      created_at: new Date().toISOString()
    };
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('time_logs').insert(newLog).select().single();
      if (!error && data) return data;
    }
    const current = StorageService.getTimeLogs();
    StorageService.setTimeLogs([newLog, ...current]);
    return newLog;
  },

  async review(logId: string, status: ApprovalStatus, reviewerId: string, attributionStatus?: AttributionStatus, reason?: string): Promise<boolean> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('time_logs')
        .update({
          approval_status: status,
          reviewer_id: reviewerId,
          review_timestamp: now,
          attribution_status: attributionStatus,
          rejection_reason: status === 'rejected' ? reason : null,
          exempt_reason: attributionStatus === 'exempt' ? reason : null
        })
        .eq('id', logId);
      if (!error) return true;
    }
    const logs = StorageService.getTimeLogs().map(l => l.id === logId ? {
      ...l,
      approval_status: status,
      approved_by: reviewerId,
      approved_at: now,
      attribution_status: attributionStatus || l.attribution_status,
      rejection_reason: status === 'rejected' ? reason : undefined,
      exempt_reason: attributionStatus === 'exempt' ? reason : l.exempt_reason
    } : l);
    StorageService.setTimeLogs(logs);
    return true;
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
    return StorageService.getPayroll();
  },

  async finalize(recordId: string, finalizedBy: string): Promise<boolean> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('payroll_records')
        .update({
          processing_status: 'finalized',
          status: 'finalized',
          finalized_by: finalizedBy,
          finalized_at: now
        })
        .eq('id', recordId);
      if (!error) return true;
    }
    const records = StorageService.getPayroll().map(r => r.id === recordId ? {
      ...r,
      status: 'finalized' as const,
      finalized_by: finalizedBy,
      finalized_at: now
    } : r);
    StorageService.setPayroll(records);
    return true;
  }
};
