-- ============================================================================
-- Migration 004: Complete Task Lifecycle, Bug Reporting, Reopening & Verification
-- ============================================================================

-- 1. Ensure enum values exist in task_status
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'assigned';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'under_fix';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'closed';

-- 2. Ensure enum values exist in defect_classification
ALTER TYPE defect_classification ADD VALUE IF NOT EXISTS 'original_delivery_defect';
ALTER TYPE defect_classification ADD VALUE IF NOT EXISTS 'scope_change';
ALTER TYPE defect_classification ADD VALUE IF NOT EXISTS 'external_dependency_issue';

-- 3. Ensure approval_status has 'exempt'
ALTER TYPE approval_status ADD VALUE IF NOT EXISTS 'exempt';

-- 4. Add verification & on-time fields to tasks
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS is_delivered_on_time BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS fix_verification_status TEXT DEFAULT 'pending' CHECK (fix_verification_status IN ('pending', 'passed', 'failed')),
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- 5. Add verification & justification fields to bugs
ALTER TABLE public.bugs
  ADD COLUMN IF NOT EXISTS classification_justification TEXT,
  ADD COLUMN IF NOT EXISTS fix_verification_status TEXT DEFAULT 'pending' CHECK (fix_verification_status IN ('pending', 'passed', 'failed')),
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- 6. Bug Attribution History Table (Immutable log of all attribution decisions)
CREATE TABLE IF NOT EXISTS public.bug_attribution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id UUID NOT NULL REFERENCES public.bugs(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  classification defect_classification NOT NULL,
  justification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bug_attribution_history_bug ON public.bug_attribution_history(bug_id);

-- Enable RLS on bug_attribution_history
ALTER TABLE public.bug_attribution_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all authenticated users on bug_attribution_history"
  ON public.bug_attribution_history FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow insert by managers and leads on bug_attribution_history"
  ON public.bug_attribution_history FOR INSERT
  TO authenticated
  WITH CHECK (public.is_team_lead_or_above());

-- 7. Trigger Function: Enhanced Task Status Changes and Delivery Preservation
CREATE OR REPLACE FUNCTION public.handle_task_lifecycle_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_actor_name TEXT;
  v_is_on_time BOOLEAN;
  v_pending_bugs INT;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NOT NULL THEN
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = v_actor_id;
  ELSE
    v_actor_name := 'System Process';
  END IF;

  -- Validation: Closing a task requires that all linked bugs are verified and passed
  IF NEW.status = 'closed' AND OLD.status <> 'closed' THEN
    SELECT COUNT(*) INTO v_pending_bugs
    FROM public.bugs
    WHERE original_task_id = NEW.id
      AND (status NOT IN ('verified_resolved', 'closed') OR fix_verification_status <> 'passed');

    IF v_pending_bugs > 0 THEN
      RAISE EXCEPTION 'Cannot close task %: There are % unverified or unresolved bug(s). Verification is required before final closure.', NEW.id, v_pending_bugs;
    END IF;
    NEW.closure_date := NOW();
  END IF;

  -- 1. When completing: preserve original delivery employee and evaluate on-time delivery
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    IF NEW.original_delivery_employee_id IS NULL THEN
      NEW.original_delivery_employee_id := COALESCE(NEW.assigned_employee_id, OLD.assigned_employee_id);
    END IF;
    
    IF NEW.actual_completion_date IS NULL THEN
      NEW.actual_completion_date := NOW();
    END IF;

    -- Calculate on-time delivery against committed deadline
    IF NEW.committed_due_date IS NOT NULL THEN
      v_is_on_time := (NEW.actual_completion_date::DATE <= NEW.committed_due_date);
      NEW.is_delivered_on_time := v_is_on_time;
    ELSE
      NEW.is_delivered_on_time := true;
    END IF;
  END IF;

  -- 2. Preserve original delivery employee even after future reopening
  IF OLD.original_delivery_employee_id IS NOT NULL THEN
    NEW.original_delivery_employee_id := OLD.original_delivery_employee_id;
  END IF;

  -- 3. Log to task_state_history on any status change
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
      'Transitioned from ' || COALESCE(OLD.status::TEXT, 'none') || ' to ' || NEW.status::TEXT,
      NOW()
    );
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_task_lifecycle_transition ON public.tasks;
CREATE TRIGGER trg_task_lifecycle_transition
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_lifecycle_transition();

-- 8. Stored Procedure: Report Bug against Task (with auto-reopen and duplicate suppression)
CREATE OR REPLACE FUNCTION public.report_bug_for_task(
  p_task_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_severity bug_severity,
  p_reporter_id UUID,
  p_steps_to_reproduce TEXT DEFAULT NULL,
  p_date_found DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
  v_task RECORD;
  v_bug_id UUID;
  v_reporter_name TEXT;
  v_orig_emp_id UUID;
BEGIN
  -- 1. Validate task existence
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid task ID %: delivered task is required.', p_task_id;
  END IF;

  SELECT full_name INTO v_reporter_name FROM public.profiles WHERE id = p_reporter_id;
  v_orig_emp_id := COALESCE(v_task.original_delivery_employee_id, v_task.assigned_employee_id);

  -- 2. Create the bug linked to task, module, project, original delivery employee
  INSERT INTO public.bugs (
    original_task_id,
    module_id,
    project_id,
    reporter_id,
    assigned_to,
    original_developer_id,
    title,
    description,
    steps_to_reproduce,
    severity,
    date_found,
    attribution_classification,
    status
  ) VALUES (
    v_task.id,
    v_task.module_id,
    v_task.project_id,
    p_reporter_id,
    v_orig_emp_id,
    v_orig_emp_id,
    p_title,
    p_description,
    p_steps_to_reproduce,
    p_severity,
    p_date_found,
    'pending_investigation',
    'open'
  ) RETURNING id INTO v_bug_id;

  -- 3. Automatically reopen the task if it is completed or closed
  -- If already reopened or under_fix, attach bug without creating duplicate reopening event!
  IF v_task.status IN ('completed', 'closed') THEN
    UPDATE public.tasks
    SET status = 'reopened'
    WHERE id = v_task.id;

    -- Also update module reopen count
    UPDATE public.modules
    SET reopen_count = reopen_count + 1,
        status = 'reopened',
        reopened_at = NOW()
    WHERE id = v_task.module_id;

    -- Create audit notification
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      link
    ) VALUES (
      COALESCE(v_orig_emp_id, p_reporter_id),
      'Task Reopened: ' || v_task.title,
      'Bug "' || p_title || '" was reported by ' || COALESCE(v_reporter_name, 'Reporter') || '. Task transitioned to Reopened.',
      'warning',
      '/tasks'
    );
  END IF;

  RETURN v_bug_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger: Prevent Self-Approval on Time Logs
CREATE OR REPLACE FUNCTION public.check_self_approval_on_time_log()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS DISTINCT FROM 'approved') THEN
    IF NEW.employee_id = NEW.reviewer_id THEN
      RAISE EXCEPTION 'Self-approval is forbidden: Employee % cannot approve their own time log %.', NEW.employee_id, NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_self_approval_on_time_log ON public.time_logs;
CREATE TRIGGER trg_check_self_approval_on_time_log
  BEFORE UPDATE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_self_approval_on_time_log();
