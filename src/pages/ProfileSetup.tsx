import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { 
  User, MapPin, Building, GraduationCap, 
  BookOpen, Briefcase, ArrowRight, ArrowLeft, 
  CheckCircle2, Sparkles, Globe, Linkedin, Github, Twitter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CollegeSelect } from '../components/CollegeSelect';

export function ProfileSetup() {
  const { user, profile, setProfile } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || user?.displayName || '',
    headline: profile?.headline || '',
    city: profile?.city || '',
    state: profile?.state || '',
    university: profile?.university || '',
    collegeCity: profile?.collegeCity || '',
    collegeState: profile?.collegeState || '',
    department: profile?.department || '',
    currentYear: profile?.currentYear || '',
    bio: profile?.bio || '',
    skills: profile?.skills?.join(', ') || '',
    socialLinks: {
      linkedin: profile?.socialLinks?.linkedin || '',
      github: profile?.socialLinks?.github || '',
      portfolio: profile?.socialLinks?.portfolio || '',
      twitter: profile?.socialLinks?.twitter || ''
    }
  });

  // Effect to handle missing profile
  React.useEffect(() => {
    const createMissingProfile = async () => {
      if (user && !profile && !isCreating) {
        setIsCreating(true);
        try {
          const userRef = doc(db, 'users', user.uid);
          const newProfile = {
            uid: user.uid,
            role: 'student', // Default role
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            displayName: user.displayName || 'New User',
            photoURL: user.photoURL || '',
            connectionsCount: 0,
            isVerified: false,
            isProfileComplete: false,
            visibility: 'public',
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, newProfile);
          // onSnapshot in App.tsx will update the profile state
        } catch (error) {
          console.error("Error creating missing profile:", error);
        } finally {
          setIsCreating(false);
        }
      }
    };
    createMissingProfile();
  }, [user?.uid, profile?.uid, isCreating]);

  if (!user) {
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Preparing your profile...</p>
        </div>
      </div>
    );
  }

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedData = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        isProfileComplete: true,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(userRef, updatedData);
      setProfile({ ...profile, ...updatedData });
      navigate('/feed');
    } catch (error) {
      console.error("Error completing profile setup:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Basic Information</h2>
              <p className="text-slate-500">Let's start with the basics to help people identify you.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required
                  value={formData.displayName}
                  onChange={e => setFormData({...formData, displayName: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="e.g. Aarav Sharma"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Professional Headline *</label>
                <input 
                  type="text" 
                  required
                  value={formData.headline}
                  onChange={e => setFormData({...formData, headline: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="e.g. Computer Science Student | Aspiring Developer"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">City</label>
                  <input 
                    type="text" 
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="e.g. New Delhi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">State</label>
                  <input 
                    type="text" 
                    value={formData.state}
                    onChange={e => setFormData({...formData, state: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="e.g. Delhi"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleNext}
              disabled={!formData.displayName || !formData.headline}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Next Step <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        );

      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Academic Details</h2>
              <p className="text-slate-500">Tell us about your university and course.</p>
            </div>

            <div className="space-y-4">
              <CollegeSelect 
                value={formData.university} 
                onChange={val => setFormData({...formData, university: val})} 
                cityValue={formData.collegeCity}
                onCityChange={val => setFormData({...formData, collegeCity: val})}
                stateValue={formData.collegeState}
                onStateChange={val => setFormData({...formData, collegeState: val})}
              />
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Department / Major *</label>
                <input 
                  type="text" 
                  required
                  value={formData.department}
                  onChange={e => setFormData({...formData, department: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="e.g. Computer Science & Engineering"
                />
              </div>
              {profile.role === 'student' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Current Year *</label>
                  <select 
                    value={formData.currentYear}
                    onChange={e => setFormData({...formData, currentYear: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  >
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
              )}
              {profile.role === 'alumni' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Graduation Year *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.currentYear}
                      onChange={e => setFormData({...formData, currentYear: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="e.g. 2020"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Current Company</label>
                    <input 
                      type="text" 
                      value={formData.headline.split(' at ')[1] || ''}
                      onChange={e => setFormData({...formData, headline: `${formData.headline.split(' at ')[0]} at ${e.target.value}`})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="e.g. Google"
                    />
                  </div>
                </div>
              )}
              {profile.role === 'professor' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Designation *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.headline}
                    onChange={e => setFormData({...formData, headline: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="e.g. Assistant Professor"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleBack}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" /> Back
              </button>
              <button 
                onClick={handleNext}
                disabled={!formData.university || !formData.department}
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Next Step <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Skills & Bio</h2>
              <p className="text-slate-500">Showcase your expertise and tell your story.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Skills (comma separated) *</label>
                <input 
                  type="text" 
                  required
                  value={formData.skills}
                  onChange={e => setFormData({...formData, skills: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="e.g. React, Node.js, Python, UI Design"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">About You *</label>
                <textarea 
                  required
                  value={formData.bio}
                  onChange={e => setFormData({...formData, bio: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  rows={5}
                  placeholder="Write a brief summary about your background, interests, and goals..."
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleBack}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" /> Back
              </button>
              <button 
                onClick={handleNext}
                disabled={!formData.skills || !formData.bio}
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Next Step <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Social Links</h2>
              <p className="text-slate-500">Connect your other professional profiles.</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="url" 
                  value={formData.socialLinks.linkedin}
                  onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, linkedin: e.target.value}})}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="LinkedIn Profile URL"
                />
              </div>
              <div className="relative">
                <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="url" 
                  value={formData.socialLinks.github}
                  onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, github: e.target.value}})}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="GitHub Profile URL"
                />
              </div>
              <div className="relative">
                <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="url" 
                  value={formData.socialLinks.twitter}
                  onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, twitter: e.target.value}})}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Twitter Profile URL"
                />
              </div>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="url" 
                  value={formData.socialLinks.portfolio}
                  onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, portfolio: e.target.value}})}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Portfolio Website URL"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleBack}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" /> Back
              </button>
              <button 
                onClick={handleComplete}
                disabled={loading}
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Complete Setup'} <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-indigo-600 uppercase tracking-wider">Step {step} of 4</span>
            <span className="text-sm font-bold text-slate-400">{Math.round((step / 4) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(step / 4) * 100}%` }}
              className="bg-indigo-600 h-full"
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        <p className="text-center mt-8 text-sm text-slate-400">
          You can always update these details later from your profile settings.
        </p>
      </div>
    </div>
  );
}
