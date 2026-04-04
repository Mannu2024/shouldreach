import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { auth, signOut } from '../firebase';
import { Home, Users, BookOpen, MessageSquare, Bell, User, LogOut, Shield, Handshake, Sliders, ChevronUp, ChevronDown, X } from 'lucide-react';
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
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
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
    navigate('/');
  };

  const defaultNavItems = [
    { id: 'feed', icon: Home, label: 'Feed', path: '/feed' },
    { id: 'network', icon: Users, label: 'Network', path: '/network' },
    { id: 'stories', icon: BookOpen, label: 'Stories', path: '/stories' },
    { id: 'messages', icon: MessageSquare, label: 'Messages', path: '/messages' },
    { id: 'notifications', icon: Bell, label: 'Notifications', path: '/notifications' },
  ];

  const [navOrder, setNavOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('customNavOrder');
    return saved ? JSON.parse(saved) : defaultNavItems.map(item => item.id);
  });

  const navItems = navOrder
    .map(id => defaultNavItems.find(item => item.id === id))
    .filter(Boolean) as typeof defaultNavItems;

  const moveItem = (index: number, direction: number) => {
    const newOrder = [...navOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + direction];
    newOrder[index + direction] = temp;
    setNavOrder(newOrder);
    localStorage.setItem('customNavOrder', JSON.stringify(newOrder));
  };

  if (!user && location.pathname === '/') {
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
    <div className="min-h-screen bg-sky-50">
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-indigo-600 origin-left z-[100]"
        style={{ scaleX }}
      />
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to={user ? "/feed" : "/"} className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                  <Handshake className="text-white w-5 h-5" />
                </div>
                <span className="text-lg sm:text-xl font-bold text-slate-900 truncate max-w-[120px] sm:max-w-none">ShouldReach</span>
              </Link>
            </div>
            
            {user && (
              <div className="flex items-center gap-2 sm:gap-4">
                <button 
                  onClick={() => setShowCustomizeModal(true)} 
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors md:hidden"
                  title="Customize Navigation"
                >
                  <Sliders className="w-5 h-5" />
                </button>
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
          {/* Sidebar (Desktop) */}
          {user && (
            <aside className="hidden md:block w-64 shrink-0">
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
                
                <div className="mt-8 pt-4 border-t border-slate-100 space-y-1">
                  <button
                    onClick={() => setShowCustomizeModal(true)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 w-full transition-colors"
                  >
                    <Sliders className="w-5 h-5 text-slate-400" />
                    Customize Navigation
                  </button>
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
          <main className="flex-1 min-w-0 pb-20 md:pb-0">
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

      {/* Mobile Bottom Navigation */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className="relative flex flex-col items-center justify-center w-full h-full"
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute inset-0 bg-indigo-50/80 rounded-2xl m-1 z-0"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <motion.div
                    animate={isActive ? { y: -2, scale: 1.1 } : { y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative z-10 flex flex-col items-center gap-1"
                  >
                    <div className="relative">
                      <Icon className={cn("w-5 h-5 transition-colors duration-300", isActive ? "text-indigo-600" : "text-slate-400")} />
                      {item.path === '/notifications' && unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center border-2 border-white shadow-sm">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <motion.span 
                      animate={isActive ? { opacity: 1 } : { opacity: 0.7 }}
                      className={cn("text-[10px] font-medium transition-colors duration-300", isActive ? "text-indigo-700" : "text-slate-500")}
                    >
                      {item.label}
                    </motion.span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Customize Nav Modal */}
      <AnimatePresence>
        {showCustomizeModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Customize Navigation</h3>
                <button onClick={() => setShowCustomizeModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Icon className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-medium text-slate-700 text-sm">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          disabled={index === 0}
                          onClick={() => moveItem(index, -1)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 hover:bg-white rounded-md shadow-sm disabled:shadow-none transition-all"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button 
                          disabled={index === navItems.length - 1}
                          onClick={() => moveItem(index, 1)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 hover:bg-white rounded-md shadow-sm disabled:shadow-none transition-all"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => setShowCustomizeModal(false)}
                  className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
