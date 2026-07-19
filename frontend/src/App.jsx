import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import { getToken, clearToken } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  // On load, try to restore session from localStorage token.
  // We persist user info in localStorage too so the page doesn't flash.
  useEffect(() => {
    const token = getToken();
    const savedUser = localStorage.getItem('cmc_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        clearToken();
        localStorage.removeItem('cmc_user');
      }
    }
    setBootstrapped(true);
  }, []);

  function handleLogin(data) {
    const userInfo = {
      username: data.username,
      isAdmin: data.isAdmin,
      quotaBytes: data.quotaBytes,
      usedBytes: data.usedBytes,
    };
    setUser(userInfo);
    localStorage.setItem('cmc_user', JSON.stringify(userInfo));
  }

  function handleLogout() {
    setUser(null);
    clearToken();
    localStorage.removeItem('cmc_user');
  }

  if (!bootstrapped) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/dashboard" replace /> : <Register />}
        />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin"
          element={user?.isAdmin ? <Admin user={user} onLogout={handleLogout} /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="*"
          element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
