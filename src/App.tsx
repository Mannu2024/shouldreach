import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, auth, db } from './firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuthStore } from './store/useAuthStore';
import { UserProfile } from './types';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';

import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import CustomCursor from './components/CustomCursor';
import { Home } from './pages/Home';
import { Feed } from './pages/Feed';
import { Network } from './pages/Network';
import { Profile } from './pages/Profile';
import { SuccessStories } from './pages/SuccessStories';
import { Admin } from './pages/Admin';
import { Messages } from './pages/Messages';
import { Notifications } from './pages/Notifications';
import { ProfileSetup } from './pages/ProfileSetup';
import { InfoPage } from './pages/InfoPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthReady } = useAuthStore();
  
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/home" replace />;
  }

  const isPasswordProvider = user.providerData.some(p => p.providerId === 'password');
  if (isPasswordProvider && !user.emailVerified) {
    return <Navigate to="/home" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  const { setUser, setProfile, setAuthReady } = useAuthStore();

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setAuthReady(true);
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setAuthReady(true);
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        });
      } else {
        setProfile(null);
        setAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [setUser, setProfile, setAuthReady]);

  return (
    <ErrorBoundary>
      <CustomCursor />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<Home />} />
            <Route path="feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
            <Route path="network" element={<ProtectedRoute><Network /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="stories" element={<ProtectedRoute><SuccessStories /></ProtectedRoute>} />
            <Route path="admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
            
            {/* Placeholder routes for navigation items */}
            <Route path="messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            
            {/* Info Pages */}
            <Route path="about" element={<InfoPage type="about" />} />
            <Route path="careers" element={<InfoPage type="careers" />} />
            <Route path="contact" element={<InfoPage type="contact" />} />
            <Route path="help" element={<InfoPage type="help" />} />
            <Route path="privacy" element={<InfoPage type="privacy" />} />
            <Route path="terms" element={<InfoPage type="terms" />} />
            <Route path="guidelines" element={<InfoPage type="guidelines" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

