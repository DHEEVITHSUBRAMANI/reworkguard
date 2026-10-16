import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Overview } from './pages/Overview';
import { Projects } from './pages/Projects';
import { Tasks } from './pages/Tasks';
import { Bugs } from './pages/Bugs';
import { TimeTracking } from './pages/TimeTracking';
import { Approvals } from './pages/Approvals';
import { Payroll } from './pages/Payroll';
import { Reports } from './pages/Reports';
import { AuditTrail } from './pages/AuditTrail';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/bugs" element={<Bugs />} />
        <Route path="/time" element={<TimeTracking />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/audit" element={<AuditTrail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
