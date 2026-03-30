import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { auth, signOut } from '../firebase';
import { 
  LayoutDashboard, 
  Users, 
  Ticket, 
  CreditCard, 
  BarChart3, 
  Bell, 
  Settings, 
  FileText, 
  LogOut, 
  Menu, 
  X,
  Shield,
  Handshake
} from 'lucide-react';
import { cn } from './Layout';
import { motion, AnimatePresence } from 'motion/react';
import { useIdleTimeout } from '../hooks/useIdleTimeout';

export function AdminLayout() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auto logout after 30 minutes of inactivity
  useIdleTimeout(30);

  // If not admin, redirect to home or show access denied
  const isDefaultAdmin = ['manishthakur2024@ramjas.du.ac.in', 'admin@shouldreach.com'].includes(user?.email?.toLowerCase() || '');
  if (profile?.role !== 'admin' && !isDefaultAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-slate-500 mt-2">You do not have permission to view this area.</p>
          <Link to="/" className="mt-6 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/secure-admin/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/secure-admin' },
    { icon: Users, label: 'Customers', path: '/secure-admin/users' },
    { icon: Ticket, label: 'Issues & Tickets', path: '/secure-admin/tickets' },
    { icon: CreditCard, label: 'Billing', path: '/secure-admin/billing' },
    { icon: BarChart3, label: 'Reports', path: '/secure-admin/reports' },
    { icon: Bell, label: 'Notifications', path: '/secure-admin/notifications' },
    { icon: FileText, label: 'Content', path: '/secure-admin/content' },
    { icon: Settings, label: 'Settings', path: '/secure-admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Handshake className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold">Admin Portal</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/secure-admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-indigo-600 text-white" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img 
              src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'Admin'}`} 
              alt="Admin" 
              className="w-10 h-10 rounded-full border border-slate-700"
            />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{profile?.displayName || 'Admin'}</p>
              <p className="text-xs text-slate-400 truncate">{profile?.email || user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Handshake className="text-white w-5 h-5" />
          </div>
          <span className="text-lg font-bold">Admin Portal</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="md:hidden fixed inset-0 z-20 bg-slate-900 text-white pt-16 flex flex-col"
          >
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/secure-admin' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors",
                      isActive 
                        ? "bg-indigo-600 text-white" 
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-800">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-red-400 hover:bg-red-500/10 w-full transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen flex flex-col">
        {/* Top Navbar (Desktop) */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-slate-800">
            {navItems.find(item => location.pathname === item.path || (item.path !== '/secure-admin' && location.pathname.startsWith(item.path)))?.label || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View Main Site
            </Link>
            <div className="w-px h-6 bg-slate-200"></div>
            <button className="p-2 text-slate-400 hover:text-slate-600 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-8 flex-1 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
