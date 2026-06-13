import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('arkive_user') || '{}');
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const login = useCallback((userData) => {
    // userData = { user_id, display_name, email, access_token }
    const { access_token, ...rest } = userData;
    localStorage.setItem('arkive_token', access_token);
    localStorage.setItem('arkive_user', JSON.stringify(rest));
    localStorage.setItem('isAuthenticated', 'true');
    setUser(rest);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('arkive_token');
    localStorage.removeItem('arkive_user');
    localStorage.removeItem('isAuthenticated');
    setUser({});
  }, []);

  const isAuthenticated = !!user?.user_id;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
