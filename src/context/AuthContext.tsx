import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { StorageService } from '../services/storage';

interface AuthContextType {
  currentUser: User;
  users: User[];
  switchUser: (userId: string) => void;
  isEmployee: boolean;
  isTeamLead: boolean;
  isLead: boolean;
  isManager: boolean;
  isFinanceAdmin: boolean;
  canApproveTime: boolean;
  canClassifyDefect: boolean;
  canManagePayroll: boolean;
  canFinalizePayroll: boolean;
  canConfigurePolicy: boolean;
  canCreateProject: boolean;
  canCreateTask: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users] = useState<User[]>(() => StorageService.getUsers());
  const [currentUserId, setCurrentUserId] = useState<string>(() => StorageService.getActiveUserId());

  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  const switchUser = (userId: string) => {
    setCurrentUserId(userId);
    StorageService.setActiveUserId(userId);
  };

  const isEmployee = currentUser.role === 'employee';
  const isTeamLead = currentUser.role === 'team_lead';
  const isManager = currentUser.role === 'manager';
  const isFinanceAdmin = currentUser.role === 'finance_admin';

  const canApproveTime = ['team_lead', 'manager', 'finance_admin'].includes(currentUser.role);
  const canClassifyDefect = ['manager', 'finance_admin'].includes(currentUser.role);
  const canManagePayroll = ['finance_admin', 'manager'].includes(currentUser.role);
  const canFinalizePayroll = currentUser.role === 'finance_admin';
  const canConfigurePolicy = ['manager', 'finance_admin'].includes(currentUser.role);
  const canCreateProject = ['manager', 'finance_admin'].includes(currentUser.role);
  const canCreateTask = ['team_lead', 'manager', 'finance_admin'].includes(currentUser.role);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        switchUser,
        isEmployee,
        isTeamLead,
        isLead: isTeamLead,
        isManager,
        isFinanceAdmin,
        canApproveTime,
        canClassifyDefect,
        canManagePayroll,
        canFinalizePayroll,
        canConfigurePolicy,
        canCreateProject,
        canCreateTask,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
