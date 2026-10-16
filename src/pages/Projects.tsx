import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  FolderGit2, 
  Plus, 
  RotateCcw, 
  Package, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  Users,
  Wrench,
  Check,
  FileText
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatDate, formatHours, cn } from '../lib/utils';
import { Project, Module, ProjectStatus, ModuleStatus, Task } from '../types';

export const Projects: React.FC = () => {
  const { projects, modules, tasks, addProject, addModule, reopenModule, searchQuery } = useApp();
  const { canCreateProject, isManager, users } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [reopenTarget, setReopenTarget] = useState<Module | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [detailModule, setDetailModule] = useState<Module | null>(null);

  // Form states
  const [newProject, setNewProject] = useState({
    name: '',
    code: '',
    client_name: '',
    description: '',
    budget: 100000,
    status: 'active' as ProjectStatus,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    manager_id: 'usr-mgr-1',
  });

  const [newModule, setNewModule] = useState({
    project_id: projects[0]?.id || '',
    name: '',
    code: '',
    description: '',
    status: 'in_development' as ModuleStatus,
    lead_id: 'usr-lead-1',
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.code) return;
    addProject(newProject);
    setIsProjectModalOpen(false);
    setNewProject({
      name: '',
      code: '',
      client_name: '',
      description: '',
      budget: 100000,
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      manager_id: 'usr-mgr-1',
    });
  };

  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModule.name || !newModule.code || !newModule.project_id) return;
    addModule(newModule);
    setIsModuleModalOpen(false);
    setNewModule({
      project_id: projects[0]?.id || '',
      name: '',
      code: '',
      description: '',
      status: 'in_development',
      lead_id: 'usr-lead-1',
    });
  };

  const handleConfirmReopen = () => {
    if (!reopenTarget) return;
    reopenModule(reopenTarget.id, reopenReason);
    setReopenTarget(null);
    setReopenReason('');
  };

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ProjectStatus | ModuleStatus) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return <Badge variant="success" dot>Delivered</Badge>;
      case 'active':
      case 'in_development':
        return <Badge variant="info" dot>In Progress</Badge>;
      case 'testing':
      case 'in_review':
        return <Badge variant="purple" dot>Testing / Review</Badge>;
      case 'reopened':
        return <Badge variant="danger" dot>Reopened (Rework)</Badge>;
      case 'on_hold':
      case 'closed':
        return <Badge variant="default">Closed / Hold</Badge>;
    }
  };

  // Detailed module helper data
  const moduleTasks = detailModule 
    ? tasks.filter(t => t.module_id === detailModule.id)
    : [];

  const moduleContributors = Array.from(
    new Set(moduleTasks.map(t => t.original_delivery_employee_id || t.assigned_to).filter(Boolean))
  ).map(id => users.find(u => u.id === id)).filter(Boolean);

  const totalModuleRegularHours = moduleTasks.reduce((acc, t) => acc + (t.actual_regular_hours || 0), 0);
  const totalModuleReworkHours = moduleTasks.reduce((acc, t) => acc + (t.corrective_hours || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header Actions & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Project Statuses</option>
            <option value="active">Active Projects</option>
            <option value="in_review">In Review</option>
            <option value="completed">Completed Projects</option>
          </select>

          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {canCreateProject && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsModuleModalOpen(true)}
              >
                Add Module
              </Button>
              <Button
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsProjectModalOpen(true)}
              >
                New Project
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Projects List with Module cards */}
      <div className="space-y-6">
        {filteredProjects
          .filter(p => selectedProjectId === 'all' || p.id === selectedProjectId)
          .map((project) => {
            const projectModules = modules.filter(m => m.project_id === project.id);
            const reopenedCount = projectModules.filter(m => m.status === 'reopened').length;

            return (
              <div key={project.id} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                {/* Project Header Bar */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-slate-900">{project.name}</h3>
                        <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold border border-slate-200">
                          {project.code}
                        </span>
                        {getStatusBadge(project.status)}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-2xl">{project.description}</p>
                    </div>
                  </div>

                  {/* Project metadata */}
                  <div className="flex items-center gap-5 text-xs text-slate-500 shrink-0">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Client</span>
                      <span className="font-semibold text-slate-800">{project.client_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Budget</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(project.budget)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Timeline</span>
                      <span className="font-medium text-slate-700">{formatDate(project.start_date)} - {formatDate(project.end_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Modules under this project */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      Modules & Delivery Milestones ({projectModules.length})
                    </h4>
                    {reopenedCount > 0 && (
                      <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {reopenedCount} module(s) reopened for corrective rework
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {projectModules.map((module) => {
                      const isReopened = module.status === 'reopened';
                      return (
                        <div
                          key={module.id}
                          className={cn(
                            'p-4 rounded-lg border transition-all text-xs cursor-pointer',
                            isReopened 
                              ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300' 
                              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
                          )}
                          onClick={() => setDetailModule(module)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-[10px] font-bold text-slate-400">
                                {module.code}
                              </span>
                              <h5 className="font-bold text-slate-900 text-sm mt-0.5 hover:text-blue-600 flex items-center gap-1.5">
                                <span>{module.name}</span>
                              </h5>
                            </div>
                            {getStatusBadge(module.status)}
                          </div>

                          <p className="text-slate-600 text-xs mt-2 line-clamp-2 leading-relaxed">
                            {module.description}
                          </p>

                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <div>
                              {module.delivered_at ? (
                                <span className="text-emerald-700 font-medium">
                                  Delivered: {new Date(module.delivered_at).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-slate-400">Not delivered yet</span>
                              )}
                            </div>

                            {/* Reopen count or action */}
                            <div className="flex items-center gap-1.5">
                              {module.reopen_count > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                  Reopened x{module.reopen_count}
                                </span>
                              )}
                              {module.status === 'delivered' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReopenTarget(module);
                                  }}
                                  className="text-rose-600 hover:text-rose-800 font-medium inline-flex items-center gap-1 underline text-[11px]"
                                >
                                  <RotateCcw className="w-3 h-3" /> Reopen
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Modal: Create Project */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title="Create New Project"
        description="Establish a new client deliverable scope with milestone deadlines."
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Project Code *</label>
              <input
                type="text"
                required
                value={newProject.code}
                onChange={(e) => setNewProject({ ...newProject, code: e.target.value.toUpperCase() })}
                placeholder="e.g. FINTECH-PROD"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name *</label>
              <input
                type="text"
                required
                value={newProject.client_name}
                onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                placeholder="e.g. Apex Global Bank"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
            <input
              type="text"
              required
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              placeholder="e.g. Enterprise Payment Gateway & Settlement Engine"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={newProject.start_date}
                onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={newProject.end_date}
                onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              placeholder="Scope of work, deliverable milestones, and key technical stack..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsProjectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Create Project
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Module */}
      <Modal
        isOpen={isModuleModalOpen}
        onClose={() => setIsModuleModalOpen(false)}
        title="Add Functional Module"
        description="Deconstruct a project into deliverable modules tracked for defect rates."
      >
        <form onSubmit={handleCreateModule} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Project *</label>
            <select
              value={newModule.project_id}
              onChange={(e) => setNewModule({ ...newModule, project_id: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Module Code *</label>
              <input
                type="text"
                required
                value={newModule.code}
                onChange={(e) => setNewModule({ ...newModule, code: e.target.value.toUpperCase() })}
                placeholder="e.g. MOD-SETTLE"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Module Name *</label>
              <input
                type="text"
                required
                value={newModule.name}
                onChange={(e) => setNewModule({ ...newModule, name: e.target.value })}
                placeholder="e.g. Settlement Clearing Engine"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={newModule.description}
              onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
              placeholder="Module requirements and technical specs..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModuleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add Module
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Reopen Confirmation */}
      <Modal
        isOpen={Boolean(reopenTarget)}
        onClose={() => setReopenTarget(null)}
        title="Reopen Module for Corrective Rework"
        description="Marking this delivered module as reopened tracks defect escalation and flags corrective maintenance hours."
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
            <p className="font-semibold text-rose-900">Warning: Reopen Impact</p>
            <p className="mt-0.5">
              Reopening will increment the reopen counter for &quot;{reopenTarget?.name}&quot; and notify the engineering team. Time logged against this module will be verified for defect attribution.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reopen Reason / Escalation Details *</label>
            <textarea
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Explain the defect discovered after client delivery..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setReopenTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmReopen}>
              Confirm Reopen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Module Detail & Delivery Contributors Drawer */}
      <Modal
        isOpen={Boolean(detailModule)}
        onClose={() => setDetailModule(null)}
        title={detailModule?.name || 'Module Details & Contributors'}
        description={`Code: ${detailModule?.code}`}
      >
        <div className="space-y-4 text-xs">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
              <div className="mt-1">{detailModule && getStatusBadge(detailModule.status)}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Reopen Count</span>
              <span className={cn(
                "font-mono font-bold text-sm block mt-1",
                (detailModule?.reopen_count || 0) > 0 ? "text-rose-600" : "text-slate-800"
              )}>
                {detailModule?.reopen_count || 0} times
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Regular Hours</span>
              <span className="font-mono font-bold text-sm text-slate-800 block mt-1">
                {totalModuleRegularHours} hrs
              </span>
            </div>
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">Rework Hours</span>
              <span className="font-mono font-bold text-sm text-rose-700 block mt-1">
                {totalModuleReworkHours} hrs
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <span className="font-semibold text-slate-700 block mb-1">Module Description:</span>
            <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
              {detailModule?.description || 'No detailed description provided.'}
            </p>
          </div>

          {/* Delivery Contributors */}
          <div>
            <span className="font-semibold text-slate-700 block mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-500" />
              Delivery Contributors ({moduleContributors.length})
            </span>
            {moduleContributors.length === 0 ? (
              <p className="text-slate-400 italic">No assigned delivery contributors recorded.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {moduleContributors.map((c) => (
                  <div key={c?.id} className="p-2.5 border border-slate-200 rounded-lg flex items-center gap-2 bg-white">
                    <img src={c?.avatar_url} alt={c?.full_name} className="w-7 h-7 rounded-full object-cover" />
                    <div>
                      <span className="font-semibold text-slate-800 block">{c?.full_name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{c?.role} • ${c?.hourly_rate}/hr</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks under module */}
          <div>
            <span className="font-semibold text-slate-700 block mb-2 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-slate-500" />
              Tasks under this Module ({moduleTasks.length})
            </span>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {moduleTasks.map((t) => (
                <div key={t.id} className="p-2.5 hover:bg-slate-50 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-800">{t.title}</span>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                      <span className="capitalize">{t.status.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{t.actual_regular_hours}h reg / {t.corrective_hours}h rework</span>
                    </div>
                  </div>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase",
                    t.status === 'completed' || t.status === 'closed' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    t.status === 'reopened' || t.status === 'under_fix' ? "bg-rose-50 text-rose-700 border-rose-200" :
                    "bg-slate-100 text-slate-700 border-slate-200"
                  )}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setDetailModule(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
