# 🛡️ ReworkGuard — Rework-Aware Task Tracking and Payroll Management System

> **Enterprise Quality & Financial Accountability Platform for Software Engineering Teams**  
> Tracks delivered modules, post-delivery defects, reopened tasks, corrective maintenance hours, managerial approvals, and transparent next-month payroll deductions.

---

## 📌 Executive Summary & Objective

In software companies, defects discovered post-delivery often cause expensive corrective maintenance cycles. Standard project management tools either conflate rework with regular billable hours or fail to tie engineering quality metrics back to financial accountability and company payroll policies.

**ReworkGuard** solves this by establishing:
1. **Strict Separation of Hours**: Regular development hours and corrective maintenance hours are tracked separately and never commingled.
2. **Defect Attribution Governance**: Post-delivery bugs are investigated and classified by managers (*Caused by original delivery*, *Not caused by original delivery*, or *Pending investigation*).
3. **Next-Month Transparent Payroll Deductions**: Attributable corrective hours from the current month are queued for policy-authorized deductions in the following month's payroll cycle.
4. **Employee Protection & Fairness**: Statutory salary deduction caps (e.g., maximum 15% of monthly salary) and monthly grace allowances (e.g., 2.0 free rework hours/month) protect engineers while encouraging high code quality.
5. **Immutable Audit Trail & Payslips**: Every approval, classification override, and deduction breakdown is logged with full transparency.

---

## 🚀 Key Features & Functional Modules

### 1. 📊 Executive Overview Dashboard
- **Active Projects & Delivered Modules**: Real-time project pacing and milestone deliverables.
- **Reopen Rate Metric**: Percentage of delivered modules reopened due to defects.
- **Approved Corrective Hours**: Aggregated rework hours currently approved and queued.
- **Next-Month Deductions (Projected vs Finalized)**: Real-time calculation of upcoming payroll deductions.
- **Interactive Recharts**:
  - Monthly corrective rework vs exempt hours trend
  - Rework distribution by client project
  - Top reopened modules and employee quality scores
- **Live Activity Feed**: Audit stream of task completions, defect filings, approvals, and payroll events.

### 2. 📁 Projects & Modules
- Hierarchical project and deliverable tracking.
- Client metadata, contract budgets, and milestone target dates.
- Statuses: `In Development`, `Testing`, `Delivered`, `Reopened (Rework)`, and `Closed`.
- Formal module reopen workflow with reason logging and team notification.

### 3. ✅ Tasks Management
- Granular task assignment across engineers.
- Real-time hour counters displaying **Regular Hours** alongside **Corrective Rework Hours**.
- One-click deliverable handoff (`Deliver & Complete`) with timestamping.
- Reopen workflow with reason tracking.

### 4. 🐛 Defect Tracking & Managerial Classification
- Bug reporting linked directly to delivered tasks and modules.
- Severity levels (`Critical`, `High`, `Medium`, `Low`).
- **3-Tier Managerial Classification**:
  - **Caused by original delivery**: Attributable to code defects or missed requirements. Subject to payroll deduction review.
  - **Not caused by original delivery**: Exempt (client scope change, third-party API deprecation, or environment outage). Zero deduction.
  - **Pending investigation**: Investigation underway; hours held in escrow.
- Automatic synchronization with linked corrective time logs and affected engineer notifications.

### 5. ⏱️ Time Tracking
- Mandatory classification between **Regular Development** and **Corrective Maintenance**.
- Corrective maintenance logs strictly require linking to an identified bug and description of fix.
- Live attribution indicator displaying whether logged hours are deductible or exempt under company policy.

### 6. ✍️ Approvals Workflow
- Multi-tier review queue for Team Leads, Managers, and Finance Admins.
- Authorize standard logs or override attribution status (e.g., grant policy exemption).
- Rejection reason prompts and batch authorization.

### 7. 💵 Payroll & Rework Deductions
- **Next-Month Deduction Calculation Engine**:
  $$\text{Billable Rework Hours} = \max(0, \text{Attributable Hours} - \text{Monthly Grace Hours})$$
  $$\text{Gross Deduction} = \text{Billable Hours} \times \text{Hourly Rate} \times \left(\frac{\text{Deduction Rate \%}}{100}\right)$$
  $$\text{Max Salary Cap} = \text{Base Monthly Salary} \times \left(\frac{\text{Max Cap \%}}{100}\right)$$
  $$\text{Net Payout} = \text{Base Salary} - \min(\text{Gross Deduction}, \text{Max Salary Cap})$$
- Selected month preview (e.g., November payroll applies October rework hours).
- Detailed printable payslip modal with complete audit calculations and line-item disclosures.
- Finalization by Finance Admin.

### 8. 📈 Reports & Quality Analytics
- Attributable vs Exempt rework ratios over time.
- Engineer quality scorecard with reopen frequencies and quality ratings.
- One-click CSV quality report export.

### 9. 📜 Immutable Audit Trail
- Filterable chronological record of all system events: `PROJECT_CREATED`, `MODULE_REOPENED`, `TASK_COMPLETED`, `DEFECT_CLASSIFIED`, `TIME_LOG_APPROVED`, `PAYROLL_FINALIZED`, and `POLICY_UPDATED`.
- Search by initiator, entity ID, or keyword.

### 10. ⚙️ Settings & Policy Governance
- Configurable deduction rate percentage (default: 100%).
- Maximum salary deduction cap percentage (default: 15%).
- Monthly grace rework hours (default: 2.0 hrs).
- Defect attribution grace period window (default: 30 days).
- Offline Demo data reset controls.

---

## 👥 Role-Based Access Control (RBAC)

Use the profile dropdown in the top-right header to switch personas instantly:

| Role | Person Example | Permissions |
| :--- | :--- | :--- |
| **Software Engineer** | Elena Rostova | View own assigned tasks, log regular/corrective time, view personal payslip. |
| **Team Lead** | David Chen | Create tasks, review and approve team time logs, view module health. |
| **Engineering Manager** | Sarah Jenkins | Classify defect attribution, create projects/modules, approve rework, configure policies. |
| **Finance Admin** | Alex Rivera | Full access, calculate/recalculate payroll, finalize disbursals, update financial policies. |

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React icons
- **State & Persistence**: React Context, LocalStorage (Zero-config Demo Mode), Supabase Client
- **Charts**: Recharts (Bar, Line, and Pie charts)
- **Database / Backend**: PostgreSQL / Supabase with Row Level Security (RLS)
- **Validation**: Zod & TypeScript strict type safety

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

### 3. Build for Production
```bash
npm run build
```

---

## 🗄️ Supabase PostgreSQL Configuration (Optional)

By default, ReworkGuard operates in **Demo Mode** using persistent browser storage pre-seeded with realistic company data. To connect your live Supabase database:

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the SQL schema found in `supabase/schema.sql` inside the Supabase SQL Editor.
3. Create a `.env` file from `.env.example`:
   ```bash
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
4. Restart the Vite development server. The application will automatically detect credentials and connect.
