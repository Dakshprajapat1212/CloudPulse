import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldAlert, Server, FileText, LogOut, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-slate-950 border-b border-slate-800 text-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 text-sky-400 font-bold text-xl tracking-wide">
              <Activity className="w-6 h-6 text-sky-400 animate-pulse" />
              <span>CloudPulse</span>
            </Link>
            <div className="flex space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1 ${
                  isActive('/') ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/incidents"
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1 ${
                  isActive('/incidents') ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Incidents</span>
              </Link>
              <Link
                to="/services"
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1 ${
                  isActive('/services') ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Server className="w-4 h-4" />
                <span>Services</span>
              </Link>
              {(user.role === 'ADMIN' || user.role === 'SRE_MANAGER') && (
                <Link
                  to="/audit"
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1 ${
                    isActive('/audit') ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Audit Logs</span>
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-200">{user.full_name}</div>
              <div className="text-xs text-sky-400 font-semibold">{user.role}</div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
