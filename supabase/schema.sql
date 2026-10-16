-- ============================================================================
-- ReworkGuard — Consolidated Supabase PostgreSQL Database Setup
-- Contains: Complete Normalized Schema, Indexes, Constraints, RLS, Triggers,
--           Database Functions, and Comprehensive Seed Data
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

-- 1. PROFILES
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

-- 5. TASK DELIVERY CONTRIBUTORS
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

-- 8. TIME LOGS
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

-- 11. PAYROLL RECORDS
CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payroll_month TEXT NOT NULL,
  source_month TEXT NOT NULL,
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

-- 12. PAYROLL DEDUCTION ITEMS
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

-- 13. AUDIT LOGS
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
  recipient_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'info',
  read_status BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(code);
CREATE INDEX IF NOT EXISTS idx_modules_project ON modules(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_module ON tasks(module_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_bugs_task ON bugs(original_task_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_employee_date ON time_logs(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON payroll_records(payroll_month, employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_task_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_actor_name TEXT;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NOT NULL THEN
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = v_actor_id;
  ELSE
    v_actor_name := 'System Process';
  END IF;

  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    IF NEW.original_delivery_employee_id IS NULL THEN
      NEW.original_delivery_employee_id := COALESCE(NEW.assigned_employee_id, OLD.assigned_employee_id);
    END IF;
    IF NEW.actual_completion_date IS NULL THEN
      NEW.actual_completion_date := NOW();
    END IF;
  END IF;

  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.task_state_history (
      task_id, previous_status, new_status, actor_id, actor_name, reason, timestamp
    ) VALUES (
      NEW.id, OLD.status, NEW.status, v_actor_id, COALESCE(v_actor_name, 'System Process'),
      'Status transition to ' || NEW.status, NOW()
    );
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_task_status_change ON public.tasks;
CREATE TRIGGER trg_task_status_change
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_status_change();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_delivery_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_deduction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "Profiles readable by all authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Projects viewable by all authenticated users"
  ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Modules viewable by all authenticated users"
  ON modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tasks viewable by all authenticated users"
  ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Time logs viewable by owner or leads"
  ON time_logs FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR public.get_current_user_role() IN ('team_lead', 'manager', 'finance_admin'));
CREATE POLICY "Employees can submit time logs"
  ON time_logs FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid() AND hours > 0 AND hours <= 24);
CREATE POLICY "Payroll records viewable by owner or managers"
  ON payroll_records FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR public.get_current_user_role() IN ('manager', 'finance_admin'));

-- ============================================================================
-- SEED DATA
-- ============================================================================

INSERT INTO public.profiles (id, full_name, email, role, active, avatar_url, department) VALUES
('11111111-1111-4000-a000-000000000001', 'Alex Rivera', 'alex.rivera@reworkguard.io', 'finance_admin', true, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'Finance & Operations'),
('22222222-2222-4000-a000-000000000002', 'Sarah Jenkins', 'sarah.jenkins@reworkguard.io', 'manager', true, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', 'Engineering Management'),
('33333333-3333-4000-a000-000000000003', 'David Chen', 'david.chen@reworkguard.io', 'team_lead', true, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'Core Banking & Fintech'),
('44444444-4444-4000-a000-000000000004', 'Elena Rostova', 'elena.rostova@reworkguard.io', 'employee', true, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', 'Full-Stack Engineering'),
('55555555-5555-4000-a000-000000000005', 'Marcus Vance', 'marcus.vance@reworkguard.io', 'employee', true, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', 'Frontend Experience'),
('66666666-6666-4000-a000-000000000006', 'Priya Patel', 'priya.patel@reworkguard.io', 'employee', true, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', 'Distributed Systems'),
('77777777-7777-4000-a000-000000000007', 'Jordan Lee', 'jordan.lee@reworkguard.io', 'employee', true, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', 'Cloud Infrastructure')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

INSERT INTO public.employee_rates (id, employee_id, effective_date, hourly_rate, base_monthly_salary, currency, active_status) VALUES
('r0000001-0000-4000-a000-000000000001', '11111111-1111-4000-a000-000000000001', '2026-01-01', 65.00, 10500.00, 'USD', true),
('r0000002-0000-4000-a000-000000000002', '22222222-2222-4000-a000-000000000002', '2026-01-01', 60.00, 9500.00, 'USD', true),
('r0000003-0000-4000-a000-000000000003', '33333333-3333-4000-a000-000000000003', '2026-01-01', 52.00, 8200.00, 'USD', true),
('r0000004-0000-4000-a000-000000000004', '44444444-4444-4000-a000-000000000004', '2026-01-01', 45.00, 7200.00, 'USD', true),
('r0000005-0000-4000-a000-000000000005', '55555555-5555-4000-a000-000000000005', '2026-01-01', 40.00, 6400.00, 'USD', true),
('r0000006-0000-4000-a000-000000000006', '66666666-6666-4000-a000-000000000006', '2026-01-01', 48.00, 7600.00, 'USD', true),
('r0000007-0000-4000-a000-000000000007', '77777777-7777-4000-a000-000000000007', '2026-01-01', 46.00, 7300.00, 'USD', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.payroll_policies (id, name, deduction_rate_percentage, max_deduction_cap_percentage, monthly_grace_hours, defect_attribution_window_days, require_manager_approval, is_active) VALUES
('p0000001-0000-4000-a000-000000000001', 'Standard Engineering Rework & Quality Policy (2026)', 100.00, 15.00, 2.00, 30, true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.projects (id, name, code, client_name, description, status, manager_id, budget, start_date, end_date) VALUES
('a0000001-0000-4000-b000-000000000001', 'FinPay Enterprise Settlement', 'PRJ-FINPAY', 'Apex Global Banking', 'High-throughput payment gateway settlement pipeline with escrow reconciliation.', 'active', '22222222-2222-4000-a000-000000000002', 185000.00, '2026-06-01', '2026-12-15'),
('a0000002-0000-4000-b000-000000000002', 'HealthPulse EHR & Telehealth', 'PRJ-HEALTH', 'MedCare Health Network', 'HIPAA-compliant EHR consent vault and WebRTC physician consultation suite.', 'active', '22222222-2222-4000-a000-000000000002', 140000.00, '2026-07-15', '2026-11-30'),
('a0000003-0000-4000-b000-000000000003', 'LogiTrack Real-Time Fleet', 'PRJ-LOGITRACK', 'TransContinental Freight', 'IoT telemetry ingestion, geofencing perimeter engine, and driver routing.', 'active', '22222222-2222-4000-a000-000000000002', 115000.00, '2026-05-10', '2026-10-31')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules (id, project_id, name, code, description, status, lead_id, delivered_at, reopened_at, reopen_count) VALUES
('b0000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', 'Payment Reconciliation Ledger', 'MOD-RECON', 'Cross-currency dual-entry ledger and ledger auditing for settlement files.', 'reopened', '33333333-3333-4000-a000-000000000003', '2026-09-25T16:00:00Z', '2026-10-04T10:15:00Z', 2),
('b0000002-0000-4000-b000-000000000002', 'a0000001-0000-4000-b000-000000000001', 'Webhook Event Dispatcher', 'MOD-WEBHOOK', 'Cryptographic signing and asynchronous webhook delivery with exponential backoff.', 'delivered', '33333333-3333-4000-a000-000000000003', '2026-10-01T14:30:00Z', NULL, 0),
('b0000003-0000-4000-b000-000000000003', 'a0000001-0000-4000-b000-000000000001', 'Stripe & Plaid Connectors', 'MOD-GATEWAYS', 'Direct API integrations for ACH and instant card settlements.', 'testing', '33333333-3333-4000-a000-000000000003', NULL, NULL, 0),
('b0000004-0000-4000-b000-000000000004', 'a0000002-0000-4000-b000-000000000002', 'EHR Consent & Audit Vault', 'MOD-CONSENT', 'Patient consent verification, signature timestamping, and export logs.', 'delivered', '33333333-3333-4000-a000-000000000003', '2026-09-28T18:00:00Z', NULL, 1),
('b0000005-0000-4000-b000-000000000005', 'a0000002-0000-4000-b000-000000000002', 'WebRTC Video Consultation Room', 'MOD-TELEHEALTH', 'Encrypted peer-to-peer physician patient video conferencing.', 'in_development', '33333333-3333-4000-a000-000000000003', NULL, NULL, 0),
('b0000006-0000-4000-b000-000000000006', 'a0000002-0000-4000-b000-000000000002', 'Patient Intake Questionnaire', 'MOD-INTAKE', 'Dynamic responsive medical history intake form with field validation.', 'delivered', '33333333-3333-4000-a000-000000000003', '2026-09-15T12:00:00Z', NULL, 0),
('b0000007-0000-4000-b000-000000000007', 'a0000003-0000-4000-b000-000000000003', 'Fleet Geofencing Engine', 'MOD-GEOFENCE', 'Real-time GPS coordinate polygon evaluation and perimeter breach alerts.', 'reopened', '33333333-3333-4000-a000-000000000003', '2026-09-30T17:00:00Z', '2026-10-08T11:45:00Z', 1),
('b0000008-0000-4000-b000-000000000008', 'a0000003-0000-4000-b000-000000000003', 'Automated Driver Billing & Invoicing', 'MOD-BILLING', 'Tier-based recurring billing cycles and PDF invoice generation.', 'delivered', '33333333-3333-4000-a000-000000000003', '2026-09-18T12:00:00Z', NULL, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks (id, module_id, project_id, title, description, assigned_employee_id, original_delivery_employee_id, committed_start_date, committed_due_date, actual_completion_date, status, original_delivery_ref, priority, estimated_hours) VALUES
('c0000001-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', 'Batch Ledger Double-Entry Processing', 'Process batch settlements with zero penny delta.', '44444444-4444-4000-a000-000000000004', '44444444-4444-4000-a000-000000000004', '2026-09-10', '2026-09-24', '2026-09-25T16:00:00Z', 'reopened', 'rel-finpay-1.0.1', 'high', 32.0),
('c0000002-0000-4000-c000-000000000002', 'b0000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', 'Export Settlement Audit Reports', 'Standardized CSV and PDF accounting summaries.', '55555555-5555-4000-a000-000000000005', '55555555-5555-4000-a000-000000000005', '2026-09-12', '2026-09-24', '2026-09-25T16:00:00Z', 'completed', 'rel-finpay-1.0.1', 'medium', 20.0),
('c0000003-0000-4000-c000-000000000003', 'b0000002-0000-4000-b000-000000000002', 'a0000001-0000-4000-b000-000000000001', 'HMAC-SHA256 Payload Signature Pipeline', 'Sign outbound webhooks with tenant keys.', '66666666-6666-4000-a000-000000000006', '66666666-6666-4000-a000-000000000006', '2026-09-15', '2026-09-30', '2026-10-01T14:30:00Z', 'completed', 'rel-webhook-1.0.0', 'critical', 24.0),
('c0000004-0000-4000-c000-000000000004', 'b0000003-0000-4000-b000-000000000003', 'a0000001-0000-4000-b000-000000000001', 'Plaid Token Exchange & Instant Balance Check', 'Integrate Plaid Link SDK with token exchange endpoint.', '44444444-4444-4000-a000-000000000004', NULL, '2026-10-01', '2026-10-25', NULL, 'in_progress', NULL, 'medium', 25.0),
('c0000005-0000-4000-c000-000000000005', 'b0000003-0000-4000-b000-000000000003', 'a0000001-0000-4000-b000-000000000001', 'Stripe Chargeback Webhook Listener', 'Automated dispute row creation on dispute events.', '77777777-7777-4000-a000-000000000007', NULL, '2026-10-05', '2026-10-28', NULL, 'in_review', NULL, 'medium', 18.0),
('c0000006-0000-4000-c000-000000000006', 'b0000004-0000-4000-b000-000000000002', 'a0000002-0000-4000-b000-000000000002', 'HIPAA Consent Form Digital Signing', 'Canvas signature capture and cryptographic hash verification.', '55555555-5555-4000-a000-000000000005', '55555555-5555-4000-a000-000000000005', '2026-09-10', '2026-09-27', '2026-09-28T18:00:00Z', 'completed', 'rel-consent-2.1', 'high', 28.0),
('c0000007-0000-4000-c000-000000000007', 'b0000005-0000-4000-b000-000000000002', 'a0000002-0000-4000-b000-000000000002', 'WebRTC Signaling Socket Cluster', 'SDP exchange and ICE candidates relay.', '66666666-6666-4000-a000-000000000006', NULL, '2026-10-01', '2026-11-05', NULL, 'in_progress', NULL, 'critical', 40.0),
('c0000008-0000-4000-c000-000000000008', 'b0000006-0000-4000-b000-000000000002', 'a0000002-0000-4000-b000-000000000002', 'Medical History Conditional Logic Validation', 'Client-side branching logic for symptom checks.', '77777777-7777-4000-a000-000000000007', '77777777-7777-4000-a000-000000000007', '2026-09-01', '2026-09-14', '2026-09-15T12:00:00Z', 'completed', 'rel-intake-1.0', 'low', 16.0),
('c0000009-0000-4000-c000-000000000009', 'b0000007-0000-4000-b000-000000000003', 'a0000003-0000-4000-b000-000000000003', 'Polygon Ray-Casting Geofence Ingestion', 'Evaluate high-frequency GPS coordinate pings.', '66666666-6666-4000-a000-000000000006', '66666666-6666-4000-a000-000000000006', '2026-09-10', '2026-09-29', '2026-09-30T17:00:00Z', 'reopened', 'rel-geofence-1.0', 'critical', 36.0),
('c0000010-0000-4000-c000-000000000010', 'b0000007-0000-4000-b000-000000000003', 'a0000003-0000-4000-b000-000000000003', 'Real-Time Driver Push Notification Service', 'FCM/APNS push alert trigger when breach detected.', '55555555-5555-4000-a000-000000000005', NULL, '2026-10-08', '2026-10-25', NULL, 'in_progress', NULL, 'high', 20.0),
('c0000011-0000-4000-c000-000000000011', 'b0000008-0000-4000-b000-000000000003', 'a0000003-0000-4000-b000-000000000003', 'Automated Driver Pay PDF Statement Generator', 'PDF engine rendering monthly haul settlements.', '44444444-4444-4000-a000-000000000004', '44444444-4444-4000-a000-000000000004', '2026-09-05', '2026-09-17', '2026-09-18T12:00:00Z', 'completed', 'rel-driver-billing-1.0', 'medium', 22.0),
('c0000012-0000-4000-c000-000000000012', 'b0000008-0000-4000-b000-000000000003', 'a0000003-0000-4000-b000-000000000003', 'Fuel Surcharge Adjustment Calculator', 'Dynamic fuel index lookup and adjustment percentage.', '77777777-7777-4000-a000-000000000007', NULL, '2026-10-10', '2026-10-30', NULL, 'backlog', NULL, 'low', 14.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bugs (id, original_task_id, module_id, project_id, reporter_id, assigned_to, original_developer_id, title, description, steps_to_reproduce, severity, date_found, attribution_classification, investigation_notes, classified_by, classified_at, status) VALUES
('d0000001-0000-4000-d000-000000000001', 'c0000001-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', '22222222-2222-4000-a000-000000000002', '44444444-4444-4000-a000-000000000004', '44444444-4444-4000-a000-000000000004', 'Ledger discrepancy in batch settlements exceeding 500 records', 'Concurrent write locks cause dirty reads in settlement escrow.', '1. Ingest batch of 750 mock payments.\n2. Trigger settlement.\n3. Discrepancy detected.', 'critical', '2026-10-04', 'caused_by_original_delivery', 'Confirmed code defect in transaction isolation level. Cursor lacked serializable lock.', '22222222-2222-4000-a000-000000000002', '2026-10-04T14:20:00Z', 'in_fix'),
('d0000002-0000-4000-d000-000000000002', 'c0000003-0000-4000-c000-000000000003', 'b0000002-0000-4000-b000-000000000002', 'a0000001-0000-4000-b000-000000000001', '33333333-3333-4000-a000-000000000003', '66666666-6666-4000-a000-000000000006', '66666666-6666-4000-a000-000000000006', 'Webhook signature validation fails on rotated keys', 'Client third-party webhook receivers reject HMAC signatures after rotating API credentials on the client admin panel.', '1. Rotate secret key on client admin.\n2. Send ping.\n3. 401 signature mismatch.', 'high', '2026-10-05', 'not_caused_by_original_delivery', 'External client spec change. Client rotated format without notifying engineering.', '22222222-2222-4000-a000-000000000002', '2026-10-06T11:00:00Z', 'verified_resolved'),
('d0000003-0000-4000-d000-000000000003', 'c0000009-0000-4000-c000-000000000003', 'b0000007-0000-4000-b000-000000000003', 'a0000003-0000-4000-b000-000000000003', '22222222-2222-4000-a000-000000000002', '66666666-6666-4000-a000-000000000006', '66666666-6666-4000-a000-000000000006', 'Geofence breach alerts delayed by up to 14 minutes in heavy traffic', 'Telemetry queue consumer stalls when spatial polygon points exceed 12 vertices.', '1. Define 16-point polygon.\n2. Simulate 50 trucks crossing border.\n3. Push delayed by 14m.', 'critical', '2026-10-08', 'caused_by_original_delivery', 'Inefficient O(N^2) in-memory point evaluation instead of PostGIS spatial index.', '22222222-2222-4000-a000-000000000002', '2026-10-08T15:30:00Z', 'in_fix'),
('d0000004-0000-4000-d000-000000000004', 'c0000006-0000-4000-c000-000000000002', 'b0000004-0000-4000-b000-000000000002', 'a0000002-0000-4000-b000-000000000002', '33333333-3333-4000-a000-000000000003', '55555555-5555-4000-a000-000000000005', '55555555-5555-4000-a000-000000000005', 'Patient consent timestamp rendered in UTC instead of hospital local timezone', 'Doctors report PDF certificates reflect GMT timestamp without hospital timezone offset.', '1. Sign on EST device.\n2. Open PDF.\n3. Shows GMT.', 'medium', '2026-10-12', 'pending_investigation', 'Investigating whether original SOW mandated UTC or hospital facility timezone.', NULL, NULL, 'investigating'),
('d0000005-0000-4000-d000-000000000005', 'c0000008-0000-4000-c000-000000000002', 'b0000006-0000-4000-b000-000000000002', 'a0000002-0000-4000-b000-000000000002', '33333333-3333-4000-a000-000000000003', '77777777-7777-4000-a000-000000000007', '77777777-7777-4000-a000-000000000007', 'Intake questionnaire dropdown values reset on Safari browser refresh', 'Hospital staff reported form state was lost on page refresh in iOS Safari.', '1. Open intake on iPad Safari.\n2. Fill questions.\n3. Refresh.', 'low', '2026-10-14', 'not_caused_by_original_delivery', 'Safari iOS 18 indexedDB bug documented by Apple. Workaround applied.', '22222222-2222-4000-a000-000000000002', '2026-10-15T09:00:00Z', 'verified_resolved')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.time_logs (id, task_id, module_id, project_id, bug_id, employee_id, work_date, hours, work_type, description, approval_status, reviewer_id, review_timestamp, attribution_status, exempt_reason, is_payroll_processed) VALUES
('e0000001-0000-4000-e000-000000000001', 'c0000001-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', 'd0000001-0000-4000-d000-000000000001', '44444444-4444-4000-a000-000000000004', '2026-10-05', 4.50, 'corrective_maintenance', 'Debugging concurrent write lock contention and row-level locks on escrow.', 'approved', '22222222-2222-4000-a000-000000000002', '2026-10-06T10:00:00Z', 'attributable', NULL, true),
('e0000002-0000-4000-e000-000000000002', 'c0000001-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', 'd0000001-0000-4000-d000-000000000001', '44444444-4444-4000-a000-000000000004', '2026-10-06', 4.00, 'corrective_maintenance', 'Refactoring settlement queries to advisory locks and adding idempotency suite.', 'approved', '22222222-2222-4000-a000-000000000002', '2026-10-07T11:00:00Z', 'attributable', NULL, true),
('e0000003-0000-4000-e000-000000000003', 'c0000003-0000-4000-c000-000000000003', 'b0000002-0000-4000-b000-000000000002', 'a0000001-0000-4000-b000-000000000001', 'd0000002-0000-4000-d000-000000000002', '66666666-6666-4000-a000-000000000006', '2026-10-06', 3.50, 'corrective_maintenance', 'Updated webhook verification endpoint to support custom client header spec.', 'approved', '22222222-2222-4000-a000-000000000002', '2026-10-07T09:30:00Z', 'exempt', 'External specification change outside delivered SOW scope.', false),
('e0000004-0000-4000-e000-000000000004', 'c0000009-0000-4000-c000-000000000003', 'b0000007-0000-4000-b000-000000000003', 'a0000003-0000-4000-b000-000000000003', 'd0000003-0000-4000-d000-000000000003', '66666666-6666-4000-a000-000000000006', '2026-10-09', 3.00, 'corrective_maintenance', 'PostGIS spatial index query migration for high frequency GPS pings.', 'approved', '22222222-2222-4000-a000-000000000002', '2026-10-10T14:00:00Z', 'attributable', NULL, true),
('e0000005-0000-4000-e000-000000000005', 'c0000009-0000-4000-c000-000000000003', 'b0000007-0000-4000-b000-000000000003', 'a0000003-0000-4000-b000-000000000003', 'd0000003-0000-4000-d000-000000000003', '66666666-6666-4000-a000-000000000006', '2026-10-10', 3.00, 'corrective_maintenance', 'Benchmarking PostGIS ST_Contains vs ray casting.', 'approved', '22222222-2222-4000-a000-000000000002', '2026-10-11T12:00:00Z', 'attributable', NULL, true),
('e0000006-0000-4000-e000-000000000006', 'c0000006-0000-4000-c000-000000000002', 'b0000004-0000-4000-b000-000000000002', 'a0000002-0000-4000-b000-000000000002', 'd0000004-0000-4000-d000-000000000004', '55555555-5555-4000-a000-000000000005', '2026-10-13', 2.00, 'corrective_maintenance', 'Diagnosing hospital timezone offset in canvas PDF rendering.', 'pending', NULL, NULL, 'pending', NULL, false),
('e0000007-0000-4000-e000-000000000007', 'c0000008-0000-4000-c000-000000000002', 'b0000006-0000-4000-b000-000000000002', 'a0000002-0000-4000-b000-000000000002', 'd0000005-0000-4000-d000-000000000005', '77777777-7777-4000-a000-000000000007', '2026-10-15', 2.50, 'corrective_maintenance', 'Implemented localStorage polyfill fallback for Safari IndexedDB.', 'approved', '22222222-2222-4000-a000-000000000002', '2026-10-15T15:00:00Z', 'exempt', 'Browser vendor runtime bug.', false),
('e0000008-0000-4000-e000-000000000008', 'c0000001-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', 'd0000001-0000-4000-d000-000000000001', '44444444-4444-4000-a000-000000000004', '2026-10-14', 1.50, 'corrective_maintenance', 'Double checked transaction rollback log.', 'rejected', '22222222-2222-4000-a000-000000000002', '2026-10-15T10:00:00Z', 'attributable', 'Duplicate entry already covered under log e0000002.', false),
('e0000009-0000-4000-e000-000000000009', 'c0000007-0000-4000-c000-000000000002', 'b0000005-0000-4000-b000-000000000002', 'a0000002-0000-4000-b000-000000000002', NULL, '66666666-6666-4000-a000-000000000006', '2026-10-14', 2.00, 'corrective_maintenance', 'Investigating audio sync jitter on reconnect.', 'pending', NULL, NULL, 'pending', NULL, false),
('e0000010-0000-4000-e000-000000000010', 'c0000010-0000-4000-c000-000000000003', 'b0000007-0000-4000-b000-000000000003', 'a0000003-0000-4000-b000-000000000003', NULL, '55555555-5555-4000-a000-000000000005', '2026-10-15', 3.00, 'corrective_maintenance', 'Tuning push notification retry interval.', 'pending', NULL, NULL, 'pending', NULL, false),
('e0000011-0000-4000-e000-000000000011', 'c0000004-0000-4000-c000-000000000001', 'b0000003-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', NULL, '44444444-4444-4000-a000-000000000004', '2026-10-03', 7.50, 'regular', 'Plaid OAuth token exchange and webhook verification endpoint.', 'approved', '33333333-3333-4000-a000-000000000003', '2026-10-04T09:00:00Z', 'exempt', NULL, false),
('e0000012-0000-4000-e000-000000000012', 'c0000002-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', NULL, '55555555-5555-4000-a000-000000000005', '2026-10-14', 8.00, 'regular', 'Export format styling updates and CSV header compliance.', 'approved', '33333333-3333-4000-a000-000000000003', '2026-10-15T09:00:00Z', 'exempt', NULL, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.payroll_records (id, employee_id, payroll_month, source_month, gross_salary, approved_rework_deduction, other_authorized_adjustments, net_salary, processing_status, total_corrective_hours, attributable_corrective_hours, billable_deduction_hours, deduction_cap_applied, notes) VALUES
('pay00001-0000-4000-e000-000000000001', '44444444-4444-4000-a000-000000000004', '2026-11', '2026-10', 7200.00, 292.50, 0.00, 6907.50, 'reviewed', 8.50, 8.50, 6.50, false, '8.5 approved corrective hours on Payment Reconciliation ledger (Bug d0000001). 2.0 hours grace applied. 6.5 hours billed at $45/hr.'),
('pay00002-0000-4000-e000-000000000002', '66666666-6666-4000-a000-000000000006', '2026-11', '2026-10', 7600.00, 192.00, 0.00, 7408.00, 'draft', 9.50, 6.00, 4.00, false, '3.5 corrective hours on Webhook marked exempt. 6.0 attributable hours on Geofencing engine minus 2.0 grace = 4.0 hours billed at $48/hr.'),
('pay00003-0000-4000-e000-000000000003', '55555555-5555-4000-a000-000000000005', '2026-11', '2026-10', 6400.00, 0.00, 0.00, 6400.00, 'draft', 2.00, 0.00, 0.00, false, '2.0 corrective hours pending manager investigation of Bug d0000004. Zero deduction applied.'),
('pay00004-0000-4000-e000-000000000004', '44444444-4444-4000-a000-000000000004', '2026-10', '2026-09', 7200.00, 45.00, 0.00, 7155.00, 'finalized', 3.00, 3.00, 1.00, false, 'September corrective maintenance deduction finalized. 1.0 billable hour deduction.')
ON CONFLICT (employee_id, payroll_month) DO NOTHING;

INSERT INTO public.payroll_deduction_items (id, payroll_record_id, source_time_log_id, task_id, module_id, bug_id, hours, hourly_rate, amount, attribution_reason, approval_reference) VALUES
('di000001-0000-4000-e000-000000000001', 'pay00001-0000-4000-e000-000000000001', 'e0000001-0000-4000-e000-000000000001', 'c0000001-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'd0000001-0000-4000-d000-000000000001', 4.50, 45.00, 202.50, 'Escrow row lock contention defect fix', 'Approved by Sarah Jenkins (2026-10-06)'),
('di000002-0000-4000-e000-000000000002', 'pay00001-0000-4000-e000-000000000001', 'e0000002-0000-4000-e000-000000000002', 'c0000001-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'd0000001-0000-4000-d000-000000000001', 4.00, 45.00, 180.00, 'Advisory lock refactoring and idempotency tests', 'Approved by Sarah Jenkins (2026-10-07)'),
('di000003-0000-4000-e000-000000000003', 'pay00002-0000-4000-e000-000000000002', 'e0000004-0000-4000-e000-000000000004', 'c0000009-0000-4000-c000-000000000003', 'b0000007-0000-4000-b000-000000000003', 'd0000003-0000-4000-d000-000000000003', 3.00, 48.00, 144.00, 'PostGIS spatial query migration', 'Approved by Sarah Jenkins (2026-10-10)'),
('di000004-0000-4000-e000-000000000004', 'pay00002-0000-4000-e000-000000000002', 'e0000005-0000-4000-e000-000000000005', 'c0000009-0000-4000-c000-000000000003', 'b0000007-0000-4000-b000-000000000003', 'd0000003-0000-4000-d000-000000000003', 3.00, 48.00, 144.00, 'PostGIS spatial query benchmarking', 'Approved by Sarah Jenkins (2026-10-11)')
ON CONFLICT (payroll_record_id, source_time_log_id) DO NOTHING;
