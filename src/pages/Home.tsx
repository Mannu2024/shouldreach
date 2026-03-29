import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  auth, googleProvider, signInWithPopup, db,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  RecaptchaVerifier, signInWithPhoneNumber, sendPasswordResetEmail,
  sendEmailVerification
} from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole } from '../types';
import { 
  GraduationCap, BookOpen, Briefcase, Users, Search, 
  MessageSquare, TrendingUp, Award, Building, ChevronRight, 
  Star, Heart, Share2, MapPin, Globe, Zap, Shield, ArrowRight, CheckCircle2,
  Menu, X, User, Mail, Phone as PhoneIcon, Lock, Eye, EyeOff, Handshake, Quote
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import Hero3DModel from '../components/Hero3DModel';

export function Home() {
  const { scrollYProgress, scrollY } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroY = useTransform(scrollY, [0, 500], [0, -100]);

  const [isJoining, setIsJoining] = useState(false);
  const [authMethod, setAuthMethod] = useState<'google' | 'email' | 'phone'>('google');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();

  useEffect(() => {
    if (user) {
      const isPasswordProvider = user.providerData.some(p => p.providerId === 'password');
      if (isPasswordProvider && !user.emailVerified) {
        if (!loading) {
          auth.signOut();
        }
        return;
      }
      if (profile) {
        navigate('/feed');
      }
    }
  }, [user?.uid, profile?.uid, navigate, user, loading]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleUserCreation(result.user);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User intentionally closed the popup, ignore the error
        return;
      }
      if (error.code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked by your browser. Please allow popups for this site.');
        return;
      }
      if (error.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for Google Sign-In. Please add it to your Firebase Console > Authentication > Settings > Authorized domains.');
        return;
      }
      console.error("Error signing in with Google", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let userCredential;
      if (authMode === 'signup') {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await sendEmailVerification(userCredential.user);
        } catch (err) {
          console.error("Failed to send verification email", err);
        }
        // Wait for auth state to propagate to Firestore
        await new Promise(resolve => setTimeout(resolve, 1000));
        await handleUserCreation(userCredential.user, false, true);
        await auth.signOut();
        setError('Account created! Please check your email to verify your account before logging in.');
        setAuthMode('login');
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
          await auth.signOut();
          setError('Please verify your email address before logging in. Check your inbox for the verification link.');
          return;
        }
        await handleUserCreation(userCredential.user, true, false);
      }
    } catch (error: any) {
      console.error("Error with email auth", error);
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login instead.');
      } else if (error.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (error: any) {
      console.error("Error sending reset email", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if ((window as any).recaptchaVerifier) return;
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let formattedPhone = phoneNumber.trim();
      if (formattedPhone.length === 10 && !formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone;
      } else if (formattedPhone.length === 12 && formattedPhone.startsWith('91')) {
        formattedPhone = '+' + formattedPhone;
      }
      
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
    } catch (error: any) {
      console.error("Error with phone sign in", error);
      if (error.code === 'auth/operation-not-allowed') {
        setError('Phone authentication is not enabled or this region is blocked. Please enable it in the Firebase Console.');
      } else if (error.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format. Please enter a valid number.');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await confirmationResult.confirm(verificationCode);
      // Wait for auth state to propagate to Firestore
      await new Promise(resolve => setTimeout(resolve, 1000));
      await handleUserCreation(result.user, true, false);
    } catch (error: any) {
      console.error("Error verifying code", error);
      if (error.code === 'auth/invalid-verification-code') {
        setError('Invalid verification code. Please try again.');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUserCreation = async (loggedInUser: any, shouldNavigate: boolean = true, isNewUser: boolean = false) => {
    try {
      if (isNewUser) {
        const newProfile = {
          uid: loggedInUser.uid,
          role: selectedRole,
          email: loggedInUser.email || '',
          phoneNumber: loggedInUser.phoneNumber || '',
          displayName: loggedInUser.displayName || 'New User',
          photoURL: loggedInUser.photoURL || '',
          connectionsCount: 0,
          isVerified: false,
          isProfileComplete: false,
          visibility: 'public',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', loggedInUser.uid), newProfile);
        if (shouldNavigate) navigate('/feed');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', loggedInUser.uid));
      
      if (!userDoc.exists()) {
        const newProfile = {
          uid: loggedInUser.uid,
          role: selectedRole,
          email: loggedInUser.email || '',
          phoneNumber: loggedInUser.phoneNumber || '',
          displayName: loggedInUser.displayName || 'New User',
          photoURL: loggedInUser.photoURL || '',
          connectionsCount: 0,
          isVerified: false,
          isProfileComplete: false,
          visibility: 'public',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', loggedInUser.uid), newProfile);
        if (shouldNavigate) navigate('/feed');
      } else {
        if (shouldNavigate) navigate('/feed');
      }
    } catch (error: any) {
      console.error("Error creating user profile in Firestore:", error);
      throw error; // Re-throw to be caught by the calling function
    }
  };

  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'Students', href: '#students' },
    { name: 'Professors', href: '#professors' },
    { name: 'Success Stories', href: '#stories' },
    { name: 'Universities', href: '#universities' },
    { name: 'Community', href: '#community' },
    { name: 'Opportunities', href: '#opportunities' },
    { name: 'About', href: '#about' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-3' : 'bg-white/80 backdrop-blur-md py-5'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-10 h-10 bg-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Handshake className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-extrabold text-indigo-950 tracking-tight">ShouldReach</span>
            </motion.div>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-6">
              {navLinks.map((link, index) => (
                <motion.a 
                  key={link.name} 
                  href={link.href} 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.1, color: '#4f46e5' }}
                  className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  {link.name}
                </motion.a>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setAuthMode('login'); setIsJoining(true); }} 
                className="text-indigo-700 font-semibold hover:text-indigo-800 transition-colors"
              >
                Login
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setAuthMode('signup'); setIsJoining(true); }} 
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                Join Now
              </motion.button>
            </div>

            {/* Mobile Menu Button */}
            <button className="lg:hidden p-2 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden absolute top-full left-0 w-full bg-white shadow-xl border-t border-slate-100 py-4 px-4 flex flex-col gap-4"
          >
            {navLinks.map((link, index) => (
              <motion.a 
                key={link.name} 
                href={link.href} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="text-base font-medium text-slate-700 p-2 hover:bg-slate-50 rounded-lg" 
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </motion.a>
            ))}
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => { setMobileMenuOpen(false); setAuthMode('login'); setIsJoining(true); }} 
                className="w-full py-3 text-indigo-700 font-semibold border border-indigo-100 rounded-xl"
              >
                Login
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => { setMobileMenuOpen(false); setAuthMode('signup'); setIsJoining(true); }} 
                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl"
              >
                Join Now
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* Auth Modal */}
      {isJoining && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 via-white to-green-500"></div>
            <button onClick={() => { setIsJoining(false); setError(''); setConfirmationResult(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-6 mt-4">
              <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
                {authMode === 'signup' ? 'Join ShouldReach' : 'Welcome Back'}
              </h2>
              <p className="text-slate-500">
                {authMode === 'signup' ? 'Select your role to get started' : 'Login to your account'}
              </p>
            </div>

            {authMode === 'signup' && !confirmationResult && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 mb-6"
              >
                <RoleOption icon={GraduationCap} title="Student" description="Connect, learn, and grow" selected={selectedRole === 'student'} onClick={() => setSelectedRole('student')} />
                <RoleOption icon={BookOpen} title="Professor" description="Mentor and share knowledge" selected={selectedRole === 'professor'} onClick={() => setSelectedRole('professor')} />
                <RoleOption icon={Briefcase} title="Alumni" description="Give back and network" selected={selectedRole === 'alumni'} onClick={() => setSelectedRole('alumni')} />
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100"
              >
                {error}
              </motion.div>
            )}

            <div className="flex gap-2 mb-6">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => { setAuthMethod('google'); setError(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${authMethod === 'google' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Google
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => { setAuthMethod('email'); setError(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${authMethod === 'email' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Email
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => { setAuthMethod('phone'); setError(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${authMethod === 'phone' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Phone
              </motion.button>
            </div>

            {authMethod === 'google' && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleLogin} 
                disabled={loading}
                className="w-full py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6 bg-white rounded-full p-0.5" />
                {loading ? 'Connecting...' : 'Continue with Google'}
              </motion.button>
            )}

            {authMethod === 'email' && (
              <motion.form 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handleEmailAuth} 
                className="space-y-4"
              >
                {resetSent && (
                  <div className="p-3 bg-green-50 text-green-600 text-sm rounded-xl border border-green-100">
                    Password reset email sent! Please check your inbox.
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                {authMode === 'login' && !resetSent && (
                  <div className="text-right">
                    <button 
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (authMode === 'signup' ? 'Create Account' : 'Login')}
                </motion.button>
              </motion.form>
            )}

            {authMethod === 'phone' && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                {!confirmationResult ? (
                  <form onSubmit={handlePhoneSignIn} className="space-y-4">
                    <div className="relative">
                      <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="tel" 
                        placeholder="+91 98765 43210" 
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div id="recaptcha-container"></div>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit" 
                      disabled={loading}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                    >
                      {loading ? 'Sending Code...' : 'Send OTP'}
                    </motion.button>
                  </form>
                ) : (
                  <motion.form 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onSubmit={handleVerifyCode} 
                    className="space-y-4"
                  >
                    <p className="text-sm text-slate-500 text-center">Enter the 6-digit code sent to {phoneNumber}</p>
                    <input 
                      type="text" 
                      placeholder="Verification Code" 
                      required
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-center text-2xl tracking-[0.5em] font-bold"
                    />
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit" 
                      disabled={loading}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                    >
                      {loading ? 'Verifying...' : 'Verify & Continue'}
                    </motion.button>
                    <button 
                      type="button"
                      onClick={() => setConfirmationResult(null)}
                      className="w-full text-sm text-indigo-600 font-semibold hover:underline"
                    >
                      Change Phone Number
                    </button>
                  </motion.form>
                )}
              </motion.div>
            )}
            
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                <button 
                  onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setError(''); }}
                  className="ml-2 text-indigo-600 font-bold hover:underline"
                >
                  {authMode === 'signup' ? 'Login' : 'Join Now'}
                </button>
              </p>
            </div>

            <p className="text-center mt-6 text-[10px] text-slate-400 leading-tight">
              By continuing, you agree to ShouldReach's <Link to="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>.
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <Hero3DModel />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
        <motion.div style={{ y: y1 }} className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-indigo-50 rounded-full blur-3xl opacity-70"></motion.div>
        <motion.div style={{ y: y2 }} className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-orange-50 rounded-full blur-3xl opacity-60"></motion.div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              style={{ opacity: heroOpacity, y: heroY }}
              className="max-w-2xl"
            >
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-100 text-orange-700 font-semibold text-sm mb-6 shadow-sm hover:shadow-md transition-shadow cursor-default"
                >
                  <span className="text-lg">🇮🇳</span>
                  Bharat Ka Apna Academic Network
                </motion.div>
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6"
                >
                  Empowering the Youth of <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-indigo-600 to-green-600">New India</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="text-xl text-slate-600 mb-10 leading-relaxed"
                >
                  Desh ke har campus se judein. Connect with students, professors, and alumni from universities across India. Build your profile, share your journey, and shape the future of Bharat.
                </motion.p>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="flex flex-col sm:flex-row gap-4 mb-8"
                >
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setAuthMode('signup'); setIsJoining(true); }} 
                    className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
                  >
                    Join Now <ArrowRight className="w-5 h-5" />
                  </motion.button>
                  <motion.a 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    href="#community" 
                    className="px-8 py-4 bg-white text-slate-700 border-2 border-slate-200 rounded-xl font-bold text-lg hover:border-indigo-200 hover:bg-indigo-50 transition-all flex items-center justify-center"
                  >
                    Explore Community
                  </motion.a>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="flex items-center gap-4 text-sm font-medium text-slate-500"
                >
                  <div className="h-px flex-1 bg-slate-200"></div>
                  <span>Let's Connect</span>
                  <div className="h-px flex-1 bg-slate-200"></div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                  className="mt-6 text-center sm:text-left"
                >
                  <span className="text-slate-600">Already a member? </span>
                  <button onClick={() => { setAuthMode('login'); setIsJoining(true); }} className="text-indigo-700 font-bold hover:underline">
                    Login
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.div 
              style={{ y: useTransform(scrollYProgress, [0, 1], [0, 100]) }}
              initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, type: "spring", bounce: 0.4 }}
              className="relative hidden lg:block h-[600px]"
            >
              {/* Abstract networking visualization */}
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100 to-orange-50 rounded-[3rem] transform rotate-3 shadow-2xl transition-transform hover:rotate-6 duration-500"></div>
              <div className="absolute inset-0 bg-white rounded-[3rem] transform -rotate-2 shadow-xl border border-slate-100 overflow-hidden p-8 transition-transform hover:-rotate-4 duration-500">
                
                {/* Floating Elements */}
                <motion.div 
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-12 left-8 bg-white p-4 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer"
                >
                  <img src="https://ui-avatars.com/api/?name=Aarav+Sharma&background=E0E7FF&color=4338CA" className="w-12 h-12 rounded-full" alt="Student" />
                  <div>
                    <p className="font-bold text-slate-900">Aarav Sharma</p>
                    <p className="text-xs text-slate-500">B.Tech, IIT Delhi</p>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 20, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute top-48 right-8 bg-white p-4 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer"
                >
                  <img src="https://ui-avatars.com/api/?name=Priya+Patel&background=FFEDD5&color=C2410C" className="w-12 h-12 rounded-full" alt="Student" />
                  <div>
                    <p className="font-bold text-slate-900">Priya Patel</p>
                    <p className="text-xs text-slate-500">MBA, IIM Ahmedabad</p>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, -25, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute bottom-32 left-16 bg-white p-4 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-4 hover:shadow-xl transition-shadow cursor-pointer"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Dr. Vikram Singh</p>
                    <p className="text-xs text-slate-500">Professor, JNU</p>
                  </div>
                </motion.div>

                {/* Connection Lines (SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                  <motion.path 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    d="M 120 100 Q 250 200 350 150" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="6 6" className="animate-[dash_20s_linear_infinite]" 
                  />
                  <motion.path 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
                    d="M 350 150 Q 250 350 150 400" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="6 6" 
                  />
                </svg>

                {/* Central Hub */}
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-10 cursor-pointer"
                >
                  <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-indigo-300 mb-4 ring-8 ring-indigo-50">
                    <Globe className="w-12 h-12 text-white" />
                  </div>
                  <div className="bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    10,000+ Connections
                  </div>
                </motion.div>

              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Join Section */}
      <section className="py-24 bg-white" id="about">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Why Join ShouldReach?</h2>
            <p className="text-lg text-slate-600">The ultimate platform designed specifically for the Indian academic ecosystem.</p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
              hidden: {}
            }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <FeatureCard 
              icon={Globe} 
              title="Connect Across India" 
              desc="Connect with students from universities across India. Break campus boundaries."
              color="bg-blue-50 text-blue-600"
            />
            <FeatureCard 
              icon={User} 
              title="Build Your Profile" 
              desc="Build your professional student profile. Showcase projects, skills, and academics."
              color="bg-indigo-50 text-indigo-600"
            />
            <FeatureCard 
              icon={Users} 
              title="Find Study Buddies" 
              desc="Find study buddies and collaborators for hackathons, research, and projects."
              color="bg-orange-50 text-orange-600"
            />
            <FeatureCard 
              icon={GraduationCap} 
              title="Connect with Mentors" 
              desc="Connect with professors and alumni mentors for career and academic guidance."
              color="bg-green-50 text-green-600"
            />
            <FeatureCard 
              icon={Award} 
              title="Share Achievements" 
              desc="Share achievements and success stories to inspire others and build your brand."
              color="bg-purple-50 text-purple-600"
            />
            <FeatureCard 
              icon={Briefcase} 
              title="Discover Opportunities" 
              desc="Discover internships, events, hackathons, and research opportunities."
              color="bg-rose-50 text-rose-600"
            />
          </motion.div>
        </div>
      </section>

      {/* Student Connection Section */}
      <section className="py-24 bg-slate-50 border-y border-slate-200 overflow-hidden" id="students">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
          >
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Find Your Campus Network</h2>
              <p className="text-lg text-slate-600">Meet students from different universities, collaborate on ideas, and grow together.</p>
            </div>
            <button className="text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-2 whitespace-nowrap group">
              View all students <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              visible: { transition: { staggerChildren: 0.15 } },
              hidden: {}
            }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <StudentCard name="Rahul Verma" uni="Delhi University" course="B.Sc Computer Science" skills={['Python', 'Data Science']} img="https://ui-avatars.com/api/?name=Rahul+Verma&background=random" />
            <StudentCard name="Sneha Reddy" uni="IIT Bombay" course="B.Tech Electrical" skills={['IoT', 'Robotics']} img="https://ui-avatars.com/api/?name=Sneha+Reddy&background=random" />
            <StudentCard name="Amit Kumar" uni="BHU" course="M.A. Economics" skills={['Research', 'Analytics']} img="https://ui-avatars.com/api/?name=Amit+Kumar&background=random" />
            <StudentCard name="Neha Sharma" uni="University of Mumbai" course="B.Com" skills={['Finance', 'Accounting']} img="https://ui-avatars.com/api/?name=Neha+Sharma&background=random" />
          </motion.div>
        </div>
      </section>

      {/* Professor Connect Section */}
      <section className="py-24 bg-white" id="professors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-indigo-950 rounded-3xl p-8 md:p-16 relative overflow-hidden"
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.3, 0.2]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
            ></motion.div>
            
            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">Connect With Professors and Mentors</h2>
                <ul className="space-y-4 mb-8">
                  <motion.li whileHover={{ x: 5 }} className="flex items-center gap-3 text-indigo-100 transition-transform"><CheckCircle2 className="w-6 h-6 text-green-400" /> Discover professors by department</motion.li>
                  <motion.li whileHover={{ x: 5 }} className="flex items-center gap-3 text-indigo-100 transition-transform"><CheckCircle2 className="w-6 h-6 text-green-400" /> Follow professors for updates</motion.li>
                  <motion.li whileHover={{ x: 5 }} className="flex items-center gap-3 text-indigo-100 transition-transform"><CheckCircle2 className="w-6 h-6 text-green-400" /> Request mentorship</motion.li>
                  <motion.li whileHover={{ x: 5 }} className="flex items-center gap-3 text-indigo-100 transition-transform"><CheckCircle2 className="w-6 h-6 text-green-400" /> Explore research guidance</motion.li>
                </ul>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-white text-indigo-950 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
                >
                  Explore Faculty Directory
                </motion.button>
              </motion.div>
              
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{
                  visible: { transition: { staggerChildren: 0.2 } },
                  hidden: {}
                }}
                className="grid sm:grid-cols-2 gap-4"
              >
                <ProfCard name="Dr. S. Krishnan" dept="Computer Science" uni="NIT Trichy" />
                <ProfCard name="Dr. Anjali Desai" dept="Physics" uni="IISc Bangalore" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Success Stories Section */}
      <section className="py-24 bg-slate-50" id="stories">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Success Stories From India’s Campuses</h2>
            <p className="text-lg text-slate-600">Read inspiring journeys of placements, startups, and research breakthroughs.</p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              visible: { transition: { staggerChildren: 0.2 } },
              hidden: {}
            }}
            className="grid md:grid-cols-3 gap-8"
          >
            <StoryCard 
              tag="Placement Success" 
              title="From Tier-3 College to Google: My Journey" 
              author="Karan Singh" 
              uni="RTU Kota"
            />
            <StoryCard 
              tag="Startup Founder" 
              title="Building a EdTech Startup from my Dorm Room" 
              author="Riya Gupta" 
              uni="Delhi University"
            />
            <StoryCard 
              tag="Research" 
              title="Publishing in IEEE as an Undergrad" 
              author="Arjun Nair" 
              uni="VIT Vellore"
            />
          </motion.div>
        </div>
      </section>

      {/* Student Testimonials Section */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">What Our Students Say</h2>
            <p className="text-lg text-slate-600">Join thousands of students who are already transforming their academic journey.</p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
              hidden: {}
            }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <TestimonialCard 
              quote="ShouldReach helped me find a research partner from another state. It's truly a game-changer for Indian students."
              author="Ananya Iyer"
              uni="Anna University"
              initial="A"
              color="bg-indigo-100 text-indigo-600"
            />
            <TestimonialCard 
              quote="The mentorship I received from alumni on this platform was instrumental in landing my first internship."
              author="Rohan Das"
              uni="Jadavpur University"
              initial="R"
              color="bg-orange-100 text-orange-600"
            />
            <TestimonialCard 
              quote="Finally, a professional network that understands the unique challenges of the Indian academic ecosystem."
              author="Meera Nair"
              uni="VIT Vellore"
              initial="M"
              color="bg-green-100 text-green-600"
            />
            <TestimonialCard 
              quote="Connecting with professors from different IITs has opened up so many research opportunities for me."
              author="Sahil Khan"
              uni="IIT Kanpur"
              initial="S"
              color="bg-purple-100 text-purple-600"
            />
          </motion.div>
        </div>
      </section>

      {/* Community Feed Preview */}
      <section className="py-24 bg-white border-t border-slate-200" id="community">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">Join the Conversation</h2>
              <p className="text-lg text-slate-600 mb-8">
                The community feed is where the magic happens. Share your achievements, ask for advice, discuss campus events, and stay updated with what's happening across Indian universities.
              </p>
              <div className="space-y-4">
                <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 transition-transform cursor-default">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600"><Award className="w-6 h-6" /></div>
                  <div><h4 className="font-bold text-slate-900">Achievements</h4><p className="text-sm text-slate-500">Celebrate wins together</p></div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 transition-transform cursor-default">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600"><Zap className="w-6 h-6" /></div>
                  <div><h4 className="font-bold text-slate-900">Campus Events</h4><p className="text-sm text-slate-500">Fests, workshops, and seminars</p></div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 transition-transform cursor-default">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600"><Briefcase className="w-6 h-6" /></div>
                  <div><h4 className="font-bold text-slate-900">Internship Updates</h4><p className="text-sm text-slate-500">Share openings and experiences</p></div>
                </motion.div>
              </div>
            </motion.div>

            {/* Mock Post */}
            <motion.div 
              initial={{ opacity: 0, y: 50, rotate: 5 }}
              whileInView={{ opacity: 1, y: 0, rotate: 1 }}
              whileHover={{ rotate: 0, scale: 1.02 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, type: "spring" }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <img src="https://ui-avatars.com/api/?name=Vikash+Yadav&background=random" className="w-12 h-12 rounded-full" alt="User" />
                <div>
                  <h4 className="font-bold text-slate-900">Vikash Yadav</h4>
                  <p className="text-xs text-slate-500">Student • Jadavpur University • 2h ago</p>
                </div>
              </div>
              <p className="text-slate-800 mb-4">
                Thrilled to share that our team won the 1st prize at the Smart India Hackathon 2026! 🏆 Huge thanks to my teammates and our mentor Dr. Das for the continuous guidance. #SIH2026 #Hackathon #Innovation
              </p>
              <div className="bg-slate-100 h-48 rounded-xl mb-4 flex items-center justify-center text-slate-400 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 group-hover:opacity-0 transition-opacity"></div>
                <Award className="w-16 h-16 text-indigo-300 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-center gap-6 pt-4 border-t border-slate-100 text-slate-500">
                <button className="flex items-center gap-2 hover:text-indigo-600 transition-colors"><Heart className="w-5 h-5" /> 245</button>
                <button className="flex items-center gap-2 hover:text-indigo-600 transition-colors"><MessageSquare className="w-5 h-5" /> 42</button>
                <button className="flex items-center gap-2 hover:text-indigo-600 ml-auto transition-colors"><Share2 className="w-5 h-5" /></button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Opportunities Section */}
      <section className="py-24 bg-slate-900 text-white" id="opportunities">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Explore Opportunities</h2>
            <p className="text-lg text-slate-400">Find the right stepping stone for your career.</p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
              hidden: {}
            }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4"
          >
            <OppCard icon={Briefcase} title="Internships" />
            <OppCard icon={Search} title="Research Programs" />
            <OppCard icon={Users} title="Student Events" />
            <OppCard icon={BookOpen} title="Workshops" />
            <OppCard icon={Zap} title="Hackathons" />
          </motion.div>
        </div>
      </section>

      {/* University Network Section */}
      <section className="py-24 bg-white" id="universities">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-12"
          >
            Students From Universities Across India
          </motion.h2>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              visible: { transition: { staggerChildren: 0.05 } },
              hidden: {}
            }}
            className="flex flex-wrap justify-center gap-4 md:gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500"
          >
            {/* Mock University Tags */}
            {['Delhi University', 'IITs & NITs', 'BHU', 'JNU', 'University of Mumbai', 'University of Calcutta', 'Anna University', 'BITS Pilani'].map((uni) => (
              <motion.span 
                key={uni}
                variants={{
                  hidden: { opacity: 0, scale: 0.8 },
                  visible: { opacity: 1, scale: 1 }
                }}
                whileHover={{ scale: 1.1, backgroundColor: '#EEF2FF', color: '#4F46E5' }}
                className="px-6 py-3 bg-slate-100 rounded-xl font-bold text-slate-800 text-lg cursor-default transition-colors"
              >
                {uni}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Community Statistics Section */}
      <section className="py-16 bg-indigo-600 text-white overflow-hidden relative">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500 rounded-full blur-3xl opacity-50"
        ></motion.div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
              hidden: {}
            }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            {[
              { num: "50K+", label: "Students Connected" },
              { num: "800+", label: "Universities Joined" },
              { num: "2,000+", label: "Professors Onboard" },
              { num: "10K+", label: "Stories Shared" }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <div className="text-4xl font-extrabold mb-2">{stat.num}</div>
                <div className="text-indigo-200 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final Call-To-Action Section */}
      <section className="py-32 relative overflow-hidden flex items-center justify-center min-h-[600px]">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover opacity-30"
          >
            <source src="https://assets.mixkit.co/videos/preview/mixkit-group-of-friends-partying-happily-4640-large.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-indigo-900/80 mix-blend-multiply"></div>
        </div>

        <motion.div 
          style={{ y: useTransform(scrollYProgress, [0.8, 1], [100, 0]) }}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">Join India’s Student Professional Network</h2>
          <p className="text-xl text-indigo-100 mb-10">Don't miss out on opportunities, mentorship, and connections that can shape your career.</p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setAuthMode('signup'); setIsJoining(true); }} 
              className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-all shadow-xl shadow-indigo-900/20"
            >
              Create Profile
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setAuthMode('signup'); setIsJoining(true); }} 
              className="px-8 py-4 bg-transparent text-white border-2 border-white/30 rounded-xl font-bold text-lg hover:bg-white/10 transition-all"
            >
              Join Now
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setAuthMode('login'); setIsJoining(true); }} 
              className="px-8 py-4 bg-indigo-500 text-white rounded-xl font-bold text-lg hover:bg-indigo-400 transition-all"
            >
              Login
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Handshake className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">ShouldReach</span>
              </div>
              <p className="text-sm max-w-sm">
                Built with ❤️ in India. For the students, professors, and future leaders of Bharat.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/guidelines" className="hover:text-white transition-colors">Community Guidelines</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 text-sm text-center md:text-left flex flex-col md:flex-row justify-between items-center">
            <p>© 2026 Divyam Enterprise Pvt. Ltd. All rights reserved.</p>
            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span className="w-3 h-3 rounded-full bg-white"></span>
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
            </div>
          </div>
        </motion.div>
      </footer>
    </div>
  );
}

