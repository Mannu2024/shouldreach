import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Shield, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, profile, isAuthReady } = useAuthStore();

  // If already logged in, redirect based on role
  useEffect(() => {
    if (isAuthReady && user) {
      const isDefaultAdmin = ['manishthakur2024@ramjas.du.ac.in', 'admin@shouldreach.com'].includes(user.email?.toLowerCase() || '');
      if (profile?.role === 'admin' || isDefaultAdmin) {
        navigate('/secure-admin');
      } else if (profile) {
        // Logged in but not an admin, redirect to home
        navigate('/');
      }
    }
  }, [user, profile, isAuthReady, navigate]);

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent. Please check your inbox.');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError('Failed to send password reset email. Please verify your email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInErr: any) {
        const isDefaultAdmin = ['manishthakur2024@ramjas.du.ac.in', 'admin@shouldreach.com'].includes(email.toLowerCase());
        
        // If it's a default admin and they get an invalid credential, try creating the account
        // This handles the case where the admin account doesn't exist yet
        if (isDefaultAdmin && (signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/user-not-found')) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              // Account exists (maybe via Google), so it's just a wrong password or needs password reset
              throw new Error('auth/invalid-credential');
            }
            throw createErr;
          }
        } else {
          throw signInErr;
        }
      }

      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      const isDefaultAdmin = ['manishthakur2024@ramjas.du.ac.in', 'admin@shouldreach.com'].includes(userCredential.user.email?.toLowerCase() || '');
      let userData = userDoc.data();
      
      if (!userDoc.exists() && isDefaultAdmin) {
        const { setDoc } = await import('firebase/firestore');
        const newProfile = {
          uid: userCredential.user.uid,
          role: 'admin',
          email: userCredential.user.email || '',
          displayName: 'Admin User',
          connectionsCount: 0,
          isVerified: true,
          isProfileComplete: true,
          visibility: 'private',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), newProfile);
        userData = newProfile;
      }
      
      if (userData?.role === 'admin' || isDefaultAdmin) {
        navigate('/secure-admin');
      } else {
        // Not an admin, sign them out immediately
        await auth.signOut();
        setError('Unauthorized access. This portal is strictly for administrators.');
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      if (err.message === 'auth/invalid-credential' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. If you previously used Google to sign in, please click "Forgot Password" to set an email password.');
      } else {
        setError('Invalid credentials or unauthorized access.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Admin Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Secure access for authorized personnel only
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-4 shadow-2xl shadow-black/50 sm:rounded-xl sm:px-10 border border-slate-700">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {message && (
              <div className="bg-emerald-500/10 border border-emerald-500/50 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-500">{message}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 bg-slate-900 border border-slate-700 rounded-lg py-2.5 text-white placeholder-slate-500 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                  placeholder="admin@shouldreach.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
                >
                  Forgot password?
                </button>
              </div>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 bg-slate-900 border border-slate-700 rounded-lg py-2.5 text-white placeholder-slate-500 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Sign in to Admin Portal'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
