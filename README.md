# 🛡️ ReworkGuard — Rework-Aware Task Tracking and Payroll Management System

> **Enterprise Quality & Financial Accountability Platform for Software Engineering Teams**  
> Tracks delivered modules, post-delivery defects, reopened tasks, corrective maintenance hours, managerial approvals, and transparent next-month payroll deductions.

---

## 📌 Executive Summary & Architecture

In software companies, defects discovered post-delivery often trigger expensive corrective maintenance cycles. Traditional project management and ERP tools either conflate rework with regular billable hours or fail to link engineering quality metrics back to financial accountability and company payroll policies.

**ReworkGuard** solves this by establishing an authoritative, transparent, and legally defensible quality-accounting loop:

1. **Strict Separation of Hours**: Regular development hours and corrective maintenance hours are tracked separately and never commingled.
2. **Defect Attribution Governance**: Post-delivery bugs are investigated and classified by managers (*Original delivery defect*, *New requirement / scope change*, *External dependency / environment issue*, or *Pending investigation*).
3. **Preservation of Delivery Provenance**: When a completed task is reopened due to a defect, the original completion timestamp, original delivery employee, and contributor split records are permanently preserved.
4. **Authoritative Next-Month Payroll Deductions**: Approved eligible corrective rework hours from the current month are automatically queued and applied to the *following month's* payroll disbursal (e.g. October rework applies to November payroll).
5. **Employee Protection & Fairness Guarantees**: Statutory salary deduction caps (e.g., maximum 15% of monthly salary) and monthly grace allowances (e.g., 2.0 free rework hours/month) protect engineers while encouraging high code quality. Exempt defects (such as third-party API deprecations or client scope changes) are strictly non-deductible.
6. **Immutable Audit Trail & RFC 4180 CSV Export**: Every status transition, attribution override, time approval, and payroll adjustment is cryptographically recorded in an append-only ledger with previous-versus-new value diff inspection and full CSV export capabilities.

---

## 🚀 Key Functional Modules

### 1. 📊 Executive Overview Dashboard
- **Active Projects & Delivered Modules**: Live tracking of deliverables, client budgets, and milestone pace.
- **Reopen Rate Metric**: Authoritative calculation of reopened deliveries with transparent denominator callout.
- **Approved Corrective Hours**: Aggregated rework hours currently approved and queued.
- **Projected vs Finalized Deductions**: Real-time forecast of upcoming payroll impact.
- **Interactive Visualizations (Recharts)**:
  - Monthly corrective rework vs exempt hours trend
  - Rework distribution by client project
  - Top reopened modules and employee quality scores
- **Live Activity Feed**: Real-time stream of completions, defect filings, approvals, and payroll events.

### 2. 📁 Projects & Modules
- Hierarchical project and deliverable tracking with client metadata, contract budgets, and milestone dates.
- Statuses: `In Development`, `Testing`, `Delivered`, `Reopened (Rework)`, and `Closed`.
- Formal module reopen workflow with reason logging, team notification, and audit linkage.

### 3. ✅ Tasks Management & Full Lifecycle
- Granular task assignment across engineers.
- Validated state transitions: `Assigned` ➔ `In Progress` ➔ `Completed` ➔ `Reopened` ➔ `Under Fix` ➔ `Closed`.
- Real-time hour counters displaying **Regular Hours** alongside **Corrective Rework Hours**.
- One-click deliverable handoff (`Deliver & Complete`) with timestamping and on-time verification against committed deadlines.
- Formal reopen workflow capturing previous state, new state, actor, and reason.
- One-click RFC 4180 CSV export of filtered tasks.

### 4. 🐛 Defect Tracking & Managerial Classification
- Bug reporting linked directly to delivered tasks and modules (prevents orphaned defects).
- Automatic reopening of completed tasks upon defect filing with audit logging.
- Severity levels (`Critical`, `High`, `Medium`, `Low`).
- **4-Tier Managerial Classification**:
  - **Original delivery defect**: Attributable to code defects or missed requirements. Subject to payroll deduction review.
  - **New requirement or scope change**: Client added scope post-delivery. Exempt from deduction.
  - **External dependency / environment issue**: Third-party API failure, cloud outage, or upstream bug. Exempt from deduction.
  - **Pending investigation**: Investigation underway; hours held in escrow.
- Mandatory written justification for exempting classifications.

