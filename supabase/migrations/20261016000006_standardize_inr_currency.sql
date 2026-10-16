-- ============================================================================
-- Migration: Standardize Currency to Indian Rupee (INR, ₹)
-- Standardizes default currency on employee rates and payroll policies
-- ============================================================================

-- 1. Ensure currency column on payroll_policies if not exists
DO $$ BEGIN
  ALTER TABLE public.payroll_policies ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- 2. Update default currency on employee_rates to INR
ALTER TABLE public.employee_rates ALTER COLUMN currency SET DEFAULT 'INR';
UPDATE public.employee_rates SET currency = 'INR' WHERE currency = 'USD' OR currency IS NULL;

-- 3. Update default currency on payroll_policies to INR
ALTER TABLE public.payroll_policies ALTER COLUMN currency SET DEFAULT 'INR';
UPDATE public.payroll_policies SET currency = 'INR' WHERE currency IS NULL;

-- 4. Convert legacy rate records in database to INR standards
UPDATE public.employee_rates SET
  hourly_rate = CASE 
    WHEN hourly_rate <= 100 THEN hourly_rate * 10
    ELSE hourly_rate
  END,
  base_monthly_salary = CASE 
    WHEN base_monthly_salary <= 20000 THEN base_monthly_salary * 10
    ELSE base_monthly_salary
  END
WHERE currency = 'INR';
