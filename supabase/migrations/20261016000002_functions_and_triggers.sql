-- ============================================================================
-- Migration 002: Secure Functions, State History Triggers & Payroll Calculation
-- ============================================================================

-- Function 1: Automatically snapshot original delivery employee and record state history
CREATE OR REPLACE FUNCTION public.handle_task_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_actor_name TEXT;
BEGIN
  -- Determine actor
  v_actor_id := auth.uid();
  IF v_actor_id IS NOT NULL THEN
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = v_actor_id;
  ELSE
    v_actor_name := 'System Process';
  END IF;

  -- 1. Preserve original delivery employee on first delivery/completion
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    IF NEW.original_delivery_employee_id IS NULL THEN
      NEW.original_delivery_employee_id := COALESCE(NEW.assigned_employee_id, OLD.assigned_employee_id);
    END IF;
    IF NEW.actual_completion_date IS NULL THEN
      NEW.actual_completion_date := NOW();
    END IF;
  END IF;

  -- 2. If status was changed, log to task_state_history
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.task_state_history (
      task_id,
      previous_status,
      new_status,
      actor_id,
      actor_name,
      reason,
      timestamp
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      v_actor_id,
      COALESCE(v_actor_name, 'System Process'),
      'Status transition to ' || NEW.status,
      NOW()
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


-- Function 2: Prevent editing approved or payroll-processed time logs
CREATE OR REPLACE FUNCTION public.check_time_log_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- If time log is already processed in payroll, reject any update
  IF OLD.is_payroll_processed = true AND NEW.is_payroll_processed = true THEN
    -- Only allow reviewer fields or reject entirely
    IF (OLD.hours <> NEW.hours OR OLD.work_date <> NEW.work_date OR OLD.work_type <> NEW.work_type) THEN
      RAISE EXCEPTION 'Cannot modify time log that has already been processed in payroll.';
    END IF;
  END IF;

  -- If employee is updating an already approved log without managerial role
  IF OLD.approval_status = 'approved' AND (OLD.hours <> NEW.hours OR OLD.work_date <> NEW.work_date) THEN
    IF NOT (public.is_manager()) THEN
      RAISE EXCEPTION 'Approved time logs can only be modified by a Manager or Finance Administrator.';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_time_log_immutability ON public.time_logs;
CREATE TRIGGER trg_check_time_log_immutability
  BEFORE UPDATE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_time_log_immutability();


-- Function 3: Idempotent Next-Month Payroll Rework Deduction Calculation
CREATE OR REPLACE FUNCTION public.calculate_monthly_payroll_rework(
  p_target_month TEXT,  -- e.g. '2026-11'
  p_source_month TEXT,  -- e.g. '2026-10'
  p_actor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  processed_employees INT,
  total_deductions_amount NUMERIC(10, 2),
  total_rework_hours NUMERIC(6, 2)
) AS $$
DECLARE
  v_policy RECORD;
  v_emp RECORD;
  v_rec_id UUID;
  v_total_corrective NUMERIC(6, 2);
  v_attr_corrective NUMERIC(6, 2);
  v_exempt_corrective NUMERIC(6, 2);
  v_billable_hours NUMERIC(6, 2);
  v_gross_deduction NUMERIC(10, 2);
  v_salary_cap NUMERIC(10, 2);
  v_final_deduction NUMERIC(10, 2);
  v_cap_applied BOOLEAN;
  v_net_salary NUMERIC(10, 2);
  v_hourly_rate NUMERIC(10, 2);
  v_base_salary NUMERIC(10, 2);
  v_log RECORD;
  v_actor_name TEXT;
  v_count_emp INT := 0;
  v_sum_deductions NUMERIC(10, 2) := 0.00;
  v_sum_rework_hours NUMERIC(6, 2) := 0.00;
BEGIN
  -- Get active policy
  SELECT * INTO v_policy FROM public.payroll_policies 
  WHERE is_active = true 
  ORDER BY updated_at DESC LIMIT 1;

  IF v_policy IS NULL THEN
    RAISE EXCEPTION 'No active payroll policy found.';
  END IF;

  -- Determine actor name
  IF p_actor_id IS NOT NULL THEN
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = p_actor_id;
  ELSE
    v_actor_name := 'Finance Calculation Engine';
  END IF;

  -- Loop through all active employees
  FOR v_emp IN 
    SELECT p.id, p.full_name, p.email,
           COALESCE(er.hourly_rate, 45.00) as hourly_rate,
           COALESCE(er.base_monthly_salary, 7000.00) as base_salary
    FROM public.profiles p
    LEFT JOIN public.employee_rates er ON er.employee_id = p.id AND er.active_status = true
    WHERE p.active = true AND p.role IN ('employee', 'team_lead')
  LOOP
    v_hourly_rate := v_emp.hourly_rate;
    v_base_salary := v_emp.base_salary;

    -- Aggregate approved corrective maintenance logs for this employee in source month
    SELECT 
      COALESCE(SUM(hours), 0.0),
      COALESCE(SUM(CASE WHEN attribution_status = 'attributable' THEN hours ELSE 0.0 END), 0.0),
      COALESCE(SUM(CASE WHEN attribution_status = 'exempt' THEN hours ELSE 0.0 END), 0.0)
    INTO 
      v_total_corrective,
      v_attr_corrective,
      v_exempt_corrective
    FROM public.time_logs
    WHERE employee_id = v_emp.id
      AND TO_CHAR(work_date, 'YYYY-MM') = p_source_month
      AND work_type = 'corrective_maintenance'
      AND approval_status = 'approved';

    -- Apply monthly grace hours
    v_billable_hours := GREATEST(0.0, v_attr_corrective - v_policy.monthly_grace_hours);
    v_gross_deduction := ROUND((v_billable_hours * v_hourly_rate * (v_policy.deduction_rate_percentage / 100.0)), 2);
    v_salary_cap := ROUND((v_base_salary * (v_policy.max_deduction_cap_percentage / 100.0)), 2);

    IF v_gross_deduction > v_salary_cap THEN
      v_cap_applied := true;
      v_final_deduction := v_salary_cap;
    ELSE
      v_cap_applied := false;
      v_final_deduction := v_gross_deduction;
    END IF;

    v_net_salary := v_base_salary - v_final_deduction;

    -- Upsert payroll record
    INSERT INTO public.payroll_records (
      employee_id,
      payroll_month,
      source_month,
      gross_salary,
      approved_rework_deduction,
      other_authorized_adjustments,
      net_salary,
      processing_status,
      total_corrective_hours,
      attributable_corrective_hours,
      billable_deduction_hours,
      deduction_cap_applied,
      notes,
      updated_at
    ) VALUES (
      v_emp.id,
      p_target_month,
      p_source_month,
      v_base_salary,
      v_final_deduction,
      0.00,
      v_net_salary,
      'draft',
      v_total_corrective,
      v_attr_corrective,
      v_billable_hours,
      v_cap_applied,
      'Calculated from ' || v_attr_corrective || 'h attributable rework in ' || p_source_month || '. Grace applied: ' || v_policy.monthly_grace_hours || 'h.',
      NOW()
    )
    ON CONFLICT (employee_id, payroll_month) DO UPDATE SET
      gross_salary = EXCLUDED.gross_salary,
      approved_rework_deduction = EXCLUDED.approved_rework_deduction,
      net_salary = EXCLUDED.net_salary,
      total_corrective_hours = EXCLUDED.total_corrective_hours,
      attributable_corrective_hours = EXCLUDED.attributable_corrective_hours,
      billable_deduction_hours = EXCLUDED.billable_deduction_hours,
      deduction_cap_applied = EXCLUDED.deduction_cap_applied,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING id INTO v_rec_id;

    -- Clear existing deduction items for this recalculation to remain idempotent
    DELETE FROM public.payroll_deduction_items WHERE payroll_record_id = v_rec_id;

    -- Insert individual deduction items for each attributable log
    IF v_billable_hours > 0 THEN
      FOR v_log IN 
        SELECT id, task_id, module_id, bug_id, hours, description
        FROM public.time_logs
        WHERE employee_id = v_emp.id
          AND TO_CHAR(work_date, 'YYYY-MM') = p_source_month
          AND work_type = 'corrective_maintenance'
          AND approval_status = 'approved'
          AND attribution_status = 'attributable'
      LOOP
        INSERT INTO public.payroll_deduction_items (
          payroll_record_id,
          source_time_log_id,
          task_id,
          module_id,
          bug_id,
          hours,
          hourly_rate,
          amount,
          attribution_reason,
          approval_reference
        ) VALUES (
          v_rec_id,
          v_log.id,
          v_log.task_id,
          v_log.module_id,
          v_log.bug_id,
          v_log.hours,
          v_hourly_rate,
          ROUND((v_log.hours * v_hourly_rate * (v_policy.deduction_rate_percentage / 100.0)), 2),
          v_log.description,
          'Approved by Manager under ' || v_policy.name
        ) ON CONFLICT (payroll_record_id, source_time_log_id) DO NOTHING;

        -- Flag time log as processed in payroll
        UPDATE public.time_logs SET is_payroll_processed = true WHERE id = v_log.id;
      END LOOP;
    END IF;

    v_count_emp := v_count_emp + 1;
    v_sum_deductions := v_sum_deductions + v_final_deduction;
    v_sum_rework_hours := v_sum_rework_hours + v_attr_corrective;
  END LOOP;

  -- Insert audit log for payroll calculation
  INSERT INTO public.audit_logs (
    actor_id,
    actor_name,
    action,
    entity_type,
    entity_id,
    structured_change_details,
    details
  ) VALUES (
    p_actor_id,
    v_actor_name,
    'PAYROLL_CALCULATED',
    'payroll',
    p_target_month,
    jsonb_build_object(
      'target_month', p_target_month,
      'source_month', p_source_month,
      'employees_processed', v_count_emp,
      'total_deductions', v_sum_deductions
    ),
    'Calculated rework deductions for ' || p_target_month || ' based on ' || p_source_month || ' approved corrective hours.'
  );

  RETURN QUERY SELECT v_count_emp, v_sum_deductions, v_sum_rework_hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
