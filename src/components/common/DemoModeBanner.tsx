import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Database, RotateCcw, CheckCircle, Info, ExternalLink, X } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export const DemoModeBanner: React.FC = () => {
  const { isDemoMode, resetAllData } = useApp();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isDemoMode || isDismissed) return null;

  const handleReset = () => {
    resetAllData();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2500);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-200/60 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between transition-all">
        <div className="flex items-center gap-2 font-medium">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] tracking-wide uppercase border border-amber-300">
            Demo Mode Active
          </span>
          <span className="hidden md:inline text-amber-800">
            Running on local persistent browser storage with realistic company seed data.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="text-amber-800 hover:text-amber-950 font-medium underline flex items-center gap-1 text-[11px]"
          >
            <Database className="w-3 h-3" />
            Connect Supabase
          </button>
          <span className="text-amber-300">|</span>
          <button
            onClick={handleReset}
            className="text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1 text-[11px]"
            title="Reset data back to original seed state"
          >
            <RotateCcw className="w-3 h-3" />
            {resetSuccess ? 'Reset!' : 'Reset Demo Data'}
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-amber-600 hover:text-amber-900 ml-2"
            title="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Supabase Database Configuration"
        description="Switch between offline persistent Demo Mode and your live Supabase PostgreSQL backend."
      >
        <div className="space-y-4 text-xs text-slate-600">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Zero-Config Demo Mode is Currently Active</p>
              <p className="mt-0.5 text-blue-700 leading-relaxed">
                All changes (tasks, logs, bug classifications, payroll calculations) are persisted in browser LocalStorage. You can test every feature without any external setup.
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 mb-1 text-sm">To Connect a Live Supabase Database:</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-600 leading-relaxed">
              <li>
                Create a project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium">supabase.com</a>.
              </li>
              <li>
                Execute the SQL schema in <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-800">supabase/schema.sql</code> in the Supabase SQL editor.
              </li>
              <li>
                Add your Supabase credentials to <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-800">.env</code>:
                <pre className="mt-1.5 p-2 bg-slate-900 text-slate-200 rounded font-mono text-[11px] overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key`}
                </pre>
              </li>
              <li>
                Restart the Vite dev server. The app will detect the configuration automatically and switch to Supabase.
              </li>
            </ol>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfigModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
