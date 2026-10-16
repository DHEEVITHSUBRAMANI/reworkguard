-- ============================================================================
-- Migration 000: Normalized Schema with Constraints & Indexes
-- ============================================================================

-- Ensure pgcrypto / uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom Enum Types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('employee', 'team_lead', 'manager', 'finance_admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('active', 'in_review', 'completed', 'on_hold');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE module_status AS ENUM ('in_development', 'testing', 'delivered', 'reopened', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('backlog', 'in_progress', 'in_review', 'completed', 'reopened');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE bug_severity AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE bug_status AS ENUM ('open', 'investigating', 'in_fix', 'verified_resolved', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE defect_classification AS ENUM (
    'caused_by_original_delivery', 
    'not_caused_by_original_delivery', 
    'pending_investigation'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE time_log_type AS ENUM ('regular', 'corrective_maintenance');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE attribution_status AS ENUM ('attributable', 'exempt', 'pending');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payroll_status AS ENUM ('draft', 'reviewed', 'finalized', 'paid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. PROFILES (Linked to auth.users if available, or standalone UUIDs)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  department TEXT NOT NULL DEFAULT 'Engineering',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'active',
  client_name TEXT NOT NULL,
  budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (budget >= 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_project_dates CHECK (end_date >= start_date)
);

-- 3. MODULES
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  status module_status NOT NULL DEFAULT 'in_development',
  lead_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  delivered_at TIMESTAMPTZ,
  reopened_at TIMESTAMPTZ,
  reopen_count INT NOT NULL DEFAULT 0 CHECK (reopen_count >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  original_delivery_employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  committed_start_date DATE,
  committed_due_date DATE,
  actual_completion_date TIMESTAMPTZ,
  closure_date TIMESTAMPTZ,
  original_delivery_ref TEXT,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'in_progress',
  estimated_hours NUMERIC(6, 2) NOT NULL DEFAULT 16.0 CHECK (estimated_hours > 0),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TASK DELIVERY CONTRIBUTORS (Multi-employee module deliveries)
CREATE TABLE IF NOT EXISTS task_delivery_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contribution_details TEXT NOT NULL,
  percentage_share NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (percentage_share > 0 AND percentage_share <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, employee_id)
);

-- 6. TASK STATE HISTORY
CREATE TABLE IF NOT EXISTS task_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  previous_status task_status,
  new_status task_status NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  reason TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. BUGS / DEFECTS
CREATE TABLE IF NOT EXISTS bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  original_developer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  severity bug_severity NOT NULL DEFAULT 'high',
  date_found DATE NOT NULL DEFAULT CURRENT_DATE,
  attribution_classification defect_classification NOT NULL DEFAULT 'pending_investigation',
  investigation_notes TEXT,
  classified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  classified_at TIMESTAMPTZ,
  status bug_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. TIME LOGS (With strict hours constraint and payroll locking)
CREATE TABLE IF NOT EXISTS time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bug_id UUID REFERENCES bugs(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours NUMERIC(5, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  work_type time_log_type NOT NULL DEFAULT 'regular',
  description TEXT NOT NULL,
  approval_status approval_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_timestamp TIMESTAMPTZ,
  rejection_reason TEXT,
  attribution_status attribution_status NOT NULL DEFAULT 'pending',
  exempt_reason TEXT,
  is_payroll_processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. EMPLOYEE HOURLY RATES & SALARIES
CREATE TABLE IF NOT EXISTS employee_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  hourly_rate NUMERIC(10, 2) NOT NULL CHECK (hourly_rate > 0),
  base_monthly_salary NUMERIC(10, 2) NOT NULL CHECK (base_monthly_salary > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  active_status BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. PAYROLL POLICIES
CREATE TABLE IF NOT EXISTS payroll_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  deduction_rate_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.0 CHECK (deduction_rate_percentage >= 0 AND deduction_rate_percentage <= 100),
  max_deduction_cap_percentage NUMERIC(5, 2) NOT NULL DEFAULT 15.0 CHECK (max_deduction_cap_percentage >= 0 AND max_deduction_cap_percentage <= 100),
  monthly_grace_hours NUMERIC(5, 2) NOT NULL DEFAULT 2.0 CHECK (monthly_grace_hours >= 0),
  defect_attribution_window_days INT NOT NULL DEFAULT 30 CHECK (defect_attribution_window_days > 0),
  require_manager_approval BOOLEAN NOT NULL DEFAULT true,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. PAYROLL RECORDS (Unique per employee and month)
CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payroll_month TEXT NOT NULL, -- Format: 'YYYY-MM'
  source_month TEXT NOT NULL,  -- Format: 'YYYY-MM'
  gross_salary NUMERIC(10, 2) NOT NULL CHECK (gross_salary >= 0),
  approved_rework_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (approved_rework_deduction >= 0),
  other_authorized_adjustments NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  net_salary NUMERIC(10, 2) NOT NULL,
  processing_status payroll_status NOT NULL DEFAULT 'draft',
  total_corrective_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
  attributable_corrective_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
  billable_deduction_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
  deduction_cap_applied BOOLEAN NOT NULL DEFAULT false,
  finalized_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  finalized_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, payroll_month)
);

-- 12. PAYROLL DEDUCTION ITEMS (Itemized breakdown preventing double-deduction)
CREATE TABLE IF NOT EXISTS payroll_deduction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id UUID NOT NULL REFERENCES payroll_records(id) ON DELETE CASCADE,
  source_time_log_id UUID NOT NULL REFERENCES time_logs(id) ON DELETE RESTRICT,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  bug_id UUID REFERENCES bugs(id) ON DELETE SET NULL,
  hours NUMERIC(5, 2) NOT NULL CHECK (hours > 0),
  hourly_rate NUMERIC(10, 2) NOT NULL CHECK (hourly_rate >= 0),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  attribution_reason TEXT NOT NULL,
  approval_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payroll_record_id, source_time_log_id)
);

-- 13. AUDIT LOGS (Immutable)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  structured_change_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id TEXT NOT NULL, -- UUID string or 'all'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'info',
  read_status BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE & INTEGRITY
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(code);
CREATE INDEX IF NOT EXISTS idx_modules_project ON modules(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_module ON tasks(module_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_original_delivery ON tasks(original_delivery_employee_id);
CREATE INDEX IF NOT EXISTS idx_bugs_task ON bugs(original_task_id);
CREATE INDEX IF NOT EXISTS idx_bugs_classification ON bugs(attribution_classification);
CREATE INDEX IF NOT EXISTS idx_time_logs_employee_date ON time_logs(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_time_logs_bug ON time_logs(bug_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_approval ON time_logs(approval_status);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON payroll_records(payroll_month, employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_deduction_timelog ON payroll_deduction_items(source_time_log_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, read_status);
