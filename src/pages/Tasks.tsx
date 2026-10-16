import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Filter, 
  Bug, 
  User, 
  Calendar,
  ExternalLink
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatHours, formatDate, cn } from '../lib/utils';
import { Task, TaskPriority, TaskStatus } from '../types';
import { Link } from 'react-router-dom';

export const Tasks: React.FC = () => {
  const { 
    tasks, 
    modules, 
    projects, 
    addTask, 
    updateTask, 
    completeTask, 
    reopenTask, 
    searchQuery 
  } = useApp();
  const { currentUser, users, canCreateTask } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [reopenTarget, setReopenTarget] = useState<Task | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  // Form State
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    project_id: projects[0]?.id || '',
    module_id: modules[0]?.id || '',
    assigned_to: users.find(u => u.role === 'employee')?.id || users[0].id,
    created_by: currentUser.id,
    priority: 'medium' as TaskPriority,
    status: 'in_progress' as TaskStatus,
    estimated_hours: 16,
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.module_id) return;
    addTask(newTask);
    setIsTaskModalOpen(false);
    setNewTask({
      title: '',
      description: '',
      project_id: projects[0]?.id || '',
      module_id: modules[0]?.id || '',
      assigned_to: users.find(u => u.role === 'employee')?.id || users[0].id,
      created_by: currentUser.id,
      priority: 'medium',
      status: 'in_progress',
      estimated_hours: 16,
    });
  };

  const handleConfirmReopen = () => {
    if (!reopenTarget) return;
    reopenTask(reopenTarget.id, reopenReason);
    setReopenTarget(null);
    setReopenReason('');
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchesProject = projectFilter === 'all' || t.project_id === projectFilter;
    const matchesAssigned = assignedFilter === 'all' || t.assigned_to === assignedFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesAssigned;
  });

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="danger" dot>Critical</Badge>;
      case 'high':
        return <Badge variant="warning" dot>High</Badge>;
      case 'medium':
        return <Badge variant="info">Medium</Badge>;
      case 'low':
        return <Badge variant="default">Low</Badge>;
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" dot>Delivered & Completed</Badge>;
      case 'reopened':
        return <Badge variant="danger" dot>Reopened (Corrective Rework)</Badge>;
      case 'in_progress':
        return <Badge variant="info" dot>In Progress</Badge>;
      case 'in_review':
        return <Badge variant="purple" dot>In Review</Badge>;
      case 'backlog':
        return <Badge variant="default">Backlog</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Task Statuses</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="completed">Completed & Delivered</option>
            <option value="reopened">Reopened for Rework</option>
            <option value="backlog">Backlog</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code}
              </option>
            ))}
          </select>

          {/* Assigned Engineer Filter */}
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({u.role})
              </option>
            ))}
          </select>

          {/* Quick toggle for current user */}
          <button
            onClick={() => setAssignedFilter(assignedFilter === currentUser.id ? 'all' : currentUser.id)}
            className={cn(
              'text-xs font-medium px-3 py-2 rounded-lg border transition-all shadow-2xs',
              assignedFilter === currentUser.id
                ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            My Assigned Tasks
          </button>
        </div>

        {canCreateTask && (
          <Button
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsTaskModalOpen(true)}
          >
            New Task
          </Button>
        )}
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Task & Module</th>
                <th className="px-4 py-3.5">Priority</th>
                <th className="px-4 py-3.5">Assignee</th>
                <th className="px-4 py-3.5">Hours (Regular / Rework)</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No tasks found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const module = modules.find((m) => m.id === task.module_id);
                  const project = projects.find((p) => p.id === task.project_id);
                  const assignee = users.find((u) => u.id === task.assigned_to);
                  const isCompleted = task.status === 'completed';
                  const isReopened = task.status === 'reopened';

                  return (
                    <tr 
                      key={task.id} 
                      className={cn(
                        'hover:bg-slate-50/70 transition-colors',
                        isReopened && 'bg-rose-50/20'
                      )}
                    >
                      {/* Title & Module */}
                      <td className="px-5 py-4 max-w-sm">
                        <div className="font-semibold text-slate-900 text-xs">
                          {task.title}
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">
                          {task.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-medium">
                          <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {project?.code}
                          </span>
                          <span>•</span>
                          <span>{module?.name}</span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getPriorityBadge(task.priority)}
                      </td>

                      {/* Assignee */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <img
                            src={assignee?.avatar_url}
                            alt={assignee?.full_name}
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                          />
                          <span className="font-medium text-slate-800">
                            {assignee?.full_name}
                          </span>
                        </div>
                      </td>

                      {/* Hours Breakdown: Regular vs Corrective */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-slate-700" title="Regular hours">
                            {task.actual_regular_hours}h reg
                          </span>
                          <span className="text-slate-300">/</span>
                          <span 
                            className={cn(
                              'font-mono font-semibold',
                              task.corrective_hours > 0 ? 'text-rose-600' : 'text-slate-400'
                            )}
                            title="Corrective maintenance rework hours"
                          >
                            {task.corrective_hours}h rework
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                          Est: {task.estimated_hours}h
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(task.status)}
                        {task.delivered_at && (
                          <span className="text-[10px] text-emerald-700 block mt-0.5">
                            Delivered: {formatDate(task.delivered_at)}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Log Time shortcut */}
                          <Link
                            to="/time"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Log time on this task"
                          >
                            <Clock className="w-4 h-4" />
                          </Link>

                          {/* Complete & Deliver button */}
                          {!isCompleted && (
                            <button
                              onClick={() => completeTask(task.id)}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1"
                              title="Deliver and complete task"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Deliver
                            </button>
                          )}

                          {/* Reopen button */}
                          {isCompleted && (
                            <button
                              onClick={() => setReopenTarget(task)}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1"
                              title="Reopen task for corrective maintenance"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reopen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Task */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Create Engineering Task"
        description="Assign a feature or technical deliverable under an active module."
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="e.g. Implement webhook signature verification"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Project *</label>
              <select
                value={newTask.project_id}
                onChange={(e) => {
                  const pId = e.target.value;
                  const relevantModules = modules.filter(m => m.project_id === pId);
                  setNewTask({
                    ...newTask,
                    project_id: pId,
                    module_id: relevantModules[0]?.id || '',
                  });
                }}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Module *</label>
              <select
                value={newTask.module_id}
                onChange={(e) => setNewTask({ ...newTask, module_id: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {modules
                  .filter(m => m.project_id === newTask.project_id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assignee *</label>
              <select
                value={newTask.assigned_to}
                onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Hours</label>
              <input
                type="number"
                value={newTask.estimated_hours}
                onChange={(e) => setNewTask({ ...newTask, estimated_hours: Number(e.target.value) })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Detailed acceptance criteria and technical scope..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Reopen Confirmation */}
      <Modal
        isOpen={Boolean(reopenTarget)}
        onClose={() => setReopenTarget(null)}
        title="Reopen Task for Corrective Rework"
        description="Mark this delivered task as reopened to allocate corrective maintenance hours."
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
            <p className="font-semibold text-amber-950">Task Reopening Notification</p>
            <p className="mt-0.5">
              Assignee will be notified. Any corrective hours logged on this reopened task will be reviewed for defect attribution.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Reopening *</label>
            <textarea
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="State the defect or bug ID triggering this rework..."
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
