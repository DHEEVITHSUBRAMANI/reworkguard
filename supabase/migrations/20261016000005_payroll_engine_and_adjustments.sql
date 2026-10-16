-- ============================================================================
-- Migration 005: Payroll Engine, Audit Adjustments, Rate Snapshots & Locking
-- ============================================================================

-- 1. Extend payroll_policies with advanced calculation and governance settings
ALTER TABLE public.payroll_policies
  ADD COLUMN IF NOT EXISTS rate_basis TEXT DEFAULT 'contract_rate' CHECK (rate_basis IN ('contract_rate', 'standard_rate')),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS rounding_mode TEXT DEFAULT 'round_half_even' CHECK (rounding_mode IN ('round_half_even', 'round_half_up')),
  ADD COLUMN IF NOT EXISTS destination_month_offset INTEGER DEFAULT 1 CHECK (destination_month_offset IN (0, 1)),
  ADD COLUMN IF NOT EXISTS policy_version TEXT DEFAULT 'v2.0',
  ADD COLUMN IF NOT EXISTS allow_no_deduction_override BOOLEAN DEFAULT false;

-- 2. Extend payroll_deduction_items with historical snapshot fields
ALTER TABLE public.payroll_deduction_items
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS work_date DATE,
  ADD COLUMN IF NOT EXISTS percentage_applied NUMERIC(5,2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS rate_basis TEXT DEFAULT 'contract_rate';

-- Prevent duplicate deduction line items for the same time log within a payroll record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_deduction_item_record_log'
  ) THEN
    ALTER TABLE public.payroll_deduction_items
      ADD CONSTRAINT uq_deduction_item_record_log UNIQUE (payroll_record_id, source_time_log_id);
  END IF;
END $$;

-- 3. Controlled Post-Finalization Payroll Adjustments Table
CREATE TABLE IF NOT EXISTS public.payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id UUID NOT NULL REFERENCES public.payroll_records(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('reversal', 'correction', 'policy_relief', 'dispute_settlement', 'other')),
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) >= 10),
  authorized_by UUID NOT NULL REFERENCES public.profiles(id),
  authorizer_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_record ON public.payroll_adjustments(payroll_record_id);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_employee ON public.payroll_adjustments(employee_id);

-- 4. Enable RLS on payroll_adjustments
ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users on payroll_adjustments"
  ON public.payroll_adjustments FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow finance admins to insert payroll_adjustments"
  ON public.payroll_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('finance_admin', 'manager')
    )
  );

-- 5. Stored function to finalize a payroll record and lock underlying time logs
CREATE OR REPLACE FUNCTION public.finalize_payroll_record(
  p_record_id UUID,
  p_finalized_by UUID,
  p_finalizer_name TEXT DEFAULT 'Finance Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record public.payroll_records%ROWTYPE;
  v_locked_count INT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_record FROM public.payroll_records WHERE id = p_record_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payroll record not found');
  END IF;

  IF v_record.status = 'finalized' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payroll record is already finalized and locked');
  END IF;

  -- 1. Lock all source time logs referenced by deduction items
  WITH target_logs AS (
    SELECT DISTINCT source_time_log_id 
    FROM public.payroll_deduction_items 
    WHERE payroll_record_id = p_record_id AND source_time_log_id IS NOT NULL
  )
  UPDATE public.time_logs
  SET is_payroll_processed = true,
      updated_at = v_now
  WHERE id IN (SELECT source_time_log_id FROM target_logs);

  GET DIAGNOSTICS v_locked_count = ROW_COUNT;

  -- 2. Mark payroll record finalized
  UPDATE public.payroll_records
  SET status = 'finalized',
      processing_status = 'finalized',
      finalized_by = p_finalized_by,
      finalized_at = v_now,
      updated_at = v_now
  WHERE id = p_record_id;

  -- 3. Audit log
  INSERT INTO public.audit_logs (
    actor_id,
    actor_name,
    user_id,
    user_name,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    p_finalized_by,
    p_finalizer_name,
    p_finalized_by,
    p_finalizer_name,
    'PAYROLL_FINALIZED',
    'payroll',
    p_record_id,
    format('Authorized and finalized payroll record %s. %s source time logs locked.', p_record_id, v_locked_count)
  );

  -- 4. Notify employee
  INSERT INTO public.notifications (
    recipient_id,
    user_id,
    title,
    message,
    type,
    notification_type,
    read,
    link
  ) VALUES (
    v_record.employee_id,
    v_record.employee_id,
    format('Payslip Finalized (%s)', v_record.payroll_month),
    format('Your payslip for %s has been finalized ($%s net). You may print your payslip.', v_record.payroll_month, v_record.net_salary),
    'success',
    'success',
    false,
    '/payroll'
  );

  RETURN jsonb_build_object('success', true, 'locked_logs', v_locked_count);
END;
$$;
