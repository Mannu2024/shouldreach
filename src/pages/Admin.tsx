import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, where, orderBy } from 'firebase/firestore';
import { SuccessStory, UserProfile, Report } from '../types';
import { Shield, CheckCircle, XCircle, Trash2, Users, BookOpen, Flag, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function Admin() {
  const { profile } = useAuthStore();
  const [pendingStories, setPendingStories] = useState<SuccessStory[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<'stories' | 'users' | 'reports'>('stories');

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const fetchAdminData = async () => {
      try {
        // Fetch pending stories
        const storiesQ = query(collection(db, 'success_stories'), where('status', '==', 'pending'));
        const storiesSnap = await getDocs(storiesQ);
        setPendingStories(storiesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as SuccessStory[]);

        // Fetch users
        const usersQ = query(collection(db, 'users'));
        const usersSnap = await getDocs(usersQ);
        setUsers(usersSnap.docs.map(d => d.data() as UserProfile));

        // Fetch pending reports
        const reportsQ = query(
          collection(db, 'reports'), 
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        );
        const reportsSnap = await getDocs(reportsQ);
        setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Report[]);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      }
    };

    fetchAdminData();
  }, [profile?.uid]);

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  const handleStoryAction = async (storyId: string, action: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'success_stories', storyId), { status: action });
      setPendingStories(prev => prev.filter(s => s.id !== storyId));
    } catch (error) {
      console.error(`Error ${action} story:`, error);
    }
  };

  const handleVerifyUser = async (userId: string, isVerified: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isVerified });
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, isVerified } : u));
    } catch (error) {
      console.error("Error verifying user:", error);
    }
  };

  const handleReportAction = async (reportId: string, action: 'resolved' | 'dismissed') => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: action });
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (error) {
      console.error(`Error ${action} report:`, error);
    }
  };

  const handleDeleteContent = async (report: Report) => {
    if (!window.confirm(`Are you sure you want to delete this ${report.targetType}?`)) return;

    try {
      // Delete the actual content based on type
      let collectionName = '';
      if (report.targetType === 'post') collectionName = 'posts';
      else if (report.targetType === 'story') collectionName = 'success_stories';
      else if (report.targetType === 'profile') collectionName = 'users'; // Be careful with deleting users

      if (collectionName) {
        await deleteDoc(doc(db, collectionName, report.targetId));
      }

      // Mark report as resolved
      await handleReportAction(report.id, 'resolved');
      alert(`${report.targetType} deleted successfully.`);
    } catch (error) {
      console.error("Error deleting content:", error);
      alert("Failed to delete content.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        </div>
        
        <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab('stories')}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'stories' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Pending Stories ({pendingStories.length})
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Manage Users ({users.length})
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'reports' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Content Reports ({reports.length})
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'stories' && (
        <div className="space-y-4">
          {pendingStories.map(story => (
            <div key={story.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{story.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">By {story.authorName} • {story.category}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleStoryAction(story.id, 'approved')}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Approve"
                  >
                    <CheckCircle className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => handleStoryAction(story.id, 'rejected')}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Reject"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-100">{story.content}</p>
            </div>
          ))}
          
          {pendingStories.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
              <p className="text-slate-500 mt-1">No pending success stories to review.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-900">User</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-900">Role</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-900">University</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map(u => (
                  <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} alt="" className="w-8 h-8 rounded-full" />
                        <div>
                          <p className="font-medium text-slate-900">{u.displayName}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'professor' ? 'bg-blue-100 text-blue-800' :
                        u.role === 'alumni' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{u.university || '-'}</td>
                    <td className="px-6 py-4">
                      {u.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" /> Verified
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">Unverified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                         onClick={() => handleVerifyUser(u.uid, !u.isVerified)}
                        className={`text-sm font-medium ${u.isVerified ? 'text-amber-600 hover:text-amber-700' : 'text-indigo-600 hover:text-indigo-700'}`}
                      >
                        {u.isVerified ? 'Revoke' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.map(report => (
            <div key={report.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 capitalize">Reported {report.targetType}</h3>
                    <p className="text-sm text-slate-500">
                      Reported {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleReportAction(report.id, 'dismissed')}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                  >
                    Dismiss
                  </button>
                  <button 
                    onClick={() => handleDeleteContent(report)}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Content
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4">
                <p className="text-sm font-semibold text-slate-700 mb-1">Reason for report:</p>
                <p className="text-slate-600">{report.reason}</p>
              </div>
              
              <div className="text-sm text-slate-500 flex items-center gap-4">
                <span>Reporter ID: <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">{report.reporterId}</span></span>
                <span>Target ID: <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">{report.targetId}</span></span>
              </div>
            </div>
          ))}
          
          {reports.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No pending reports</h3>
              <p className="text-slate-500 mt-1">The community is looking good!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
