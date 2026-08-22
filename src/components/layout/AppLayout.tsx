/**
 * App Layout Component — HealthCare Design System (Stitch-generated)
 *
 * Responsive sidebar navigation with:
 * - Plus Jakarta Sans / Inter typography
 * - Sky-500 (patient) / Teal-500 (doctor) role branding
 * - Clean card-based nav items with active state
 * - Role-based navigation, user profile dropdown
 */

import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../../lib/db/types';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Search,
  Stethoscope,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Heart,
  Shield,
  CalendarDays,
  Pill,
  FileText,
  Activity,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: Record<UserRole, NavItem[]> = {
  patient: [
    { label: 'Dashboard', path: '/patient', icon: <LayoutDashboard size={18} /> },
    { label: 'Book Appointment', path: '/patient/book', icon: <Search size={18} /> },
    { label: 'My Appointments', path: '/patient/appointments', icon: <Calendar size={18} /> },
    { label: 'Prescriptions', path: '/patient/prescriptions', icon: <Pill size={18} /> },
    { label: 'Visit Summaries', path: '/patient/summaries', icon: <FileText size={18} /> },
    { label: 'Settings', path: '/patient/settings', icon: <Settings size={18} /> },
  ],
  doctor: [
    { label: 'Dashboard', path: '/doctor', icon: <LayoutDashboard size={18} /> },
    { label: 'Schedule', path: '/doctor/schedule', icon: <CalendarDays size={18} /> },
    { label: 'Patients', path: '/doctor/patients', icon: <Users size={18} /> },
    { label: 'Settings', path: '/doctor/settings', icon: <Settings size={18} /> },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={18} /> },
    { label: 'Doctors', path: '/admin/doctors', icon: <Stethoscope size={18} /> },
    { label: 'Appointments', path: '/admin/appointments', icon: <Calendar size={18} /> },
    { label: 'Notifications', path: '/admin/notifications', icon: <Bell size={18} /> },
    { label: 'Settings', path: '/admin/settings', icon: <Settings size={18} /> },
  ],
};

const roleConfig: Record<UserRole, { label: string; icon: React.ReactNode; activeClass: string; avatarClass: string; bannerColor: string }> = {
  patient: {
    label: 'Patient Portal',
    icon: <Heart size={16} className="text-[#b59a5c]" />,
    activeClass: 'bg-[#e7d8b5] text-[#3b2f2f] font-bold border-l-2 border-[#b59a5c]',
    avatarClass: '',
    bannerColor: 'from-[#3b2f2f] to-[#5c492a]',
  },
  doctor: {
    label: 'Doctor Portal',
    icon: <Stethoscope size={16} className="text-[#b59a5c]" />,
    activeClass: 'bg-[#e7d8b5] text-[#3b2f2f] font-bold border-l-2 border-[#b59a5c]',
    avatarClass: 'avatar-initials-doctor',
    bannerColor: 'from-[#3b2f2f] to-[#5c492a]',
  },
  admin: {
    label: 'Admin Portal',
    icon: <Shield size={16} className="text-[#b59a5c]" />,
    activeClass: 'bg-[#e7d8b5] text-[#3b2f2f] font-bold border-l-2 border-[#b59a5c]',
    avatarClass: '',
    bannerColor: 'from-[#3b2f2f] to-[#5c492a]',
  },
};

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const config = roleConfig[user.role];
  const items = navItems[user.role] || [];
  const initials = user.profile.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2) || 'U';

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: '/login' });
  };

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${config.bannerColor} flex items-center justify-center shadow-sm`}>
          <Activity size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 font-display">HealthCare</h1>
          <p className="text-xs text-slate-400">{config.label}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            className="nav-item"
            activeProps={{ className: `nav-item ${config.activeClass}` }}
          >
            <span className="opacity-70">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className={`avatar-initials-sm ${config.avatarClass}`}>{initials}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{user.profile.full_name}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{user.role}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  if (!user) return null;

  const config = roleConfig[user.role];
  const initials = user.profile.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2) || 'U';

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: '/login' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col animate-fade-in">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">

        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center justify-between px-4 lg:px-6 h-14">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Menu size={20} className="text-slate-600" />
            </button>

            {/* Portal label (desktop) */}
            <div className="hidden lg:flex items-center gap-2">
              {config.icon}
              <span className="text-sm font-semibold text-slate-700 font-display">{config.label}</span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Notification bell */}
              <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors relative">
                <Bell size={18} className="text-slate-500" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className={`avatar-initials-sm ${config.avatarClass}`}>{initials}</div>
                  <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {user.profile.full_name}
                  </span>
                  <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-1 animate-scale-in">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900 truncate">{user.profile.full_name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                      <span className="badge badge-confirmed mt-2 capitalize">{user.role}</span>
                    </div>
                    <Link
                      to={`/${user.role}/settings`}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <Settings size={14} className="text-slate-400" />
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
