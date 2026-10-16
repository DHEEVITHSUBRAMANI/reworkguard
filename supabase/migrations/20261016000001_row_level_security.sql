-- ============================================================================
-- Migration 001: Row-Level Security (RLS) & Role Permission Policies
-- ============================================================================

-- Helper Functions to read caller's role securely from profiles table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_finance_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (public.get_current_user_role() = 'finance_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (public.get_current_user_role() IN ('manager', 'finance_admin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_team_lead_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (public.get_current_user_role() IN ('team_lead', 'manager', 'finance_admin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable RLS across all 14 tables
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

-- 1. PROFILES POLICIES
CREATE POLICY "Profiles readable by all authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = public.get_current_user_role()); -- Prevent self-role elevation

CREATE POLICY "Managers can manage user profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (public.is_manager());

-- 2. PROJECTS POLICIES
CREATE POLICY "Projects viewable by all authenticated users"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Projects manageable by managers and finance admins"
  ON projects FOR ALL
  TO authenticated
  USING (public.is_manager());

-- 3. MODULES POLICIES
CREATE POLICY "Modules viewable by all authenticated users"
  ON modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Modules manageable by managers and finance admins"
  ON modules FOR ALL
  TO authenticated
  USING (public.is_manager());

-- 4. TASKS POLICIES
CREATE POLICY "Tasks viewable by all authenticated users"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Tasks creatable by team leads and above"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_team_lead_or_above());

CREATE POLICY "Tasks updatable by team leads and managers"
  ON tasks FOR UPDATE
  TO authenticated
  USING (public.is_team_lead_or_above() OR auth.uid() = assigned_employee_id);

-- 5. TASK DELIVERY CONTRIBUTORS POLICIES
CREATE POLICY "Contributors viewable by all authenticated users"
  ON task_delivery_contributors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Contributors manageable by leads and managers"
  ON task_delivery_contributors FOR ALL
  TO authenticated
  USING (public.is_team_lead_or_above());

-- 6. TASK STATE HISTORY POLICIES
CREATE POLICY "Task state history viewable by all authenticated users"
  ON task_state_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Task state history insertable by authenticated users"
  ON task_state_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 7. BUGS POLICIES
CREATE POLICY "Bugs viewable by all authenticated users"
  ON bugs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Bugs reportable by any authenticated user"
  ON bugs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Defect classification strictly restricted to managers and finance admins"
  ON bugs FOR UPDATE
  TO authenticated
  USING (public.is_manager());

-- 8. TIME LOGS POLICIES
CREATE POLICY "Employees can view own time logs, leads/managers view all"
  ON time_logs FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid() OR
    public.is_team_lead_or_above()
  );

CREATE POLICY "Employees can submit own time logs"
  ON time_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid() AND
    hours > 0 AND hours <= 24
  );

CREATE POLICY "Prevent editing approved or processed time logs"
  ON time_logs FOR UPDATE
  TO authenticated
  USING (
    -- If employee is updating own log, must not be approved or payroll processed
    (employee_id = auth.uid() AND approval_status = 'pending' AND is_payroll_processed = false)
    OR
    -- If lead/manager is updating for review
    public.is_team_lead_or_above()
  );

-- 9. EMPLOYEE RATES POLICIES
CREATE POLICY "Employees can view own rate, finance and managers view all"
  ON employee_rates FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid() OR
    public.is_manager()
  );

CREATE POLICY "Employee rates manageable exclusively by finance admins"
  ON employee_rates FOR ALL
  TO authenticated
  USING (public.is_finance_admin());

-- 10. PAYROLL POLICIES (Rules)
CREATE POLICY "Payroll policy viewable by all authenticated users"
  ON payroll_policies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Payroll policy manageable by finance admin and managers"
  ON payroll_policies FOR ALL
  TO authenticated
  USING (public.is_manager());

-- 11. PAYROLL RECORDS POLICIES
CREATE POLICY "Employees view only own finalized/reviewed records; finance/managers view all"
  ON payroll_records FOR SELECT
  TO authenticated
  USING (
    (employee_id = auth.uid() AND processing_status IN ('reviewed', 'finalized', 'paid'))
    OR
    public.is_manager()
  );

CREATE POLICY "Payroll records manageable by finance admins"
  ON payroll_records FOR ALL
  TO authenticated
  USING (public.is_finance_admin());

-- 12. PAYROLL DEDUCTION ITEMS POLICIES
CREATE POLICY "Deduction items viewable by record owner or finance/managers"
  ON payroll_deduction_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payroll_records pr 
      WHERE pr.id = payroll_deduction_items.payroll_record_id 
      AND (pr.employee_id = auth.uid() OR public.is_manager())
    )
  );

CREATE POLICY "Deduction items manageable by finance admins"
  ON payroll_deduction_items FOR ALL
  TO authenticated
  USING (public.is_finance_admin());

-- 13. AUDIT LOGS POLICIES (Immutable)
CREATE POLICY "Audit logs readable by authenticated users"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Audit logs insertable by system/authenticated actions"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No UPDATE or DELETE policy on audit_logs to guarantee immutability!

-- 14. NOTIFICATIONS POLICIES
CREATE POLICY "Users read own notifications or broadcast notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    recipient_id = auth.uid()::text OR
    recipient_id = 'all'
  );

CREATE POLICY "Users can mark own notifications as read"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    recipient_id = auth.uid()::text OR
    recipient_id = 'all'
  );

CREATE POLICY "Notifications insertable by authenticated users"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
