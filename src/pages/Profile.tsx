import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { db, auth, sendEmailVerification } from '../firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs, addDoc, onSnapshot, increment, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Edit2, Save, X, BookOpen, GraduationCap, Briefcase, Award, Eye, Heart, Plus, ChevronDown, ChevronUp, Trash2, Users, BarChart2, Search, ArrowRight, UserPlus, CheckCircle2, Linkedin, Github, Globe, Twitter, MessageSquare, Sparkles } from 'lucide-react';
import { ProfileVisibility, Education, Experience, Achievement, Certification, Project, UserProfile } from '../types';
import { CollegeSelect } from '../components/CollegeSelect';
import { formatDistanceToNow } from 'date-fns';
import { getProfileAdvice } from '../services/geminiService';
import { sendNotification } from '../services/notificationService';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';

export const AVAILABLE_COMPANIES = [
  { id: 'google', name: 'Google', followers: '30M followers', logo: 'https://logo.clearbit.com/google.com' },
  { id: 'microsoft', name: 'Microsoft', followers: '20M followers', logo: 'https://logo.clearbit.com/microsoft.com' },
  { id: 'apple', name: 'Apple', followers: '15M followers', logo: 'https://logo.clearbit.com/apple.com' },
  { id: 'amazon', name: 'Amazon', followers: '25M followers', logo: 'https://logo.clearbit.com/amazon.com' },
  { id: 'meta', name: 'Meta', followers: '12M followers', logo: 'https://logo.clearbit.com/meta.com' },
  { id: 'netflix', name: 'Netflix', followers: '8M followers', logo: 'https://logo.clearbit.com/netflix.com' },
  { id: 'tcs', name: 'Tata Consultancy Services', followers: '18M followers', logo: 'https://logo.clearbit.com/tcs.com' },
  { id: 'tp', name: 'Teleperformance', followers: '3M followers', logo: 'https://logo.clearbit.com/teleperformance.com' },
];