### 5. ⏱️ Time Tracking
- Mandatory classification between **Regular Development** and **Corrective Maintenance**.
- Corrective maintenance logs strictly require linking to an identified bug and description of fix.
- Live attribution indicator displaying whether logged hours are deductible or exempt under company policy.
- Queue for rejected logs with resubmission workflow.
- RFC 4180 CSV export of filtered time logs.

### 6. ✍️ Approvals Workflow
- Multi-tier review queue for Team Leads, Managers, and Finance Admins.
- Authorize standard logs or override attribution status (e.g., grant policy exemption).
- Rejection reason prompts, batch authorization, and payroll lock enforcement.
- RFC 4180 CSV export of approvals queue.

### 7. 💵 Authoritative Payroll Calculation Engine
- **Next-Month Deduction Calculation Rule**:
  - Eligible only if work type is `CORRECTIVE_MAINTENANCE`, approval status is `Approved`, defect attribution is `Original delivery defect`, required manager approvals are complete, log has not already been finalized, and log falls within the processed rework period.
  - Excludes pending, rejected, and exempt entries.
  - Formula:
    $$\text{Billable Rework Hours} = \max(0, \text{Attributable Hours} - \text{Monthly Grace Hours})$$
    $$\text{Gross Deduction} = \text{Billable Hours} \times \text{Hourly Rate} \times \left(\frac{\text{Deduction Rate \%}}{100}\right)$$
    $$\text{Max Salary Cap} = \text{Base Monthly Salary} \times \left(\frac{\text{Max Cap \%}}{100}\right)$$
    $$\text{Final Deduction} = \min(\text{Gross Deduction}, \text{Max Salary Cap}) - \text{Adjustments}$$
    $$\text{Net Payout} = \text{Base Salary} - \text{Final Deduction}$$
- Selected month preview and finalization (e.g., November payroll applies October rework hours).
- Detailed printable payslip modal with complete audit calculations, line-item disclosures, and adjustment authorization.

### 8. 📈 Reports & Quality Analytics
- **Rework Overview**: KPI cards, distinct Reopen Rate formula `(distinct delivered tasks reopened in period / distinct completed deliveries in period) * 100`, explicit denominator explanation, and drilldown inspection modal for underlying tasks.
- **Monthly Finance Review**: Tabular reconciliation of Gross Base Payroll, Proposed Rework Deductions, Approved Deductions, Finalized Deductions, Exempt Hours/Amounts, Pending Attributions, Pending Approvals, and Carried Forward Adjustments to persisted records with zero double-counting.
- **Employee Quality Metrics**: Scorecard table featuring original deliveries count, reopened deliveries count, reopen rate, attributable corrective hours, exempt hours, average fix time, and unresolved bugs, with sample-size transparency.
- **Module & Project Quality**: Recharts horizontal bar chart (top reopened modules), stacked project bar chart, severity distribution pie chart, and mean fix time trend chart.
- One-click RFC 4180 CSV quality metrics export.

### 9. 📜 Immutable Audit Trail
- Filterable, searchable chronological record of all system events: `PROJECT_CREATED`, `MODULE_REOPENED`, `TASK_COMPLETED`, `DEFECT_CLASSIFIED`, `TIME_LOG_APPROVED`, `PAYROLL_FINALIZED`, and `POLICY_UPDATED`.
- Expandable row diff viewer displaying previous state, new state, actor, reason, and structured change payloads.
- Deep inspection modal with RFC 4180 / SOC-2 compliance snapshot.
- RFC 4180 CSV export of filtered audit logs.

### 10. 🔔 In-App Notification Center
- Unread/All filter tabs.
- Categorized status badges: Defect, Reopened, Approved, Attribution, Payroll.
- Direct deep-linking to linked records (`/payroll`, `/bugs`, `/tasks`, `/approvals`) with automatic mark-as-read on click.

---

## 🌟 Priya Sharma E2E Demo Scenario

ReworkGuard comes pre-seeded with the canonical **Priya Sharma** rework-lifecycle scenario:

