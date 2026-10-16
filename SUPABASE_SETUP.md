# 🗄️ Supabase PostgreSQL & Architecture Setup Guide

This guide covers the database architecture, Row-Level Security (RLS) enforcement, database triggers, authentication, and demo login mechanisms for **ReworkGuard**.

---

## 1. Database Schema Overview (14 Normalized Tables)

All tables use **UUID primary keys**, strict foreign keys, timestamp tracking, and database integrity constraints.

| # | Table Name | Purpose & Key Constraints |
|---|------------|---------------------------|
| 1 | `profiles` | User identity linked to Supabase Auth (`id` references `auth.users(id)`), role enum (`employee`, `team_lead`, `manager`, `finance_admin`), department. |
| 2 | `projects` | Client deliverables, contract budgets, and milestone dates (`end_date >= start_date`). |
| 3 | `modules` | Project feature modules, delivery timestamps, and reopen counters (`reopen_count >= 0`). |
| 4 | `tasks` | Engineering tasks, committed vs actual completion dates, immutable `original_delivery_employee_id`, and delivery tags. |
| 5 | `task_delivery_contributors` | Multi-employee delivery attribution (`UNIQUE(task_id, employee_id)`), percentage share. |
| 6 | `task_state_history` | Audit log of every task lifecycle transition (previous status, new status, actor, timestamp, reason). |
| 7 | `bugs` | Post-delivery defects, severity, and 3-tier classification (`caused_by_original_delivery`, `not_caused_by_original_delivery`, `pending_investigation`). |
| 8 | `time_logs` | Work hours (`hours > 0 AND hours <= 24`), strict category (`regular` vs `corrective_maintenance`), approval status, and `is_payroll_processed` lock. |
| 9 | `employee_rates` | Historic and active hourly rates and base monthly salaries (`hourly_rate > 0`, `base_monthly_salary > 0`). |
| 10 | `payroll_policies` | Corporate rework policy rules (deduction rate %, salary cap %, grace hours, defect attribution window). |
| 11 | `payroll_records` | Monthly payroll ledger (`UNIQUE(employee_id, payroll_month)`), net payouts, and statutory salary cap limits. |
| 12 | `payroll_deduction_items` | Itemized line items linking payroll records to source time logs (`UNIQUE(payroll_record_id, source_time_log_id)`). |
| 13 | `audit_logs` | Append-only immutable compliance log with structured JSON change details. |
| 14 | `notifications` | Transparent employee alerts and managerial notifications. |

---

## 2. Row-Level Security (RLS) & Role Access Matrix

RLS is enabled on all 14 tables in `supabase/migrations/20261016000001_row_level_security.sql`.

### Role Permissions
- **Software Engineer (`employee`)**:
  - `time_logs`: Can view and submit own logs. Cannot edit logs once approved or flagged `is_payroll_processed = true`.
  - `tasks`: Can view all project tasks; can update status of tasks assigned to them.
  - `payroll_records`: Can only view their own finalized/reviewed payslips.
  - `bugs`: Can report defects; cannot classify defects for payroll attribution.
- **Team Lead (`team_lead`)**:
  - Can review and approve/reject team time logs.
  - Can create and reassign tasks.
- **Engineering Manager (`manager`)**:
  - Sole authority to classify defect attribution (`caused_by_original_delivery` vs `not_caused_by_original_delivery`).
  - Can override time log attribution (grant policy exemptions).
  - Can create projects, modules, and configure rework policies.
- **Finance Admin (`finance_admin`)**:
  - Full financial oversight: execute payroll calculation engine, review draft records, adjust rates, and finalize disbursals.
  - Full administrative access across all tables.

---

## 3. Database Functions & Triggers

Defined in `supabase/migrations/20261016000002_functions_and_triggers.sql`:

### A. Automatic Delivery Attribution & State History Trigger
```sql
CREATE TRIGGER trg_task_status_change
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_status_change();
```
- When a task is marked `completed` for the first time, it snapshots `original_delivery_employee_id` permanently. Even if the task is reassigned during rework, historical attribution is preserved.
- Any change in task status automatically creates an immutable record in `task_state_history`.

### B. Time Log Immutability Guard
```sql
CREATE TRIGGER trg_check_time_log_immutability
  BEFORE UPDATE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_time_log_immutability();
```
- Rejects edits to any time log that has already been finalized in payroll or approved by a manager.

### C. Idempotent Payroll Calculation Engine
```sql
SELECT * FROM public.calculate_monthly_payroll_rework('2026-11', '2026-10', '<admin_uuid>');
```
- Computes next-month deductions from source month approved attributable rework hours.
- Deducts monthly grace hours ($2.0\text{h}$).
- Enforces statutory salary cap ($15\%$ of base monthly salary).
- Upserts into `payroll_records` and inserts itemized rows into `payroll_deduction_items`.
- Locks associated time logs with `is_payroll_processed = true`.

---

## 4. How to Apply Migrations in Supabase

### Option A: Via Supabase CLI (Recommended for production)
```bash
# Link to your Supabase project
supabase link --project-ref your-project-id

# Push migrations
supabase db push
```

### Option B: Via Supabase Web Dashboard (One-click setup)
1. Go to your Supabase Project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** from the left navigation.
3. Paste the contents of [`supabase/schema.sql`](file:///C:/Users/divit/.gemini/antigravity/scratch/reworkguard/supabase/schema.sql).
4. Click **Run**. This will create all enums, tables, RLS policies, triggers, and seed demo records.

---

## 5. Connecting the Web App to Supabase

1. Copy `.env.example` to `.env`:
   ```powershell
   copy .env.example .env
   ```
2. Edit `.env` with your project API URL and public anon key:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Restart the Vite development server:
   ```powershell
   npm run dev
   ```
4. The application automatically detects valid Supabase credentials and switches from **Demo Mode** to **Live Supabase Mode**.

---

## 6. Safe Demo Logins & Authentication Testing

The application includes an **AuthModal** (accessible from the top-right profile menu) with pre-configured demo credentials:

| Persona | Role | Email | Safe Password |
|---------|------|-------|---------------|
| Alex Rivera | Finance Admin | `alex.rivera@reworkguard.io` | `DemoPass2026!` |
| Sarah Jenkins | Engineering Manager | `sarah.jenkins@reworkguard.io` | `DemoPass2026!` |
| David Chen | Team Lead | `david.chen@reworkguard.io` | `DemoPass2026!` |
| Elena Rostova | Software Engineer | `elena.rostova@reworkguard.io` | `DemoPass2026!` |

*(When running in offline Demo Mode, clicking any persona automatically switches the active session without requiring network traffic).*