export function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile, setProfile: setCurrentUserProfile } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);
  const [customCompany, setCustomCompany] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [connectionSent, setConnectionSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSendVerification = async () => {
    if (auth.currentUser && auth.currentUser.email && !auth.currentUser.emailVerified) {
      try {
        await sendEmailVerification(auth.currentUser);
        setVerificationSent(true);
      } catch (error) {
        console.error("Error sending verification email:", error);
      }
    }
  };

  const isOwnProfile = !userId || userId === user?.uid;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      if (isOwnProfile) {
        setProfile(currentUserProfile);
        setLoading(false);
      } else if (userId) {
        try {
          const docRef = doc(db, 'users', userId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchProfile();
  }, [userId, isOwnProfile, currentUserProfile]);

  const [expandedSections, setExpandedSections] = useState({
    experience: true,
    achievements: true,
    education: true,
    projects: true,
    skills: true,
    certifications: true,
    followedCompanies: true,
    interests: true,
    socialLinks: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleEditProfile = () => {
    setIsEditing(true);
    setExpandedSections({
      experience: false,
      achievements: false,
      education: false,
      projects: false,
      skills: false,
      certifications: false,
      followedCompanies: false,
      interests: false,
      socialLinks: false
    });
  };

  const handleEditSection = (section: keyof typeof expandedSections) => {
    setIsEditing(true);
    setExpandedSections({
      experience: false,
      achievements: false,
      education: false,
      projects: false,
      skills: false,
      certifications: false,
      followedCompanies: false,
      interests: false,
      socialLinks: false,
      [section]: true
    });
  };

  const [activities, setActivities] = useState<{ id: string; type: 'post' | 'comment'; content: string; createdAt: string }[]>([]);
  const [viewers, setViewers] = useState<{ id: string; viewerId: string; viewerName: string; viewerPhoto: string; createdAt: string }[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [endorsements, setEndorsements] = useState<{ [skill: string]: string[] }>({});
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [profileConnectionsCount, setProfileConnectionsCount] = useState(0);

  useEffect(() => {
    if (!profile?.uid) return;

    const q1 = query(collection(db, 'connections'), where('requesterId', '==', profile.uid), where('status', '==', 'accepted'));
    const q2 = query(collection(db, 'connections'), where('receiverId', '==', profile.uid), where('status', '==', 'accepted'));

    let count1 = 0;
    let count2 = 0;

    const updateCount = () => setProfileConnectionsCount(count1 + count2);

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      count1 = snapshot.size;
      updateCount();
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      count2 = snapshot.size;
      updateCount();
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.uid) return;

    // Fetch user's posts
    const postsQuery = query(collection(db, 'posts'), where('authorId', '==', profile.uid));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const userPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'post' as const,
        content: doc.data().content,
        createdAt: doc.data().createdAt
      }));
      setActivities(prev => {
        const otherActivities = prev.filter(a => a.type !== 'post');
        return [...otherActivities, ...userPosts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    // Fetch user's comments
    const commentsQuery = query(collection(db, 'comments'), where('authorId', '==', profile.uid));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const userComments = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'comment' as const,
        content: doc.data().content,
        createdAt: doc.data().createdAt
      }));
      setActivities(prev => {
        const otherActivities = prev.filter(a => a.type !== 'comment');
        return [...otherActivities, ...userComments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });

    return () => {
      unsubscribePosts();
      unsubscribeComments();
    };
  }, [profile?.uid]);

  // Track profile view
  useEffect(() => {
    if (!user || !profile || isOwnProfile) return;

    const trackView = async () => {
      try {
        const q = query(
          collection(db, 'profile_views'), 
          where('viewerId', '==', user.uid), 
          where('targetId', '==', profile.uid)
        );
        const viewSnap = await getDocs(q);

        if (viewSnap.empty) {
          await addDoc(collection(db, 'profile_views'), {
            viewerId: user.uid,
            viewerName: currentUserProfile?.displayName || 'Someone',
            viewerPhoto: currentUserProfile?.photoURL || '',
            targetId: profile.uid,
            createdAt: new Date().toISOString()
          });
          
          // Increment view count in user profile
          const userRef = doc(db, 'users', profile.uid);
          await updateDoc(userRef, {
            'analytics.profileViews': increment(1)
          });
        }
      } catch (error) {
        console.error("Error tracking profile view:", error);
      }
    };

    trackView();
  }, [profile?.uid, isOwnProfile, user?.uid]);

  // Fetch profile viewers
  useEffect(() => {
    if (!user || !profile || !isOwnProfile) return;

    const viewersQuery = query(collection(db, 'profile_views'), where('targetId', '==', profile.uid));
    const unsubscribeViewers = onSnapshot(viewersQuery, (snapshot) => {
      const viewersList = snapshot.docs.map(doc => ({
        id: doc.id,
        viewerId: doc.data().viewerId,
        viewerName: doc.data().viewerName,
        viewerPhoto: doc.data().viewerPhoto,
        createdAt: doc.data().createdAt
      })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setViewers(viewersList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'profile_views');
    });
    return () => unsubscribeViewers();
  }, [profile?.uid, isOwnProfile, user?.uid]);

  // Fetch current user's connections
  useEffect(() => {
    if (!user) return;

    const q1 = query(collection(db, 'connections'), where('requesterId', '==', user.uid));
    const q2 = query(collection(db, 'connections'), where('receiverId', '==', user.uid));

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      const conns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConnections(prev => {
        const otherConns = prev.filter(c => c.requesterId !== user.uid);
        return [...otherConns, ...conns];
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'connections');
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      const conns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConnections(prev => {
        const otherConns = prev.filter(c => c.receiverId !== user.uid);
        return [...otherConns, ...conns];
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'connections');
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user?.uid]);

  const handleConnectViewer = async (receiverId: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'connections'), {
        requesterId: user.uid,
        receiverId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Send notification
      await sendNotification(
        receiverId,
        'connection_request',
        'New Connection Request',
        `${currentUserProfile?.displayName || 'Someone'} wants to connect with you.`,
        '/network?tab=requests',
        { requesterId: user.uid }
      );
    } catch (error) {
      console.error("Error sending connection request:", error);
    }
  };

  useEffect(() => {
    if (!profile?.uid) return;

    // Fetch skill endorsements
    const endorsementsQuery = query(collection(db, 'skills_endorsements'), where('userId', '==', profile.uid));
    const unsubscribeEndorsements = onSnapshot(endorsementsQuery, (snapshot) => {
      const endorsementsMap: { [skill: string]: string[] } = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!endorsementsMap[data.skill]) {
          endorsementsMap[data.skill] = [];
        }
        endorsementsMap[data.skill].push(data.endorserId);
      });
      setEndorsements(endorsementsMap);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'skills_endorsements');
    });

    return () => unsubscribeEndorsements();
  }, [profile?.uid]);

  const handleAnalyzeProfile = async () => {
    if (!profile || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const advice = await getProfileAdvice(profile);
      setAiAdvice(advice);
      
      // Save to Firestore if it's the user's own profile
      if (isOwnProfile) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { aiAdvice: advice });
      }
    } catch (error) {
      console.error("Error analyzing profile:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (profile?.aiAdvice) {
      setAiAdvice(profile.aiAdvice);
    }
  }, [profile?.aiAdvice]);

  const handleEndorseSkill = async (skill: string) => {
    if (!user || !profile || isOwnProfile) return;

    const existingEndorsement = Object.entries(endorsements).find(([s, endorsers]) => s === skill && endorsers.includes(user.uid));

    if (existingEndorsement) {
      // Remove endorsement
      const q = query(collection(db, 'skills_endorsements'), 
        where('userId', '==', profile.uid),
        where('endorserId', '==', user.uid),
        where('skill', '==', skill)
      );
      const snap = await getDocs(q);
      snap.forEach(async (d) => {
        await deleteDoc(doc(db, 'skills_endorsements', d.id));
      });
    } else {
      // Add endorsement
      await addDoc(collection(db, 'skills_endorsements'), {
        userId: profile.uid,
        endorserId: user.uid,
        skill,
        createdAt: new Date().toISOString()
      });
    }
  };

  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    headline: profile?.headline || '',
    city: profile?.city || '',
    state: profile?.state || '',
    university: profile?.university || '',
    collegeCity: profile?.collegeCity || '',
    collegeState: profile?.collegeState || '',
    department: profile?.department || '',
    bio: profile?.bio || '',
    skills: profile?.skills?.join(', ') || '',
    interests: profile?.interests?.join(', ') || '',
    visibility: profile?.visibility || 'public',
    education: profile?.education || [],
    experience: profile?.experience || [],
    achievements: profile?.achievements || [],
    certifications: profile?.certifications || [],
    projects: profile?.projects || [],
    socialLinks: profile?.socialLinks || { linkedin: '', github: '', portfolio: '', googleScholar: '', twitter: '' }
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        headline: profile.headline || '',
        city: profile.city || '',
        state: profile.state || '',
        university: profile.university || '',
        collegeCity: profile.collegeCity || '',
        collegeState: profile.collegeState || '',
        department: profile.department || '',
        bio: profile.bio || '',
        skills: profile.skills?.join(', ') || '',
        interests: profile.interests?.join(', ') || '',
        visibility: profile.visibility || 'public',
        education: profile.education || [],
        experience: profile.experience || [],
        achievements: profile.achievements || [],
        certifications: profile.certifications || [],
        projects: profile.projects || [],
        socialLinks: profile.socialLinks || { linkedin: '', github: '', portfolio: '', googleScholar: '', twitter: '' }
      });
    }
  }, [profile?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-900">Profile not found</h2>
        <p className="text-slate-500 mt-2">The user you are looking for does not exist or has a private profile.</p>
        <button onClick={() => navigate('/network')} className="mt-4 text-indigo-600 font-semibold hover:underline">
          Go back to Network
        </button>
      </div>
    );
  }

  const calculateProgress = () => {
    const fields = [
      !!profile.displayName,
      !!profile.headline,
      !!(profile.city || profile.state),
      !!profile.university,
      !!profile.bio,
      !!(profile.skills && profile.skills.length > 0),
      !!(profile.education && profile.education.length > 0),
      !!(profile.experience && profile.experience.length > 0),
      !!(profile.achievements && profile.achievements.length > 0),
      !!(profile.certifications && profile.certifications.length > 0),
      !!(profile.projects && profile.projects.length > 0)
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };
  const progress = calculateProgress();

  const handleSave = async () => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedData = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        interests: formData.interests.split(',').map(s => s.trim()).filter(Boolean)
      };
      
      await updateDoc(userRef, updatedData);
      if (isOwnProfile) {
        setCurrentUserProfile({ ...currentUserProfile!, ...updatedData });
      }
      setProfile({ ...profile!, ...updatedData });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleMessage = async () => {
    if (!user || !profile || isOwnProfile || isMessaging) return;

    setIsMessaging(true);
    try {
      // Check if chat already exists
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(q);
      const existingChat = snapshot.docs.find(doc => {
        const participants = doc.data().participants as string[];
        return participants.includes(profile.uid);
      });

      if (existingChat) {
        navigate(`/messages?chatId=${existingChat.id}`);
      } else {
        // Create new chat
        const newChatRef = await addDoc(collection(db, 'chats'), {
          participants: [user.uid, profile.uid],
          lastMessage: '',
          lastMessageTime: new Date().toISOString(),
          unreadCount: {
            [user.uid]: 0,
            [profile.uid]: 0
          }
        });
        navigate(`/messages?chatId=${newChatRef.id}`);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      handleFirestoreError(error, OperationType.CREATE, 'chats');
    } finally {
      setIsMessaging(false);
    }
  };

  const toggleCompanyFollow = async (companyId: string) => {
    if (!user || !currentUserProfile) return;
    
    try {
      const currentFollowed = currentUserProfile.followedCompanies || [];
      let newFollowed;
      
      if (currentFollowed.includes(companyId)) {
        newFollowed = currentFollowed.filter(id => id !== companyId);
      } else {
        newFollowed = [...currentFollowed, companyId];
      }
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { followedCompanies: newFollowed });
      
      const updatedProfile = { ...currentUserProfile, followedCompanies: newFollowed };
      setCurrentUserProfile(updatedProfile);
      
      if (isOwnProfile) {
        setProfile(updatedProfile);
      }
    } catch (error) {
      console.error("Error updating followed companies:", error);
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [
        ...prev.education,
        { id: Date.now().toString(), university: 'University Name', college: '', city: '', state: '', degree: 'Bachelor of Science', fieldOfStudy: 'Computer Science', startYear: '2020', endYear: '2024', grade: '', description: '' }
      ]
    }));
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu)
    }));
  };

  const removeEducation = (id: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  };

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [
        ...prev.experience,
        { id: Date.now().toString(), organization: 'Organization Name', role: 'Software Engineer', type: '', startDate: 'Jan 2023', endDate: 'Present', description: 'Role description...', achievements: '' }
      ]
    }));
  };

  const updateExperience = (id: string, field: keyof Experience, value: string) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
    }));
  };

  const removeExperience = (id: string) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    }));
  };

  const addAchievement = () => {
    setFormData(prev => ({
      ...prev,
      achievements: [
        ...prev.achievements,
        { id: Date.now().toString(), title: '', description: '', date: '', issuer: '' }
      ]
    }));
  };

  const updateAchievement = (id: string, field: keyof Achievement, value: string) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements.map(ach => ach.id === id ? { ...ach, [field]: value } : ach)
    }));
  };

  const removeAchievement = (id: string) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements.filter(ach => ach.id !== id)
    }));
  };

  const addCertification = () => {
    setFormData(prev => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        { id: Date.now().toString(), title: 'New Certification', issuer: 'Issuing Organization', date: 'Jul 2025', link: 'https://' }
      ]
    }));
  };

  const updateCertification = (id: string, field: keyof Certification, value: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.map(cert => cert.id === id ? { ...cert, [field]: value } : cert)
    }));
  };

  const removeCertification = (id: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(cert => cert.id !== id)
    }));
  };

  const addProject = () => {
    setFormData(prev => ({
      ...prev,
      projects: [
        ...prev.projects,
        { id: Date.now().toString(), title: 'New Project', description: 'Project description...', technologies: 'React, Node.js', link: 'https://', duration: 'Jan 2023 - Present' }
      ]
    }));
  };

  const updateProject = (id: string, field: keyof Project, value: string) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.map(proj => proj.id === id ? { ...proj, [field]: value } : proj)
    }));
  };

  const removeProject = (id: string) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.filter(proj => proj.id !== id)
    }));
  };

  return (
    <div className={`max-w-[1128px] mx-auto pt-6 px-4 sm:px-6 lg:px-8 ${isEditing ? 'pb-24' : 'pb-12'}`}>
      {isOwnProfile && auth.currentUser && auth.currentUser.email && !auth.currentUser.emailVerified && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-amber-800 font-semibold">Verify your email address</h3>
            <p className="text-amber-700 text-sm mt-1">
              Please verify your email address to secure your account and access all features.
            </p>
          </div>
          <button
            onClick={handleSendVerification}
            disabled={verificationSent}
            className={`shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              verificationSent
                ? 'bg-amber-100 text-amber-600 cursor-not-allowed'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {verificationSent ? 'Verification Sent' : 'Send Verification Link'}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Content - Left Column */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Header Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Cover Photo */}
            <div className="h-48 bg-gradient-to-r from-blue-100 to-blue-300 relative">
              {isOwnProfile && (
                <button className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-sm text-slate-600 hover:bg-slate-50 transition-colors">
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <div className="px-6 pb-6">
              <div className="flex justify-between items-start">
                {/* Profile Photo */}
                <div className="-mt-20 relative z-10">
                  <img 
                    src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&background=random&size=160`} 
                    alt={profile.displayName} 
                    className="w-40 h-40 rounded-full border-4 border-white shadow-sm bg-white object-cover"
                  />
                </div>
                
                <div className="pt-4">
                  {isOwnProfile && (
                    !isEditing ? (
                      <button 
                        onClick={handleEditProfile}
                        className="flex items-center gap-2 px-4 py-1.5 border border-slate-300 text-slate-700 rounded-full font-semibold hover:bg-slate-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Profile
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsEditing(false)}
                          className="flex items-center gap-2 px-4 py-1.5 border border-slate-500 text-slate-600 rounded-full font-semibold hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleSave}
                          className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                {isEditing ? (
                  <div className="space-y-4 max-w-2xl mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                      <input 
                        type="text" 
                        value={formData.displayName}
                        onChange={e => setFormData({...formData, displayName: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Headline</label>
                      <input 
                        type="text" 
                        value={formData.headline}
                        onChange={e => setFormData({...formData, headline: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g. Computer Science Student at Delhi University"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                        <input 
                          type="text" 
                          value={formData.city}
                          onChange={e => setFormData({...formData, city: e.target.value})}
                          className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                        <input 
                          type="text" 
                          value={formData.state}
                          onChange={e => setFormData({...formData, state: e.target.value})}
                          className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <CollegeSelect 
                        value={formData.university} 
                        onChange={(val) => setFormData({...formData, university: val})} 
                        cityValue={formData.collegeCity}
                        onCityChange={(val) => setFormData({...formData, collegeCity: val})}
                        stateValue={formData.collegeState}
                        onStateChange={(val) => setFormData({...formData, collegeState: val})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Course / Department</label>
                      <input 
                        type="text" 
                        value={formData.department}
                        onChange={e => setFormData({...formData, department: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">About / Bio</label>
                      <textarea 
                        value={formData.bio}
                        onChange={e => setFormData({...formData, bio: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                        placeholder="Write a brief summary about yourself..."
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
                      {profile.displayName}
                      {profile.isVerified && <CheckCircle2 className="w-5 h-5 text-slate-500" />}
                    </h1>
                    <p className="text-slate-900 mt-1 text-lg">{profile.headline || profile.department || 'Student'}</p>
                    <p className="text-slate-500 text-sm mt-1">
                      {profile.city || 'City'}, {profile.state || 'India'} · <a href="#" className="text-blue-600 font-semibold hover:underline">Contact info</a>
                    </p>
                    <p className="text-blue-600 font-semibold text-sm mt-1 hover:underline cursor-pointer">
                      {profileConnectionsCount} connections
                    </p>
                    
                    {!isOwnProfile && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button className="px-4 py-1.5 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors">
                          Follow
                        </button>
                        <button 
                          onClick={handleMessage}
                          disabled={isMessaging}
                          className={`px-4 py-1.5 border border-blue-600 text-blue-600 rounded-full font-semibold transition-colors flex items-center gap-2 ${
                            isMessaging ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          {isMessaging ? 'Opening...' : 'Message'}
                        </button>
                        <button 
                          onClick={() => setConnectionSent(true)}
                          disabled={connectionSent}
                          className={`px-4 py-1.5 border rounded-full font-semibold transition-colors ${
                            connectionSent 
                              ? 'border-green-600 text-green-600 bg-green-50' 
                              : 'border-slate-500 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {connectionSent ? 'Pending' : 'Connect'}
                        </button>
                        <button className="px-4 py-1.5 border border-slate-500 text-slate-600 rounded-full font-semibold hover:bg-slate-50 transition-colors">
                          More
                        </button>
                      </div>
                    )}

                    {profile.bio && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="mt-6"
                      >
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">About</h2>
                        <p className="text-slate-700 whitespace-pre-wrap">{profile.bio}</p>
                      </motion.div>
                    )}

                    {isOwnProfile && (
                      <>
                        {/* Profile Completion Progress Bar */}
                        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-slate-900">Profile Completion</h3>
                            <span className="text-sm font-medium text-blue-600">{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                          </div>
                          {progress < 100 && (
                            <p className="text-xs text-slate-500 mt-2">
                              Complete your profile to stand out to recruiters and peers.
                            </p>
                          )}
                        </div>

                        <div className="mt-4 p-4 bg-slate-100 rounded-lg relative">
                          <button 
                            onClick={async () => {
                              const newStatus = !profile.isOpenToWork;
                              const userRef = doc(db, 'users', user.uid);
                              await updateDoc(userRef, { isOpenToWork: newStatus });
                              setProfile({ ...profile, isOpenToWork: newStatus });
                              if (isOwnProfile) {
                                setCurrentUserProfile({ ...currentUserProfile!, isOpenToWork: newStatus });
                              }
                            }}
                            className="absolute top-4 right-4 text-slate-600 hover:bg-slate-200 p-1 rounded-full transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <h3 className="font-semibold text-slate-900">Open to work</h3>
                          <p className="text-sm text-slate-900 mt-1">
                            {profile.isOpenToWork 
                              ? "You're currently open to new opportunities." 
                              : "You're not currently looking for new roles."}
                          </p>
                          <button 
                            onClick={async () => {
                              const newStatus = !profile.isOpenToWork;
                              const userRef = doc(db, 'users', user.uid);
                              await updateDoc(userRef, { isOpenToWork: newStatus });
                              setProfile({ ...profile, isOpenToWork: newStatus });
                              if (isOwnProfile) {
                                setCurrentUserProfile({ ...currentUserProfile!, isOpenToWork: newStatus });
                              }
                            }}
                            className="text-blue-600 font-semibold text-sm mt-1 inline-block hover:underline"
                          >
                            {profile.isOpenToWork ? "Stop showing" : "Start showing"}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* AI Assistant Card */}
          {isOwnProfile && (
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-6 h-6" />
                  <h2 className="text-xl font-bold">AI Profile Assistant</h2>
                </div>
                <p className="text-indigo-100 mb-6">
                  Get personalized advice to optimize your profile for recruiters and peers using Gemini AI.
                </p>
                
                {aiAdvice ? (
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 mb-6 border border-white/20">
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{aiAdvice}</ReactMarkdown>
                    </div>
                  </div>
                ) : null}

                <button 
                  onClick={handleAnalyzeProfile}
                  disabled={isAnalyzing}
                  className="bg-white text-indigo-600 px-6 py-2 rounded-full font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {aiAdvice ? "Refresh Advice" : "Analyze My Profile"}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Analytics Card */}
          {isOwnProfile && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Analytics</h2>
                <p className="text-slate-500 text-sm flex items-center gap-1">
                  <Eye className="w-4 h-4" /> Private to you
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button 
                  onClick={() => setShowViewersModal(true)}
                  className="p-4 rounded-lg hover:bg-slate-50 transition-colors text-left border border-transparent hover:border-slate-200"
                >
                  <p className="text-slate-900 font-bold text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-slate-600" /> {viewers.length}
                  </p>
                  <p className="text-slate-900 font-semibold text-sm">Profile viewers</p>
                  <p className="text-slate-500 text-xs mt-1">Past 90 days</p>
                </button>
                
                <div className="p-4 rounded-lg text-left">
                  <p className="text-slate-900 font-bold text-lg flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-slate-600" /> {activities.filter(a => a.type === 'post').length}
                  </p>
                  <p className="text-slate-900 font-semibold text-sm">Posts created</p>
                  <p className="text-slate-500 text-xs mt-1">Total posts you've shared.</p>
                </div>
                
                <div className="p-4 rounded-lg text-left">
                  <p className="text-slate-900 font-bold text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-slate-600" /> {activities.filter(a => a.type === 'comment').length}
                  </p>
                  <p className="text-slate-900 font-semibold text-sm">Comments made</p>
                  <p className="text-slate-500 text-xs mt-1">Total comments on posts.</p>
                </div>
              </div>
            </div>
          )}

          {/* Activity Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Activity</h2>
                <p className="text-blue-600 font-semibold text-sm hover:underline cursor-pointer">{profileConnectionsCount} connections</p>
              </div>
              <div className="flex gap-2">
                {isOwnProfile && (
                  <button onClick={() => navigate('/feed')} className="px-4 py-1.5 border border-blue-600 text-blue-600 rounded-full font-semibold hover:bg-blue-50 transition-colors">
                    Create a post
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              {activities.slice(0, 3).map((activity) => (
                <div key={activity.id} className="pb-4 border-b border-slate-100 last:border-0">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">{profile.displayName}</span> 
                    {activity.type === 'post' ? ' posted this' : ' commented on a post'} • {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                  <p className="text-sm text-slate-900 mt-1 line-clamp-2">{activity.content}</p>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-slate-500 text-center py-4">No recent activity to show.</p>
              )}
            </div>
            
            {activities.length > 3 && (
              <div className="border-t border-slate-200 -mx-6 -mb-6 mt-4">
                <button className="w-full py-3 text-slate-600 font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1 rounded-b-xl">
                  Show all activity <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Experience Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Experience</h2>
              <div className="flex gap-2">
                {isOwnProfile && isEditing && (
                  <button onClick={addExperience} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Plus className="w-6 h-6" />
                  </button>
                )}
                {!isEditing && isOwnProfile && (
                  <button onClick={() => handleEditSection('experience')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => toggleSection('experience')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  {expandedSections.experience ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {expandedSections.experience && (
              isEditing ? (
              <div className="space-y-6">
                {formData.experience.map((exp) => (
                  <div key={exp.id} className="p-4 border border-slate-200 rounded-xl relative">
                    <button onClick={() => removeExperience(exp.id)} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Organization / Company</label>
                        <input type="text" value={exp.organization} onChange={e => updateExperience(exp.id, 'organization', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Role / Position</label>
                        <input type="text" value={exp.role} onChange={e => updateExperience(exp.id, 'role', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                        <input type="text" value={exp.startDate} onChange={e => updateExperience(exp.id, 'startDate', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g. Jan 2023" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                        <input type="text" value={exp.endDate} onChange={e => updateExperience(exp.id, 'endDate', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g. Present" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea value={exp.description} onChange={e => updateExperience(exp.id, 'description', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.experience.length === 0 && <p className="text-slate-500 text-center py-4">No experience added yet.</p>}
              </div>
            ) : (
              <div className="space-y-6">
                {profile.experience && profile.experience.length > 0 ? (
                  profile.experience.map((exp, index) => (
                    <div key={exp.id} className={`flex gap-4 ${index !== 0 ? "pt-6 border-t border-slate-100" : ""}`}>
                      <div className="w-12 h-12 bg-slate-100 flex-shrink-0">
                        <img src={`https://ui-avatars.com/api/?name=${exp.organization}&background=random`} alt={exp.organization} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{exp.role}</h3>
                        <p className="text-sm text-slate-900">{exp.organization}</p>
                        <p className="text-sm text-slate-500">{exp.startDate} - {exp.endDate || 'Present'}</p>
                        {exp.description && <p className="text-sm text-slate-900 mt-2 whitespace-pre-wrap">{exp.description}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-4">No experience added yet.</p>
                )}
              </div>
            ))}
          </div>

          {/* Achievements Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Achievements</h2>
              <div className="flex gap-2">
                {isOwnProfile && isEditing && (
                  <button onClick={addAchievement} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Plus className="w-6 h-6" />
                  </button>
                )}
                {!isEditing && isOwnProfile && (
                  <button onClick={() => handleEditSection('achievements')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => toggleSection('achievements')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  {expandedSections.achievements ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {expandedSections.achievements && (
              isEditing ? (
              <div className="space-y-6">
                {formData.achievements.map((ach) => (
                  <div key={ach.id} className="p-4 border border-slate-200 rounded-xl relative">
                    <button onClick={() => removeAchievement(ach.id)} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input type="text" value={ach.title} onChange={e => updateAchievement(ach.id, 'title', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Issuing Organization</label>
                        <input type="text" value={ach.issuer} onChange={e => updateAchievement(ach.id, 'issuer', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                        <input type="text" value={ach.date} onChange={e => updateAchievement(ach.id, 'date', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g. Jan 2023" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea value={ach.description} onChange={e => updateAchievement(ach.id, 'description', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.achievements.length === 0 && <p className="text-slate-500 text-center py-4">No achievements added yet.</p>}
              </div>
            ) : (
              <div className="space-y-6">
                {profile.achievements && profile.achievements.length > 0 ? (
                  profile.achievements.map((ach, index) => (
                    <div key={ach.id} className={`flex gap-4 ${index !== 0 ? "pt-6 border-t border-slate-100" : ""}`}>
                      <div className="w-12 h-12 bg-slate-100 flex-shrink-0">
                        <Award className="w-full h-full p-2 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{ach.title}</h3>
                        <p className="text-sm text-slate-900">{ach.issuer}</p>
                        <p className="text-sm text-slate-500">{ach.date}</p>
                        {ach.description && <p className="text-sm text-slate-900 mt-2 whitespace-pre-wrap">{ach.description}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-4">No achievements added yet.</p>
                )}
              </div>
            ))}
          </div>

          {/* Education Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Education</h2>
              <div className="flex gap-2">
                {isOwnProfile && isEditing && (
                  <button onClick={addEducation} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Plus className="w-6 h-6" />
                  </button>
                )}
                {!isEditing && isOwnProfile && (
                  <button onClick={() => handleEditSection('education')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => toggleSection('education')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  {expandedSections.education ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {expandedSections.education && (
              isEditing ? (
              <div className="space-y-6">
                {formData.education.map((edu) => (
                  <div key={edu.id} className="p-4 border border-slate-200 rounded-xl relative">
                    <button onClick={() => removeEducation(edu.id)} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <CollegeSelect 
                          value={edu.university} 
                          onChange={val => updateEducation(edu.id, 'university', val)} 
                          cityValue={edu.city}
                          onCityChange={val => updateEducation(edu.id, 'city', val)}
                          stateValue={edu.state}
                          onStateChange={val => updateEducation(edu.id, 'state', val)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Degree / Course</label>
                        <input type="text" value={edu.degree} onChange={e => updateEducation(edu.id, 'degree', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Field of Study</label>
                        <input type="text" value={edu.fieldOfStudy} onChange={e => updateEducation(edu.id, 'fieldOfStudy', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g. Computer Science" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Start Year</label>
                        <input type="text" value={edu.startYear} onChange={e => updateEducation(edu.id, 'startYear', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">End Year</label>
                        <input type="text" value={edu.endYear} onChange={e => updateEducation(edu.id, 'endYear', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea value={edu.description} onChange={e => updateEducation(edu.id, 'description', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={2} />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.education.length === 0 && <p className="text-slate-500 text-center py-4">No education added yet.</p>}
              </div>
            ) : (
              <div className="space-y-6">
                {profile.education && profile.education.length > 0 ? (
                  profile.education.map((edu, index) => (
                    <div key={edu.id} className={`flex gap-4 ${index !== 0 ? "pt-6 border-t border-slate-100" : ""}`}>
                      <div className="w-12 h-12 bg-slate-100 flex-shrink-0">
                        <img src={`https://ui-avatars.com/api/?name=${edu.university}&background=random`} alt={edu.university} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{edu.university}</h3>
                        <p className="text-sm text-slate-900">{edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}</p>
                        <p className="text-sm text-slate-500">{edu.startYear} - {edu.endYear || 'Present'}</p>
                        {edu.description && <p className="text-sm text-slate-900 mt-2 whitespace-pre-wrap">{edu.description}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-4">No education added yet.</p>
                )}
              </div>
            ))}
          </div>

          {/* Projects Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Projects</h2>
              <div className="flex gap-2">
                {isOwnProfile && isEditing && (
                  <button onClick={addProject} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Plus className="w-6 h-6" />
                  </button>
                )}
                {!isEditing && isOwnProfile && (
                  <button onClick={() => handleEditSection('projects')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => toggleSection('projects')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  {expandedSections.projects ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {expandedSections.projects && (
              isEditing ? (
              <div className="space-y-6">
                {formData.projects.map((proj) => (
                  <div key={proj.id} className="p-4 border border-slate-200 rounded-xl relative">
                    <button onClick={() => removeProject(proj.id)} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Project Title</label>
                        <input type="text" value={proj.title} onChange={e => updateProject(proj.id, 'title', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                        <input type="text" value={proj.duration} onChange={e => updateProject(proj.id, 'duration', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g. Jan 2023 - Present" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Project Link</label>
                        <input type="text" value={proj.link} onChange={e => updateProject(proj.id, 'link', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Technologies Used</label>
                        <input type="text" value={proj.technologies} onChange={e => updateProject(proj.id, 'technologies', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g. React, Node.js, Firebase" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Project Image URL</label>
                        <input type="text" value={proj.imageUrl || ''} onChange={e => updateProject(proj.id, 'imageUrl', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://example.com/image.jpg" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea value={proj.description} onChange={e => updateProject(proj.id, 'description', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.projects.length === 0 && <p className="text-slate-500 text-center py-4">No projects added yet.</p>}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.projects && profile.projects.length > 0 ? (
                  profile.projects.map((proj, index) => (
                    <div key={proj.id} className="group relative bg-slate-50 rounded-xl overflow-hidden border border-slate-200 hover:shadow-md transition-all">
                      {proj.imageUrl ? (
                        <img 
                          src={proj.imageUrl} 
                          alt={proj.title} 
                          className="w-full h-40 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-40 bg-slate-200 flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-slate-400" />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{proj.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{proj.duration}</p>
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{proj.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {proj.technologies && proj.technologies.split(',').map((tech, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-500">
                              {tech.trim()}
                            </span>
                          ))}
                        </div>
                        {proj.link && (
                          <a 
                            href={proj.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-4 text-blue-600 font-semibold text-sm flex items-center gap-1 hover:underline"
                          >
                            View Project <Globe className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-4 col-span-2">No projects added yet.</p>
                )}
              </div>
            ))}
          </div>

          {/* Skills Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Skills</h2>
              <div className="flex gap-2">
                {isOwnProfile && (
                  <button onClick={() => setEditingSection('skills')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Plus className="w-6 h-6" />
                  </button>
                )}
                {!isEditing && isOwnProfile && (
                  <button onClick={() => handleEditSection('skills')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => toggleSection('skills')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  {expandedSections.skills ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {expandedSections.skills && (
              <div className="space-y-6">
                {profile.skills?.map((skill, index) => (
                  <div key={index} className="pb-4 border-b border-slate-100 last:border-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-slate-900">{skill}</h3>
                      {!isOwnProfile && (
                        <button 
                          onClick={() => handleEndorseSkill(skill)}
                          className={`px-4 py-1 rounded-full border text-sm font-semibold transition-colors ${
                            endorsements[skill]?.includes(user?.uid || '')
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'text-blue-600 border-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          {endorsements[skill]?.includes(user?.uid || '') ? 'Endorsed' : 'Endorse'}
                        </button>
                      )}
                    </div>
                    {endorsements[skill]?.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {endorsements[skill].slice(0, 3).map((endorserId, i) => (
                            <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center overflow-hidden">
                              <Users className="w-3 h-3 text-slate-400" />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">
                          {endorsements[skill].length} {endorsements[skill].length === 1 ? 'endorsement' : 'endorsements'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                {(!profile.skills || profile.skills.length === 0) && (
                  <p className="text-slate-500 text-center py-4">No skills listed yet.</p>
                )}
              </div>
            )}
          </div>

          {/* Certifications Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Certifications</h2>
              <div className="flex gap-2">
                {isOwnProfile && isEditing && (
                  <button onClick={addCertification} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Plus className="w-6 h-6" />
                  </button>
                )}
                {!isEditing && isOwnProfile && (
                  <button onClick={() => handleEditSection('certifications')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => toggleSection('certifications')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  {expandedSections.certifications ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {expandedSections.certifications && (
              isEditing ? (
              <div className="space-y-6">
                {formData.certifications.map((cert) => (
                  <div key={cert.id} className="p-4 border border-slate-200 rounded-xl relative">
                    <button onClick={() => removeCertification(cert.id)} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Certificate Title</label>
                        <input type="text" value={cert.title} onChange={e => updateCertification(cert.id, 'title', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Issuing Organization</label>
                        <input type="text" value={cert.issuer} onChange={e => updateCertification(cert.id, 'issuer', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Date Issued</label>
                        <input type="text" value={cert.date} onChange={e => updateCertification(cert.id, 'date', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g. Jul 2025" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Credential Link</label>
                        <input type="text" value={cert.link} onChange={e => updateCertification(cert.id, 'link', e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://" />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.certifications.length === 0 && <p className="text-slate-500 text-center py-4">No certifications added yet.</p>}
              </div>
            ) : (
              <div className="space-y-6">
                {profile.certifications && profile.certifications.length > 0 ? (
                  profile.certifications.map((cert, index) => (
                    <div key={cert.id} className={`flex gap-4 ${index !== 0 ? "pt-6 border-t border-slate-100" : ""}`}>
                      <div className="w-12 h-12 bg-slate-100 flex-shrink-0">
                        <Award className="w-full h-full p-2 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{cert.title}</h3>
                        <p className="text-sm text-slate-900">{cert.issuer}</p>
                        <p className="text-sm text-slate-500">Issued {cert.date}</p>
                        {cert.link && (
                          <a href={cert.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 px-4 py-1.5 border border-slate-500 text-slate-600 rounded-full font-semibold text-sm hover:bg-slate-50 transition-colors">
                            Show credential <ArrowRight className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-4">No certifications added yet.</p>
                )}
              </div>
            ))}
          </div>

          {/* Social Links Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Social Links</h2>
              <div className="flex gap-2">
                {!isEditing && isOwnProfile && (
                  <button onClick={() => handleEditSection('socialLinks')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => toggleSection('socialLinks')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  {expandedSections.socialLinks ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {expandedSections.socialLinks && (
              isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn</label>
                    <input type="text" value={formData.socialLinks.linkedin} onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, linkedin: e.target.value}})} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">GitHub</label>
                    <input type="text" value={formData.socialLinks.github} onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, github: e.target.value}})} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://github.com/..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Portfolio</label>
                    <input type="text" value={formData.socialLinks.portfolio} onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, portfolio: e.target.value}})} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Google Scholar</label>
                    <input type="text" value={formData.socialLinks.googleScholar} onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, googleScholar: e.target.value}})} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://scholar.google.com/..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Twitter</label>
                    <input type="text" value={formData.socialLinks.twitter} onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, twitter: e.target.value}})} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://twitter.com/..." />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.socialLinks && Object.values(profile.socialLinks).some(link => link) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.socialLinks.linkedin && (
                        <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                          <Linkedin className="w-5 h-5" />
                          <span className="font-semibold">LinkedIn</span>
                        </a>
                      )}
                      {profile.socialLinks.github && (
                        <a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-800 hover:underline">
                          <Github className="w-5 h-5" />
                          <span className="font-semibold">GitHub</span>
                        </a>
                      )}
                      {profile.socialLinks.portfolio && (
                        <a href={profile.socialLinks.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:underline">
                          <Globe className="w-5 h-5" />
                          <span className="font-semibold">Portfolio</span>
                        </a>
                      )}
                      {profile.socialLinks.googleScholar && (
                        <a href={profile.socialLinks.googleScholar} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline">
                          <GraduationCap className="w-5 h-5" />
                          <span className="font-semibold">Google Scholar</span>
                        </a>
                      )}
                      {profile.socialLinks.twitter && (
                        <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sky-500 hover:underline">
                          <Twitter className="w-5 h-5" />
                          <span className="font-semibold">Twitter</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-4">No social links added yet.</p>
                  )}
                </div>
              )
            )}
          </div>

          {/* Interests Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Interests</h2>
              <div className="flex gap-2">
                {isOwnProfile && (
                  <button onClick={() => setEditingSection('interests')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Plus className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => toggleSection('interests')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  {expandedSections.interests ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {expandedSections.interests && (
              <div className="flex flex-wrap gap-2">
                {profile.interests && profile.interests.length > 0 ? (
                  profile.interests.map((interest, index) => (
                    <span 
                      key={index}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-medium border border-slate-200"
                    >
                      {interest}
                    </span>
                  ))
                ) : (
                  <p className="text-slate-500 py-2">No interests added yet.</p>
                )}
              </div>
            )}
          </div>

          {/* Companies Followed Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Companies Followed</h2>
              <div className="flex gap-2">
                {!isEditing && isOwnProfile && (
                  <button onClick={() => handleEditSection('followedCompanies')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => toggleSection('followedCompanies')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  {expandedSections.followedCompanies ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {expandedSections.followedCompanies && (
              <>
                {isEditing && (
                  <div className="mb-6 flex gap-2">
                    <input
                      type="text"
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      placeholder="Add a custom company..."
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => {
                        if (customCompany.trim()) {
                          toggleCompanyFollow(customCompany.trim());
                          setCustomCompany('');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Add
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(() => {
                    const followed = profile.followedCompanies || [];
                    const customFollowed = followed
                      .filter(id => !AVAILABLE_COMPANIES.some(c => c.id === id))
                      .map(id => ({ id, name: id, followers: 'Custom', logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(id)}&background=random` }));
                    
                    const displayList = isEditing 
                      ? [...AVAILABLE_COMPANIES, ...customFollowed]
                      : [...AVAILABLE_COMPANIES.filter(c => followed.includes(c.id)), ...customFollowed];

                    return displayList.map(company => (
                      <div key={company.id} className="flex gap-4">
                        <div className="w-12 h-12 bg-slate-100 flex-shrink-0">
                          <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm">{company.name}</h3>
                          <p className="text-xs text-slate-500 mb-2">{company.followers}</p>
                          {user && (
                            <button 
                              onClick={() => toggleCompanyFollow(company.id)}
                              className={`px-4 py-1 border rounded-full font-semibold text-sm transition-colors flex items-center gap-1 ${
                                (currentUserProfile?.followedCompanies || []).includes(company.id)
                                  ? 'border-slate-500 text-slate-600 hover:bg-slate-50'
                                  : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              {(currentUserProfile?.followedCompanies || []).includes(company.id) ? '✓ Following' : '+ Follow'}
                            </button>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                  
                  {!isEditing && (!profile.followedCompanies || profile.followedCompanies.length === 0) && (
                    <p className="text-slate-500 col-span-2">No companies followed yet.</p>
                  )}
                </div>
              </>
            )}
          </div>

        </div>

        {/* Sidebar - Right Column */}
        <div className="lg:col-span-4 space-y-4 hidden lg:block">
          
          {/* Profile language / URL */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">Profile language</h3>
                <p className="text-sm text-slate-500">English</p>
              </div>
              <button className="text-slate-600 hover:bg-slate-100 p-1 rounded-full"><Edit2 className="w-4 h-4" /></button>
            </div>
            <div className="border-t border-slate-100 my-4"></div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-slate-900">Public profile & URL</h3>
                <p className="text-sm text-slate-500 break-all">www.shouldreach.in/in/{profile.displayName.toLowerCase().replace(/\s+/g, '-')}</p>
              </div>
              <button className="text-slate-600 hover:bg-slate-100 p-1 rounded-full"><Edit2 className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Ad Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-500 text-right">Ad •••</p>
            <p className="text-xs text-slate-600 mt-2">ShouldReach Member, enjoy 50% off 2 months of Premium</p>
            <div className="flex items-center justify-center gap-2 mt-2 font-semibold text-slate-900">
              <div className="w-4 h-4 bg-yellow-500 rounded-sm"></div> Premium
            </div>
            <p className="text-sm text-slate-900 mt-2">Get hired faster with exclusive tools and features</p>
            <button className="mt-4 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-full font-semibold hover:bg-blue-50 transition-colors">
              Redeem offer
            </button>
          </div>

          {/* Who your viewers also viewed */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900">Who your viewers also viewed</h2>
            <div className="flex items-center gap-1 text-slate-500 text-xs mb-4">
              <Eye className="w-3 h-3" />
              <span>Private to you</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <img src="https://ui-avatars.com/api/?name=S&background=random" className="w-12 h-12 rounded-full" alt="Profile" />
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Someone at Delhi University</h3>
                  <button className="mt-1 px-4 py-1 border border-slate-500 text-slate-600 rounded-full font-semibold text-sm hover:bg-slate-50 transition-colors">
                    View
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <img src="https://ui-avatars.com/api/?name=A&background=random" className="w-12 h-12 rounded-full" alt="Profile" />
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Auditor at KPMG</h3>
                  <button className="mt-1 px-4 py-1 border border-slate-500 text-slate-600 rounded-full font-semibold text-sm hover:bg-slate-50 transition-colors">
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* People you may know */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900">People you may know</h2>
            <p className="text-slate-500 text-xs mb-4">From your university</p>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <img src="https://ui-avatars.com/api/?name=AG&background=random" className="w-12 h-12 rounded-full" alt="Profile" />
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Akash Gupta <span className="text-slate-500">✓</span></h3>
                  <p className="text-xs text-slate-600">Business Process Associate | Banking & Financial Operatio...</p>
                  <button className="mt-2 px-4 py-1 border border-slate-500 text-slate-600 rounded-full font-semibold text-sm hover:bg-slate-50 transition-colors flex items-center gap-1">
                    <UserPlus className="w-4 h-4" /> Connect
                  </button>
                </div>
              </div>
            </div>
            
            <div className="border-t border-slate-200 -mx-6 -mb-6 mt-4">
              <button className="w-full py-3 text-slate-600 font-semibold hover:bg-slate-50 transition-colors rounded-b-xl">
                Show all
              </button>
            </div>
          </div>

        </div>
      </div>
      {/* Viewers Modal */}
      {showViewersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Profile Viewers</h3>
              <button onClick={() => setShowViewersModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {viewers.length > 0 ? (
                <div className="space-y-4">
                  {viewers.map((viewer) => {
                    const isCurrentUser = user?.uid === viewer.viewerId;
                    const connection = connections.find(c => 
                      (c.requesterId === user?.uid && c.receiverId === viewer.viewerId) ||
                      (c.receiverId === user?.uid && c.requesterId === viewer.viewerId)
                    );
                    const isConnected = connection?.status === 'accepted';
                    const isPending = connection?.status === 'pending';

                    return (
                      <div key={viewer.id} className="flex items-center gap-3">
                        <img 
                          src={viewer.viewerPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewer.viewerName)}&background=random`} 
                          alt={viewer.viewerName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{viewer.viewerName}</p>
                          <p className="text-xs text-slate-500">{formatDistanceToNow(new Date(viewer.createdAt), { addSuffix: true })}</p>
                        </div>
                        {!isCurrentUser && !isConnected && (
                          <button
                            onClick={() => handleConnectViewer(viewer.viewerId)}
                            disabled={isPending}
                            className={`px-3 py-1 text-sm font-semibold rounded-full border transition-colors flex items-center gap-1 ${
                              isPending
                                ? 'border-slate-300 text-slate-400 bg-slate-50 cursor-not-allowed'
                                : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                            }`}
                          >
                            {!isPending && <UserPlus className="w-3 h-3" />}
                            {isPending ? 'Pending' : 'Connect'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">No viewers yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Persistent Save Bar */}
      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 flex justify-end gap-3 px-4 md:px-8">
          <button 
            onClick={() => setIsEditing(false)}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-full font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      )}

      {/* Section Editing Modal */}
      {editingSection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingSection === 'skills' ? 'Add Skills' : `Edit ${editingSection}`}
              </h3>
              <button onClick={() => setEditingSection(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {editingSection === 'skills' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Skills (comma separated)</label>
                    <textarea 
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      rows={4}
                      placeholder="e.g. React, TypeScript, Node.js"
                    />
                  </div>
                </div>
              )}
              {editingSection === 'interests' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Interests (comma separated)</label>
                    <textarea 
                      value={formData.interests}
                      onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      rows={4}
                      placeholder="e.g. Open Source, AI, Machine Learning, Web Development"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
              <button 
                onClick={() => setEditingSection(null)}
                className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-full transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  await handleSave();
                  setEditingSection(null);
                }}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