| Stage | Entity / Ref | Details | Status |
| :--- | :--- | :--- | :--- |
| **1. Original Delivery** | Task `tsk-101`<br>Module `mod-101` | Priya Sharma completes **"Implement payment processing"** in module **"Payment Gateway"** on Sept 25, 2026. Original delivery employee and on-time status are permanently preserved. | Completed (On Time) |
| **2. Post-Delivery Defect** | Bug `bug-101` | Critical bug **"Duplicate payment callback handling"** is filed against `tsk-101` on Oct 4, 2026. | Logged & Linked |
| **3. Automatic Reopen** | Task `tsk-101` | Task `tsk-101` is automatically transitioned from `completed` to `reopened` with full state history record `tsh-102`. | Reopened |
| **4. Manager Attribution** | Bug `bug-101` | Manager Sarah Jenkins classifies `bug-101` as **"Original delivery defect"** (idempotency key flaw in callback handler). | Attributable |
| **5. Corrective Time Log** | Log `log-202` | Priya logs 6.0h corrective maintenance on `bug-101` on Oct 10, 2026. | Approved (6.0h) |
| **6. Exempt Bug (Contrast)**| Bug `bug-102`<br>Log `log-201` | Bug **"Payment Gateway Webhook Timeout"** classified as **"External dependency issue"** (upstream gateway outage). Priya logs 4.0h. | Approved (Exempt) |
| **7. Fix Verification** | Task `tsk-101` | Fix deployed and verified with Redis idempotency locks. Task closed. | Verified & Closed |
| **8. Payroll Calculation** | Record `pay-2026-11-emp3` | November 2026 payroll runs: 6.0h attributable rework @ ₹500/hr = **₹3,000 deduction**. The 4.0h external bug is strictly excluded. | Calculated (Nov 2026) |
| **9. Itemized Breakdown** | Item `pdi-201` | Line-item `pdi-201` records 6.0h @ ₹500/hr = ₹3,000 tied to `log-202` and `bug-101`. Zero double-counting. | Persisted Breakdown |
| **10. Audit Verification** | Logs `aud-003` to `aud-009` | Immutable audit trail records every state change, attribution decision, and payroll calculation. | Verified Immutable |

> **Interactive Demo Walkthrough**: Click the **"Priya E2E Demo"** button with the sparkle icon in the top header at any time to launch the interactive 10-stage inspection walkthrough with live evidence panels, role switching, and record links!

---

## 👥 Role-Based Access Control (RBAC)

Switch roles instantly using the persona selector in the top-right header:

| Role | Demo Persona | Key Permissions |
| :--- | :--- | :--- |
| **Software Engineer** | Priya Sharma (`usr-emp-3`) / Elena Rostova (`usr-emp-1`) | View assigned tasks, log regular/corrective hours, view personal payslip. |
| **Team Lead** | David Chen (`usr-lead-1`) | Create tasks, review and approve team time logs, view module delivery health. |
| **Engineering Manager** | Sarah Jenkins (`usr-mgr-1`) | Classify defect attribution, reopen modules, approve rework, configure policies. |
| **Finance Admin** | Alex Rivera (`usr-fin-1`) | Full administrative access, run/recalculate payroll, finalize disbursals, export CSV reports. |

---

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 + TypeScript + Vite
- **Styling & UI Components**: Tailwind CSS, shadcn/ui patterns, Lucide React
- **Routing**: React Router v6
- **Data Visualizations**: Recharts (Bar, Line, Stacked, and Pie charts)
- **Data Persistence**:
  - LocalStorage / InMemory Context (Zero-config offline mode with pre-seeded data)
  - Supabase PostgreSQL Client (Full production schema in `supabase/schema.sql`)
- **Export Formats**: RFC 4180 Compliant CSV Export (Tasks, Time Logs, Payroll, Quality Metrics, Audit Trail)
- **Validation & Math**: Zod schema validation, KaTeX financial formulas, deterministic currency arithmetic

---

## ⚡ Local Setup & Execution Instructions

### Prerequisites
- Node.js (v18+ or v20+)
- npm or pnpm

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Automated Test Suites
ReworkGuard includes comprehensive automated tests covering the payroll engine, task lifecycle, bug attribution, and acceptance criteria:
```bash
# Run acceptance test suite (48 tests)
npx tsx tests/acceptance.test.ts

# Run payroll calculation engine test suite (37 tests)
npx tsx tests/payroll.test.ts
```
**Total Passing Tests: 85 / 85**

### 4. Build for Production
```bash
npm run build
```

---

## 🗄️ Supabase PostgreSQL Schema & Migrations

ReworkGuard includes a normalized PostgreSQL database schema with Row Level Security (RLS) policies:

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Execute the complete DDL schema located in `supabase/schema.sql`.
3. Create a `.env` file from `.env.example`:
   ```bash
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
4. Restart the Vite development server. ReworkGuard will automatically connect to Supabase.

---

## 📄 License

MIT License. Designed and built for engineering quality and transparent financial governance.