// Subcomponents

function RoleOption({ icon: Icon, title, description, selected, onClick }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
        selected 
          ? 'border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-100' 
          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
      }`}
    >
      <div className={`p-3 rounded-xl ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h4 className={`font-bold ${selected ? 'text-indigo-900' : 'text-slate-900'}`}>{title}</h4>
        <p className={`text-sm ${selected ? 'text-indigo-700' : 'text-slate-500'}`}>{description}</p>
      </div>
      {selected && (
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          className="ml-auto"
        >
          <CheckCircle2 className="w-5 h-5 text-indigo-600" />
        </motion.div>
      )}
    </motion.button>
  );
}

function FeatureCard({ icon: Icon, title, desc, color }: any) {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function StudentCard({ name, uni, course, skills, img }: any) {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1 }
      }}
      whileHover={{ y: -10, scale: 1.02 }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all text-center group cursor-grab active:cursor-grabbing z-10 relative"
    >
      <img src={img} alt={name} className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-slate-50 group-hover:border-indigo-50 transition-colors" />
      <h3 className="font-bold text-lg text-slate-900">{name}</h3>
      <p className="text-sm text-indigo-600 font-medium mb-1">{uni}</p>
      <p className="text-xs text-slate-500 mb-4">{course}</p>
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {skills.map((s: string) => (
          <span key={s} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">{s}</span>
        ))}
      </div>
      <button className="w-full py-2 border border-indigo-600 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-600 hover:text-white transition-colors">
        Connect
      </button>
    </motion.div>
  );
}

