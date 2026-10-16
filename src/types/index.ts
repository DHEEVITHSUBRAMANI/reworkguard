export type UserRole = 'employee' | 'team_lead' | 'manager' | 'finance_admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  avatar_url?: string;
  department: string;
  hourly_rate?: number;
  base_monthly_salary?: number;
  quality_score?: number;
  reopen_count?: number;
  created_at?: string;
  updated_at?: string;
}

// User alias for backwards compatibility
export type User = Profile;

export type ProjectStatus = 'active' | 'in_review' | 'completed' | 'on_hold';

export interface Project {
  id: string;
  name: string;
  code: string;
  client_name: string;
  description: string;
  status: ProjectStatus;
  manager_id: string;
  budget: number;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at?: string;
}

export type ModuleStatus = 'in_development' | 'testing' | 'delivered' | 'reopened' | 'closed';

export interface Module {
  id: string;
  project_id: string;
  name: string;
  code: string;
  description: string;
  status: ModuleStatus;
  delivered_at?: string;
  reopened_at?: string;
  reopen_count: number;
  lead_id: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 
  | 'assigned' 
  | 'in_progress' 
  | 'completed' 
  | 'reopened' 
  | 'under_fix' 
  | 'closed' 
  | 'backlog' 
  | 'in_review';

export interface Task {
  id: string;
  module_id: string;
  project_id: string;
  title: string;
  description: string;
  assigned_to: string; // employee_id
  assigned_employee_id?: string;
  original_delivery_employee_id?: string;
  committed_start_date?: string;
  committed_due_date?: string;
  actual_completion_date?: string;
  closure_date?: string;
  is_delivered_on_time?: boolean;
  original_delivery_ref?: string;
  created_by: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimated_hours: number;
  actual_regular_hours: number;
  corrective_hours: number;
  fix_verification_status?: 'pending' | 'passed' | 'failed';
  verified_by?: string;
  verification_notes?: string;
  delivered_at?: string;
  completed_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface TaskDeliveryContributor {
  id: string;
  task_id: string;
  employee_id: string;
  contribution_details: string;
  percentage_share: number;
  created_at: string;
}

export interface TaskStateHistory {
  id: string;
  task_id: string;
  previous_status?: TaskStatus;
  new_status: TaskStatus;
  actor_id?: string;
  actor_name: string;
  reason?: string;
  timestamp: string;
  created_at?: string;
}

export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';
export type BugStatus = 'open' | 'investigating' | 'in_fix' | 'verified_resolved' | 'closed';
export type DefectClassification = 
  | 'original_delivery_defect' 
  | 'scope_change' 
  | 'external_dependency_issue' 
  | 'pending_investigation'
  | 'caused_by_original_delivery' 
  | 'not_caused_by_original_delivery';

export interface BugReport {
  id: string;
  task_id?: string;
  original_task_id?: string;
  module_id: string;
  project_id: string;
  title: string;
  description: string;
  steps_to_reproduce: string;
  severity: BugSeverity;
  status: BugStatus;
  reported_by: string;
  reporter_id?: string;
  assigned_to?: string;
  original_developer_id?: string;
  date_found?: string;
  defect_classification: DefectClassification;
  attribution_classification?: DefectClassification;
  classification_notes?: string;
  classification_justification?: string;
  investigation_notes?: string;
  classified_by?: string;
  classified_at?: string;
  fix_verification_status?: 'pending' | 'passed' | 'failed';
  verified_by?: string;
  verification_notes?: string;
  created_at: string;
  updated_at?: string;
}

export type Bug = BugReport;

export interface BugAttributionRecord {
  id: string;
  bug_id: string;
  reviewer_id: string;
  reviewer_name: string;
  classification: DefectClassification;
  new_classification?: DefectClassification;
  justification?: string;
  decided_by?: string;
  created_at: string;
}

export type TimeLogType = 'regular' | 'corrective_maintenance';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'exempt';
export type AttributionStatus = 'attributable' | 'exempt' | 'pending';

export interface TimeLog {
  id: string;
  task_id: string;
  module_id: string;
  project_id: string;
  user_id: string; // employee_id
  employee_id?: string;
  log_type: TimeLogType;
  work_type?: TimeLogType;
  bug_id?: string;
  hours: number;
  date: string; // YYYY-MM-DD
  work_date?: string;
  description: string;
  approval_status: ApprovalStatus;
  approved_by?: string;
  reviewer_id?: string;
  reviewer_name?: string;
  approved_at?: string;
  review_timestamp?: string;
  rejection_reason?: string;
  attribution_status: AttributionStatus;
  exempt_reason?: string;
  is_payroll_processed?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface EmployeeRate {
  id: string;
  employee_id: string;
  effective_date: string;
  hourly_rate: number;
  base_monthly_salary: number;
  currency: string;
  active_status: boolean;
  created_at?: string;
}

export type RateBasis = 'employee_effective_rate' | 'blended_rate' | 'contract_rate' | 'fixed_policy_rate';
export type RoundingMode = 'round_half_up' | 'truncate';

export interface PayrollPolicy {
  id: string;
  name: string;
  is_active: boolean;
  deduction_rate_percentage: number;
  max_deduction_cap_percentage: number;
  monthly_grace_hours: number;
  defect_attribution_window_days: number;
  require_manager_approval: boolean;
  rate_basis?: RateBasis;
  currency?: string;
  rounding_mode?: RoundingMode;
  destination_month_offset?: number; // e.g. 1 = following month
  policy_version?: number;
  allow_no_deduction_override?: boolean;
  effective_date?: string;
  updated_at: string;
}

export type PayrollStatus = 'draft' | 'under_review' | 'reviewed' | 'approved' | 'finalized' | 'paid';

export type AdjustmentType = 'reversal' | 'correction' | 'policy_relief' | 'dispute_settlement';

export interface PayrollAdjustment {
  id: string;
  payroll_record_id: string;
  employee_id: string;
  adjustment_type: AdjustmentType;
  amount: number;
  reason: string;
  authorized_by: string;
  authorizer_name?: string;
  created_at: string;
}

export interface PayrollRecord {
  id: string;
  period: string; // e.g. "2026-11"
  payroll_month?: string;
  source_month: string; // e.g. "2026-10"
  employee_id: string;
  base_salary: number;
  gross_salary?: number;
  hourly_rate: number;
  regular_hours_worked: number;
  total_corrective_hours: number;
  attributable_corrective_hours: number;
  exempt_corrective_hours: number;
  billable_deduction_hours: number;
  gross_deduction_amount: number;
  deduction_amount: number;
  approved_rework_deduction?: number;
  other_authorized_adjustments?: number;
  deduction_cap_applied: boolean;
  net_payout: number;
  net_salary?: number;
  status: PayrollStatus;
  processing_status?: PayrollStatus;
  finalized_at?: string;
  finalized_by?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface PayrollDeductionItem {
  id: string;
  payroll_record_id: string;
  source_time_log_id: string;
  employee_id?: string;
  task_id?: string;
  module_id?: string;
  bug_id?: string;
  work_date?: string;
  hours: number;
  hourly_rate: number;
  amount: number;
  attribution_reason: string;
  approval_reference?: string;
  created_at: string;
}

export type EntityType = 'task' | 'module' | 'project' | 'bug' | 'time_log' | 'payroll' | 'policy';

export interface AuditLog {
  id: string;
  user_id?: string;
  actor_id?: string;
  user_name: string;
  actor_name?: string;
  action: string;
  entity_type: EntityType;
  entity_id: string;
  details: string;
  structured_change_details?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp?: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string; // recipient_id
  recipient_id?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  notification_type?: 'info' | 'warning' | 'success' | 'danger';
  read: boolean;
  read_status?: boolean;
  link?: string;
  timestamp?: string;
  created_at: string;
}

export type Notification = AppNotification;
