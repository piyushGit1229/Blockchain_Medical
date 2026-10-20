// ============================================================
// MediLedger — Authentication & Persona Context
// ============================================================

import React, { createContext, useContext, useState } from 'react';
import type { CurrentUser } from '../types';
import { DEMO_CURRENT_USER, DEMO_PERSONAS } from '../data/demo';
import { showToast } from '../components/ui';

interface AuthContextType {
  currentUser: CurrentUser;
  isAuthenticated: boolean;
  login: (persona?: CurrentUser) => void;
  logout: () => void;
  switchPersona: (persona: CurrentUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_AUTH_KEY = 'mediledger_is_authenticated';
const STORAGE_USER_ID_KEY = 'mediledger_current_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_AUTH_KEY);
    return saved !== null ? saved === 'true' : true; // Default authenticated for demo
  });

  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    const savedId = localStorage.getItem(STORAGE_USER_ID_KEY);
    if (savedId) {
      const found = DEMO_PERSONAS.find(p => p.id === savedId);
      if (found) return found;
    }
    return DEMO_CURRENT_USER;
  });

  const login = (persona?: CurrentUser) => {
    const targetUser = persona || DEMO_CURRENT_USER;
    setCurrentUser(targetUser);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_AUTH_KEY, 'true');
    localStorage.setItem(STORAGE_USER_ID_KEY, targetUser.id);
    showToast(
      'success',
      'Authenticated successfully',
      `Signed in as ${targetUser.name} (${targetUser.role.toUpperCase()})`
    );
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem(STORAGE_AUTH_KEY, 'false');
    showToast('info', 'Signed out', 'Session terminated. Digital certificates cleared from memory.');
  };

  const switchPersona = (persona: CurrentUser) => {
    setCurrentUser(persona);
    localStorage.setItem(STORAGE_USER_ID_KEY, persona.id);
    showToast(
      'info',
      'Identity Switched',
      `Active operator changed to ${persona.name} (${persona.organization.shortName})`
    );
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, login, logout, switchPersona }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