function ProfCard({ name, dept, uni }: any) {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0 }
      }}
      whileHover={{ scale: 1.05 }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl text-white hover:bg-white/20 transition-colors cursor-grab active:cursor-grabbing z-10 relative"
    >
      <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center mb-4">
        <BookOpen className="w-6 h-6" />
      </div>
      <h3 className="font-bold text-lg mb-1">{name}</h3>
      <p className="text-indigo-200 text-sm mb-4">{dept} • {uni}</p>
      <button className="text-sm font-semibold text-white flex items-center gap-1 hover:gap-2 transition-all">
        View Profile <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function StoryCard({ tag, title, author, uni }: any) {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0 }
      }}
      whileHover={{ y: -10 }}
      className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col h-full"
    >
      <span className="inline-block px-3 py-1 bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-wider rounded-full mb-4 self-start">
        {tag}
      </span>
      <h3 className="text-xl font-bold text-slate-900 mb-4 leading-tight flex-1">{title}</h3>
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">
          {author.charAt(0)}
        </div>
        <div>
          <p className="font-bold text-sm text-slate-900">{author}</p>
          <p className="text-xs text-slate-500">{uni}</p>
        </div>
      </div>
    </motion.div>
  );
}

function TestimonialCard({ quote, author, uni, initial, color }: any) {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      whileHover={{ y: -5 }}
      className="bg-slate-50 p-8 rounded-2xl border border-slate-100 relative group"
    >
      <Quote className="absolute top-4 right-4 w-8 h-8 text-slate-200 group-hover:text-indigo-100 transition-colors" />
      <p className="text-slate-700 italic mb-6 relative z-10">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${color}`}>
          {initial}
        </div>
        <div>
          <h4 className="font-bold text-sm text-slate-900">{author}</h4>
          <p className="text-xs text-slate-500">{uni}</p>
        </div>
      </div>
    </motion.div>
  );
}

function OppCard({ icon: Icon, title }: any) {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1 }
      }}
      whileHover={{ scale: 1.05, backgroundColor: '#334155' }}
      className="bg-slate-800 border border-slate-700 p-6 rounded-2xl text-center transition-all cursor-pointer group"
    >
      <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-indigo-400" />
      </div>
      <h3 className="font-bold text-white">{title}</h3>
    </motion.div>
  );
}

// UserRoleIcon is just a placeholder for the generic user icon
function UserRoleIcon(props: any) {
  return <User {...props} />;
}

