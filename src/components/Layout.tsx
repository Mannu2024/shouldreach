import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { auth, signOut } from '../firebase';
import { Home, Users, BookOpen, MessageSquare, Bell, User, LogOut, Shield, Handshake } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';

import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Layout() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/home');
  };

  const navItems = [
    { icon: Home, label: 'Feed', path: '/feed' },
    { icon: Users, label: 'Network', path: '/network' },
    { icon: BookOpen, label: 'Success Stories', path: '/stories' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ icon: Shield, label: 'Admin', path: '/admin' });
  }

  if (!user && (location.pathname === '/' || location.pathname === '/home')) {
    return (
      <div className="min-h-screen bg-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-indigo-600 origin-left z-[100]"
        style={{ scaleX }}
      />
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to={user ? "/feed" : "/home"} className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Handshake className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-slate-900 hidden sm:block">ShouldReach</span>
              </Link>
            </div>
            
            {user && (
              <div className="flex items-center gap-4">
                <Link to="/profile" className="flex items-center gap-2 hover:bg-slate-50 p-2 rounded-lg transition-colors">
                  <img 
                    src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}&background=random`} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full border border-slate-200"
                  />
                  <span className="text-sm font-medium text-slate-700 hidden sm:block">{profile?.displayName}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          {user && (
            <aside className="w-full md:w-64 shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sticky top-24">
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          isActive 
                            ? "bg-indigo-50 text-indigo-700" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <Icon className={cn("w-5 h-5", isActive ? "text-indigo-700" : "text-slate-400")} />
                        {item.label}
                        {item.path === '/notifications' && unreadCount > 0 && (
                          <span className="ml-auto bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
                
                <div className="mt-8 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 w-full transition-colors"
                  >
                    <LogOut className="w-5 h-5 text-slate-400" />
                    Sign Out
                  </button>
                </div>
              </div>
            </aside>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {user && profile && !profile.isProfileComplete && location.pathname !== '/profile-setup' && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-indigo-900">Complete your profile</h3>
                    <p className="text-xs text-indigo-700 mt-0.5">Add more details to help others discover you and build your network.</p>
                  </div>
                </div>
                <Link 
                  to="/profile-setup" 
                  className="shrink-0 w-full sm:w-auto text-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Complete Profile
                </Link>
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
