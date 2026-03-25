import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../firebase';
import { collection, query, getDocs, limit, addDoc, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { UserProfile, Connection } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Search, BookOpen, GraduationCap, Sparkles, UserPlus, Clock, Check, X, Bell, Brain } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { sendNotification } from '../services/notificationService';
import { getSmartNetworkingAdvice } from '../services/geminiService';

export function Network() {
  const { user, profile: currentUserProfile } = useAuthStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchParams] = useSearchParams();
  const initialSearchTerm = searchParams.get('university') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'discover' | 'suggestions' | 'connections' | 'requests'>('discover');
  const [connectedProfiles, setConnectedProfiles] = useState<UserProfile[]>([]);
  const [pendingProfiles, setPendingProfiles] = useState<UserProfile[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [aiNetworkingAdvice, setAiNetworkingAdvice] = useState<Record<string, { advice: string; loading: boolean }>>({});
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [universityFilter, setUniversityFilter] = useState<string>('');
  const [skillsFilter, setSkillsFilter] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [allConnections, setAllConnections] = useState<Connection[]>([]);

  const handleGetAiAdvice = async (targetProfile: UserProfile) => {
    if (!currentUserProfile || aiNetworkingAdvice[targetProfile.uid]?.loading) return;
    
    setAiNetworkingAdvice(prev => ({
      ...prev,
      [targetProfile.uid]: { advice: '', loading: true }
    }));

    try {
      const advice = await getSmartNetworkingAdvice(currentUserProfile, targetProfile);
      setAiNetworkingAdvice(prev => ({
        ...prev,
        [targetProfile.uid]: { advice, loading: false }
      }));
    } catch (error) {
      console.error("Error getting AI networking advice:", error);
      setAiNetworkingAdvice(prev => ({
        ...prev,
        [targetProfile.uid]: { advice: "You both have great profiles! Connecting could lead to interesting discussions.", loading: false }
      }));
    }
  };

  useEffect(() => {
    if (!user || activeTab !== 'connections') return;

    const fetchConnectedProfiles = async () => {
      setLoadingConnections(true);
      try {
        const acceptedConns = connections.filter(c => c.status === 'accepted');
        const connectedIds = acceptedConns.map(c => 
          c.requesterId === user.uid ? c.receiverId : c.requesterId
        );

        if (connectedIds.length === 0) {
          setConnectedProfiles([]);
          setLoadingConnections(false);
          return;
        }

        // Fetch profiles in batches of 10
        const profiles: UserProfile[] = [];
        for (let i = 0; i < connectedIds.length; i += 10) {
          const batchIds = connectedIds.slice(i, i + 10);
          const q = query(collection(db, 'users'), where('uid', 'in', batchIds));
          const snapshot = await getDocs(q);
          profiles.push(...snapshot.docs.map(doc => doc.data() as UserProfile));
        }
        setConnectedProfiles(profiles);
      } catch (error) {
        console.error("Error fetching connected profiles:", error);
      } finally {
        setLoadingConnections(false);
      }
    };

    fetchConnectedProfiles();
  }, [user?.uid, activeTab, connections]);

  useEffect(() => {
    if (!user || activeTab !== 'requests') return;

    const fetchPendingProfiles = async () => {
      setLoadingRequests(true);
      try {
        const pendingConns = connections.filter(c => c.receiverId === user.uid && c.status === 'pending');
        const pendingIds = pendingConns.map(c => c.requesterId);

        if (pendingIds.length === 0) {
          setPendingProfiles([]);
          setLoadingRequests(false);
          return;
        }

        const profiles: UserProfile[] = [];
        for (let i = 0; i < pendingIds.length; i += 10) {
          const batchIds = pendingIds.slice(i, i + 10);
          const q = query(collection(db, 'users'), where('uid', 'in', batchIds));
          const snapshot = await getDocs(q);
          profiles.push(...snapshot.docs.map(doc => doc.data() as UserProfile));
        }
        setPendingProfiles(profiles);
      } catch (error) {
        console.error("Error fetching pending profiles:", error);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchPendingProfiles();
  }, [user?.uid, activeTab, connections]);

  useEffect(() => {
    if (!user) return;

    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), limit(50));
        const snapshot = await getDocs(q);
        const usersData = snapshot.docs
          .map(doc => doc.data() as UserProfile)
          .filter(u => u.uid !== user.uid); // Exclude current user
        setUsers(usersData);
        
        // Fetch all connections to compute mutual connections
        const connsQ = query(collection(db, 'connections'), limit(1000));
        const connsSnapshot = await getDocs(connsQ);
        setAllConnections(connsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Connection));
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;

    // Listen to connections where current user is involved
    const q1 = query(collection(db, 'connections'), where('requesterId', '==', user.uid));
    const q2 = query(collection(db, 'connections'), where('receiverId', '==', user.uid));

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      const conns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Connection[];
      setConnections(prev => {
        const otherConns = prev.filter(c => c.requesterId !== user.uid);
        return [...otherConns, ...conns];
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'connections');
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      const conns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Connection[];
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

  const handleConnect = async (receiverId: string) => {
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

  const handleAccept = async (requesterId: string) => {
    if (!user) return;
    try {
      const conn = connections.find(c => c.requesterId === requesterId && c.receiverId === user.uid && c.status === 'pending');
      if (!conn) return;

      await updateDoc(doc(db, 'connections', conn.id), {
        status: 'accepted'
      });

      // Update connections count for both users (simplified)
      // In a real app, you'd use a cloud function or transaction

      // Send notification to requester
      await sendNotification(
        requesterId,
        'connection_accepted',
        'Connection Accepted',
        `${currentUserProfile?.displayName || 'Someone'} accepted your connection request.`,
        `/profile/${user.uid}`,
        { receiverId: user.uid }
      );
    } catch (error) {
      console.error("Error accepting connection:", error);
    }
  };

  const handleReject = async (requesterId: string) => {
    if (!user) return;
    try {
      const conn = connections.find(c => c.requesterId === requesterId && c.receiverId === user.uid && c.status === 'pending');
      if (!conn) return;

      await deleteDoc(doc(db, 'connections', conn.id));
    } catch (error) {
      console.error("Error rejecting connection:", error);
    }
  };

  const getConnectionStatus = (targetUserId: string) => {
    if (!user) return null;
    const conn = connections.find(c => 
      (c.requesterId === user.uid && c.receiverId === targetUserId) ||
      (c.receiverId === user.uid && c.requesterId === targetUserId)
    );
    return conn ? conn.status : null;
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (u.university && u.university.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (u.skills && u.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))) ||
                          u.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesUniversity = !universityFilter || (u.university && u.university.toLowerCase().includes(universityFilter.toLowerCase()));
    const matchesSkills = skillsFilter.length === 0 || skillsFilter.every(skill => 
      u.skills && u.skills.some(s => s.toLowerCase() === skill.toLowerCase())
    );
    return matchesSearch && matchesRole && matchesUniversity && matchesSkills;
  });

  // Calculate connection suggestions
  const suggestedUsers = useMemo(() => {
    if (!currentUserProfile || users.length === 0) return [];

    // Get current user's accepted connections
    const myConnectedIds = allConnections
      .filter(c => c.status === 'accepted' && (c.requesterId === user?.uid || c.receiverId === user?.uid))
      .map(c => c.requesterId === user?.uid ? c.receiverId : c.requesterId);

    return users.map(otherUser => {
      // Don't suggest people we're already connected with or pending
      const existingConn = allConnections.find(c => 
        (c.requesterId === user?.uid && c.receiverId === otherUser.uid) ||
        (c.receiverId === user?.uid && c.requesterId === otherUser.uid)
      );
      
      if (existingConn) return { user: otherUser, score: -1, matchReasons: [] };

      let score = 0;
      const matchReasons: string[] = [];

      // Mutual connections (High priority)
      const theirConnectedIds = allConnections
        .filter(c => c.status === 'accepted' && (c.requesterId === otherUser.uid || c.receiverId === otherUser.uid))
        .map(c => c.requesterId === otherUser.uid ? c.receiverId : c.requesterId);
      
      const mutualCount = myConnectedIds.filter(id => theirConnectedIds.includes(id)).length;
      if (mutualCount > 0) {
        score += mutualCount * 3;
        matchReasons.push(`${mutualCount} Mutual Connection${mutualCount > 1 ? 's' : ''}`);
      }

      // University match (High priority)
      if (currentUserProfile.university && otherUser.university && 
          currentUserProfile.university.toLowerCase() === otherUser.university.toLowerCase()) {
        score += 5;
        matchReasons.push('Same University');
      }

      // Department match
      if (currentUserProfile.department && otherUser.department && 
          currentUserProfile.department.toLowerCase() === otherUser.department.toLowerCase()) {
        score += 3;
        matchReasons.push('Same Department');
      }

      // Skills match
      if (currentUserProfile.skills && otherUser.skills) {
        const commonSkills = currentUserProfile.skills.filter(skill => 
          otherUser.skills?.some(s => s.toLowerCase() === skill.toLowerCase())
        );
        if (commonSkills.length > 0) {
          score += commonSkills.length * 2;
          matchReasons.push(`${commonSkills.length} Shared Skill${commonSkills.length > 1 ? 's' : ''}`);
        }
      }

      // Interests match
      if (currentUserProfile.interests && otherUser.interests) {
        const commonInterests = currentUserProfile.interests.filter(interest => 
          otherUser.interests?.some(i => i.toLowerCase() === interest.toLowerCase())
        );
        if (commonInterests.length > 0) {
          score += commonInterests.length;
          matchReasons.push(`${commonInterests.length} Shared Interest${commonInterests.length > 1 ? 's' : ''}`);
        }
      }

      return { user: otherUser, score, matchReasons };
    })
    .filter(item => item.score > 0) // Only show users with at least one match
    .sort((a, b) => b.score - a.score) // Sort by highest score
    .slice(0, 10); // Top 10 suggestions
  }, [users, currentUserProfile, allConnections, user?.uid]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('discover')}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'discover'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Discover Connections
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'suggestions'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Suggested for You
              {suggestedUsers.length > 0 && (
                <span className="bg-indigo-100 text-indigo-600 py-0.5 px-2 rounded-full text-xs">
                  {suggestedUsers.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'connections'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              My Connections
              {connections.filter(c => c.status === 'accepted').length > 0 && (
                <span className="ml-2 bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">
                  {connections.filter(c => c.status === 'accepted').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors relative ${
                activeTab === 'requests'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Requests
              {connections.filter(c => c.receiverId === user?.uid && c.status === 'pending').length > 0 && (
                <span className="ml-2 bg-indigo-600 text-white py-0.5 px-2 rounded-full text-[10px] font-bold">
                  {connections.filter(c => c.receiverId === user?.uid && c.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'discover' && (
          <div className="p-6">
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, university, or skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-48">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="University..." 
                      value={universityFilter}
                      onChange={(e) => setUniversityFilter(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  
                  <button 
                    onClick={() => setActiveTab('connections')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-100 transition-colors whitespace-nowrap"
                  >
                    <UserPlus className="w-4 h-4" />
                    My Network
                  </button>
                </div>
              </div>

              {/* Skills filter and Clear Filters */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex-1 flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 min-h-[48px] w-full">
                  {skillsFilter.map(skill => (
                    <span key={skill} className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm">
                      {skill}
                      <button onClick={() => setSkillsFilter(prev => prev.filter(s => s !== skill))} className="hover:text-indigo-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={skillsFilter.length === 0 ? "Filter by skills (press Enter)..." : "Add skill..."}
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && skillInput.trim()) {
                        e.preventDefault();
                        if (!skillsFilter.includes(skillInput.trim())) {
                          setSkillsFilter(prev => [...prev, skillInput.trim()]);
                        }
                        setSkillInput('');
                      }
                    }}
                    className="flex-1 min-w-[200px] outline-none text-sm px-2 bg-transparent"
                  />
                </div>
                
                {(searchTerm || universityFilter || filterRole !== 'all' || skillsFilter.length > 0) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setUniversityFilter('');
                      setFilterRole('all');
                      setSkillsFilter([]);
                      setSkillInput('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4 md:pb-6 hide-scrollbar">
              {['all', 'student', 'professor', 'alumni', 'recruiter'].map((role) => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                    filterRole === role 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}s
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((profile) => (
                <UserCard 
                  key={profile.uid} 
                  profile={profile} 
                  connectionStatus={getConnectionStatus(profile.uid)}
                  onConnect={() => handleConnect(profile.uid)}
                />
              ))}
              
              {filteredUsers.length === 0 && (
                <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">No users found</h3>
                  <p className="text-slate-500 mt-1">Try adjusting your search or filters.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="p-6 bg-slate-50/50 min-h-[400px]">
            {suggestedUsers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suggestedUsers.map(({ user: profile, matchReasons }) => (
                  <div key={profile.uid} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex items-start justify-between mb-4">
                      <img 
                        src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&background=random`} 
                        alt={profile.displayName} 
                        className="w-16 h-16 rounded-full border-2 border-white shadow-sm object-cover"
                      />
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold capitalize">
                        {profile.role}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{profile.displayName}</h3>
                    
                    <div className="space-y-2 mt-3 mb-4 flex-grow">
                      {profile.university && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <GraduationCap className="w-4 h-4 shrink-0 text-slate-400" />
                          <span className="truncate">{profile.university}</span>
                        </div>
                      )}
                      {profile.department && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <BookOpen className="w-4 h-4 shrink-0 text-slate-400" />
                          <span className="truncate">{profile.department}</span>
                        </div>
                      )}
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Why connect?</p>
                        <button 
                          onClick={() => handleGetAiAdvice(profile)}
                          className="text-[10px] flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                        >
                          <Brain className="w-3 h-3" /> AI Insight
                        </button>
                      </div>
                      
                      {aiNetworkingAdvice[profile.uid]?.loading ? (
                        <div className="flex items-center gap-2 py-2">
                          <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[10px] text-slate-500 italic">Gemini is thinking...</span>
                        </div>
                      ) : aiNetworkingAdvice[profile.uid]?.advice ? (
                        <p className="text-xs text-slate-600 italic bg-indigo-50 p-2 rounded-lg border border-indigo-100 mb-2">
                          "{aiNetworkingAdvice[profile.uid].advice}"
                        </p>
                      ) : null}

                      <div className="flex flex-wrap gap-1.5">
                        {matchReasons.map((reason, idx) => (
                          <span key={idx} className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium border border-purple-100">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <ConnectionButton 
                      status={getConnectionStatus(profile.uid)} 
                      onClick={() => handleConnect(profile.uid)} 
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No suggestions yet</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Complete your profile with your university, department, skills, and interests to get personalized connection suggestions.
                </p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'connections' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Your Connections</h3>
                <p className="text-sm text-slate-500">People you are connected with across the network.</p>
              </div>
              <button 
                onClick={() => setActiveTab('discover')}
                className="text-indigo-600 font-semibold text-sm hover:underline"
              >
                Find more people
              </button>
            </div>

            {loadingConnections ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : connectedProfiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {connectedProfiles.map((profile) => (
                  <UserCard 
                    key={profile.uid} 
                    profile={profile} 
                    connectionStatus="accepted"
                    onConnect={() => {}}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <UserPlus className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No connections yet</h3>
                <p className="text-slate-500 max-w-xs mx-auto mt-2">
                  Start connecting with students, professors, and alumni to build your network.
                </p>
                <button 
                  onClick={() => setActiveTab('discover')}
                  className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Explore People
                </button>
              </div>
            )}
          </div>
        )}
        {activeTab === 'requests' && (
          <div className="p-6">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900">Connection Requests</h3>
              <p className="text-sm text-slate-500">People who want to connect with you.</p>
            </div>

            {loadingRequests ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : pendingProfiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingProfiles.map((profile) => (
                  <div key={profile.uid} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center hover:shadow-md transition-all group">
                    <Link to={`/profile/${profile.uid}`} className="flex flex-col items-center w-full">
                      <img 
                        src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&background=random`} 
                        alt={profile.displayName} 
                        className="w-20 h-20 rounded-full border-4 border-white shadow-sm mb-4 object-cover"
                      />
                      <h3 className="text-lg font-bold text-slate-900">{profile.displayName}</h3>
                      <p className="text-sm font-medium text-indigo-600 capitalize mb-4">{profile.role}</p>
                    </Link>
                    
                    <div className="flex gap-2 w-full mt-auto">
                      <button 
                        onClick={() => handleAccept(profile.uid)}
                        className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </button>
                      <button 
                        onClick={() => handleReject(profile.uid)}
                        className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Bell className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No pending requests</h3>
                <p className="text-slate-500 max-w-xs mx-auto mt-2">
                  When someone sends you a connection request, it will appear here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionButton({ status, onClick }: { status: string | null, onClick: () => void }) {
  if (status === 'pending') {
    return (
      <button disabled className="mt-auto w-full py-2.5 bg-slate-100 text-slate-500 font-semibold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
        <Clock className="w-4 h-4" />
        Pending
      </button>
    );
  }
  
  if (status === 'accepted') {
    return (
      <button disabled className="mt-auto w-full py-2.5 bg-emerald-50 text-emerald-600 font-semibold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed border border-emerald-200">
        <Check className="w-4 h-4" />
        Connected
      </button>
    );
  }

  return (
    <button 
      onClick={onClick}
      className="mt-auto w-full py-2.5 bg-indigo-50 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
    >
      <UserPlus className="w-4 h-4" />
      Connect
    </button>
  );
}

function UserCard({ profile, connectionStatus, onConnect }: { profile: UserProfile, connectionStatus: string | null, onConnect: () => void }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center hover:shadow-md transition-all group">
      <Link to={`/profile/${profile.uid}`} className="flex flex-col items-center w-full">
        <img 
          src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&background=random`} 
          alt={profile.displayName} 
          className="w-24 h-24 rounded-full border-4 border-white shadow-sm mb-4 object-cover group-hover:scale-105 transition-transform"
        />
        <h3 className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors">{profile.displayName}</h3>
        <p className="text-sm font-medium text-indigo-600 capitalize mb-4">{profile.role}</p>
        
        <div className="space-y-2 w-full mb-6 flex-grow">
          {profile.university && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span className="truncate">{profile.university}</span>
            </div>
          )}
          {profile.department && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="truncate">{profile.department}</span>
            </div>
          )}
          
          {profile.skills && profile.skills.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mt-4">
              {profile.skills.slice(0, 3).map((skill, i) => (
                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                  {skill}
                </span>
              ))}
              {profile.skills.length > 3 && (
                <span className="text-[10px] text-slate-400">+{profile.skills.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      </Link>
      
      <ConnectionButton status={connectionStatus} onClick={onConnect} />
    </div>
  );
}
