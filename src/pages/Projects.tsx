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
  AlertCircle 
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Project, Module, ProjectStatus, ModuleStatus } from '../types';

export const Projects: React.FC = () => {
  const { projects, modules, addProject, addModule, reopenModule, searchQuery } = useApp();
  const { canCreateProject, isManager } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [reopenTarget, setReopenTarget] = useState<Module | null>(null);
  const [reopenReason, setReopenReason] = useState('');

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
                            'p-4 rounded-lg border transition-all text-xs',
                            isReopened 
                              ? 'bg-rose-50/40 border-rose-200' 
                              : 'bg-white border-slate-200/80 hover:border-slate-300'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-[10px] font-bold text-slate-400">
                                {module.code}
                              </span>
                              <h5 className="font-bold text-slate-900 text-sm mt-0.5">{module.name}</h5>
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
                                  onClick={() => setReopenTarget(module)}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
              <input
                type="text"
                required
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="e.g. Apex Settlement Engine"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Project Code *</label>
              <input
                type="text"
                required
                value={newProject.code}
                onChange={(e) => setNewProject({ ...newProject, code: e.target.value.toUpperCase() })}
                placeholder="e.g. PRJ-APEX"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name</label>
              <input
                type="text"
                value={newProject.client_name}
                onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                placeholder="e.g. Apex Global Banking"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Budget ($)</label>
              <input
                type="number"
                value={newProject.budget}
                onChange={(e) => setNewProject({ ...newProject, budget: Number(e.target.value) })}
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
              placeholder="High-level engineering scope and deliverables..."
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target End Date</label>
              <input
                type="date"
                value={newProject.end_date}
                onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
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

      {/* Modal: Create Module */}
      <Modal
        isOpen={isModuleModalOpen}
        onClose={() => setIsModuleModalOpen(false)}
        title="Add Project Module"
        description="Define a feature module or milestone component under a project."
      >
        <form onSubmit={handleCreateModule} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assign to Project *</label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Module Name *</label>
              <input
                type="text"
                required
                value={newModule.name}
                onChange={(e) => setNewModule({ ...newModule, name: e.target.value })}
                placeholder="e.g. Settlement Clearing Pipeline"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Module Code *</label>
              <input
                type="text"
                required
                value={newModule.code}
                onChange={(e) => setNewModule({ ...newModule, code: e.target.value.toUpperCase() })}
                placeholder="e.g. MOD-CLEARING"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
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
    </div>
  );
};
