-- ============================================================================
-- Migration 003: Realistic Demo Seed Data
-- ============================================================================

-- 1. PROFILES (4 Employees, 1 Team Lead, 1 Manager, 1 Finance Admin)
INSERT INTO public.profiles (id, full_name, email, role, active, avatar_url, department) VALUES
('11111111-1111-4000-a000-000000000001', 'Alex Rivera', 'alex.rivera@reworkguard.io', 'finance_admin', true, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'Finance & Operations'),
('22222222-2222-4000-a000-000000000002', 'Sarah Jenkins', 'sarah.jenkins@reworkguard.io', 'manager', true, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', 'Engineering Management'),
('33333333-3333-4000-a000-000000000003', 'David Chen', 'david.chen@reworkguard.io', 'team_lead', true, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'Core Banking & Fintech'),
('44444444-4444-4000-a000-000000000004', 'Elena Rostova', 'elena.rostova@reworkguard.io', 'employee', true, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', 'Full-Stack Engineering'),
('55555555-5555-4000-a000-000000000005', 'Marcus Vance', 'marcus.vance@reworkguard.io', 'employee', true, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', 'Frontend Experience'),
('66666666-6666-4000-a000-000000000006', 'Priya Patel', 'priya.patel@reworkguard.io', 'employee', true, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', 'Distributed Systems'),
('77777777-7777-4000-a000-000000000007', 'Jordan Lee', 'jordan.lee@reworkguard.io', 'employee', true, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', 'Cloud Infrastructure')
ON CONFLICT (id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- 2. EMPLOYEE RATES
INSERT INTO public.employee_rates (id, employee_id, effective_date, hourly_rate, base_monthly_salary, currency, active_status) VALUES
('r0000001-0000-4000-a000-000000000001', '11111111-1111-4000-a000-000000000001', '2026-01-01', 65.00, 10500.00, 'USD', true),
('r0000002-0000-4000-a000-000000000002', '22222222-2222-4000-a000-000000000002', '2026-01-01', 60.00, 9500.00, 'USD', true),
('r0000003-0000-4000-a000-000000000003', '33333333-3333-4000-a000-000000000003', '2026-01-01', 52.00, 8200.00, 'USD', true),
('r0000004-0000-4000-a000-000000000004', '44444444-4444-4000-a000-000000000004', '2026-01-01', 45.00, 7200.00, 'USD', true),
('r0000005-0000-4000-a000-000000000005', '55555555-5555-4000-a000-000000000005', '2026-01-01', 40.00, 6400.00, 'USD', true),
('r0000006-0000-4000-a000-000000000006', '66666666-6666-4000-a000-000000000006', '2026-01-01', 48.00, 7600.00, 'USD', true),
('r0000007-0000-4000-a000-000000000007', '77777777-7777-4000-a000-000000000007', '2026-01-01', 46.00, 7300.00, 'USD', true)
ON CONFLICT (id) DO NOTHING;

-- 3. PAYROLL POLICIES
INSERT INTO public.payroll_policies (id, name, deduction_rate_percentage, max_deduction_cap_percentage, monthly_grace_hours, defect_attribution_window_days, require_manager_approval, is_active) VALUES
('p0000001-0000-4000-a000-000000000001', 'Standard Engineering Rework & Quality Policy (2026)', 100.00, 15.00, 2.00, 30, true, true)
ON CONFLICT (id) DO NOTHING;

-- 4. PROJECTS (3 Projects)
INSERT INTO public.projects (id, name, code, client_name, description, status, manager_id, budget, start_date, end_date) VALUES
('a0000001-0000-4000-b000-000000000001', 'FinPay Enterprise Settlement', 'PRJ-FINPAY', 'Apex Global Banking', 'High-throughput payment gateway settlement pipeline with escrow reconciliation.', 'active', '22222222-2222-4000-a000-000000000002', 185000.00, '2026-06-01', '2026-12-15'),
('a0000002-0000-4000-b000-000000000002', 'HealthPulse EHR & Telehealth', 'PRJ-HEALTH', 'MedCare Health Network', 'HIPAA-compliant EHR consent vault and WebRTC physician consultation suite.', 'active', '22222222-2222-4000-a000-000000000002', 140000.00, '2026-07-15', '2026-11-30'),
('a0000003-0000-4000-b000-000000000003', 'LogiTrack Real-Time Fleet', 'PRJ-LOGITRACK', 'TransContinental Freight', 'IoT telemetry ingestion, geofencing perimeter engine, and driver routing.', 'active', '22222222-2222-4000-a000-000000000002', 115000.00, '2026-05-10', '2026-10-31')
ON CONFLICT (id) DO NOTHING;

-- 5. MODULES (8 Modules)
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

-- 6. TASKS (12 Tasks across diverse lifecycle states)
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

-- 7. TASK DELIVERY CONTRIBUTORS (Multi-employee deliveries)
INSERT INTO public.task_delivery_contributors (id, task_id, employee_id, contribution_details, percentage_share) VALUES
('t0000001-0000-4000-c000-000000000001', 'c0000001-0000-4000-c000-000000000001', '44444444-4444-4000-a000-000000000004', 'Lead architect on dual-entry ledger transaction locks', 80.00),
('t0000002-0000-4000-c000-000000000002', 'c0000001-0000-4000-c000-000000000001', '66666666-6666-4000-a000-000000000006', 'Database index optimization and transaction tests', 20.00)
ON CONFLICT (task_id, employee_id) DO NOTHING;

-- 8. BUGS (5 Bug reports across classifications)
INSERT INTO public.bugs (id, original_task_id, module_id, project_id, reporter_id, assigned_to, original_developer_id, title, description, steps_to_reproduce, severity, date_found, attribution_classification, investigation_notes, classified_by, classified_at, status) VALUES
('d0000001-0000-4000-d000-000000000001', 'c0000001-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', '22222222-2222-4000-a000-000000000002', '44444444-4444-4000-a000-000000000004', '44444444-4444-4000-a000-000000000004', 'Ledger discrepancy in batch settlements exceeding 500 records', 'Concurrent write locks cause dirty reads in settlement escrow.', '1. Ingest batch of 750 mock payments.\n2. Trigger settlement.\n3. Discrepancy detected.', 'critical', '2026-10-04', 'caused_by_original_delivery', 'Confirmed code defect in transaction isolation level. Cursor lacked serializable lock.', '22222222-2222-4000-a000-000000000002', '2026-10-04T14:20:00Z', 'in_fix'),
('d0000002-0000-4000-d000-000000000002', 'c0000003-0000-4000-c000-000000000003', 'b0000002-0000-4000-b000-000000000002', 'a0000001-0000-4000-b000-000000000001', '33333333-3333-4000-a000-000000000003', '66666666-6666-4000-a000-000000000006', '66666666-6666-4000-a000-000000000006', 'Webhook signature validation fails on rotated keys', 'Client third-party webhook receivers reject HMAC signatures after rotating API credentials on the client admin panel.', '1. Rotate secret key on client admin.\n2. Send ping.\n3. 401 signature mismatch.', 'high', '2026-10-05', 'not_caused_by_original_delivery', 'External client spec change. Client rotated format without notifying engineering.', '22222222-2222-4000-a000-000000000002', '2026-10-06T11:00:00Z', 'verified_resolved'),
('d0000003-0000-4000-d000-000000000003', 'c0000009-0000-4000-c000-000000000003', 'b0000007-0000-4000-b000-000000000003', 'a0000003-0000-4000-b000-000000000003', '22222222-2222-4000-a000-000000000002', '66666666-6666-4000-a000-000000000006', '66666666-6666-4000-a000-000000000006', 'Geofence breach alerts delayed by up to 14 minutes in heavy traffic', 'Telemetry queue consumer stalls when spatial polygon points exceed 12 vertices.', '1. Define 16-point polygon.\n2. Simulate 50 trucks crossing border.\n3. Push delayed by 14m.', 'critical', '2026-10-08', 'caused_by_original_delivery', 'Inefficient O(N^2) in-memory point evaluation instead of PostGIS spatial index.', '22222222-2222-4000-a000-000000000002', '2026-10-08T15:30:00Z', 'in_fix'),
('d0000004-0000-4000-d000-000000000004', 'c0000006-0000-4000-c000-000000000002', 'b0000004-0000-4000-b000-000000000002', 'a0000002-0000-4000-b000-000000000002', '33333333-3333-4000-a000-000000000003', '55555555-5555-4000-a000-000000000005', '55555555-5555-4000-a000-000000000005', 'Patient consent timestamp rendered in UTC instead of hospital local timezone', 'Doctors report PDF certificates reflect GMT timestamp without hospital timezone offset.', '1. Sign on EST device.\n2. Open PDF.\n3. Shows GMT.', 'medium', '2026-10-12', 'pending_investigation', 'Investigating whether original SOW mandated UTC or hospital facility timezone.', NULL, NULL, 'investigating'),
('d0000005-0000-4000-d000-000000000005', 'c0000008-0000-4000-c000-000000000002', 'b0000006-0000-4000-b000-000000000002', 'a0000002-0000-4000-b000-000000000002', '33333333-3333-4000-a000-000000000003', '77777777-7777-4000-a000-000000000007', '77777777-7777-4000-a000-000000000007', 'Intake questionnaire dropdown values reset on Safari browser refresh', 'Hospital staff reported form state was lost on page refresh in iOS Safari.', '1. Open intake on iPad Safari.\n2. Fill questions.\n3. Refresh.', 'low', '2026-10-14', 'not_caused_by_original_delivery', 'Safari iOS 18 indexedDB bug documented by Apple. Workaround applied.', '22222222-2222-4000-a000-000000000002', '2026-10-15T09:00:00Z', 'verified_resolved')
ON CONFLICT (id) DO NOTHING;

-- 9. TIME LOGS (10 Corrective maintenance logs + Regular logs)
INSERT INTO public.time_logs (id, task_id, module_id, project_id, bug_id, employee_id, work_date, hours, work_type, description, approval_status, reviewer_id, review_timestamp, attribution_status, exempt_reason, is_payroll_processed) VALUES
-- Elena Rostova: Attributable rework (Bug 1: Ledger discrepancy)
('e0000001-0000-4000-e000-000000000001', 'c0000001-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', 'd0000001-0000-4000-d000-000000000001', '44444444-4444-4000-a000-000000000004', '2026-10-05', 4.50, 'corrective_maintenance', 'Debugging concurrent write lock contention and row-level locks on escrow.', 'approved', '22222222-2222-4000-a000-000000000002', '2026-10-06T10:00:00Z', 'attributable', NULL, true),
('e0000002-0000-4000-e000-000000000002', 'c0000001-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', 'd0000001-0000-4000-d000-000000000001', '44444444-4444-4000-a000-000000000004', '2026-10-06', 4.00, 'corrective_maintenance', 'Refactoring settlement queries to advisory locks and adding idempotency suite.', 'approved', '22222222-2222-4000-a000-000000000002', '2026-10-07T11:00:00Z', 'attributable', NULL, true),

-- Priya Patel: Exempt rework (Bug 2: Webhook secret rotation)
('e0000003-0000-4000-e000-000000000003', 'c0000003-0000-4000-c000-000000000003', 'b0000002-0000-4000-b000-000000000002', 'a0000001-0000-4000-b000-000000000001', 'd0000002-0000-4000-d000-000000000002', '66666666-6666-4000-a000-000000000006', '2026-10-06', 3.50, 'corrective_maintenance', 'Updated webhook verification endpoint to support custom client header spec.', 'approved', '22222222-2222-4000-a000-000000000002', '2026-10-07T09:30:00Z', 'exempt', 'External specification change outside delivered SOW scope.', false),

-- Priya Patel: Attributable rework (Bug 3: Geofence polygon math)
('e0000004-0000-4000-e000-000000000004', 'c0000009-0000-4000-c000-000000000003', 'b0000007-0000-4000-b000-000000000003', 'a0000003-0000-4000-b000-000000000003', 'd0000003-0000-4000-d000-000000000003', '66666666-6666-4000-a000-000000000006', '2026-10-09', 3.00, 'corrective_maintenance', 'PostGIS spatial index query migration for high frequency GPS pings.', 'approved', '22222222-2222-4000-a000-000000000002', '2026-10-10T14:00:00Z', 'attributable', NULL, true),
('e0000005-0000-4000-e000-000000000005', 'c0000009-0000-4000-c000-000000000003', 'b0000007-0000-4000-b000-000000000003', 'a0000003-0000-4000-b000-000000000003', 'd0000003-0000-4000-d000-000000000003', '66666666-6666-4000-a000-000000000006', '2026-10-10', 3.00, 'corrective_maintenance', 'Benchmarking PostGIS ST_Contains vs ray casting.', 'approved', '22222222-2222-4000-a000-000000000002', '2026-10-11T12:00:00Z', 'attributable', NULL, true),

-- Marcus Vance: Pending investigation rework (Bug 4: Timestamp issue)
('e0000006-0000-4000-e000-000000000006', 'c0000006-0000-4000-c000-000000000002', 'b0000004-0000-4000-b000-000000000002', 'a0000002-0000-4000-b000-000000000002', 'd0000004-0000-4000-d000-000000000004', '55555555-5555-4000-a000-000000000005', '2026-10-13', 2.00, 'corrective_maintenance', 'Diagnosing hospital timezone offset in canvas PDF rendering.', 'pending', NULL, NULL, 'pending', NULL, false),

-- Jordan Lee: Exempt rework (Bug 5: Safari indexedDB)
('e0000007-0000-4000-e000-000000000007', 'c0000008-0000-4000-c000-000000000002', 'b0000006-0000-4000-b000-000000000002', 'a0000002-0000-4000-b000-000000000002', 'd0000005-0000-4000-d000-000000000005', '77777777-7777-4000-a000-000000000007', '2026-10-15', 2.50, 'corrective_maintenance', 'Implemented localStorage polyfill fallback for Safari IndexedDB.', 'approved', '22222222-2222-4000-a000-000000000002', '2026-10-15T15:00:00Z', 'exempt', 'Browser vendor runtime bug.', false),

-- Additional Corrective logs in pending/rejected states
('e0000008-0000-4000-e000-000000000008', 'c0000001-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', 'd0000001-0000-4000-d000-000000000001', '44444444-4444-4000-a000-000000000004', '2026-10-14', 1.50, 'corrective_maintenance', 'Double checked transaction rollback log.', 'rejected', '22222222-2222-4000-a000-000000000002', '2026-10-15T10:00:00Z', 'attributable', 'Duplicate entry already covered under log e0000002.', false),
('e0000009-0000-4000-e000-000000000009', 'c0000007-0000-4000-c000-000000000002', 'b0000005-0000-4000-b000-000000000002', 'a0000002-0000-4000-b000-000000000002', NULL, '66666666-6666-4000-a000-000000000006', '2026-10-14', 2.00, 'corrective_maintenance', 'Investigating audio sync jitter on reconnect.', 'pending', NULL, NULL, 'pending', NULL, false),
('e0000010-0000-4000-e000-000000000010', 'c0000010-0000-4000-c000-000000000003', 'b0000007-0000-4000-b000-000000000003', 'a0000003-0000-4000-b000-000000000003', NULL, '55555555-5555-4000-a000-000000000005', '2026-10-15', 3.00, 'corrective_maintenance', 'Tuning push notification retry interval.', 'pending', NULL, NULL, 'pending', NULL, false),

-- Regular Development logs (ordinary billable work)
('e0000011-0000-4000-e000-000000000011', 'c0000004-0000-4000-c000-000000000001', 'b0000003-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', NULL, '44444444-4444-4000-a000-000000000004', '2026-10-03', 7.50, 'regular', 'Plaid OAuth token exchange and webhook verification endpoint.', 'approved', '33333333-3333-4000-a000-000000000003', '2026-10-04T09:00:00Z', 'exempt', NULL, false),
('e0000012-0000-4000-e000-000000000012', 'c0000002-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'a0000001-0000-4000-b000-000000000001', NULL, '55555555-5555-4000-a000-000000000005', '2026-10-14', 8.00, 'regular', 'Export format styling updates and CSV header compliance.', 'approved', '33333333-3333-4000-a000-000000000003', '2026-10-15T09:00:00Z', 'exempt', NULL, false)
ON CONFLICT (id) DO NOTHING;

-- 10. PAYROLL RECORDS (Sample periods)
INSERT INTO public.payroll_records (id, employee_id, payroll_month, source_month, gross_salary, approved_rework_deduction, other_authorized_adjustments, net_salary, processing_status, total_corrective_hours, attributable_corrective_hours, billable_deduction_hours, deduction_cap_applied, notes) VALUES
-- Elena Rostova: November 2026 (calculating October 2026 rework: 8.5h attr - 2.0h grace = 6.5h * $45 = $292.50)
('pay00001-0000-4000-e000-000000000001', '44444444-4444-4000-a000-000000000004', '2026-11', '2026-10', 7200.00, 292.50, 0.00, 6907.50, 'reviewed', 8.50, 8.50, 6.50, false, '8.5 approved corrective hours on Payment Reconciliation ledger (Bug d0000001). 2.0 hours grace applied. 6.5 hours billed at $45/hr.'),
-- Priya Patel: November 2026 (6.0h attr - 2.0h grace = 4.0h * $48 = $192.00)
('pay00002-0000-4000-e000-000000000002', '66666666-6666-4000-a000-000000000006', '2026-11', '2026-10', 7600.00, 192.00, 0.00, 7408.00, 'draft', 9.50, 6.00, 4.00, false, '3.5 corrective hours on Webhook marked exempt. 6.0 attributable hours on Geofencing engine minus 2.0 grace = 4.0 hours billed at $48/hr.'),
-- Marcus Vance: November 2026 (0.0h attributable, 2.0h pending investigation)
('pay00003-0000-4000-e000-000000000003', '55555555-5555-4000-a000-000000000005', '2026-11', '2026-10', 6400.00, 0.00, 0.00, 6400.00, 'draft', 2.00, 0.00, 0.00, false, '2.0 corrective hours pending manager investigation of Bug d0000004. Zero deduction applied.'),
-- Elena Rostova: October 2026 finalized payroll (September rework: 3.0h - 2.0h grace = 1.0h * $45 = $45.00)
('pay00004-0000-4000-e000-000000000004', '44444444-4444-4000-a000-000000000004', '2026-10', '2026-09', 7200.00, 45.00, 0.00, 7155.00, 'finalized', 3.00, 3.00, 1.00, false, 'September corrective maintenance deduction finalized. 1.0 billable hour deduction.')
ON CONFLICT (employee_id, payroll_month) DO NOTHING;

-- 11. PAYROLL DEDUCTION ITEMS
INSERT INTO public.payroll_deduction_items (id, payroll_record_id, source_time_log_id, task_id, module_id, bug_id, hours, hourly_rate, amount, attribution_reason, approval_reference) VALUES
('di000001-0000-4000-e000-000000000001', 'pay00001-0000-4000-e000-000000000001', 'e0000001-0000-4000-e000-000000000001', 'c0000001-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'd0000001-0000-4000-d000-000000000001', 4.50, 45.00, 202.50, 'Escrow row lock contention defect fix', 'Approved by Sarah Jenkins (2026-10-06)'),
('di000002-0000-4000-e000-000000000002', 'pay00001-0000-4000-e000-000000000001', 'e0000002-0000-4000-e000-000000000002', 'c0000001-0000-4000-c000-000000000001', 'b0000001-0000-4000-b000-000000000001', 'd0000001-0000-4000-d000-000000000001', 4.00, 45.00, 180.00, 'Advisory lock refactoring and idempotency tests', 'Approved by Sarah Jenkins (2026-10-07)'),
('di000003-0000-4000-e000-000000000003', 'pay00002-0000-4000-e000-000000000002', 'e0000004-0000-4000-e000-000000000004', 'c0000009-0000-4000-c000-000000000003', 'b0000007-0000-4000-b000-000000000003', 'd0000003-0000-4000-d000-000000000003', 3.00, 48.00, 144.00, 'PostGIS spatial query migration', 'Approved by Sarah Jenkins (2026-10-10)'),
('di000004-0000-4000-e000-000000000004', 'pay00002-0000-4000-e000-000000000002', 'e0000005-0000-4000-e000-000000000005', 'c0000009-0000-4000-c000-000000000003', 'b0000007-0000-4000-b000-000000000003', 'd0000003-0000-4000-d000-000000000003', 3.00, 48.00, 144.00, 'PostGIS spatial query benchmarking', 'Approved by Sarah Jenkins (2026-10-11)')
ON CONFLICT (payroll_record_id, source_time_log_id) DO NOTHING;

-- 12. TASK STATE HISTORY
INSERT INTO public.task_state_history (id, task_id, previous_status, new_status, actor_id, actor_name, reason, timestamp) VALUES
('h0000001-0000-4000-e000-000000000001', 'c0000001-0000-4000-c000-000000000001', 'in_progress', 'completed', '44444444-4444-4000-a000-000000000004', 'Elena Rostova', 'Completed initial sprint delivery', '2026-09-25T16:00:00Z'),
('h0000002-0000-4000-e000-000000000002', 'c0000001-0000-4000-c000-000000000001', 'completed', 'reopened', '22222222-2222-4000-a000-000000000002', 'Sarah Jenkins', 'Reopened for corrective maintenance following Bug d0000001', '2026-10-04T10:15:00Z'),
('h0000003-0000-4000-e000-000000000003', 'c0000009-0000-4000-c000-000000000003', 'in_progress', 'completed', '66666666-6666-4000-a000-000000000006', 'Priya Patel', 'Delivered polygon boundary ingestion', '2026-09-30T17:00:00Z'),
('h0000004-0000-4000-e000-000000000004', 'c0000009-0000-4000-c000-000000000003', 'completed', 'reopened', '22222222-2222-4000-a000-000000000002', 'Sarah Jenkins', 'Reopened due to geofence latency bug d0000003', '2026-10-08T11:45:00Z')
ON CONFLICT (id) DO NOTHING;

-- 13. AUDIT LOGS
INSERT INTO public.audit_logs (id, actor_id, actor_name, action, entity_type, entity_id, structured_change_details, details, timestamp) VALUES
('au000001-0000-4000-e000-000000000001', '22222222-2222-4000-a000-000000000002', 'Sarah Jenkins', 'POLICY_UPDATED', 'policy', 'p0000001-0000-4000-a000-000000000001', '{"rate": 100, "cap": 15, "grace": 2.0}', 'Configured standard rework policy: 100% rate, 15% salary cap, 2.0 hrs monthly grace.', '2026-10-01T08:30:00Z'),
('au000002-0000-4000-e000-000000000002', '11111111-1111-4000-a000-000000000001', 'Alex Rivera', 'PAYROLL_FINALIZED', 'payroll', 'pay00004-0000-4000-e000-000000000004', '{"period": "2026-10", "deduction": 45.00}', 'Finalized October 2026 payroll for Elena Rostova with $45.00 rework deduction.', '2026-10-01T15:00:00Z'),
('au000003-0000-4000-e000-000000000003', '22222222-2222-4000-a000-000000000002', 'Sarah Jenkins', 'MODULE_REOPENED', 'module', 'b0000001-0000-4000-b000-000000000001', '{"reopen_count": 2}', 'Module Payment Reconciliation Ledger status changed to REOPENED following critical defect discovery.', '2026-10-04T10:15:00Z'),
('au000004-0000-4000-e000-000000000004', '22222222-2222-4000-a000-000000000002', 'Sarah Jenkins', 'DEFECT_CLASSIFIED', 'bug', 'd0000001-0000-4000-d000-000000000001', '{"classification": "caused_by_original_delivery"}', 'Classified defect d0000001 as Caused by original delivery (Assigned: Elena Rostova).', '2026-10-04T14:20:00Z'),
('au000005-0000-4000-e000-000000000005', '22222222-2222-4000-a000-000000000002', 'Sarah Jenkins', 'DEFECT_CLASSIFIED', 'bug', 'd0000002-0000-4000-d000-000000000002', '{"classification": "not_caused_by_original_delivery"}', 'Classified defect d0000002 as Not caused by original delivery (Exempt from payroll deduction).', '2026-10-06T11:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 14. NOTIFICATIONS
INSERT INTO public.notifications (id, recipient_id, title, message, notification_type, read_status, link, timestamp) VALUES
('n0000001-0000-4000-e000-000000000001', 'all', 'Defect d0000001 Classified', 'Sarah Jenkins classified Bug d0000001 as caused by original delivery. Corrective logs flagged for payroll review.', 'warning', false, '/bugs', '2026-10-04T14:21:00Z'),
('n0000002-0000-4000-e000-000000000002', '44444444-4444-4000-a000-000000000004', 'Corrective Hours Approved', 'Your 8.5 corrective hours for Bug d0000001 have been approved. 2.0 hrs monthly grace applies on November payroll.', 'info', false, '/payroll', '2026-10-07T11:05:00Z'),
('n0000003-0000-4000-e000-000000000003', 'all', 'November Payroll Preview Ready', 'Preliminary payroll preview for November 2026 is available for finance and employee review.', 'info', true, '/payroll', '2026-10-16T08:05:00Z')
ON CONFLICT (id) DO NOTHING;
