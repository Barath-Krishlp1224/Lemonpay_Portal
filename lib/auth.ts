// lib/auth.ts
import { NextRequest } from 'next/server';

export interface AuthUser {
  userId: string;
  userName: string;
  userRole: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: AuthUser;
}

export function getAuthHeaders(request: Request | NextRequest): AuthUser {
  const userId = request.headers.get('x-user-id') || '';
  const userName = request.headers.get('x-user-name') || '';
  const userRole = request.headers.get('x-user-role') || '';

  return { userId, userName, userRole };
}

export function validateAuth(headers: AuthUser): AuthResult {
  const { userId, userName, userRole } = headers;
  
  if (!userId || !userName || !userRole) {
    return { 
      success: false, 
      error: 'Authentication headers are missing. Please log in again.' 
    };
  }

  const validRoles = ['Admin', 'Manager', 'TeamLead', 'Employee'];
  if (!validRoles.includes(userRole)) {
    return { 
      success: false, 
      error: `Invalid user role: ${userRole}` 
    };
  }

  return { 
    success: true, 
    user: { userId, userName, userRole } 
  };
}

export function hasPermission(
  userRole: string,
  requiredRole: 'Admin' | 'Manager' | 'TeamLead' | 'Employee' | 'Any'
): boolean {
  const roleHierarchy = {
    'Admin': 4,
    'Manager': 3,
    'TeamLead': 2,
    'Employee': 1
  };

  if (requiredRole === 'Any') return true;
  
  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole];
  
  return userLevel >= requiredLevel;
}

export function canEditTask(userRole: string, isAssigned: boolean): boolean {
  if (userRole === 'Admin' || userRole === 'Manager' || userRole === 'TeamLead') {
    return true;
  }
  
  if (userRole === 'Employee') {
    return isAssigned;
  }
  
  return false;
}

export function canDeleteTask(userRole: string): boolean {
  return userRole === 'Admin' || userRole === 'Manager';
}

export function canCommentOnTask(userRole: string, isAssigned: boolean): boolean {
  if (userRole === 'Admin' || userRole === 'Manager' || userRole === 'TeamLead') {
    return true;
  }
  
  if (userRole === 'Employee') {
    return isAssigned;
  }
  
  return false;
}

// Helper for API responses
export function createErrorResponse(message: string, status: number = 400) {
  return {
    success: false,
    error: message,
    status
  };
}

export function createSuccessResponse(data: any = null, message: string = 'Success') {
  return {
    success: true,
    message,
    data
  };
}